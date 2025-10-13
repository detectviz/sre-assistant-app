package mcp

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/sre/assistant/pkg/types"
)

func TestClientQueryMetricsSuccess(t *testing.T) {
	t.Parallel()

	var receivedPath string
	var payload map[string]any

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPath = r.URL.Path
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok"})
	}))
	t.Cleanup(srv.Close)

	client, err := NewClient(Config{BaseURL: srv.URL})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}

        req := types.InsightAnalyzeRequest{MetricsDatasource: "prom", LogsDatasource: "loki", MetricQuery: "up", LogQuery: "{app=\"grafana\"}"}
	tr := types.ParsedTimeRange{From: time.Now().Add(-time.Hour), To: time.Now()}

	resp, err := client.QueryMetrics(context.Background(), req, tr)
	if err != nil {
		t.Fatalf("query metrics: %v", err)
	}

	if receivedPath != "/tools/queryMetrics" {
		t.Fatalf("unexpected path %s", receivedPath)
	}

	if payload["query"] != "up" {
		t.Fatalf("unexpected query payload: %v", payload)
	}

	data := resp.(map[string]any)
	if data["status"] != "ok" {
		t.Fatalf("unexpected response: %v", data)
	}
}

func TestClientQueryIncidentMetrics(t *testing.T) {
	t.Parallel()

	var payload map[string]any

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/tools/queryMetrics" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	t.Cleanup(srv.Close)

	client, err := NewClient(Config{BaseURL: srv.URL})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}

        req := types.IncidentEvalRequest{MetricsDatasource: "prom", LogsDatasource: "loki", MetricQuery: "up", LogQuery: "{app=\"grafana\"}", IncidentID: "inc"}
	tr := types.ParsedTimeRange{From: time.Now().Add(-time.Hour), To: time.Now()}

	if _, err := client.QueryIncidentMetrics(context.Background(), req, tr); err != nil {
		t.Fatalf("query incident metrics: %v", err)
	}

	if payload["incidentId"] != "inc" {
		t.Fatalf("expected incident id in payload: %v", payload)
	}
}

func TestClientQueryMetricsError(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte("bad gateway"))
	}))
	t.Cleanup(srv.Close)

	client, err := NewClient(Config{BaseURL: srv.URL})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}

        req := types.InsightAnalyzeRequest{MetricsDatasource: "prom", LogsDatasource: "loki", MetricQuery: "up", LogQuery: "{app=\"grafana\"}"}
	tr := types.ParsedTimeRange{From: time.Now().Add(-time.Hour), To: time.Now()}

	if _, err := client.QueryMetrics(context.Background(), req, tr); err == nil {
		t.Fatalf("expected error but got none")
	}
}

func TestClientHealthAndDatasource(t *testing.T) {
	t.Parallel()

	requests := make(chan string, 2)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests <- r.URL.Path
		if r.Method == http.MethodGet && r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method == http.MethodPost && r.URL.Path == "/tools/queryMetrics" {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"status":"ok"}`))
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	t.Cleanup(srv.Close)

	client, err := NewClient(Config{BaseURL: srv.URL, DatasourceUID: "prom"})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}

	if err := client.Health(context.Background()); err != nil {
		t.Fatalf("health check failed: %v", err)
	}

	if err := client.ProbeDatasource(context.Background()); err != nil {
		t.Fatalf("datasource probe failed: %v", err)
	}

	paths := map[string]bool{}
	for i := 0; i < 2; i++ {
		select {
		case p := <-requests:
			paths[p] = true
		default:
			t.Fatalf("missing expected request %d", i)
		}
	}

	if !paths["/health"] || !paths["/tools/queryMetrics"] {
		t.Fatalf("unexpected request paths: %v", paths)
	}
}

func TestClientProbeDatasourceRequiresUID(t *testing.T) {
	t.Parallel()

	client, err := NewClient(Config{BaseURL: "http://example.com"})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}

	if err := client.ProbeDatasource(context.Background()); err == nil {
		t.Fatalf("expected error when datasource uid missing")
	}
}
