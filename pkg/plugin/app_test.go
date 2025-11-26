package plugin

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// TestAppHandlers tests the basic handlers of the App.
// Note: SREAgent related handlers are harder to test without mocking the agent or the ADK environment.
// For now, we verify that the routes are registered and return meaningful responses (even if errors due to missing setup).
// TestAppHandlers 測試 App 的基本處理程序。
// 注意：如果沒有模擬代理或 ADK 環境，SREAgent 相關的處理程序較難測試。
// 目前，我們驗證路由已註冊並返回有意義的回應（即使由於缺少設置而出現錯誤）。
func TestAppHandlers(t *testing.T) {
	// Initialize App without SREAgent for basic tests
	// 初始化不帶 SREAgent 的 App 進行基本測試
	app := &App{}

	mux := http.NewServeMux()
	app.registerRoutes(mux)

	t.Run("Ping", func(t *testing.T) {
		req, err := http.NewRequest("GET", "/ping", nil)
		if err != nil {
			t.Fatal(err)
		}
		rr := httptest.NewRecorder()
		mux.ServeHTTP(rr, req)

		if status := rr.Code; status != http.StatusOK {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}

		expected := `{"message": "ok"}`
		if rr.Body.String() != expected {
			t.Errorf("handler returned unexpected body: got %v want %v", rr.Body.String(), expected)
		}
	})

	t.Run("Insight Analyze - No Agent", func(t *testing.T) {
		// This should fail gracefully because SREAgent is nil
		// 這應該會優雅地失敗，因為 SREAgent 是 nil
		req, err := http.NewRequest("POST", "/resources/insight/analyze", strings.NewReader(`{"data": "test"}`))
		if err != nil {
			t.Fatal(err)
		}
		rr := httptest.NewRecorder()
		mux.ServeHTTP(rr, req)

		if status := rr.Code; status != http.StatusInternalServerError {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusInternalServerError)
		}
	})
}

// TestAppInitialization tests the NewApp function.
// This might fail if it tries to connect to real services, so we should be careful.
// NewApp calls NewSREAgent which tries to connect to MCP.
// We expect it to log error but not fail initialization of App if SREAgent fails (based on our code).
// TestAppInitialization 測試 NewApp 函數。
// 如果它嘗試連接到真實服務，這可能會失敗，所以我們應該小心。
// NewApp 調用 NewSREAgent，它嘗試連接到 MCP。
// 如果 SREAgent 失敗，我們期望它記錄錯誤但不會導致 App 初始化失敗（基於我們的程式碼）。
func TestAppInitialization(t *testing.T) {
	ctx := context.Background()
	settings := backend.AppInstanceSettings{}

	// We expect NewApp to succeed even if SREAgent fails to init (it just logs error)
	// 我們期望 NewApp 即使 SREAgent 初始化失敗也能成功（它只是記錄錯誤）
	instance, err := NewApp(ctx, settings)
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}
	if instance == nil {
		t.Fatal("NewApp returned nil instance")
	}

	app, ok := instance.(*App)
	if !ok {
		t.Fatal("Instance is not of type *App")
	}

	// SREAgent might be nil if initialization failed (likely because of connection refusal to localhost:8000)
	// 如果初始化失敗（可能是因為拒絕連接到 localhost:8000），SREAgent 可能是 nil
	if app.sreAgent == nil {
		t.Log("SREAgent is nil, as expected in test environment without MCP server")
	} else {
		t.Log("SREAgent initialized successfully (unexpected but okay)")
	}
}
