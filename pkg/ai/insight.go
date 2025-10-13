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
 * 依據《docs/architecture.md》第 6.1 與 7.2 節，InsightSummarizer 負責整合 MCP 查詢結果並委派給 LLM 產生摘要。
 */
type InsightSummarizer struct {
	LLM LLMClient
}

type LLMClient interface {
	Enabled(ctx context.Context) (bool, error)
	Chat(ctx context.Context, req ChatRequest) (ChatResponse, error)
}

func (s *InsightSummarizer) SummarizeInsight(ctx context.Context, req types.InsightAnalyzeRequest, metrics any, logs any) (string, error) {
	if s == nil || s.LLM == nil {
		return "", errors.New("LLM 客戶端未配置")
	}

	enabled, err := s.LLM.Enabled(ctx)
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
	logsJSON, err := json.Marshal(logs)
	if err != nil {
		logsJSON = []byte("{}")
	}

        prompt := fmt.Sprintf("請依據以下指標與日誌資料提供 SRE 分析摘要，並標示可能的異常根因。\\nMetricQuery: %s\\nLogQuery: %s", req.MetricQuery, req.LogQuery)

        resp, err := s.LLM.Chat(ctx, ChatRequest{
                Prompt: prompt,
                Context: map[string]any{
                        "metrics":    string(metricsJSON),
                        "logs":       string(logsJSON),
                        "metricsDatasource": req.MetricsDatasource,
                        "logsDatasource":    req.LogsDatasource,
                        "dimensions": req.Dimensions,
                },
        })
	if err != nil {
		return "", fmt.Errorf("LLM 摘要請求失敗: %w", err)
	}

	if resp.Output == "" {
		return "", errors.New("LLM 未回傳任何摘要內容")
	}

	return resp.Output, nil
}
