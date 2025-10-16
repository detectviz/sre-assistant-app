import type { SelectableValue } from '@grafana/data';

/**
 * MCP 工具定義。
 */
export interface McpToolDefinition {
  /** 工具名稱，對應 Grafana MCP tool 的 name 欄位。 */
  name: string;
  /** 工具用途說明。 */
  description: string;
  /** 參數使用提示，協助使用者了解必填與可選欄位。 */
  parameterNote: string;
  /** 預設的參數 JSON 內容，供快速編輯。 */
  exampleArgs?: Record<string, unknown>;
}

/**
 * MCP 工具分類定義。
 */
export interface McpToolCategory {
  /** 類別識別字串。 */
  id: string;
  /** 類別顯示名稱。 */
  title: string;
  /** 類別內包含的工具清單。 */
  tools: McpToolDefinition[];
}

/**
 * 依照 docs/grafana-mcp-fauture.md 整理的 Grafana MCP 工具目錄。
 * 為方便前端顯示，此處補充了常見的參數需求與示例 JSON，實際欄位仍以 MCP 伺服器回應為準。
 */
export const mcpToolCatalog: McpToolCategory[] = [
  {
    id: 'search',
    title: '🔍 搜尋資源',
    tools: [
      {
        name: 'search_dashboards',
        description: '以關鍵字搜尋 Grafana 儀表板並回傳符合條件的清單。',
        parameterNote: '必填: query (string)。',
        exampleArgs: {
          query: 'error rate',
        },
      },
      {
        name: 'search_folders',
        description: '以關鍵字搜尋 Grafana 資料夾並取得 UID、標籤等資訊。',
        parameterNote: '必填: query (string)。',
        exampleArgs: {
          query: 'production',
        },
      },
    ],
  },
  {
    id: 'datasource',
    title: '📊 資料來源管理',
    tools: [
      {
        name: 'list_datasources',
        description: '列出所有可用的資料來源，可依據類型過濾。',
        parameterNote: '可選: type (string)。',
        exampleArgs: {
          type: 'prometheus',
        },
      },
      {
        name: 'get_datasource_by_name',
        description: '依資料來源名稱取得完整設定細節。',
        parameterNote: '必填: name (string)。',
        exampleArgs: {
          name: 'Prometheus',
        },
      },
      {
        name: 'get_datasource_by_uid',
        description: '依資料來源 UID 取得完整設定細節。',
        parameterNote: '必填: uid (string)。',
        exampleArgs: {
          uid: 'prometheus_uid',
        },
      },
    ],
  },
  {
    id: 'prometheus',
    title: '📈 Prometheus 指標分析',
    tools: [
      {
        name: 'list_prometheus_label_names',
        description: '列出 Prometheus 中所有可用的標籤名稱。',
        parameterNote: '必填: datasourceUid (string)。可選: matches (string[])、startRfc3339、endRfc3339、limit。',
        exampleArgs: {
          datasourceUid: 'prometheus_uid',
          limit: 50,
        },
      },
      {
        name: 'list_prometheus_label_values',
        description: '取得指定標籤在 Prometheus 中的所有唯一值。',
        parameterNote: '必填: datasourceUid (string)、labelName (string)。可選: matches (string[])、startRfc3339、endRfc3339、limit。',
        exampleArgs: {
          datasourceUid: 'prometheus_uid',
          labelName: 'job',
          limit: 20,
        },
      },
      {
        name: 'list_prometheus_metric_names',
        description: '列出資料來源中的所有指標名稱，可搭配正則過濾與分頁。',
        parameterNote: '必填: datasourceUid (string)。可選: regex、limit、page。',
        exampleArgs: {
          datasourceUid: 'prometheus_uid',
          regex: 'http_.*',
          limit: 100,
        },
      },
      {
        name: 'list_prometheus_metric_metadata',
        description: '取得 Prometheus 指標的中繼資料 (實驗性功能)。',
        parameterNote: '必填: datasourceUid (string)。可選: metric、limit、limitPerMetric。',
        exampleArgs: {
          datasourceUid: 'prometheus_uid',
          metric: 'up',
        },
      },
      {
        name: 'query_prometheus',
        description: '執行 PromQL 查詢，支援即時與範圍模式。',
        parameterNote: '必填: datasourceUid (string)、expr (string)、startTime (string)。可選: endTime、queryType、stepSeconds。',
        exampleArgs: {
          datasourceUid: 'prometheus_uid',
          expr: 'sum(rate(http_requests_total[5m])) by (status)',
          startTime: 'now-15m',
          endTime: 'now',
          queryType: 'range',
          stepSeconds: 30,
        },
      },
    ],
  },
  {
    id: 'loki',
    title: '📝 Loki 日誌分析',
    tools: [
      {
        name: 'list_loki_label_names',
        description: '列出 Loki 日誌中的所有標籤名稱。',
        parameterNote: '必填: datasourceUid (string)。可選: startRfc3339、endRfc3339。',
        exampleArgs: {
          datasourceUid: 'loki_uid',
        },
      },
      {
        name: 'list_loki_label_values',
        description: '取得指定標籤在 Loki 中的所有值。',
        parameterNote: '必填: datasourceUid (string)、labelName (string)。可選: startRfc3339、endRfc3339。',
        exampleArgs: {
          datasourceUid: 'loki_uid',
          labelName: 'app',
        },
      },
      {
        name: 'query_loki_logs',
        description: '以 LogQL 查詢 Loki 日誌，回傳符合條件的日誌條目。',
        parameterNote: '必填: datasourceUid (string)、logql (string)。可選: startRfc3339、endRfc3339、limit、direction。',
        exampleArgs: {
          datasourceUid: 'loki_uid',
          logql: '{app="frontend"} |= "error"',
          limit: 50,
        },
      },
      {
        name: 'query_loki_stats',
        description: '取得符合特定 LogQL 選擇器的日誌統計資訊。',
        parameterNote: '必填: datasourceUid (string)、logql (string)。可選: startRfc3339、endRfc3339。',
        exampleArgs: {
          datasourceUid: 'loki_uid',
          logql: '{app="frontend", environment="prod"}',
        },
      },
      {
        name: 'find_error_pattern_logs',
        description: '分析 Loki 日誌以找出異常的錯誤模式。',
        parameterNote: '建議提供: datasourceUid (string)、logql (string)、baselineHours (number)。實際欄位依 MCP 工具定義為準。',
        exampleArgs: {
          datasourceUid: 'loki_uid',
          logql: '{app="frontend"} |= "error"',
          baselineHours: 24,
        },
      },
      {
        name: 'find_slow_requests',
        description: '從 Tempo 或相關資料來源找出超過閾值的慢請求。',
        parameterNote: '建議提供: datasourceUid (string)、service (string)、thresholdMs (number)。',
        exampleArgs: {
          datasourceUid: 'tempo_uid',
          service: 'frontend',
          thresholdMs: 500,
        },
      },
      {
        name: 'get_assertions',
        description: '取得 Grafana 斷言摘要，用於了解 SLO/SLA 異常。',
        parameterNote: '建議提供: datasourceUid (string)、entity (string)、timeRange (object)。',
        exampleArgs: {
          datasourceUid: 'assertion_uid',
          entity: 'payments-api',
          timeRange: {
            from: 'now-6h',
            to: 'now',
          },
        },
      },
    ],
  },
  {
    id: 'alerts',
    title: '🚨 告警管理',
    tools: [
      {
        name: 'list_alert_rules',
        description: '列出 Grafana 告警規則與狀態摘要。',
        parameterNote: '可選: folderUid、labelFilters (Record<string,string>)、state、limit、page。',
        exampleArgs: {
          folderUid: 'team-a',
          state: 'ok',
          limit: 50,
        },
      },
      {
        name: 'get_alert_rule_by_uid',
        description: '依 UID 取得告警規則的完整設定。',
        parameterNote: '必填: uid (string)。',
        exampleArgs: {
          uid: 'alert_rule_uid',
        },
      },
      {
        name: 'create_alert_rule',
        description: '建立新的 Grafana 告警規則。',
        parameterNote: '必填: rule (object) 需包含 title、condition、data 等欄位。',
        exampleArgs: {
          rule: {
            title: '高錯誤率告警',
            condition: 'A',
            data: [],
          },
        },
      },
      {
        name: 'update_alert_rule',
        description: '更新既有的 Grafana 告警規則設定。',
        parameterNote: '必填: uid (string)、rule (object)。',
        exampleArgs: {
          uid: 'alert_rule_uid',
          rule: {
            title: '更新後的告警規則',
          },
        },
      },
      {
        name: 'delete_alert_rule',
        description: '刪除指定的 Grafana 告警規則。',
        parameterNote: '必填: uid (string)。',
        exampleArgs: {
          uid: 'alert_rule_uid',
        },
      },
      {
        name: 'list_contact_points',
        description: '列出 Grafana 通知聯絡點摘要。',
        parameterNote: '可選: limit、page、search (string)。',
        exampleArgs: {
          limit: 50,
          search: 'pagerduty',
        },
      },
    ],
  },
  {
    id: 'dashboard',
    title: '📊 儀表板操作',
    tools: [
      {
        name: 'get_dashboard_by_uid',
        description: '取得儀表板完整 JSON 定義。',
        parameterNote: '必填: uid (string)。',
        exampleArgs: {
          uid: 'dashboard_uid',
        },
      },
      {
        name: 'get_dashboard_panel_queries',
        description: '擷取儀表板中每個面板的查詢設定與資料來源。',
        parameterNote: '必填: uid (string)。',
        exampleArgs: {
          uid: 'dashboard_uid',
        },
      },
      {
        name: 'get_dashboard_property',
        description: '透過 JSONPath 取得儀表板的特定屬性內容。',
        parameterNote: '必填: uid (string)、jsonPath (string)。',
        exampleArgs: {
          uid: 'dashboard_uid',
          jsonPath: '$.panels[0]',
        },
      },
      {
        name: 'get_dashboard_summary',
        description: '取得儀表板的摘要資訊，如標籤與更新時間。',
        parameterNote: '必填: uid (string)。',
        exampleArgs: {
          uid: 'dashboard_uid',
        },
      },
      {
        name: 'update_dashboard',
        description: '以完整 JSON 或 Patch 操作建立或更新儀表板。',
        parameterNote: '可選: dashboard (object)、uid (string)、operations (array)。',
        exampleArgs: {
          uid: 'dashboard_uid',
          dashboard: {
            title: '新的儀表板標題',
            panels: [],
          },
        },
      },
      {
        name: 'generate_deeplink',
        description: '為 Grafana 資源生成深度連結 URL。',
        parameterNote: '必填: resourceType (string)、uid (string)。可選: panelId、queryParams。',
        exampleArgs: {
          resourceType: 'dashboard',
          uid: 'dashboard_uid',
          panelId: 2,
        },
      },
    ],
  },
  {
    id: 'incident',
    title: '🔍 事件與事故管理',
    tools: [
      {
        name: 'list_incidents',
        description: '列出 Grafana Incident 事件，可依狀態或是否為演練篩選。',
        parameterNote: '可選: status ("active"|"resolved")、drill (boolean)、limit (number)。',
        exampleArgs: {
          status: 'active',
          limit: 20,
        },
      },
      {
        name: 'get_incident',
        description: '依 ID 取得事件詳細資訊。',
        parameterNote: '必填: id (string)。',
        exampleArgs: {
          id: 'incident_id',
        },
      },
      {
        name: 'create_incident',
        description: '建立新的事件並指定嚴重程度與聊天室前綴。',
        parameterNote: '必填: title、severity、roomPrefix。可選: labels、status、attachCaption、attachUrl、isDrill。',
        exampleArgs: {
          title: '資料庫延遲升高',
          severity: 'critical',
          roomPrefix: 'db-incident',
          labels: {
            service: 'payments',
          },
        },
      },
      {
        name: 'add_activity_to_incident',
        description: '為既有事件新增時間軸註記。',
        parameterNote: '必填: incidentId、body、eventTime。',
        exampleArgs: {
          incidentId: 'incident_id',
          body: '重啟資料庫節點以緩解壓力。',
          eventTime: new Date().toISOString(),
        },
      },
      {
        name: 'get_sift_analysis',
        description: '取得特定實體的 Sift 分析結果摘要。',
        parameterNote: '必填: entityId (string)。可選: startTime、endTime。',
        exampleArgs: {
          entityId: 'service:payments-api',
          startTime: 'now-24h',
          endTime: 'now',
        },
      },
      {
        name: 'get_sift_investigation',
        description: '取得指定 Sift 調查案例的詳細資訊。',
        parameterNote: '必填: id (string)。',
        exampleArgs: {
          id: 'sift_case_id',
        },
      },
      {
        name: 'list_sift_investigations',
        description: '列出所有 Sift 調查案例，支援分頁與狀態過濾。',
        parameterNote: '可選: status、limit、cursor。',
        exampleArgs: {
          status: 'active',
          limit: 20,
        },
      },
    ],
  },
  {
    id: 'oncall',
    title: '👥 OnCall 值班管理',
    tools: [
      {
        name: 'get_current_oncall_users',
        description: '取得目前正在值班的使用者清單。',
        parameterNote: '可選: teamUid (string)、scheduleUid (string)。',
        exampleArgs: {
          teamUid: 'team_uid',
        },
      },
      {
        name: 'get_oncall_shift',
        description: '查詢特定排班班次的詳細資料。',
        parameterNote: '必填: scheduleUid (string)、shiftId (string)。',
        exampleArgs: {
          scheduleUid: 'schedule_uid',
          shiftId: 'shift_id',
        },
      },
      {
        name: 'list_oncall_schedules',
        description: '列出所有 OnCall 排班表。',
        parameterNote: '可選: teamUid、limit、cursor。',
        exampleArgs: {
          limit: 20,
        },
      },
      {
        name: 'list_oncall_teams',
        description: '列出所有 OnCall 團隊基本資訊。',
        parameterNote: '可選: limit、cursor、query。',
        exampleArgs: {
          query: 'SRE',
        },
      },
      {
        name: 'list_oncall_users',
        description: '列出所有註冊於 OnCall 的使用者。',
        parameterNote: '可選: limit、cursor、teamUid。',
        exampleArgs: {
          limit: 50,
        },
      },
      {
        name: 'get_alert_group',
        description: '依 ID 取得 OnCall 告警群組詳細資料。',
        parameterNote: '必填: id (string)。',
        exampleArgs: {
          id: 'alert_group_id',
        },
      },
      {
        name: 'list_alert_groups',
        description: '列出 OnCall 告警群組並支援多種過濾條件。',
        parameterNote: '可選: teamUid、status、limit、cursor。',
        exampleArgs: {
          status: 'open',
          limit: 25,
        },
      },
    ],
  },
  {
    id: 'infrastructure',
    title: '🏗️ 基礎設施與團隊',
    tools: [
      {
        name: 'list_teams',
        description: '搜尋 Grafana 團隊並回傳摘要。',
        parameterNote: '可選: query (string)、limit、page。',
        exampleArgs: {
          query: 'SRE',
        },
      },
      {
        name: 'list_users_by_org',
        description: '列出組織內的所有使用者。',
        parameterNote: '可選: query (string)、page、limit。',
        exampleArgs: {
          query: 'alice',
          limit: 50,
        },
      },
      {
        name: 'create_folder',
        description: '建立新的 Grafana 資料夾。',
        parameterNote: '必填: title (string)。可選: uid (string)。',
        exampleArgs: {
          title: 'SRE Playbooks',
          uid: 'sre-playbooks',
        },
      },
      {
        name: 'fetch_pyroscope_profile',
        description: '從 Pyroscope 取回指定服務的效能分析檔案。',
        parameterNote: '必填: datasourceUid (string)、profileType (string)、query (string)。可選: startTime、endTime。',
        exampleArgs: {
          datasourceUid: 'pyroscope_uid',
          profileType: 'cpu',
          query: 'service="payments"',
          startTime: 'now-30m',
          endTime: 'now',
        },
      },
      {
        name: 'list_pyroscope_label_names',
        description: '列出 Pyroscope 分析檔案中可用的標籤名稱。',
        parameterNote: '必填: datasourceUid (string)。可選: profileType、query。',
        exampleArgs: {
          datasourceUid: 'pyroscope_uid',
          profileType: 'cpu',
        },
      },
      {
        name: 'list_pyroscope_label_values',
        description: '取得指定標籤在 Pyroscope 分析檔案中的值。',
        parameterNote: '必填: datasourceUid (string)、labelName (string)。可選: profileType、query。',
        exampleArgs: {
          datasourceUid: 'pyroscope_uid',
          labelName: 'service',
        },
      },
      {
        name: 'list_pyroscope_profile_types',
        description: '列出資料來源支援的 Pyroscope 分析檔案類型。',
        parameterNote: '必填: datasourceUid (string)。',
        exampleArgs: {
          datasourceUid: 'pyroscope_uid',
        },
      },
    ],
  },
];

/**
 * 產生下拉式選單可用的工具選項陣列。
 */
export function buildToolSelectOptions(): Array<SelectableValue<string>> {
  const options: Array<SelectableValue<string>> = [];

  for (const category of mcpToolCatalog) {
    for (const tool of category.tools) {
      options.push({
        label: `${tool.name}（${category.title}）`,
        value: tool.name,
        description: tool.description,
      });
    }
  }

  return options;
}

/**
 * 依工具名稱查找對應的定義。
 */
export function findToolByName(name?: string): McpToolDefinition | undefined {
  if (!name) {
    return undefined;
  }

  for (const category of mcpToolCatalog) {
    const match = category.tools.find((tool) => tool.name === name);

    if (match) {
      return match;
    }
  }

  return undefined;
}
