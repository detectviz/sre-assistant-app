package mcp

import (
        "bytes"
        "context"
        "encoding/json"
        "errors"
        "fmt"
        "io"
        "net/http"
        "net/url"
        "strings"
        "time"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/sre/assistant/pkg/types"
)

/**
 * @section 6 LLM 與 MCP 整合
 * 根據《docs/architecture.md》第 6.2 節，本客戶端封裝與 Grafana MCP Server 的 HTTP 互動，
 * 供後端 Resource Handler 查詢指標、日誌與告警工具。
 */
type Config struct {
	BaseURL        string
	APIToken       string
	HTTPClient     *http.Client
	DatasourceUID  string
	DatasourceTool string
}

type Client struct {
	baseURL        *url.URL
	httpClient     *http.Client
	authHeader     string
	datasourceUID  string
	datasourceTool string
}

const (
	defaultTimeout      = 10 * time.Second
	toolQueryMetrics    = "queryMetrics"
	toolGetLogs         = "getLogs"
	toolListAlerts      = "listAlerts"
	defaultToolCategory = "/tools/"
)

func NewClient(cfg Config) (*Client, error) {
	if strings.TrimSpace(cfg.BaseURL) == "" {
		return nil, errors.New("MCP BaseURL 不可為空")
	}

	parsed, err := url.Parse(cfg.BaseURL)
	if err != nil {
		return nil, fmt.Errorf("解析 MCP BaseURL 失敗: %w", err)
	}

	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: defaultTimeout}
	}

	client := &Client{
		baseURL:        parsed,
		httpClient:     httpClient,
		datasourceUID:  cfg.DatasourceUID,
		datasourceTool: cfg.DatasourceTool,
	}

	if cfg.APIToken != "" {
		client.authHeader = "Bearer " + cfg.APIToken
	}

	if client.datasourceTool == "" {
		client.datasourceTool = toolQueryMetrics
	}

	return client, nil
}

func (c *Client) QueryMetrics(ctx context.Context, req types.InsightAnalyzeRequest, tr types.ParsedTimeRange) (any, error) {
        payload := map[string]any{
                "datasource": req.MetricsDatasource,
                "query":      req.MetricQuery,
                "from":       tr.From.Format(time.RFC3339),
                "to":         tr.To.Format(time.RFC3339),
        }
        if len(req.Dimensions) > 0 {
                payload["dimensions"] = req.Dimensions
        }
        return c.callTool(ctx, toolQueryMetrics, payload)
}

func (c *Client) GetLogs(ctx context.Context, req types.InsightAnalyzeRequest, tr types.ParsedTimeRange) (any, error) {
        payload := map[string]any{
                "datasource": req.LogsDatasource,
                "range": map[string]string{
                        "from": tr.From.Format(time.RFC3339),
                        "to":   tr.To.Format(time.RFC3339),
                },
                "query": req.LogQuery,
        }
        for k, v := range req.Dimensions {
                payload[k] = v
        }
        return c.callTool(ctx, toolGetLogs, payload)
}

func (c *Client) QueryIncidentMetrics(ctx context.Context, req types.IncidentEvalRequest, tr types.ParsedTimeRange) (any, error) {
        payload := map[string]any{
                "datasource": req.MetricsDatasource,
                "query":      req.MetricQuery,
                "from":       tr.From.Format(time.RFC3339),
                "to":         tr.To.Format(time.RFC3339),
        }
        if req.IncidentID != "" {
                payload["incidentId"] = req.IncidentID
        }
        return c.callTool(ctx, toolQueryMetrics, payload)
}

func (c *Client) ListAlerts(ctx context.Context, req types.IncidentEvalRequest, tr types.ParsedTimeRange) (any, error) {
        payload := map[string]any{
                "incidentId": req.IncidentID,
                "datasource": req.MetricsDatasource,
                "from":       tr.From.Format(time.RFC3339),
                "to":         tr.To.Format(time.RFC3339),
        }
        if req.MetricQuery != "" {
                payload["query"] = req.MetricQuery
        }
        return c.callTool(ctx, toolListAlerts, payload)
}

func (c *Client) Health(ctx context.Context) error {
	_, err := c.simpleRequest(ctx, http.MethodGet, "/health", nil)
	return err
}

func (c *Client) ProbeDatasource(ctx context.Context) error {
	if c.datasourceUID == "" {
		return errors.New("尚未設定 Datasource UID，無法進行健康檢查")
	}

	payload := map[string]any{
		"datasource": c.datasourceUID,
		"query":      "1",
		"from":       time.Now().Add(-5 * time.Minute).Format(time.RFC3339),
		"to":         time.Now().Format(time.RFC3339),
	}

	_, err := c.callTool(ctx, c.datasourceTool, payload)
	return err
}

func (c *Client) callTool(ctx context.Context, tool string, payload map[string]any) (any, error) {
	endpoint := strings.TrimSuffix(c.baseURL.String(), "/") + defaultToolCategory + tool
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("序列化 MCP 請求失敗: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("建立 MCP 請求失敗: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.authHeader != "" {
		req.Header.Set("Authorization", c.authHeader)
	}

	res, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("呼叫 MCP 工具 %s 失敗: %w", tool, err)
	}
	defer func() {
		io.Copy(io.Discard, res.Body)
		res.Body.Close()
	}()

	if res.StatusCode != http.StatusOK {
		message, _ := io.ReadAll(res.Body)
		log.DefaultLogger.Error("MCP 工具回應非 200", "tool", tool, "status", res.StatusCode, "body", string(message))
		return nil, fmt.Errorf("MCP 工具 %s 回傳狀態碼 %d", tool, res.StatusCode)
	}

	var data any
	if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("解析 MCP 工具 %s 回應失敗: %w", tool, err)
	}

	return data, nil
}

func (c *Client) simpleRequest(ctx context.Context, method, path string, body io.Reader) ([]byte, error) {
	endpoint := strings.TrimSuffix(c.baseURL.String(), "/") + path
	req, err := http.NewRequestWithContext(ctx, method, endpoint, body)
	if err != nil {
		return nil, err
	}
	if c.authHeader != "" {
		req.Header.Set("Authorization", c.authHeader)
	}

	res, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() {
		io.Copy(io.Discard, res.Body)
		res.Body.Close()
	}()

	if res.StatusCode >= 400 {
		message, _ := io.ReadAll(res.Body)
		return nil, fmt.Errorf("HTTP %s %s 失敗: %s", method, path, strings.TrimSpace(string(message)))
	}

	return io.ReadAll(res.Body)
}
