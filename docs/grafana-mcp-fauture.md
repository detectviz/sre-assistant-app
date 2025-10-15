根據架構說明和 MCP Grafana 工具分析，SRE Assistant APP Plugin 可以透過 Grafana MCP 做以下事情：

## **核心功能分類**

### **📊 指標查詢與分析**

- **Prometheus 查詢** (`query_prometheus`): 使用 PromQL 表達式查詢 Prometheus，支援即時查詢和範圍查詢，可使用 RFC3339 格式或相對時間表達式
- **指標名稱列表** (`list_prometheus_metric_names`): 列出 Prometheus 數據源中的所有指標名稱，支援正則表達式過濾和分頁
- **標籤名稱列表** (`list_prometheus_label_names`): 列出 Prometheus 中的標籤名稱，支援系列選擇器和時間範圍過濾
- **標籤值獲取** (`list_prometheus_label_values`): 獲取特定標籤名稱的所有唯一值，支援系列選擇器和時間範圍過濾
- **指標中繼資料** (`list_prometheus_metric_metadata`): 列出 Prometheus 指標的中繼資料（實驗性功能）
- **效能分析**: 分析系統指標趨勢、預測異常狀況

### **📝 日誌檢索與分析**

- **Loki 日誌查詢** (`query_loki_logs`): 執行 LogQL 查詢檢索日誌條目或指標值，支援完整的 LogQL 語法
- **日誌標籤名稱** (`list_loki_label_names`): 列出日誌中找到的所有標籤名稱鍵值
- **日誌標籤值** (`list_loki_label_values`): 檢索特定標籤名稱的所有唯一值，用於發現過濾選項
- **日誌統計** (`query_loki_stats`): 檢索匹配給定 LogQL 選擇器的日誌串流統計資訊
- **錯誤模式偵測** (`find_error_pattern_logs`): 搜尋 Loki 日誌中比上日平均值更高的錯誤模式
- **緩慢請求偵測** (`find_slow_requests`): 搜尋相關 Tempo 資料源中的慢請求
- **斷言獲取** (`get_assertions`): 獲取實體的斷言摘要，包含類型、名稱、環境、站點、命名空間和時間範圍

### **🚨 告警管理**

- **告警規則列表** (`list_alert_rules`): 列出 Grafana 告警規則，包含 UID、標題、狀態和標籤，支援標籤過濾和分頁
- **告警規則詳情** (`get_alert_rule_by_uid`): 檢索特定告警規則的完整配置和狀態
- **創建告警規則** (`create_alert_rule`): 使用指定配置創建新的 Grafana 告警規則
- **更新告警規則** (`update_alert_rule`): 更新現有告警規則的配置
- **刪除告警規則** (`delete_alert_rule`): 刪除指定的告警規則
- **聯絡點列表** (`list_contact_points`): 列出 Grafana 通知聯絡點，包含 UID、名稱和類型
- **告警評估**: AI 分析告警規則並提供最佳化建議

### **📈 儀表板與可視化**

- **儀表板搜尋** (`search_dashboards`): 依查詢字符串搜尋 Grafana 儀表板，返回匹配的儀表板列表
- **儀表板詳情** (`get_dashboard_by_uid`): 檢索包含面板、變數和設定的完整儀表板
- **儀表板摘要** (`get_dashboard_summary`): 獲取儀表的壓縮摘要資訊
- **儀表板屬性** (`get_dashboard_property`): 使用 JSONPath 表達式獲取儀表板的特定部分
- **面板查詢提取** (`get_dashboard_panel_queries`): 從儀表板中檢索面板查詢和資訊
- **儀表板更新** (`update_dashboard`): 使用 JSON 或補丁操作創建或更新儀表板
- **深度連結生成** (`generate_deeplink`): 為 Grafana 資源生成深度連結 URL，支援儀表板、面板和 Explore 查詢
- **文件夾搜尋** (`search_folders`): 依查詢字符串搜尋 Grafana 文件夾

### **🔍 事件與事故管理**

- **事件列表** (`list_incidents`): 列出 Grafana 事件，支援狀態過濾和演練事件包含
- **事件詳情** (`get_incident`): 依 ID 獲取單一事件的完整詳細資訊
- **創建事件** (`create_incident`): 創建新的 Grafana 事件，包含標題、嚴重程度和聊天室前綴
- **添加事件活動** (`add_activity_to_incident`): 向現有事件時間軸添加註記活動
- **Sift 分析獲取** (`get_sift_analysis`): 獲取 Sift 調查分析結果
- **Sift 調查詳情** (`get_sift_investigation`): 獲取特定 Sift 調查案例的詳細資訊
- **Sift 調查列表** (`list_sift_investigations`): 列出所有 Sift 調查案例

### **👥 當值排班管理**

- **當前值班人員** (`get_current_oncall_users`): 獲取目前值班人員資訊
- **值班班次** (`get_oncall_shift`): 獲取特定值班班次的詳細資訊
- **值班排班表** (`list_oncall_schedules`): 列出所有值班排班表
- **值班團隊** (`list_oncall_teams`): 列出所有值班團隊
- **值班用戶** (`list_oncall_users`): 列出所有值班用戶
- **告警群組詳情** (`get_alert_group`): 依 ID 獲取 Grafana OnCall 的特定告警群組
- **告警群組列表** (`list_alert_groups`): 列出 Grafana OnCall 的告警群組，支援多種過濾選項

### **🏗️ 基礎設施管理**

- **資料來源列表** (`list_datasources`): 列出可用的 Grafana 資料來源，可按類型過濾
- **依名稱獲取資料來源** (`get_datasource_by_name`): 使用名稱檢索特定資料來源的詳細資訊
- **依 UID 獲取資料來源** (`get_datasource_by_uid`): 使用 UID 檢索特定資料來源的詳細資訊
- **團隊搜尋** (`list_teams`): 依查詢字符串搜尋 Grafana 團隊
- **組織用戶列表** (`list_users_by_org`): 列出組織中的所有用戶及其詳細資訊
- **創建資料夾** (`create_folder`): 創建新的 Grafana 資料夾
- **效能分析檔案** (`fetch_pyroscope_profile`): 從 Pyroscope 獲取應用程式效能分析檔案
- **效能標籤名稱** (`list_pyroscope_label_names`): 列出 Pyroscope 中的標籤名稱
- **效能標籤值** (`list_pyroscope_label_values`): 列出 Pyroscope 中的標籤值
- **效能分析類型** (`list_pyroscope_profile_types`): 列出可用的 Pyroscope 效能分析檔案類型

## **AI 整合能力**

結合 `@grafana/llm` 和 MCP 工具，Plugin 能：

1. **智慧分析**: AI 自動分析指標趨勢、預測異常、解釋根本原因
2. **自動化建議**: 提供告警規則最佳化、靜音策略建議
3. **自然語言互動**: 支援對話式查詢和指令
4. **上下文感知**: 根據使用者選擇的資料源、主機、指標等提供相關建議

## **實際應用場景**

- **異常診斷**: 自動分析系統指標和日誌，識別效能瓶頸
- **事件回應**: 智慧建立事件、分配團隊、追蹤解決進度
- **預防性維護**: 監控趨勢，提前發現潛在問題
- **自動化工作流程**: 結合告警和事件管理，實現端到端 SRE 流程

這些功能讓 SRE Assistant APP Plugin 成為一個完整的 AI 驅動可觀察性平台，大幅提升 SRE 團隊的效率和回應速度。