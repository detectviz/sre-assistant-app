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
 * IncidentHandler 對應 `/resources/incident/eval`，結合 MCP 工具與 AI 建議。
 */
type IncidentHandler struct {
	MCPClient IncidentMCPClient
	Advisor   IncidentAdvisor
}

// IncidentMCPClient 定義 Incident 所需的 MCP 查詢能力。
type IncidentMCPClient interface {
	QueryIncidentMetrics(ctx context.Context, req types.IncidentEvalRequest, tr types.ParsedTimeRange) (any, error)
	ListAlerts(ctx context.Context, req types.IncidentEvalRequest, tr types.ParsedTimeRange) (any, error)
}

// IncidentAdvisor 定義 AI 建議的介面。
type IncidentAdvisor interface {
	BuildRecommendations(ctx context.Context, req types.IncidentEvalRequest, metrics any, alerts any) (string, error)
}

// HandleEval 處理告警評估請求。
func (h *IncidentHandler) HandleEval(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var payload types.IncidentEvalRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		h.writeError(w, http.StatusBadRequest, err)
		return
	}

	parsedRange, err := parseTimeRange(payload.AlertWindow, "alertWindow.from/to 不可為空")
	if err != nil {
		h.writeError(w, http.StatusBadRequest, err)
		return
	}

	response, err := h.evaluate(ctx, payload, parsedRange)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err)
		return
	}

	h.writeJSON(w, response)
}

func (h *IncidentHandler) evaluate(ctx context.Context, req types.IncidentEvalRequest, tr types.ParsedTimeRange) (types.IncidentEvalResponse, error) {
        if h.MCPClient == nil {
                return types.IncidentEvalResponse{}, errors.New("MCP 客戶端未配置")
        }
        if h.Advisor == nil {
                return types.IncidentEvalResponse{}, errors.New("LLM 建議器未配置")
        }

        if strings.TrimSpace(req.MetricsDatasource) == "" {
                return types.IncidentEvalResponse{}, errors.New("metricsDatasource 不可為空")
        }
        if strings.TrimSpace(req.LogsDatasource) == "" {
                return types.IncidentEvalResponse{}, errors.New("logsDatasource 不可為空")
        }
        if strings.TrimSpace(req.MetricQuery) == "" {
                return types.IncidentEvalResponse{}, errors.New("metricQuery 不可為空")
        }
        if strings.TrimSpace(req.LogQuery) == "" {
                return types.IncidentEvalResponse{}, errors.New("logQuery 不可為空")
        }

        metrics, err := h.MCPClient.QueryIncidentMetrics(ctx, req, tr)
        if err != nil {
                return types.IncidentEvalResponse{}, err
        }

	alerts, err := h.MCPClient.ListAlerts(ctx, req, tr)
	if err != nil {
		return types.IncidentEvalResponse{}, err
	}

	recommendations, err := h.Advisor.BuildRecommendations(ctx, req, metrics, alerts)
	if err != nil {
		return types.IncidentEvalResponse{}, err
	}

	return types.IncidentEvalResponse{
		Status:          "pending",
		Recommendations: recommendations,
		Validation: map[string]any{
			"metrics": metrics,
			"alerts":  alerts,
		},
	}, nil
}

func (h *IncidentHandler) writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.DefaultLogger.Error("failed to encode incident response", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (h *IncidentHandler) writeError(w http.ResponseWriter, status int, err error) {
	log.DefaultLogger.Error("incident handler error", "status", status, "error", err)
	http.Error(w, err.Error(), status)
}
