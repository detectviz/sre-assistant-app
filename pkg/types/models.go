package types

import "time"

// InsightAnalyzeRequest 對應 architecture.md 第 5.1 節，用於觸發 /resources/insight/analyze。
type InsightAnalyzeRequest struct {
	Service     string    `json:"service"`
	Environment string    `json:"environment"`
	Range       TimeRange `json:"range"`
	MetricQuery string    `json:"metricQuery,omitempty"`
	LogQuery    string    `json:"logQuery,omitempty"`
}

// TimeRange 表示查詢的時間範圍。
type TimeRange struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}

// InsightMetricPoint 為 MCP metrics 回傳的摘要。
type InsightMetricPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Value     float64   `json:"value"`
	Unit      string    `json:"unit,omitempty"`
	Label     string    `json:"label,omitempty"`
}

// InsightLogEntry 為 MCP logs 回傳的摘要。
type InsightLogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	Source    string    `json:"source,omitempty"`
}

// InsightAlertSummary 為 MCP alerts 工具回傳的摘要。
type InsightAlertSummary struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Severity    string `json:"severity"`
	State       string `json:"state"`
	Description string `json:"description,omitempty"`
}

// InsightAnalyzeResponse 為後端整合 MCP 後回傳的內容。
type InsightAnalyzeResponse struct {
	Metrics      []InsightMetricPoint  `json:"metrics"`
	Logs         []InsightLogEntry     `json:"logs"`
	Alerts       []InsightAlertSummary `json:"alerts"`
	AIAssessment string                `json:"aiAssessment,omitempty"`
}

// IncidentEvalRequest 對應 architecture.md 第 5.1 節，用於觸發 /resources/incident/eval。
type IncidentEvalRequest struct {
	AlertUID    string    `json:"alertUid"`
	Service     string    `json:"service"`
	Environment string    `json:"environment"`
	Range       TimeRange `json:"range"`
}

// IncidentTimelineEntry 用於事件時間軸。
type IncidentTimelineEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Message   string    `json:"message"`
	Source    string    `json:"source"`
	Severity  string    `json:"severity"`
}

// IncidentRecommendation 提供 AI 建議的具體行動。
type IncidentRecommendation struct {
	Title  string `json:"title"`
	Detail string `json:"detail"`
	Impact string `json:"impact"`
}

// IncidentEvalResponse 為後端整合 MCP 與 AI 分析後回傳的內容。
type IncidentEvalResponse struct {
	Status          string                   `json:"status"`
	Timeline        []IncidentTimelineEntry  `json:"timeline"`
	Recommendations []IncidentRecommendation `json:"recommendations"`
	AISynopsis      string                   `json:"aiSynopsis,omitempty"`
}
