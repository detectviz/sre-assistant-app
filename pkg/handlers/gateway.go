package handlers

import (
	"context"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/sre/assistant/pkg/types"
)

// ObservabilityGateway 對應 architecture.md 第 6 章，封裝 MCP server 呼叫。
type ObservabilityGateway interface {
	QueryMetrics(ctx context.Context, req types.InsightAnalyzeRequest) ([]types.InsightMetricPoint, error)
	QueryLogs(ctx context.Context, req types.InsightAnalyzeRequest) ([]types.InsightLogEntry, error)
	ListAlerts(ctx context.Context, service, environment string) ([]types.InsightAlertSummary, error)
	Timeline(ctx context.Context, req types.IncidentEvalRequest) ([]types.IncidentTimelineEntry, error)
}

// MockGateway 為 MCP 伺服器的占位實作，用於本範例骨架。
type MockGateway struct {
	logger log.Logger
}

// NewMockGateway 建立預設的 MockGateway。
func NewMockGateway(logger log.Logger) *MockGateway {
	return &MockGateway{logger: logger}
}

// QueryMetrics 模擬回傳 metrics 資料點。
func (m *MockGateway) QueryMetrics(_ context.Context, req types.InsightAnalyzeRequest) ([]types.InsightMetricPoint, error) {
	now := time.Now()
	return []types.InsightMetricPoint{
		{Timestamp: now.Add(-5 * time.Minute), Value: 12, Unit: "req/s", Label: req.Service},
		{Timestamp: now.Add(-1 * time.Minute), Value: 18, Unit: "req/s", Label: req.Service},
	}, nil
}

// QueryLogs 模擬回傳最新的錯誤 log。
func (m *MockGateway) QueryLogs(_ context.Context, req types.InsightAnalyzeRequest) ([]types.InsightLogEntry, error) {
	return []types.InsightLogEntry{
		{Timestamp: time.Now().Add(-2 * time.Minute), Level: "error", Message: "timeout connecting upstream", Source: req.Service},
	}, nil
}

// ListAlerts 模擬回傳對應服務的告警摘要。
func (m *MockGateway) ListAlerts(_ context.Context, service, environment string) ([]types.InsightAlertSummary, error) {
	return []types.InsightAlertSummary{
		{ID: "alert-1", Name: "High error rate", Severity: "critical", State: "firing", Description: service + " in " + environment},
	}, nil
}

// Timeline 模擬事件時間軸。
func (m *MockGateway) Timeline(_ context.Context, req types.IncidentEvalRequest) ([]types.IncidentTimelineEntry, error) {
	base := time.Now()
	return []types.IncidentTimelineEntry{
		{Timestamp: base.Add(-30 * time.Minute), Message: "Alert triggered", Source: req.AlertUID, Severity: "critical"},
		{Timestamp: base.Add(-10 * time.Minute), Message: "Auto rollback started", Source: req.Service, Severity: "warning"},
	}, nil
}
