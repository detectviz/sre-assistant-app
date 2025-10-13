package ai

import (
	"context"
	"errors"
	"testing"

	"github.com/sre/assistant/pkg/types"
)

func TestIncidentAdvisorSuccess(t *testing.T) {
	t.Parallel()

	llm := &stubLLM{enabled: true, output: "recommend"}
	advisor := &IncidentAdvisor{LLM: llm}

        recommendation, err := advisor.BuildRecommendations(context.Background(), types.IncidentEvalRequest{
                IncidentID:        "inc-1",
                MetricQuery:       "up",
                LogQuery:          "{app=\"grafana\"}",
                MetricsDatasource: "prom",
                LogsDatasource:    "loki",
                AlertWindow:       types.TimeRange{From: "2024-01-01T00:00:00Z", To: "2024-01-01T01:00:00Z"},
        }, map[string]int{"value": 1}, []string{"alert"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if recommendation != "recommend" {
		t.Fatalf("unexpected recommendation: %s", recommendation)
	}
	if len(llm.requests) != 1 {
		t.Fatalf("expected chat request")
	}
}

func TestIncidentAdvisorDisabled(t *testing.T) {
	t.Parallel()

	llm := &stubLLM{enabled: false}
	advisor := &IncidentAdvisor{LLM: llm}

	if _, err := advisor.BuildRecommendations(context.Background(), types.IncidentEvalRequest{}, nil, nil); err == nil {
		t.Fatalf("expected error when llm disabled")
	}
}

func TestIncidentAdvisorLLMError(t *testing.T) {
	t.Parallel()

	llm := &stubLLM{enabled: true, err: errors.New("llm failure")}
	advisor := &IncidentAdvisor{LLM: llm}

	if _, err := advisor.BuildRecommendations(context.Background(), types.IncidentEvalRequest{}, nil, nil); err == nil {
		t.Fatalf("expected error")
	}
}
