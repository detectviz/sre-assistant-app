# SRE Assistant APP Plugin 架構說明

## **1. 總覽**

**SRE Assistant APP Plugin** 是一個基於 Grafana 的 **App Plugin**，提供 AI 協助的可觀察性、事件智慧診斷與自動化功能。  
本架構直接整合 **Grafana LLM App** 與 **MCP (Model Context Protocol) Server**，實現即時分析與行動導向的工作流程。

本平台支援：
- **AI 驅動的分析與摘要**（透過 `@grafana/llm`）
- **即時資料存取與行動觸發**（透過 MCP 工具）

---

## **2. 核心組件**

| 層級 | 技術 | 說明 |
|------|------|------|
| **前端 (App Plugin)** | React + TypeScript + Grafana Scenes SDK | 提供互動式使用者介面與 AI 可視化框架 |
| **後端 (Go SDK)** | `grafana-plugin-sdk-go` | 提供 Resource API、資料訪問與審計記錄 |
| **LLM 整合** | `@grafana/llm` | 與 Grafana LLM App 溝通的統一 AI 介面 |
| **MCP 整合** | Grafana MCP Server (`grafana/mcp-grafana`) | 提供即時查詢工具 (metrics, logs, alerts, dashboards) |
| **外部資料源** | Prometheus, Loki | 提供基礎監控資料與事件 |

---

## **3. 資料流總覽**

```
[使用者 / 分析者]
        │
        ▼
 [SRE APP Plugin (前端 Scenes)]
    ├─ Overview Page
    ├─ Insight Page
    └─ Incident Page
        │
        ▼
 [Grafana Plugin Backend (Go SDK)]
    ├─ /resources/insight/analyze
    └─ /resources/incident/eval
        │
        ▼
 [Grafana LLM App + MCP Server]
    ├─ LLM Provider (Ollama / OpenAI)
    ├─ MCP 工具：
    │    ├─ queryMetrics
    │    ├─ getLogs
    │    ├─ listAlerts
    │    ├─ getDashboardPanels
    │    └─ queryAnnotations
        │
        ▼
 [Grafana 資料源 / 外部系統]
    ├─ Prometheus
    └─ Loki / Tempo

```

---

## **4. 前端架構**

### **4.1 結構**
```
sre-assistant-app/src/
├── pages/
│   ├── OverviewPage.tsx
│   ├── InsightPage.tsx
│   └── IncidentPage.tsx
├── scenes/
│   ├── InsightScene.ts
│   └── IncidentScene.ts
├── api/
│   ├── insight.api.ts
│   └── incident.api.ts
├── ai/
│   ├── llmClient.ts
│   ├── mcpClient.ts
│   └── aiAssistant.ts
└── module.ts
```

### **4.2 前端資料互動流程**
| 步驟 | 說明 |
|------|------|
| **1** | 使用者與 Scene 頁面互動（選擇 Host、Metric 或 Log 或 Alert、時間範圍）。 |
| **2** | Scene 呼叫 `api/*.ts` → 後端 Resource API。 |
| **3** | 後端查詢 Grafana 資料源或 MCP 工具。 |
| **4** | 前端可直接透過 `@grafana/llm` 呼叫 LLM 或 MCP 工具。 |
| **5** | 結果以可視化組件呈現（Scenes 物件）。 |

---

## **5. 後端架構**

### **5.1 Resource API**
| Endpoint | 功能 | 輸出 |
|-----------|------|------|
| `/resources/insight/analyze` | 整合資料源與 LLM 推理進行分析 | 異常摘要、預測、AI 解釋 |
| `/resources/incident/eval` | 評估告警規則與 AI 建議 | 規則狀態、編寫規則、閾值調整建議 |

### **5.2 主要程式骨架**
```go
func (s *Server) Serve() error {
  return backend.Serve(backend.ServeOpts{
    CheckHealthHandler: healthHandler{},
    ResourceHandler: httpadapter.New(httpadapter.WithRouter(func(r chi.Router) {
      r.Post("/insight/analyze", handleAnalyze)
      r.Post("/incident/eval", handleEval)
    })),
  })
}
```

---

## **6. LLM 與 MCP 整合**

[參考 use-llms-and-mcp.md](reference/plugin-tools-docs/how-to-guides/app-plugins/use-llms-and-mcp.md)

### **6.1 LLM 整合流程**
1. 檢查可用性：
   ```ts
   const enabled = await llm.enabled();
   ```
2. 發送請求：
   ```ts
   const result = await llm.chatCompletions({
     model: llm.Model.BASE,
     messages,
   });
   ```
3. 顯示結果（Insight / 解釋文字）。

### **6.2 Grafana MCP Server 整合流程**

[參考 mcp-grafana](reference/mcp-grafana)

1. 建立連線：
   ```ts
   const mcpClient = new mcp.Client({ name: 'sre-assistant', version: '1.0.0' });
   const transport = new mcp.StreamableHTTPClientTransport(mcp.streamableHTTPURL());
   await mcpClient.connect(transport);
   ```
2. 列出工具：
   ```ts
   const tools = await mcpClient.listTools();
   ```
3. 呼叫工具：
   ```ts
   const result = await mcpClient.callTool({
     name: 'queryMetrics',
     arguments: { query: 'rate(node_cpu_seconds_total[5m])' },
   });
   ```
4. 結合 LLM 推理：
   ```ts
   const openAITools = mcp.convertToolsToOpenAI(tools);
   const response = await llm.chatCompletions({ messages, tools: openAITools });
   ```

---

## **7. 四大頁面資料流**

### **7.1 Overview Page**
- 聚合 KPI 指標（`queryMetrics`）
- 顯示告警摘要（`listAlerts`）
- 使用 LLM 生成摘要報告

### **7.2 Insight Page**
[資料源][主機][指標][時間]
- 呼叫 `/insight/analyze` + `queryMetrics`
- 顯示趨勢與預測結果
- LLM 生成異常原因解釋

### **7.3 Incident Page**
[資料源][主機]
- 呼叫 `queryMetrics` 得到過去指標資料
- 呼叫 `/incident/eval` 產生設定告警規則
- LLM 提供告警建議與靜音策略

---

## **8. 可觀察性與安全性**

| 項目 | 實作 |
|------|------|
| **Metrics** | 後端輸出 plugin 指標（查詢次數、延遲、錯誤率）。 |
| **Audit Logging** | 自動化與分析行為皆以 Annotation 記錄。 |
| **RBAC** | 繼承 Grafana 使用者與組織上下文。 |
| **Secure JSON** | 機密資訊透過 Grafana 安全設定儲存。 |
| **Tenant 隔離** | 以 Org / Folder 控制存取範圍。 |

---

## **9. 擴充策略**

| 層級 | 方向 |
|------|------|
| **前端** | 新增對話式 AI 面板（Ask AI about incidents）。 |
| **後端** | 註冊自訂 MCP 工具：`getIncidents`, `runPlaybook`, `fetchRCA`。 |
| **MCP Server** | 參考 [`grafana/k8s-mcp-server`] 整合 K8s context。 |
| **AI Provider** | 支援多模型（Ollama、Gemini、Vertex）。 |

---

## **10. 結論**

本架構實現一個 **AI 驅動可觀察性平台**，結合：
- Grafana LLM App 的推理能力  
- MCP Server 的資料與行動層  
- Scenes SDK 的互動與可視化  

形成一個**自洽、可擴充、AI 智能化的 SRE 平台**。

---

## **11. 參考資料**

[前端 Plugin Tools](reference/plugin-tools-docs)
[前端 Scenes](reference/scenes-docs)
[Grafana MCP Server](reference/mcp-grafana)
[後端 SDK](reference/grafana-plugin-sdk-go)