# Plugin Package (pkg/plugin)

本套件實作了 SRE Assistant 的 Grafana 後端插件邏輯。它負責處理來自 Grafana 的資源調用 (Resource Calls)，並整合 Google ADK (Agent Development Kit) 來提供 AI 輔助功能。

## 核心組件

### App

`App` 結構體是插件的主要入口點，實現了 `backend.CallResourceHandler`、`instancemgmt.InstanceDisposer` 和 `backend.CheckHealthHandler` 介面。

它負責：
1. 初始化 SRE Agent (`pkg/sreagent`)。
2. 註冊並處理 HTTP 路由。
3. 管理插件生命週期。

### SRE Agent 整合

在 `NewApp` 初始化過程中，會讀取 Grafana 的 `AppInstanceSettings` 來配置 SRE Agent：
- **Gemini API Key**: 從 `DecryptedSecureJSONData` 中的 `gemini_api_key` 獲取。
- **MCP Endpoint**: 從 `DecryptedSecureJSONData` 中的 `mcp_endpoint` 獲取 (預設為 `http://localhost:8000/sse`)。

如果 Agent 初始化失敗（例如缺少配置或無法連接 MCP Server），插件會記錄錯誤但繼續運行，唯相關 AI 功能將無法使用。

## HTTP 資源路由 (Resource Routes)

插件透過 `httpadapter` 註冊了以下路由供前端調用：

### 基礎功能
- `GET /ping`: 健康檢查，回傳 `{"message": "ok"}`。
- `POST /echo`: 回聲測試，原樣返回請求內容。

### SRE Agent 功能
這些端點會調用後端的 ADK Agent 進行分析。每個請求都會生成一個獨立的 Session ID 以確保狀態隔離。

- `POST /resources/insight/analyze`
  - **用途**: 分析洞察數據 (Insight Data)。
  - **請求**: `{"data": "..."}`
  - **回應**: `{"result": "Agent 分析結果..."}`

- `POST /resources/incident/eval`
  - **用途**: 評估事件數據 (Incident Data)。
  - **請求**: `{"data": "..."}`
  - **回應**: `{"result": "Agent 評估結果..."}`

## 開發與測試

### 單元測試
本套件包含 `app_test.go` 與 `resources_test.go`，用於驗證路由處理邏輯。
由於 Agent 依賴外部服務 (MCP, Gemini API)，測試中已處理 Agent 未初始化時的 Graceful Degradation 情境。

```bash
go test ./pkg/plugin/...
```
