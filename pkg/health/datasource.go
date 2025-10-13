package health

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

/**
 * @section 5.2 系統健康檢查
 * 依據《docs/architecture.md》第 5.2 節，本模組透過 Grafana REST API 驗證資料來源健康狀態，
 * 確保觀測數據可被順利取得。
 */

type DatasourceProbeConfig struct {
	BaseURL    string
	APIToken   string
	Datasource string
	Timeout    time.Duration
	HTTPClient *http.Client
}

const defaultDatasourceTimeout = 10 * time.Second

// NewDatasourceProbe 建立呼叫 Grafana 資料來源健康檢查 API 的探針。
func NewDatasourceProbe(cfg DatasourceProbeConfig) func(context.Context) error {
	trimmedBase := strings.TrimSpace(cfg.BaseURL)
	trimmedUID := strings.TrimSpace(cfg.Datasource)

	var endpoint *url.URL
	var endpointErr error
	if trimmedBase != "" && trimmedUID != "" {
		endpoint, endpointErr = url.Parse(strings.TrimRight(trimmedBase, "/") + "/api/datasources/uid/" + trimmedUID + "/health")
	}

	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: defaultDatasourceTimeout}
	}

	authHeader := ""
	if token := strings.TrimSpace(cfg.APIToken); token != "" {
		authHeader = "Bearer " + token
	}

	return func(ctx context.Context) error {
		if trimmedUID == "" {
			return errors.New("未設定資料來源 UID，無法檢查健康狀態")
		}
		if trimmedBase == "" {
			return errors.New("未設定 Grafana BaseURL，無法檢查資料來源")
		}
		if endpointErr != nil {
			return fmt.Errorf("解析 Grafana BaseURL 失敗: %w", endpointErr)
		}

		timeout := cfg.Timeout
		if timeout <= 0 {
			timeout = defaultDatasourceTimeout
		}

		ctx, cancel := context.WithTimeout(ctx, timeout)
		defer cancel()

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
		if err != nil {
			return fmt.Errorf("建立 Grafana 健康檢查請求失敗: %w", err)
		}
		if authHeader != "" {
			req.Header.Set("Authorization", authHeader)
		}

		res, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("呼叫 Grafana 健康檢查失敗: %w", err)
		}
		defer func() {
			io.Copy(io.Discard, res.Body)
			res.Body.Close()
		}()

		if res.StatusCode >= 400 {
			message, _ := io.ReadAll(res.Body)
			return fmt.Errorf("Grafana 資料來源健康檢查狀態碼 %d: %s", res.StatusCode, strings.TrimSpace(string(message)))
		}

		var payload struct {
			Status  string `json:"status"`
			Message string `json:"message"`
		}
		if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
			return fmt.Errorf("解析 Grafana 健康檢查回應失敗: %w", err)
		}
		if strings.EqualFold(payload.Status, "ok") {
			return nil
		}

		if payload.Message == "" {
			payload.Message = "Grafana 回傳非 OK 狀態"
		}
		return fmt.Errorf("資料來源健康檢查失敗: %s", payload.Message)
	}
}
