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

type stubIncidentMCP struct {
	metrics any
	alerts  any
	err     error
}

func (s *stubIncidentMCP) QueryIncidentMetrics(context.Context, types.IncidentEvalRequest, types.ParsedTimeRange) (any, error) {
	return s.metrics, s.err
}

func (s *stubIncidentMCP) ListAlerts(context.Context, types.IncidentEvalRequest, types.ParsedTimeRange) (any, error) {
	return s.alerts, s.err
}

type stubIncidentAdvisor struct {
	recommendation string
	err            error
}

func (s *stubIncidentAdvisor) BuildRecommendations(context.Context, types.IncidentEvalRequest, any, any) (string, error) {
	return s.recommendation, s.err
}

func TestIncidentHandlerHandleEvalSuccess(t *testing.T) {
	t.Parallel()

	handler := &IncidentHandler{
		MCPClient: &stubIncidentMCP{metrics: map[string]int{"value": 1}, alerts: []string{"alert"}},
		Advisor:   &stubIncidentAdvisor{recommendation: "do it"},
	}

        payload := types.IncidentEvalRequest{
                IncidentID:        "inc-1",
                MetricsDatasource: "prom",
                LogsDatasource:    "loki",
                MetricQuery:       "up",
                LogQuery:          "{app=\"grafana\"}",
                AlertWindow:       types.TimeRange{From: "2024-01-01T00:00:00Z", To: "2024-01-01T01:00:00Z"},
        }
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/incident/eval", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handler.HandleEval(rec, req)

	res := rec.Result()
	if res.StatusCode != 200 {
		t.Fatalf("unexpected status: %d", res.StatusCode)
	}
	defer res.Body.Close()

	var response types.IncidentEvalResponse
	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.Recommendations != "do it" {
		t.Fatalf("unexpected recommendation: %s", response.Recommendations)
	}
}

func TestIncidentHandlerHandleEvalAdvisorError(t *testing.T) {
	t.Parallel()

	handler := &IncidentHandler{
		MCPClient: &stubIncidentMCP{metrics: map[string]int{"value": 1}, alerts: []string{"alert"}},
		Advisor:   &stubIncidentAdvisor{err: errors.New("advisor error")},
	}

        payload := types.IncidentEvalRequest{
                IncidentID:        "inc-1",
                MetricsDatasource: "prom",
                LogsDatasource:    "loki",
                MetricQuery:       "up",
                LogQuery:          "{app=\"grafana\"}",
                AlertWindow:       types.TimeRange{From: "2024-01-01T00:00:00Z", To: "2024-01-01T01:00:00Z"},
        }
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/incident/eval", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handler.HandleEval(rec, req)

	if rec.Result().StatusCode != 500 {
		t.Fatalf("expected 500 status")
	}
}
