package plugin

import (
	"context"
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"

	"github.com/sre/assistant/pkg/sreagent"
)

// Make sure App implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. Plugin should not implement all these interfaces - only those which are
// required for a particular task.
// 確保 App 實作了所需的介面。這很重要，
// 否則我們在運行時只會從插件收到未實作錯誤的回應。
// 插件不應該實作所有這些介面 - 只需要實作特定任務所需的介面。
var (
	_ backend.CallResourceHandler   = (*App)(nil)
	_ instancemgmt.InstanceDisposer = (*App)(nil)
	_ backend.CheckHealthHandler    = (*App)(nil)
)

// App is an example app plugin with a backend which can respond to data queries.
// App 是一個範例應用程式插件，具有可以回應數據查詢的後端。
type App struct {
	backend.CallResourceHandler
	sreAgent *sreagent.SREAgent
}

// NewApp creates a new example *App instance.
// NewApp 建立一個新的範例 *App 實例。
func NewApp(ctx context.Context, settings backend.AppInstanceSettings) (instancemgmt.Instance, error) {
	var app App

	// Extract secure configuration
	// 提取安全配置
	apiKey := settings.DecryptedSecureJSONData["gemini_api_key"]
	mcpEndpoint := settings.DecryptedSecureJSONData["mcp_endpoint"]

	agentConfig := sreagent.Config{
		GeminiAPIKey: apiKey,
		MCPEndpoint:  mcpEndpoint,
	}

	agent, err := sreagent.NewSREAgent(ctx, agentConfig)
	if err != nil {
		backend.Logger.Error("Failed to initialize SRE Agent", "error", err)
		// We don't fail the app initialization, but the agent functionality won't work.
		// Alternatively, we could return error.
		// 我們不會讓應用程式初始化失敗，但代理功能將無法運作。
		// 或者，我們可以返回錯誤。
	}
	app.sreAgent = agent

	// Use a httpadapter (provided by the SDK) for resource calls. This allows us
	// to use a *http.ServeMux for resource calls, so we can map multiple routes
	// to CallResource without having to implement extra logic.
	// 使用 httpadapter（由 SDK 提供）進行資源調用。這允許我們
	// 使用 *http.ServeMux 進行資源調用，因此我們可以映射多個路由
	// 到 CallResource 而無需實作額外的邏輯。
	mux := http.NewServeMux()
	app.registerRoutes(mux)
	app.CallResourceHandler = httpadapter.New(mux)

	return &app, nil
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created.
// Dispose 這裡告訴插件 SDK 當建立新實例時，插件想要清理資源。
func (a *App) Dispose() {
	// cleanup
	// 清理
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// CheckHealth 處理從 Grafana 發送到插件的健康檢查。
func (a *App) CheckHealth(_ context.Context, _ *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "ok",
	}, nil
}
