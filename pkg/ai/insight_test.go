package ai

import (
	"context"
	"errors"
	"testing"

	"github.com/sre/assistant/pkg/types"
)

type stubLLM struct {
	enabled  bool
	output   string
	err      error
	requests []ChatRequest
}

func (s *stubLLM) Enabled(context.Context) (bool, error) {
	if s.err != nil {
		return false, s.err
	}
	return s.enabled, nil
}

func (s *stubLLM) Chat(ctx context.Context, req ChatRequest) (ChatResponse, error) {
	s.requests = append(s.requests, req)
	if s.err != nil {
		return ChatResponse{}, s.err
	}
	return ChatResponse{Output: s.output}, nil
}

func TestInsightSummarizerSuccess(t *testing.T) {
	t.Parallel()

	llm := &stubLLM{enabled: true, output: "analysis"}
	summarizer := &InsightSummarizer{LLM: llm}

        summary, err := summarizer.SummarizeInsight(context.Background(), types.InsightAnalyzeRequest{
                MetricsDatasource: "prom",
                LogsDatasource:    "loki",
                MetricQuery:       "rate",
                LogQuery:          "{job=\"grafana\"}",
        }, map[string]any{"value": 1}, []string{"log"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if summary != "analysis" {
		t.Fatalf("unexpected summary: %s", summary)
	}
	if len(llm.requests) != 1 {
		t.Fatalf("expected chat request")
	}
}

func TestInsightSummarizerDisabled(t *testing.T) {
	t.Parallel()

	llm := &stubLLM{enabled: false}
	summarizer := &InsightSummarizer{LLM: llm}

        if _, err := summarizer.SummarizeInsight(context.Background(), types.InsightAnalyzeRequest{}, nil, nil); err == nil {
                t.Fatalf("expected error when llm disabled")
        }
}

func TestInsightSummarizerLLMError(t *testing.T) {
	t.Parallel()

	llm := &stubLLM{enabled: true, err: errors.New("llm failure")}
	summarizer := &InsightSummarizer{LLM: llm}

	if _, err := summarizer.SummarizeInsight(context.Background(), types.InsightAnalyzeRequest{}, nil, nil); err == nil {
		t.Fatalf("expected error when llm returns failure")
	}
}
