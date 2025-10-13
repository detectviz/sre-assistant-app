package main

import (
	"context"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/sre/assistant/pkg/handlers"
)

// healthHandler 對應 architecture.md 第 5.2 節，檢查 MCP 與資料來源狀態。
type healthHandler struct {
	gateway handlers.ObservabilityGateway
}

func (h *healthHandler) CheckHealth(ctx context.Context, _ *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	if _, err := h.gateway.ListAlerts(ctx, "health-check", "default"); err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: "無法連線至 MCP 伺服器",
		}, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "MCP gateway ready",
	}, nil
}

func main() {
	logger := log.DefaultLogger
	gateway := handlers.NewMockGateway(logger)
	insight := handlers.NewInsightHandler(gateway, logger)
	incident := handlers.NewIncidentHandler(gateway, logger)

	router := func(r chi.Router) {
		r.Post("/insight/analyze", insight.Analyze)
		r.Post("/incident/eval", incident.Evaluate)
	}

	if err := backend.Serve(backend.ServeOpts{
		CheckHealthHandler:  &healthHandler{gateway: gateway},
		CallResourceHandler: httpadapter.New(httpadapter.WithRouter(router)),
	}); err != nil {
		logger.Error("backend server failed", "error", err)
		os.Exit(1)
	}
}
