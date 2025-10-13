package types

import "time"

/**
 * @section 5.1 Resource API
 * 定義 Insight 與 Incident Resource API 所需的輸入輸出資料結構，對應《docs/architecture.md》第 5.1 節。
 */

// TimeRange 以 ISO8601 字串傳遞，後端將統一轉換為 time.Time 以利後續查詢。
type TimeRange struct {
	From string `json:"from"`
	To   string `json:"to"`
}

// ParsedTimeRange 方便內部使用的時間模型。
type ParsedTimeRange struct {
	From time.Time
	To   time.Time
}

// InsightAnalyzeRequest 定義前端 `/insight/analyze` 的請求格式。
type InsightAnalyzeRequest struct {
        MetricsDatasource string            `json:"metricsDatasource"`
        LogsDatasource    string            `json:"logsDatasource"`
        MetricQuery       string            `json:"metricQuery"`
        LogQuery          string            `json:"logQuery"`
        TimeRange         TimeRange         `json:"timeRange"`
        Dimensions        map[string]string `json:"dimensions,omitempty"`
}

// InsightAnalyzeResponse 將 MCP 數據與 AI 摘要回傳前端。
type InsightAnalyzeResponse struct {
	Metrics   any    `json:"metrics"`
	Logs      any    `json:"logs"`
	AISummary string `json:"aiSummary"`
}

// IncidentEvalRequest 定義 `/incident/eval` 的請求格式。
type IncidentEvalRequest struct {
        IncidentID        string    `json:"incidentId"`
        MetricsDatasource string    `json:"metricsDatasource"`
        LogsDatasource    string    `json:"logsDatasource"`
        MetricQuery       string    `json:"metricQuery"`
        LogQuery          string    `json:"logQuery"`
        AlertWindow       TimeRange `json:"alertWindow"`
}

// IncidentEvalResponse 聚合規則狀態、建議與驗證資訊。
type IncidentEvalResponse struct {
	Status          string `json:"status"`
	Recommendations string `json:"recommendations"`
	Validation      any    `json:"validation"`
}
