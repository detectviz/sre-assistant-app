# Grafana MCP 工具文檔

## 🚀 快速開始

### 環境變數設置

在使用 MCP 工具之前，需要設置以下環境變數：

```bash
# 設置 Grafana 連接信息
export GRAFANA_URL=http://localhost:3000
export GRAFANA_SERVICE_ACCOUNT_TOKEN=your_service_account_token_here

# 設置 MCP 服務器地址（可選，默認值）
export MCP_GRAFANA_URL=http://localhost:8000
```


### 測試連接

#### 方法 1：使用測試腳本（推薦）

```bash
# 進入 mcp-grafana 目錄
cd reference/mcp-grafana

# 啟動 MCP 服務器
make run-sse

# 運行測試腳本
cd docs/local
python3 test_tools.py
```

#### 方法 2：手動測試

```bash
# 1. 啟動 MCP 服務器
go run ./cmd/mcp-grafana --transport sse --log-level info

# 2. 在另一個終端測試連接
curl -X POST "http://localhost:8000/sse" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}'
```

## 📊 總覽

- **MCP 服務器**: http://localhost:8000
- **Grafana URL**: http://localhost:3000
- **連接狀態**: ✅ 已連接
- **總工具數**: 50 個

## 📈 工具分類統計

| 類別 | 工具數量 | 說明 |
|------|----------|------|
| 🔍 Search | 2 個 | 儀表板和文件夾搜索 |
| 📊 Datasource | 3 個 | 數據源管理 |
| 🚨 Incident | 4 個 | 事件管理 |
| 📈 Prometheus | 5 個 | Prometheus 查詢和元數據 |
| 📝 Loki | 4 個 | 日誌查詢 |
| 📊 Dashboard | 5 個 | 儀表板操作 |
| 👥 Oncall | 5 個 | 值班排班管理 |
| 🔍 Sift | 3 個 | 調查分析 |
| 📁 Folder | 1 個 | 文件夾管理 |
| 🔥 Pyroscope | 4 個 | 性能分析 |
| 🔧 Alert Management | 5 個 | 告警規則管理 |
| 👥 User & Team | 3 個 | 用戶和團隊管理 |
| 🚨 OnCall Integration | 2 個 | OnCall 告警組管理 |
| 🔍 Observability Analysis | 3 個 | 可觀測性分析工具 |
| 🔗 Utility | 1 個 | 實用工具 |

## 🛠️ 詳細工具列表

### 🔍 Search 工具 (2 個)

#### `search_dashboards`
**描述**: Search for Grafana dashboards by a query string. Returns a list of matching dashboards with details like title, UID, folder, tags, and URL.

**參數**:
- `query` (string): 搜索查詢字符串

#### `search_folders`
**描述**: Search for Grafana folders by a query string. Returns matching folders with details like title, UID, and URL.

**參數**:
- `query` (string): 搜索查詢字符串

### 📊 Datasource 工具 (3 個)

#### `get_datasource_by_name`
**描述**: Retrieves detailed information about a specific datasource using its name. Returns the full datasource model, including UID, type, URL, access settings, JSON data, and secure JSON field status.

**參數** (必填):
- `name` (string): 數據源名稱

#### `get_datasource_by_uid`
**描述**: Retrieves detailed information about a specific datasource using its UID. Returns the full datasource model, including name, type, URL, access settings, JSON data, and secure JSON field status.

**參數** (必填):
- `uid` (string): 數據源 UID

#### `list_datasources`
**描述**: List available Grafana datasources. Optionally filter by datasource type (e.g., 'prometheus', 'loki'). Returns a summary list including ID, UID, name, type, and default status.

**參數**:
- `type` (string, 可選): 數據源類型過濾器


### 🚨 Incident 工具 (4 個)

#### `add_activity_to_incident`
**描述**: Add a note (userNote activity) to an existing incident's timeline using its ID. The note body can include URLs which will be attached as context. Use this to add context to an incident.

**參數**:
- `body` (string): 活動內容
- `eventTime` (string): 事件時間
- `incidentId` (string): 事件 ID

#### `create_incident`
**描述**: Create a new Grafana incident. Requires title, severity, and room prefix. Allows setting status and labels. This tool should be used judiciously and sparingly, and only after confirmation from the user, as it may notify or alarm lots of people.

**參數**:
- `title` (string): 事件標題
- `severity` (string): 嚴重程度
- `roomPrefix` (string): 聊天室前綴
- `attachCaption`, `attachUrl`, `isDrill`, `labels`, `status` (可選)

#### `get_incident`
**描述**: Get a single incident by ID. Returns the full incident details including title, status, severity, labels, timestamps, and other metadata.

**參數**:
- `id` (string): 事件 ID

#### `list_incidents`
**描述**: List Grafana incidents. Allows filtering by status ('active', 'resolved') and optionally including drill incidents. Returns a preview list with basic details.

**參數**:
- `status` (string, 可選): 狀態過濾器 ('active', 'resolved')
- `drill` (boolean, 可選): 是否包含演練事件
- `limit` (number, 可選): 結果限制數量


### 📈 Prometheus 工具 (5 個)

#### `list_prometheus_label_names`
**描述**: List label names in a Prometheus datasource. Allows filtering by series selectors and time range.

**參數** (必填):
- `datasourceUid` (string): Prometheus 數據源 UID

**參數** (可選):
- `matches` (array): 系列選擇器
- `startRfc3339`, `endRfc3339` (string): 時間範圍
- `limit` (number): 結果限制

#### `list_prometheus_label_values`
**描述**: Get the values for a specific label name in Prometheus. Allows filtering by series selectors and time range.

**參數** (必填):
- `datasourceUid` (string): Prometheus 數據源 UID
- `labelName` (string): 標籤名稱

**參數** (可選):
- `matches` (array): 系列選擇器
- `startRfc3339`, `endRfc3339` (string): 時間範圍
- `limit` (number): 結果限制

#### `list_prometheus_metric_metadata`
**描述**: List Prometheus metric metadata. Returns metadata about metrics currently scraped from targets. Note: This endpoint is experimental.

**參數** (必填):
- `datasourceUid` (string): Prometheus 數據源 UID

**參數** (可選):
- `metric` (string): 指標名稱過濾器
- `limit`, `limitPerMetric` (number): 結果限制

#### `list_prometheus_metric_names`
**描述**: List metric names in a Prometheus datasource. Retrieves all metric names and then filters them locally using the provided regex. Supports pagination.

**參數** (必填):
- `datasourceUid` (string): Prometheus 數據源 UID

**參數** (可選):
- `regex` (string): 正則表達式過濾器
- `limit`, `page` (number): 分頁參數

#### `query_prometheus`
**描述**: Query Prometheus using a PromQL expression. Supports both instant queries (at a single point in time) and range queries (over a time range). Time can be specified either in RFC3339 format or as relative time expressions like 'now', 'now-1h', 'now-30m', etc.

**參數** (必填):
- `datasourceUid` (string): Prometheus 數據源 UID
- `expr` (string): PromQL 表達式
- `startTime` (string): 開始時間

**參數** (可選):
- `endTime` (string): 結束時間
- `queryType` (string): 查詢類型
- `stepSeconds` (number): 步長秒數


### 📝 Loki 工具 (4 個)

#### `list_loki_label_names`
**描述**: Lists all available label names (keys) found in logs within a specified Loki datasource and time range. Returns a list of unique label strings (e.g., `["app", "env", "pod"]`). If the time range is not provided, it defaults to the last hour.

**參數** (必填):
- `datasourceUid` (string): Loki 數據源 UID

**參數** (可選):
- `startRfc3339`, `endRfc3339` (string): 時間範圍

#### `list_loki_label_values`
**描述**: Retrieves all unique values associated with a specific `labelName` within a Loki datasource and time range. Returns a list of string values (e.g., for `labelName="env"`, might return `["prod", "staging", "dev"]`). Useful for discovering filter options. Defaults to the last hour if the time range is omitted.

**參數** (必填):
- `datasourceUid` (string): Loki 數據源 UID
- `labelName` (string): 標籤名稱

**參數** (可選):
- `startRfc3339`, `endRfc3339` (string): 時間範圍

#### `query_loki_logs`
**描述**: Executes a LogQL query against a Loki datasource to retrieve log entries or metric values. Returns a list of results, each containing a timestamp, labels, and either a log line (`line`) or a numeric metric value (`value`). Defaults to the last hour, a limit of 10 entries, and 'backward' direction (newest first). Supports full LogQL syntax for log and metric queries (e.g., `{app="foo"} |= "error"`, `rate({app="bar"}[1m])`).

**參數** (必填):
- `datasourceUid` (string): Loki 數據源 UID
- `logql` (string): LogQL 查詢表達式

**參數** (可選):
- `startRfc3339`, `endRfc3339` (string): 時間範圍
- `limit` (number): 結果限制
- `direction` (string): 查詢方向

#### `query_loki_stats`
**描述**: Retrieves statistics about log streams matching a given LogQL *selector* within a Loki datasource and time range. Returns an object containing the count of streams, chunks, entries, and total bytes (e.g., `{"streams": 5, "chunks": 50, "entries": 10000, "bytes": 512000}`). The `logql` parameter **must** be a simple label selector (e.g., `{app="nginx", env="prod"}`) and does not support line filters, parsers, or aggregations.

**參數** (必填):
- `datasourceUid` (string): Loki 數據源 UID
- `logql` (string): LogQL 選擇器

**參數** (可選):
- `startRfc3339`, `endRfc3339` (string): 時間範圍


### 📊 Dashboard 工具 (5 個)

#### `get_dashboard_by_uid`
**描述**: Retrieves the complete dashboard, including panels, variables, and settings, for a specific dashboard identified by its UID.

**參數** (必填):
- `uid` (string): 儀表板 UID

#### `get_dashboard_panel_queries`
**描述**: Use this tool to retrieve panel queries and information from a Grafana dashboard.

**參數** (必填):
- `uid` (string): 儀表板 UID

#### `get_dashboard_property`
**描述**: Get specific parts of a dashboard using JSONPath expressions.

**參數** (必填):
- `uid` (string): 儀表板 UID
- `jsonPath` (string): JSONPath 表達式

#### `get_dashboard_summary`
**描述**: Get a compact summary of a dashboard.

**參數** (必填):
- `uid` (string): 儀表板 UID

#### `update_dashboard`
**描述**: Create or update a dashboard using JSON or patch operations.

**參數** (可選):
- `dashboard` (object): 完整儀表板 JSON
- `uid` (string): 現有儀表板 UID
- `operations` (array): 補丁操作

---

## 📋 工具使用總結

本文檔涵蓋了 **50 個 Grafana MCP 工具**，按功能分類如下：

| 功能領域 | 工具數量 | 主要用途 |
|----------|----------|----------|
| **數據查詢** | 13 個 | Prometheus、Loki、Pyroscope 數據檢索 |
| **儀表板管理** | 5 個 | 儀表板 CRUD 操作和查詢 |
| **告警管理** | 5 個 | 告警規則的完整生命週期管理 |
| **用戶與權限** | 3 個 | 聯繫點、團隊、用戶管理 |
| **OnCall 集成** | 7 個 | 值班排班和告警組管理 |
| **可觀測性分析** | 6 個 | 錯誤模式分析、性能分析、斷言檢查 |
| **實用工具** | 6 個 | 文件夾管理、搜索、深度鏈接生成 |
| **事件管理** | 4 個 | 事件的創建、更新和跟蹤 |
| **數據源管理** | 3 個 | 數據源信息的檢索和管理 |

### 🔧 使用建議

1. **按需選擇工具**: 根據具體任務選擇合適的工具類別
2. **注意參數要求**: 仔細檢查必填參數，避免調用失敗
3. **合理使用分頁**: 對於列表類工具，注意 `limit` 和 `page` 參數
4. **時間範圍控制**: 日誌和指標查詢注意時間範圍設置
5. **權限檢查**: 確保 Service Account 有足夠的權限

### 📊 數據完整性

所有工具都經過詳細的參數驗證和錯誤處理，確保：
- ✅ 清晰的參數文檔
- ✅ 必填/可選參數區分
- ✅ 類型提示
- ✅ 使用示例參考
