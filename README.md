# SRE Assistant APP Plugin 架構說明

## 1. 總覽

**SRE Assistant APP Plugin** 是一個基於 Grafana 的 **App Plugin**，提供 AI 協助的可觀察性、事件智慧診斷與自動化功能。

### 核心特色
- **前端驅動**: 前端直接透過 `@grafana/llm` 呼叫 LLM 和 MCP 工具
- **無後端邏輯**: 初期版本避免複雜的後端 API 調用，專注於前端體驗
- **漸進式擴充**: 待功能穩定後，再逐步添加後端邏輯和 API 整合

### 架構原則
- **簡潔優先**: 避免過度複雜的架構設計
- **前端主導**: 將主要邏輯放在前端，減少網路往返
- **可擴充性**: 保留後端擴充的空間，但初期不實現

---

## 2. 核心組件

| 組件 | 技術棧 | 責任範圍 | 說明 |
|------|--------|----------|------|
| **前端介面** | React + TypeScript + Grafana Scenes SDK | 使用者互動、AI 對話、結果展示 | 提供直觀的 AI 助手介面，直接呼叫 LLM 和 MCP 工具 |
| **LLM 整合** | `@grafana/llm` | AI 推理、工具調用、自然語言處理 | 前端直接與 Grafana LLM App 通信，處理工具調用邏輯 |
| **MCP 工具** | Grafana MCP Server | 數據查詢、系統操作 | 提供 50+ 種 Grafana 生態工具，前端可直接調用 |
| **Grafana 平台** | Grafana App Plugin | 插件容器、權限管理、安全性 | 提供插件運行環境和統一的認證授權 |

---

## 3. 前端資料互動流程

### 當前實現（前端驅動）
| 步驟 | 說明 | 技術實現 |
|------|------|----------|
| **1** | 使用者與 Scene 頁面互動 | React 組件處理使用者輸入和選擇 |
| **2** | 前端直接呼叫 `@grafana/llm` | 使用 `llm.chatCompletions()` 和 MCP 客戶端 |
| **3** | LLM 處理工具調用邏輯 | AI 決定是否需要調用 MCP 工具 |
| **4** | MCP 工具執行查詢 | 直接訪問 Grafana 資料源和 API |
| **5** | 結果渲染展示 | 使用 Scenes SDK 展示 AI 回應和數據 |

### 設計優勢
- **減少網路往返**: 前端直接呼叫，避免後端中間層
- **即時回應**: AI 推理和工具調用都在前端完成
- **簡化架構**: 不需要複雜的後端 API 設計
- **快速迭代**: 前端修改即可調整功能邏輯

---

## 4. 安全性與權限

### 當前實現（前端驅動）
| 安全層面 | 實現方式 | 說明 |
|----------|----------|------|
| **認證** | Grafana 內建認證 | 使用者通過 Grafana 登入，自動繼承權限 |
| **授權** | RBAC 模型 | 基於使用者角色控制工具存取權限 |
| **數據隔離** | Org/Folder 級別 | 使用者只能訪問授權的組織和文件夾數據 |
| **工具權限** | MCP 服務器控制 | 根據使用者權限動態過濾可用工具 |
| **審計日誌** | 前端行為記錄 | 記錄所有 AI 互動和工具調用 |

### 未來擴充（後端邏輯）
- **Metrics 收集**: 後端輸出插件指標（查詢次數、延遲、錯誤率）
- **Audit Logging**: 自動化與分析行為以 Annotation 記錄
- **Secure JSON**: 機密資訊透過 Grafana 安全設定儲存

---

## 6. 開發與部署

### 環境需求
- **Grafana**: 9.0+ （建議 10.0+）
- **Node.js**: 18+
- **Go**: 1.21+ （後端擴充時需要）

### 建置流程
```bash
# 安裝依賴
npm install

# 前端建置
npm run build
```

### 測試策略
- **單元測試**: React 組件和工具函數
- **整合測試**: LLM 和 MCP 工具調用
- **端到端測試**: 完整使用者流程

---

## 7. 未來擴充規劃

### 階段一：前端功能完善（當前焦點）
- ✅ AI 對話介面優化
- ✅ MCP 工具深度整合
- ✅ 使用者體驗改進
- ✅ 錯誤處理和重試機制

### 階段二：後端邏輯引入（穩定後）
- 🔄 自訂 Resource API 實現
- 🔄 複雜業務邏輯處理
- 🔄 數據聚合和快取
- 🔄 背景任務處理
- 🔄 Metrics 和 Audit Logging

### 階段三：進階功能（長期）
- 🔄 多模型支援（Ollama、Gemini、Vertex）
- 🔄 自訂 MCP 工具開發
- 🔄 Kubernetes 上下文整合
- 🔄 自動化 Playbook 執行

---

## 8. 參考資源

- [Grafana Plugin Development](https://grafana.com/developers/plugin-tools/)
- [Scenes SDK Documentation](https://grafana.com/developers/scenes/)
- [@grafana/llm Package](https://www.npmjs.com/package/@grafana/llm)
- [Grafana LLM App](https://github.com/grafana/grafana-llm-app)
- [Grafana MCP Grafana Server](https://github.com/grafana/mcp-grafana)