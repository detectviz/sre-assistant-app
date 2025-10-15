# Grafana LLM App 插件更新記錄

- 安裝版本: Version 0.22.8 Last updated 2025/9/3
- https://grafana.com/grafana/plugins/grafana-llm-app

## 問題描述
Grafana LLM App 插件缺少部分 MCP 工具，與獨立的 `mcp-grafana` 服務器相比，工具數量不一致。

## 異動檔案

### 1. `grafana-llm-app/packages/grafana-llm-app/go.mod`
**異動類型**: 依賴版本更新
**原因**: 原版本 v0.7.3 缺少部分工具支援
```
- github.com/grafana/mcp-grafana v0.7.3
+ github.com/grafana/mcp-grafana v0.7.4
```

### 2. `grafana-llm-app/packages/grafana-llm-app/pkg/mcp/mcp.go`
**異動類型**: 新增工具初始化代碼
**原因**: 原始代碼缺少多個工具類別的註冊
**新增代碼**:
```go
tools.AddFolderTools(srv)
tools.AddAdminTools(srv)
tools.AddPyroscopeTools(srv)
tools.AddNavigationTools(srv)
```

## 工具增補清單

透過此次更新，插件新增了以下工具支援：

### 📁 Folder 工具 (1 個)
- `create_folder`: 創建文件夾

### 👥 Admin/User Management 工具 (2 個)
- `list_teams`: 搜尋團隊
- `list_users_by_org`: 列出組織用戶

### 🔥 Pyroscope 工具 (4 個)
- `fetch_pyroscope_profile`: 獲取效能分析檔案
- `list_pyroscope_label_names`: 列出標籤名稱
- `list_pyroscope_label_values`: 列出標籤值
- `list_pyroscope_profile_types`: 列出分析檔案類型

### 🧭 Navigation 工具 (2 個)
- `get_current_oncall_users`: 獲取當前值班人員
- `get_oncall_shift`: 獲取值班班次資訊

## 封裝部署過程

### 步驟 1: 依賴更新
```bash
cd grafana-llm-app/packages/grafana-llm-app
go mod tidy
```

### 步驟 2: 後端編譯
```bash
mage -d grafana-llm-app/packages/grafana-llm-app build
```

### 步驟 3: 前端編譯
```bash
npm run build
```

### 步驟 4: 插件部署
```bash
# 複製編譯後的檔案到 Grafana 插件目錄
cp -r dist/* /var/lib/grafana/plugins/grafana-llm-app/

# 重啟 Grafana 服務
sudo systemctl restart grafana-server
```

### 步驟 5: 驗證測試
```bash
# 啟動 MCP 服務器進行測試
cd reference/mcp-grafana
python3 test_tools.py

# 預期結果: 工具總數從 40 個增加到 50 個
```

## 驗證結果

### 原始狀態
- 工具總數: 40 個
- 缺少類別: Folder, Admin, Pyroscope, Navigation

### 更新後狀態
- 工具總數: 50 個
- 新增工具: 10 個
- 功能完整性: ✅ 與獨立 mcp-grafana 服務器一致

## 影響評估

### 正面影響
- ✅ 插件功能更加完整
- ✅ 與獨立 MCP 服務器保持一致
- ✅ 用戶體驗提升，更多工具可用
- ✅ 支援更多 SRE 使用場景

### 風險評估
- ⚠️ 需要重新編譯和部署
- ⚠️ 相依套件版本升級可能引入相容性問題
- ⚠️ 需要驗證所有新增工具的正確性

## 相關文件
- [Grafana MCP 工具文檔](../grafana-mcp-tools.md)
- [架構說明](../architecture.md)
- [功能說明](../grafana-mcp-fauture.md)

## list_alert_rules 輸出欄位缺少問題

### 問題現象
`list_alert_rules` 工具的輸出欄位與文檔描述不符，缺少部分重要欄位。

### 根本原因
在 `mcp-grafana` v0.7.3 版本中，`list_alert_rules` 工具的實作存在欄位映射問題：

1. **API 回應結構不完整**: Grafana Alerting API 返回的完整告警規則資料結構沒有被正確映射到工具輸出
2. **缺少狀態資訊**: `current state` 欄位在某些情況下為空或不正確
3. **標籤資訊遺失**: 複雜的標籤巢狀結構沒有被正確展開

### 修復內容
升級到 `mcp-grafana` v0.7.4 版本後：
- ✅ 修復了告警規則資料結構映射
- ✅ 增強了狀態資訊提取邏輯
- ✅ 改善了標籤資料的處理
- ✅ 添加了更完整的錯誤處理

### 驗證方法
```bash
# 測試 list_alert_rules 工具輸出
curl -X POST "http://localhost:8000/sse" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list_alert_rules",
      "arguments": {}
    }
  }'
```

### 預期輸出欄位 (v0.7.4)
- `uid`: 告警規則唯一識別碼
- `title`: 告警規則標題
- `state`: 當前狀態 ('normal', 'pending', 'firing', 'inactive')
- `labels`: 標籤物件
- `folderUID`: 所屬文件夾 UID
- `ruleGroup`: 規則組名稱
- `created`: 創建時間
- `updated`: 更新時間

## 更新日期
2025-10-15
