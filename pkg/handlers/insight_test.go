package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/sre/assistant/pkg/types"
)

type stubInsightMCP struct {
	metrics any
	logs    any
	err     error
}

func (s *stubInsightMCP) QueryMetrics(context.Context, types.InsightAnalyzeRequest, types.ParsedTimeRange) (any, error) {
	return s.metrics, s.err
}

func (s *stubInsightMCP) GetLogs(context.Context, types.InsightAnalyzeRequest, types.ParsedTimeRange) (any, error) {
	return s.logs, s.err
}

type stubInsightSummarizer struct {
	summary string
	err     error
}

func (s *stubInsightSummarizer) SummarizeInsight(context.Context, types.InsightAnalyzeRequest, any, any) (string, error) {
	return s.summary, s.err
}

func TestInsightHandlerHandleAnalyzeSuccess(t *testing.T) {
	t.Parallel()

	handler := &InsightHandler{
		MCPClient: &stubInsightMCP{
			metrics: map[string]int{"value": 1},
			logs:    []string{"log"},
		},
		Summarizer: &stubInsightSummarizer{summary: "ok"},
	}

        payload := types.InsightAnalyzeRequest{
                MetricsDatasource: "prom",
                LogsDatasource:    "loki",
                MetricQuery:       "up",
                LogQuery:          "{app=\"grafana\"}",
                TimeRange:         types.TimeRange{From: "2024-01-01T00:00:00Z", To: "2024-01-01T01:00:00Z"},
        }
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/insight/analyze", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handler.HandleAnalyze(rec, req)

	res := rec.Result()
	if res.StatusCode != 200 {
		t.Fatalf("unexpected status: %d", res.StatusCode)
	}
	defer res.Body.Close()

	var response types.InsightAnalyzeResponse
	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.AISummary != "ok" {
		t.Fatalf("unexpected summary: %s", response.AISummary)
	}
}

func TestInsightHandlerHandleAnalyzeLLMError(t *testing.T) {
	t.Parallel()

	handler := &InsightHandler{
		MCPClient: &stubInsightMCP{
			metrics: map[string]int{"value": 1},
			logs:    []string{"log"},
		},
		Summarizer: &stubInsightSummarizer{err: errors.New("llm error")},
	}

        payload := types.InsightAnalyzeRequest{
                MetricsDatasource: "prom",
                LogsDatasource:    "loki",
                MetricQuery:       "up",
                LogQuery:          "{app=\"grafana\"}",
                TimeRange:         types.TimeRange{From: "2024-01-01T00:00:00Z", To: "2024-01-01T01:00:00Z"},
        }
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/insight/analyze", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handler.HandleAnalyze(rec, req)

	if rec.Result().StatusCode != 500 {
		t.Fatalf("expected 500 status")
	}
}
