package handlers

import (
        "context"
        "encoding/json"
        "errors"
        "net/http"
        "strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"

	"github.com/sre/assistant/pkg/types"
)

/**
 * @section 5.1 Resource API
 * InsightHandler 依據《docs/architecture.md》第 5.1 節實作 `/resources/insight/analyze` 邏輯，
 * 串接 MCP 指標、日誌與 AI 摘要。
 */
type InsightHandler struct {
	MCPClient  InsightMCPClient
	Summarizer InsightSummarizer
}

// InsightMCPClient 定義 MCP 查詢所需的能力。
type InsightMCPClient interface {
	QueryMetrics(ctx context.Context, req types.InsightAnalyzeRequest, tr types.ParsedTimeRange) (any, error)
	GetLogs(ctx context.Context, req types.InsightAnalyzeRequest, tr types.ParsedTimeRange) (any, error)
}

// InsightSummarizer 定義 LLM 摘要行為。
type InsightSummarizer interface {
	SummarizeInsight(ctx context.Context, req types.InsightAnalyzeRequest, metrics any, logs any) (string, error)
}

// HandleAnalyze 是公開的 HTTP 入口。
func (h *InsightHandler) HandleAnalyze(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var payload types.InsightAnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		h.writeError(w, http.StatusBadRequest, err)
		return
	}

	parsedRange, err := parseTimeRange(payload.TimeRange, "timeRange.from/to 不可為空")
	if err != nil {
		h.writeError(w, http.StatusBadRequest, err)
		return
	}

	metrics, logs, summary, err := h.runAnalysis(ctx, payload, parsedRange)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err)
		return
	}

	h.writeJSON(w, types.InsightAnalyzeResponse{
		Metrics:   metrics,
		Logs:      logs,
		AISummary: summary,
	})
}

func (h *InsightHandler) runAnalysis(ctx context.Context, req types.InsightAnalyzeRequest, tr types.ParsedTimeRange) (any, any, string, error) {
        if h.MCPClient == nil {
                return nil, nil, "", errors.New("MCP 客戶端未配置")
        }
        if h.Summarizer == nil {
                return nil, nil, "", errors.New("LLM 摘要器未配置")
        }

        if strings.TrimSpace(req.MetricsDatasource) == "" {
                return nil, nil, "", errors.New("metricsDatasource 不可為空")
        }
        if strings.TrimSpace(req.LogsDatasource) == "" {
                return nil, nil, "", errors.New("logsDatasource 不可為空")
        }
        if strings.TrimSpace(req.MetricQuery) == "" {
                return nil, nil, "", errors.New("metricQuery 不可為空")
        }
        if strings.TrimSpace(req.LogQuery) == "" {
                return nil, nil, "", errors.New("logQuery 不可為空")
        }

        metrics, err := h.MCPClient.QueryMetrics(ctx, req, tr)
        if err != nil {
                return nil, nil, "", err
        }

	logs, err := h.MCPClient.GetLogs(ctx, req, tr)
	if err != nil {
		return nil, nil, "", err
	}

	summary, err := h.Summarizer.SummarizeInsight(ctx, req, metrics, logs)
	if err != nil {
		return nil, nil, "", err
	}

	return metrics, logs, summary, nil
}

func (h *InsightHandler) writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.DefaultLogger.Error("failed to encode response", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (h *InsightHandler) writeError(w http.ResponseWriter, status int, err error) {
	log.DefaultLogger.Error("insight handler error", "status", status, "error", err)
	http.Error(w, err.Error(), status)
}
