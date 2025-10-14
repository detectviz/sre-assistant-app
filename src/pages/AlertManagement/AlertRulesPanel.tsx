import React, { useEffect } from 'react';
import { Badge, Button, Spinner, Alert, type BadgeColor } from '@grafana/ui';
import { css } from '@emotion/css';
import { SceneObjectBase, type SceneComponentProps, type SceneObjectState } from '@grafana/scenes';
import { mcp } from '@grafana/llm';
import type { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index';

interface RawAlertRule {
  id?: number;
  uid?: string;
  title?: string;
  name?: string;
  state?: string;
  folderTitle?: string;
  folderUID?: string;
  ruleGroup?: string;
  updated?: string;
  health?: string;
  labels?: Record<string, string>;
  for?: string;
}

interface AlertRuleSummary {
  id: string;
  title: string;
  state: string;
  health: string;
  location: string;
  durationText: string;
  updatedText: string;
  labels: Record<string, string>;
}

interface AlertRulesPanelState extends SceneObjectState {
  loading: boolean;
  error?: string;
  rules: AlertRuleSummary[];
  connectionMessage?: string;
  connectionSeverity?: 'info' | 'success' | 'warning' | 'error';
}

const tableStyles = css`
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;

  thead {
    background: var(--input-bg, #f5f6f9);
  }

  th,
  td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border-weak, #d8d9dd);
  }
`;

const labelListStyles = css`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const labelPillStyles = css`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--background-secondary, #f2f3f5);
  font-family: var(--font-family-monospace);
  font-size: 12px;
`;

export class AlertRulesPanel extends SceneObjectBase<AlertRulesPanelState> {
  static Component = AlertRulesPanelRenderer;

  private initialized = false;
  private mcpClient: MCPClient | null = null;
  private mcpEnabled = false;

  constructor(initialState: AlertRulesPanelState) {
    super(initialState);
  }

  ensureLoaded() {
    if (this.initialized) {
      return;
    }

    if (!this.mcpEnabled || !this.mcpClient) {
      return;
    }

    this.initialized = true;
    void this.loadRules();
  }

  refresh() {
    if (!this.mcpEnabled) {
      this.setState({
        loading: false,
        error: undefined,
        rules: [],
        connectionMessage: 'Grafana MCP 尚未啟用，無法取得告警規則。請於 Grafana LLM App 中啟用 MCP 伺服器後再試。',
        connectionSeverity: 'warning',
      });
      return;
    }

    if (!this.mcpClient) {
      this.setState({
        connectionMessage: 'Grafana MCP 連線建立中，請稍候再重新整理。',
        connectionSeverity: 'info',
      });
      return;
    }

    void this.loadRules();
  }

  setMCPContext(context: { client: MCPClient | null; enabled: boolean; error?: Error }) {
    this.mcpEnabled = context.enabled;
    this.mcpClient = context.client;

    if (!context.enabled) {
      this.initialized = false;
      this.setState({
        loading: false,
        rules: [],
        connectionMessage: 'Grafana MCP 尚未啟用，無法取得告警規則。請先在 Grafana LLM App 設定中啟用 MCP 伺服器。',
        connectionSeverity: 'warning',
      });
      return;
    }

    if (context.error) {
      this.initialized = false;
      this.setState({
        loading: false,
        rules: [],
        error: undefined,
        connectionMessage: `無法建立 Grafana MCP 連線：${context.error.message}`,
        connectionSeverity: 'error',
      });
      return;
    }

    if (!context.client) {
      this.setState({
        connectionMessage: 'Grafana MCP 連線建立中，初始化完成後將自動載入告警資料。',
        connectionSeverity: 'info',
      });
      return;
    }

    this.setState({
      connectionMessage: undefined,
      connectionSeverity: undefined,
    });

    if (!this.initialized) {
      this.ensureLoaded();
    }
  }

  private async loadRules() {
    if (!this.mcpEnabled || !this.mcpClient) {
      return;
    }

    this.setState({ loading: true, error: undefined });

    try {
      const list = await fetchAlertRules(this.mcpClient);
      const normalized = list.map((item, index) => {
        const id = item.uid ?? String(item.id ?? item.title ?? index);
        const updated =
          item.updated && !Number.isNaN(Date.parse(item.updated)) ? new Date(item.updated) : undefined;
        const location = item.folderTitle ?? item.ruleGroup ?? item.folderUID ?? '未分類';
        const durationText = item.for && item.for.trim() !== '' ? item.for : '未設定';

        return {
          id,
          title: item.title ?? item.name ?? '未命名規則',
          state: item.state ?? 'unknown',
          health: item.health ?? 'unknown',
          location,
          durationText,
          updatedText: updated ? updated.toLocaleString() : '無評估時間',
          labels: item.labels ?? {},
        } satisfies AlertRuleSummary;
      });

      this.setState({
        loading: false,
        error: undefined,
        rules: normalized,
      });
    } catch (err) {
      const message = extractErrorMessage(err);
      this.setState({
        loading: false,
        error: message,
        rules: [],
      });
    }
  }
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeError = error as {
      status?: number;
      statusText?: string;
      message?: string;
      data?: { message?: string };
    };

    if (maybeError.status === 404) {
      return 'Grafana Alerting API 尚未啟用或使用者權限不足，請確認設定後再試。';
    }

    return (
      maybeError.data?.message ??
      maybeError.message ??
      maybeError.statusText ??
      '無法取得告警規則資料，請稍後再試。'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '無法取得告警規則資料，請稍後再試。';
}

function AlertRulesPanelRenderer({ model }: SceneComponentProps<AlertRulesPanel>) {
  const state = model.useState();
  const { client, enabled, error: mcpError } = mcp.useMCPClient();

  useEffect(() => {
    model.setMCPContext({ client, enabled, error: mcpError ?? undefined });
  }, [client, enabled, mcpError, model]);

  useEffect(() => {
    model.ensureLoaded();
  }, [model, client, enabled]);

  const refreshDisabled = state.loading || !enabled || !client;

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Button icon="sync" onClick={() => model.refresh()} disabled={refreshDisabled}>
          重新整理
        </Button>
        {state.loading && <Spinner inline={true} size={16} />}
      </div>
      {state.connectionMessage && (
        <Alert title="MCP 連線狀態" severity={state.connectionSeverity ?? 'info'} style={{ marginTop: '12px' }}>
          {state.connectionMessage}
        </Alert>
      )}
      {state.error && (
        <Alert title="讀取失敗" severity="error" style={{ marginTop: '12px' }}>
          {state.error}
        </Alert>
      )}
      {!state.loading && !state.error && state.rules.length === 0 && (
        <Alert title="目前沒有可用的告警規則" severity="info" style={{ marginTop: '12px' }}>
          建議檢查 Alerting 設定或切換組織。
        </Alert>
      )}
      {state.rules.length > 0 && (
        <table className={tableStyles}>
          <thead>
            <tr>
              <th>名稱</th>
              <th>狀態</th>
              <th>健康度</th>
              <th>資料夾 / 群組</th>
              <th>持續時間</th>
              <th>最近評估</th>
              <th>主要標籤</th>
            </tr>
          </thead>
          <tbody>
            {state.rules.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.title}</td>
                <td>
                  <Badge text={rule.state.toUpperCase()} color={stateBadgeColor(rule.state)} />
                </td>
                <td>
                  <Badge text={rule.health.toUpperCase()} color={healthBadgeColor(rule.health)} />
                </td>
                <td>{rule.location}</td>
                <td>{rule.durationText}</td>
                <td>{rule.updatedText}</td>
                <td>
                  <LabelList labels={rule.labels} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function stateBadgeColor(state: string): BadgeColor {
  switch (state.toLowerCase()) {
    case 'ok':
      return 'green';
    case 'pending':
      return 'blue';
    case 'firing':
      return 'red';
    case 'inactive':
      return 'green';
    case 'recovering':
      return 'orange';
    default:
      return 'darkgrey';
  }
}

function healthBadgeColor(health: string): BadgeColor {
  switch (health.toLowerCase()) {
    case 'ok':
      return 'green';
    case 'error':
      return 'red';
    case 'warning':
      return 'orange';
    case 'no_data':
      return 'darkgrey';
    default:
      return 'blue';
  }
}

function LabelList({ labels }: { labels: Record<string, string> }) {
  const entries = Object.entries(labels);

  if (entries.length === 0) {
    return <span>無</span>;
  }

  return (
    <div className={labelListStyles}>
      {entries.map(([key, value]) => (
        <span key={`${key}:${value}`} className={labelPillStyles}>
          {`${key}=${value}`}
        </span>
      ))}
    </div>
  );
}

async function fetchAlertRules(client: MCPClient): Promise<RawAlertRule[]> {
  const result = await client.callTool({
    name: 'list_alert_rules',
    arguments: {},
  });

  const textPayload = extractTextPayload(result?.content);

  if (!textPayload) {
    return [];
  }

  const parsed = safeParseJSON(textPayload);

  if (!Array.isArray(parsed)) {
    throw new Error('MCP 回傳格式不符合預期，請確認 Grafana MCP 伺服器版本。');
  }

  return parsed.map((item) => normalizeMCPAlertRule(item));
}

function extractTextPayload(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((entry) => {
      if (entry && typeof entry === 'object' && 'type' in entry && (entry as { type?: unknown }).type === 'text') {
        const textValue = (entry as { text?: unknown }).text;
        return typeof textValue === 'string' ? textValue : '';
      }
      return '';
    })
    .join('')
    .trim();
}

function safeParseJSON(payload: string): unknown {
  if (!payload) {
    return [];
  }

  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new Error('無法解析 MCP 回傳的告警資料，請稍後再試。');
  }
}

function normalizeMCPAlertRule(value: unknown): RawAlertRule {
  if (!value || typeof value !== 'object') {
    throw new Error('MCP 告警資料缺少必要欄位，請確認權限與 Grafana 版本。');
  }

  const candidate = value as Partial<RawAlertRule> & {
    uid?: string;
    title?: string;
    state?: string;
    health?: string;
    folderUID?: string;
    ruleGroup?: string;
    for?: string;
    lastEvaluation?: string;
    labels?: Record<string, string>;
  };

  return {
    uid: candidate.uid,
    title: candidate.title,
    state: candidate.state,
    health: candidate.health,
    folderTitle: candidate.folderUID,
    folderUID: candidate.folderUID,
    ruleGroup: candidate.ruleGroup,
    updated: candidate.lastEvaluation,
    labels: candidate.labels,
    for: candidate.for,
  };
}
