package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/sre/assistant/pkg/types"
)

// IncidentHandler 對應 architecture.md 第 5 節，負責 /resources/incident/eval。
type IncidentHandler struct {
	gateway ObservabilityGateway
	logger  log.Logger
}

// NewIncidentHandler 建立預設的事件評估處理器。
func NewIncidentHandler(gateway ObservabilityGateway, logger log.Logger) *IncidentHandler {
	return &IncidentHandler{gateway: gateway, logger: logger}
}

// Evaluate 整合 MCP 事件資料並產生建議。
func (h *IncidentHandler) Evaluate(w http.ResponseWriter, r *http.Request) {
	var req types.IncidentEvalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	timeline, err := h.gateway.Timeline(ctx, req)
	if err != nil {
		h.logger.Error("timeline query failed", "error", err)
		http.Error(w, "failed to query incident timeline", http.StatusBadGateway)
		return
	}

	alerts, err := h.gateway.ListAlerts(ctx, req.Service, req.Environment)
	if err != nil {
		h.logger.Error("list alerts failed", "error", err)
		http.Error(w, "failed to list alerts", http.StatusBadGateway)
		return
	}

	status := deriveStatus(alerts)

	resp := types.IncidentEvalResponse{
		Status:   status,
		Timeline: timeline,
		Recommendations: []types.IncidentRecommendation{
			{Title: "通知值班工程師", Detail: "透過 PagerDuty 通知值班人員檢查最新部署。", Impact: "high"},
			{Title: "檢視最新變更", Detail: "使用 MCP 工具 getLogs 深入檢查錯誤訊息。", Impact: "medium"},
		},
		AISynopsis: buildIncidentSynopsis(req, status, alerts),
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		h.logger.Error("encode response failed", "error", err)
	}
}

func deriveStatus(alerts []types.InsightAlertSummary) string {
	for _, alert := range alerts {
		if strings.EqualFold(alert.Severity, "critical") {
			return "critical"
		}
	}
	for _, alert := range alerts {
		if strings.EqualFold(alert.Severity, "warning") {
			return "degraded"
		}
	}
	return "healthy"
}

func buildIncidentSynopsis(req types.IncidentEvalRequest, status string, alerts []types.InsightAlertSummary) string {
	builder := &strings.Builder{}
	builder.WriteString("Alert: " + req.AlertUID + "\\n")
	builder.WriteString("Service: " + req.Service + "\\n")
	builder.WriteString("Environment: " + req.Environment + "\\n")
	builder.WriteString("狀態: " + status + "\\n")
	builder.WriteString("相關告警: ")
	names := make([]string, 0, len(alerts))
	for _, alert := range alerts {
		names = append(names, alert.Name)
	}
	builder.WriteString(strings.Join(names, ", "))
	return builder.String()
}
