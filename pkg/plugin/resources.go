package plugin

import (
	"encoding/json"
	"net/http"
)

// handlePing is an example HTTP GET resource that returns a {"message": "ok"} JSON response.
// handlePing 是一個範例 HTTP GET 資源，返回 {"message": "ok"} JSON 回應。
func (a *App) handlePing(w http.ResponseWriter, req *http.Request) {
	w.Header().Add("Content-Type", "application/json")
	if _, err := w.Write([]byte(`{"message": "ok"}`)); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// handleEcho is an example HTTP POST resource that accepts a JSON with a "message" key and
// returns to the client whatever it is sent.
// handleEcho 是一個範例 HTTP POST 資源，接受帶有 "message" 鍵的 JSON 並
// 將發送的內容返回給客戶端。
func (a *App) handleEcho(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Add("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(body); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// handleInsightAnalyze handles requests to analyze an insight using the SRE Agent.
// handleInsightAnalyze 處理使用 SRE Agent 分析洞察的請求。
func (a *App) handleInsightAnalyze(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if a.sreAgent == nil {
		http.Error(w, "SRE Agent not initialized", http.StatusInternalServerError)
		return
	}

	var body struct {
		Data string `json:"data"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	result, err := a.sreAgent.AnalyzeInsight(req.Context(), body.Data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Add("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{"result": result}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

// handleIncidentEval handles requests to evaluate an incident using the SRE Agent.
// handleIncidentEval 處理使用 SRE Agent 評估事件的請求。
func (a *App) handleIncidentEval(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if a.sreAgent == nil {
		http.Error(w, "SRE Agent not initialized", http.StatusInternalServerError)
		return
	}

	var body struct {
		Data string `json:"data"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	result, err := a.sreAgent.EvalIncident(req.Context(), body.Data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Add("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{"result": result}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

// registerRoutes takes a *http.ServeMux and registers some HTTP handlers.
// registerRoutes 接受一個 *http.ServeMux 並註冊一些 HTTP 處理程序。
func (a *App) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/ping", a.handlePing)
	mux.HandleFunc("/echo", a.handleEcho)
	mux.HandleFunc("/resources/insight/analyze", a.handleInsightAnalyze)
	mux.HandleFunc("/resources/incident/eval", a.handleIncidentEval)
}
