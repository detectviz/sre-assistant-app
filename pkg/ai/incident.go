package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/sre/assistant/pkg/types"
)

/**
 * @section 6 LLM 與 MCP 整合
 * 依據《docs/architecture.md》第 6.1 與 7.3 節，IncidentAdvisor 整合告警與指標資訊生成 AI 建議。
 */
type IncidentAdvisor struct {
	LLM LLMClient
}

func (a *IncidentAdvisor) BuildRecommendations(ctx context.Context, req types.IncidentEvalRequest, metrics any, alerts any) (string, error) {
	if a == nil || a.LLM == nil {
		return "", errors.New("LLM 客戶端未配置")
	}

	enabled, err := a.LLM.Enabled(ctx)
	if err != nil {
		return "", fmt.Errorf("檢查 LLM 可用性失敗: %w", err)
	}
	if !enabled {
		return "", errors.New("LLM 服務目前不可用")
	}

	metricsJSON, err := json.Marshal(metrics)
	if err != nil {
		metricsJSON = []byte("{}")
	}
	alertsJSON, err := json.Marshal(alerts)
	if err != nil {
		alertsJSON = []byte("[]")
	}

        prompt := fmt.Sprintf("請針對事件 %s 在告警視窗內提供調查步驟與緩解建議。請評估指標查詢: %s 並參考日誌查詢: %s", req.IncidentID, req.MetricQuery, req.LogQuery)

        resp, err := a.LLM.Chat(ctx, ChatRequest{
                Prompt: prompt,
                Context: map[string]any{
                        "metrics":    string(metricsJSON),
                        "alerts":     string(alertsJSON),
                        "metricsDatasource": req.MetricsDatasource,
                        "logsDatasource":    req.LogsDatasource,
                        "timeRange": map[string]string{
                                "from": req.AlertWindow.From,
                                "to":   req.AlertWindow.To,
                        },
                },
	})
	if err != nil {
		return "", fmt.Errorf("LLM 生成建議失敗: %w", err)
	}

	if resp.Output == "" {
		return "", errors.New("LLM 未回傳任何建議內容")
	}

	return resp.Output, nil
}
