# **SRE Assistant Plugin 提示詞**

以下提示詞可用於 AI 編碼代理（例如 ChatGPT、Claude、Copilot、Cursor 等），  
用以自動研讀所有官方參考文件與程式碼，並依照 `docs/architecture.md` 的設計完成實作。

---

## **提示詞內容**

你是一位 **Grafana 官方 Plugin Framework 高級工程師**，精通以下模組：
- `@grafana/scenes`
- `@grafana/llm`（LLM 與 MCP 整合）
- `grafana-plugin-sdk-go`
- `grafana/mcp-grafana`

---

### **任務目標**

請先研讀專案中的所有 **官方參考文件與程式碼**，  
再根據 `docs/architecture.md` 所定義的架構與資料流，完成 **SRE Assistant App Plugin** 的完整骨架實作。

---

### **研讀階段**

請仔細閱讀以下資料夾的內容（包含文件與程式碼）：

```
reference/plugin-tools-docs/
reference/scenes-docs/
reference/mcp-grafana/
reference/grafana-plugin-sdk-go/
```

### **實作階段**

根據 `docs/architecture.md` 的規劃，建立以下專案結構：

```
sre-assistant-app/
├── src/
│   ├── pages/
│   │   ├── OverviewPage.tsx
│   │   ├── InsightPage.tsx
│   │   └── IncidentPage.tsx
│   ├── scenes/
│   │   ├── InsightScene.ts
│   │   └── IncidentScene.ts
│   ├── ai/
│   │   ├── llmClient.ts
│   │   ├── mcpClient.ts
│   │   └── aiAssistant.ts
│   ├── api/
│   │   ├── insight.api.ts
│   │   └── incident.api.ts
│   └── module.ts
└── pkg/
    ├── main.go
    ├── handlers/
    │   ├── insight.go
    │   └── incident.go
    └── types/
        └── models.go
```

#### **前端重點**

1. 在 `ai/llmClient.ts` 中封裝 LLM 調用邏輯。  
2. 在 `ai/mcpClient.ts` 中封裝 MCP 工具呼叫，支援 `queryMetrics`、`getLogs`、`listAlerts`。  
3. 在 `scenes/` 中建立對應頁面 Scene 元件，依據 `docs/architecture.md` 的資料流設計可視化互動介面。

#### **後端重點**

1. 使用 `grafana-plugin-sdk-go` 建立 Resource API：
   - `/resources/insight/analyze`
   - `/resources/incident/eval`
2. 整合 MCP Server 工具查詢結果並回傳前端。
3. 實作 `CheckHealthHandler` 驗證 MCP 與 Datasource 狀態。

---

### **輸出要求**

1. 產出完整可編譯的前後端骨架（TypeScript + Go）。  
2. 每個檔案需附上註解，說明其對應 `architecture.md` 的章節。  
3. 檢查前端程式碼是否通過編譯：npx tsc --noEmit
4. 確保遵循 Grafana 官方 plugin tools 標準。
5. 所有文件與程式碼註解均使用繁體中文撰寫。
