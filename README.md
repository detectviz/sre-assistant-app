# SRE Assistant App (SRE 智慧助理插件)

> **Grafana 生態中最頂尖的 AI 驅動可觀察性助理**

## 1. 專案總覽

**SRE Assistant App** 是一個深度整合 Grafana 生態的智慧運維助理。它結合了大型語言模型 (LLM) 的推理能力與 Grafana 的可觀察性數據，旨在協助 SRE 團隊快速診斷問題、分析日誌與指標，並最終實現自動化的故障應對。

### 核心特色
*   **自然語言查詢**: 透過對話介面，直接查詢 Prometheus 指標與 Loki 日誌，無需記憶複雜的 PromQL/LogQL 語法。
*   **上下文感知**: AI 能自動感知當前的時間範圍 (Time Range) 與資料源 (Data Source)，提供精準的查詢建議。
*   **MCP 工具整合**: 採用 Model Context Protocol (MCP) 標準，前端與後端皆可靈活調用 Grafana 生態中的各種工具 (如 `prometheus:query`, `loki:query`)。
*   **混合架構**:
    *   **Frontend**: 基於 `@grafana/scenes` 構建互動式 UI，並透過 `@grafana/llm` 處理 AI 對話。
    *   **Backend**: 使用 Go 語言與 `google.golang.org/adk` 框架，提供更強大的代理 (Agent) 能力與數據持久化 (開發中)。

---

## 2. 系統架構

本插件採用前後端分離的混合架構，確保互動的即時性與後端處理的穩定性。

| 層級 | 技術棧 | 職責 |
| :--- | :--- | :--- |
| **Frontend** | React, TypeScript, Grafana Scenes SDK | 負責 UI 呈現、使用者互動、以及透過 `@grafana/llm` 發起輕量級的 AI 請求。 |
| **Backend** | Go, Grafana Plugin SDK, Google ADK | 負責複雜的 Agent 邏輯、狀態管理、與 MCP Server 的通訊，以及未來的數據持久化。 |
| **AI/LLM** | `@grafana/llm`, Google Gemini (via ADK) | 提供自然語言理解與推理能力。 |
| **Tools** | MCP (Model Context Protocol) | 標準化的工具介面，連接 Prometheus, Loki, Alerting 等 Grafana 資料源。 |

---

## 3. 快速開始 (Getting Started)

### 前置需求
*   **Grafana**: v10.0+ (建議 v11.0+)
*   **Grafana LLM App**: 需安裝並啟用 `grafana-llm-app` 插件，以提供基礎的 LLM 服務。
*   **Gemini API Key**: 用於後端 Agent 的推理服務。

### 安裝與開發
1.  **Clone 專案**:
    ```bash
    git clone https://github.com/sre/assistant.git
    cd assistant
    ```

2.  **安裝前端依賴**:
    ```bash
    npm install
    ```

3.  **啟動開發環境**:
    使用 Docker Compose 啟動包含 Grafana 與插件的完整環境。
    ```bash
    npm run server
    ```
    *Grafana 將於 `http://localhost:3000` 啟動。*

4.  **前端熱更新 (Optional)**:
    若需即時預覽前端修改，可開啟另一個終端機執行：
    ```bash
    npm run dev
    ```

### 配置說明
進入 Grafana -> **Administration** -> **Plugins** -> **SRE Assistant App** -> **Configuration**：
1.  輸入 `Gemini API Key`。
2.  (選填) 設定 `MCP Endpoint` (預設為 `http://localhost:8000/sse`)。

---

## 4. 開發藍圖 (Roadmap)

本專案遵循分階段演進策略，目標是從單純的查詢助理進化為全功能的 SRE 自動化代理。

### Phase 1: MVP - AI 賦能的查詢助理 (2025 Q4)
> **核心目標**: 實現從「手動查詢」到「自然語言查詢」的轉變。

| 狀態 | 優先級 | 任務 |
| :--: | :---: | :--- |
| ✅ | **P0** | **整合 `@grafana/llm`**: 實作對話式 UI，支援自然語言查詢指標與日誌。 |
| ✅ | **P0** | **前端 MCP 工具調用**: 透過 LLM 呼叫 `prometheus:query` 和 `loki:query`。 |
| ✅ | **P1** | **上下文感知**: 讓 AI 理解當前 Time Range 與 Data Source。 |
| ✅ | **P1** | **對話歷史**: 前端 Session 級別的對話紀錄。 |
| ✅ | **P2** | **基礎 UI 框架**: 基於 Grafana Scenes SDK 搭建核心頁面。 |

### Phase 2: 後端賦能與體驗增強 (2026 Q1)
> **核心目標**: 啟用 Go 後端，提供持久化記憶與更穩定的體驗。

| 狀態 | 優先級 | 任務 |
| :--: | :---: | :--- |
| ✅ | **P0** | **後端架構重構**: 模組化 ADK Agent (`pkg/sreagent`) 與 Scenes 前端邏輯。 |
| ⏳ | **P0** | **對話歷史持久化**: 使用資料庫儲存對話，支援跨 Session 追溯。 |
| ⏳ | **P1** | **使用者偏好設定**: 記住使用者的常用資料源與 Dashboard。 |
| ⏳ | **P1** | **遙測與監控**: 插件自我監控 (Metrics)。 |
| ⏳ | **P2** | **安全與密鑰管理**: 整合 Secure JSON Data。 |
| ⏳ | **P2** | **建立後端 Resource API**: 提供 RESTful API 供前端存取。 |

### Phase 3: 邁向智能自動化 (2026 Q2)
> **核心目標**: 升級為「SRE 代理」，執行複雜分析與應對。

| 狀態 | 優先級 | 任務 |
| :--: | :---: | :--- |
| ⏳ | **P0** | **告警分析能力**: AI 自動分析告警根因 (Root Cause Analysis)。 |
| ⏳ | **P1** | **Runbook 整合**: 依指令執行標準化 SOP。 |
| ⏳ | **P1** | **自訂 MCP 工具**: 開發專屬工具 (如 `create-annotation`)。 |
| ⏳ | **P2** | **主動式異常偵測**: 實驗性功能，自動識別圖表異常。 |

### Phase 4: 生態整合與自我完善 (2026 H2)
> **核心目標**: 與外部生態深度整合，具備自我學習能力。

| 狀態 | 優先級 | 任務 |
| :--: | :---: | :--- |
| ⏳ | **P1** | **事件管理整合**: 整合 Jira/ServiceNow，一鍵開單。 |
| ⏳ | **P1** | **使用者回饋機制**: 收集 RLAIF 數據優化模型。 |
| ⏳ | **P2** | **知識庫整合 (RAG)**: 檢索企業內部維運文檔。 |
| ⏳ | **P2** | **多 LLM 支援**: 支援 OpenAI, Anthropic, Ollama 等多種後端。 |

---

## 5. 貢獻指南

歡迎參與 SRE Assistant App 的開發！請遵循以下原則：
*   **遵守憲法**: 所有開發需符合 `.specify/memory/constitution.md` 中的規範。
*   **測試驅動**: 新功能需包含單元測試與 E2E 測試。
*   **程式碼品質**: 提交前請執行 `npm run lint` 與 `npm run typecheck`。

---

*文件更新日期: 2025-10-15*
