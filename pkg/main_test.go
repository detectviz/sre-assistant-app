package main

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

/**
 * @section 5.2 系統健康檢查
 * 本測試依據《docs/architecture.md》第 5.2 節，驗證健康檢查探針整合後能正確反映依賴狀態。
 */

func TestServerCheckHealthAllHealthy(t *testing.T) {
	t.Parallel()

	srv := &server{
		health: healthChecker{
			MCPProbe:        func(context.Context) error { return nil },
			DatasourceProbe: func(context.Context) error { return nil },
		},
	}

	res, err := srv.CheckHealth(context.Background(), &backend.CheckHealthRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Status != backend.HealthStatusOk {
		t.Fatalf("unexpected status: %v", res.Status)
	}
	if !strings.Contains(res.Message, "MCP: ok") || !strings.Contains(res.Message, "Datasource: ok") {
		t.Fatalf("unexpected message: %s", res.Message)
	}
}

func TestServerCheckHealthWithFailures(t *testing.T) {
	t.Parallel()

	srv := &server{
		health: healthChecker{
			MCPProbe: func(context.Context) error {
				return errors.New("ping 失敗")
			},
			DatasourceProbe: func(context.Context) error {
				return errors.New("健康檢查異常")
			},
		},
	}

	res, err := srv.CheckHealth(context.Background(), &backend.CheckHealthRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Status != backend.HealthStatusError {
		t.Fatalf("expected error status, got %v", res.Status)
	}
	if !strings.Contains(res.Message, "MCP: ping 失敗") {
		t.Fatalf("missing MCP error: %s", res.Message)
	}
	if !strings.Contains(res.Message, "Datasource: 健康檢查異常") {
		t.Fatalf("missing datasource error: %s", res.Message)
	}
}
