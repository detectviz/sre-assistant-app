package main

import (
	"context"
	"errors"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"

	"github.com/sre/assistant/pkg/ai"
	"github.com/sre/assistant/pkg/handlers"
	"github.com/sre/assistant/pkg/health"
	"github.com/sre/assistant/pkg/mcp"
)

/**
 * @section 5 後端架構
 * 依據《docs/architecture.md》第 5 章，本主程式註冊 Resource API 與健康檢查處理器。
 */
func main() {
	srv := newServer()

	router := chi.NewRouter()
	srv.registerRoutes(router)

	if err := backend.Serve(backend.ServeOpts{
		CheckHealthHandler:  srv,
		CallResourceHandler: httpadapter.New(router),
	}); err != nil {
		log.DefaultLogger.Error("backend serve failed", "error", err)
		os.Exit(1)
	}
}

type server struct {
	insight  *handlers.InsightHandler
	incident *handlers.IncidentHandler
	health   healthChecker
}

type healthChecker struct {
	MCPProbe        func(context.Context) error
	DatasourceProbe func(context.Context) error
}

func newServer() *server {
	datasourceUID := os.Getenv("SRE_ASSISTANT_DATASOURCE_UID")

	mcpClient, err := mcp.NewClient(mcp.Config{
		BaseURL:        os.Getenv("SRE_ASSISTANT_MCP_URL"),
		APIToken:       os.Getenv("SRE_ASSISTANT_MCP_TOKEN"),
		DatasourceUID:  datasourceUID,
		DatasourceTool: os.Getenv("SRE_ASSISTANT_DATASOURCE_TOOL"),
	})
	if err != nil {
		log.DefaultLogger.Error("初始化 MCP 客戶端失敗", "error", err)
	}

	llmClient, err := ai.NewClient(ai.Config{
		BaseURL:  os.Getenv("SRE_ASSISTANT_LLM_URL"),
		APIToken: os.Getenv("SRE_ASSISTANT_LLM_TOKEN"),
	})
	if err != nil {
		log.DefaultLogger.Error("初始化 LLM 客戶端失敗", "error", err)
	}

	srv := &server{
		insight: &handlers.InsightHandler{
			MCPClient:  mcpClient,
			Summarizer: &ai.InsightSummarizer{LLM: llmClient},
		},
		incident: &handlers.IncidentHandler{
			MCPClient: mcpClient,
			Advisor:   &ai.IncidentAdvisor{LLM: llmClient},
		},
	}

	srv.health = healthChecker{
		MCPProbe: health.NewMCPProbe(health.MCPProbeConfig{Client: mcpClient}),
		DatasourceProbe: health.NewDatasourceProbe(health.DatasourceProbeConfig{
			BaseURL:    os.Getenv("SRE_ASSISTANT_GRAFANA_URL"),
			APIToken:   os.Getenv("SRE_ASSISTANT_GRAFANA_TOKEN"),
			Datasource: datasourceUID,
		}),
	}

	return srv
}

func (s *server) registerRoutes(router chi.Router) {
	router.Post("/insight/analyze", s.insight.HandleAnalyze)
	router.Post("/incident/eval", s.incident.HandleEval)
}

// CheckHealth 依據第 5.1 節規範檢查 MCP 與資料來源狀態。
func (s *server) CheckHealth(ctx context.Context, _ *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	var messages []string
	status := backend.HealthStatusOk

	if err := s.probe(ctx, s.health.MCPProbe, "MCP"); err != nil {
		status = backend.HealthStatusError
		messages = append(messages, "MCP: "+err.Error())
	} else {
		messages = append(messages, "MCP: ok")
	}

	if err := s.probe(ctx, s.health.DatasourceProbe, "Datasource"); err != nil {
		status = backend.HealthStatusError
		messages = append(messages, "Datasource: "+err.Error())
	} else {
		messages = append(messages, "Datasource: ok")
	}

	if len(messages) == 0 {
		messages = append(messages, "所有依賴皆通過檢查")
	}

	return &backend.CheckHealthResult{
		Status:  status,
		Message: strings.Join(messages, "; "),
	}, nil
}

func (s *server) probe(ctx context.Context, fn func(context.Context) error, name string) error {
	if fn == nil {
		return errors.New(name + " 探針未實作")
	}
	return fn(ctx)
}
