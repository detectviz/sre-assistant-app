package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/sre/assistant/pkg/types"
)

// InsightHandler 對應 architecture.md 第 5 節，負責 /resources/insight/analyze。
type InsightHandler struct {
	gateway ObservabilityGateway
	logger  log.Logger
}

// NewInsightHandler 建立預設的分析處理器。
func NewInsightHandler(gateway ObservabilityGateway, logger log.Logger) *InsightHandler {
	return &InsightHandler{gateway: gateway, logger: logger}
}

// Analyze 整合 MCP gateway 資料並回傳摘要。
func (h *InsightHandler) Analyze(w http.ResponseWriter, r *http.Request) {
	var req types.InsightAnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	metrics, err := h.gateway.QueryMetrics(ctx, req)
	if err != nil {
		h.logger.Error("query metrics failed", "error", err)
		http.Error(w, "failed to query metrics", http.StatusBadGateway)
		return
	}

	logs, err := h.gateway.QueryLogs(ctx, req)
	if err != nil {
		h.logger.Error("query logs failed", "error", err)
		http.Error(w, "failed to query logs", http.StatusBadGateway)
		return
	}

	alerts, err := h.gateway.ListAlerts(ctx, req.Service, req.Environment)
	if err != nil {
		h.logger.Error("list alerts failed", "error", err)
		http.Error(w, "failed to list alerts", http.StatusBadGateway)
		return
	}

	summary := buildInsightSummary(req, metrics, logs, alerts)

	resp := types.InsightAnalyzeResponse{
		Metrics:      metrics,
		Logs:         logs,
		Alerts:       alerts,
		AIAssessment: summary,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		h.logger.Error("encode response failed", "error", err)
	}
}

func buildInsightSummary(req types.InsightAnalyzeRequest, metrics []types.InsightMetricPoint, logs []types.InsightLogEntry, alerts []types.InsightAlertSummary) string {
	builder := &strings.Builder{}
	builder.WriteString("服務: " + req.Service + "\\n")
	builder.WriteString("環境: " + req.Environment + "\\n")
	builder.WriteString("Metric 點數: ")
	builder.WriteString(strconv.Itoa(len(metrics)))
	builder.WriteString("\\nLogs 條數: ")
	builder.WriteString(strconv.Itoa(len(logs)))
	builder.WriteString("\\nAlerts 數量: ")
	builder.WriteString(strconv.Itoa(len(alerts)))
	return builder.String()
}
