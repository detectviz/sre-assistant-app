package ai

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
)

/**
 * @section 6 LLM 與 MCP 整合
 * 依據《docs/architecture.md》第 6.1 節，封裝 Grafana LLM App 的 REST 介面，供 Summarizer 與 Advisor 使用。
 */
type Config struct {
	BaseURL    string
	APIToken   string
	HTTPClient *http.Client
}

type Client struct {
	baseURL    *url.URL
	httpClient *http.Client
	authHeader string
}

type ChatRequest struct {
	Prompt  string         `json:"prompt"`
	Context map[string]any `json:"context,omitempty"`
}

type ChatResponse struct {
	Output string `json:"output"`
}

func NewClient(cfg Config) (*Client, error) {
	if strings.TrimSpace(cfg.BaseURL) == "" {
		return nil, errors.New("LLM BaseURL 不可為空")
	}

	parsed, err := url.Parse(cfg.BaseURL)
	if err != nil {
		return nil, fmt.Errorf("解析 LLM BaseURL 失敗: %w", err)
	}

	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}

	client := &Client{baseURL: parsed, httpClient: httpClient}
	if cfg.APIToken != "" {
		client.authHeader = "Bearer " + cfg.APIToken
	}

	return client, nil
}

func (c *Client) Enabled(ctx context.Context) (bool, error) {
	_, err := c.request(ctx, http.MethodGet, "/health", nil)
	if err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return false, err
		}
		log.DefaultLogger.Warn("LLM 健康檢查失敗", "error", err)
		return false, nil
	}
	return true, nil
}

func (c *Client) Chat(ctx context.Context, req ChatRequest) (ChatResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return ChatResponse{}, fmt.Errorf("序列化 LLM 請求失敗: %w", err)
	}

	data, err := c.request(ctx, http.MethodPost, "/v1/chat", bytes.NewReader(body))
	if err != nil {
		return ChatResponse{}, err
	}

	var resp ChatResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return ChatResponse{}, fmt.Errorf("解析 LLM 回應失敗: %w", err)
	}
	return resp, nil
}

func (c *Client) request(ctx context.Context, method, path string, body io.Reader) ([]byte, error) {
	endpoint := strings.TrimSuffix(c.baseURL.String(), "/") + path
	req, err := http.NewRequestWithContext(ctx, method, endpoint, body)
	if err != nil {
		return nil, err
	}
	if method == http.MethodPost {
		req.Header.Set("Content-Type", "application/json")
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
		return nil, fmt.Errorf("LLM 請求失敗: %s", strings.TrimSpace(string(message)))
	}

	return io.ReadAll(res.Body)
}
