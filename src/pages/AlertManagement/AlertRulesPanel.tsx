import React, { useEffect } from 'react';
import { getBackendSrv } from '@grafana/runtime';
import { Badge, Button, Spinner, Alert, type BadgeColor } from '@grafana/ui';
import { css } from '@emotion/css';
import { SceneObjectBase, type SceneComponentProps, type SceneObjectState } from '@grafana/scenes';

interface RawAlertRule {
  id?: number;
  uid?: string;
  title?: string;
  name?: string;
  state?: string;
  folderTitle?: string;
  ruleGroup?: string;
  updated?: string;
}

interface AlertRuleSummary {
  id: string;
  title: string;
  state: string;
  folder: string;
  updatedText: string;
}

interface AlertRulesPanelState extends SceneObjectState {
  loading: boolean;
  error?: string;
  rules: AlertRuleSummary[];
}

interface AlertRuleEndpoint {
  url: string;
  unwrap?: (response: unknown) => unknown;
}

const ALERT_RULE_ENDPOINTS: AlertRuleEndpoint[] = [
  {
    url: '/api/ruler/grafana/api/v1/rules',
  },
  {
    url: '/api/alertmanager/grafana/config/api/v1/rules',
    unwrap: (response: unknown) => {
      if (!response || typeof response !== 'object') {
        return response;
      }

      const { data } = response as { data?: unknown };
      if (!data || typeof data !== 'object') {
        return response;
      }

      const dataObj = data as { groups?: unknown; ruleGroups?: unknown };

      if (Array.isArray(dataObj.groups)) {
        return dataObj.groups;
      }

      if (Array.isArray(dataObj.ruleGroups)) {
        return dataObj.ruleGroups;
      }

      return data;
    },
  },
  {
    url: '/api/alerting/rules',
  },
];

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

export class AlertRulesPanel extends SceneObjectBase<AlertRulesPanelState> {
  static Component = AlertRulesPanelRenderer;

  private initialized = false;

  constructor(initialState: AlertRulesPanelState) {
    super(initialState);
  }

  ensureLoaded() {
    if (!this.initialized) {
      this.initialized = true;
      void this.loadRules();
    }
  }

  refresh() {
    void this.loadRules();
  }

  private async loadRules() {
    this.setState({ loading: true, error: undefined });

    try {
      const list = await fetchAlertRules();
      const normalized = list.map((item, index) => {
        const id = item.uid ?? String(item.id ?? item.title ?? index);
        const updated = item.updated ? new Date(item.updated) : undefined;
        return {
          id,
          title: item.title ?? item.name ?? '未命名規則',
          state: item.state ?? 'unknown',
          folder: item.folderTitle ?? item.ruleGroup ?? '未分類',
          updatedText: updated ? updated.toLocaleString() : '無更新時間',
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

async function fetchAlertRules(): Promise<RawAlertRule[]> {
  let lastError: unknown;

  for (const endpoint of ALERT_RULE_ENDPOINTS) {
    try {
      const response = await getBackendSrv().get(endpoint.url);
      const payload = endpoint.unwrap ? endpoint.unwrap(response) : response;
      return normalizeRuleResponse(payload);
    } catch (error) {
      lastError = error;
      if (!shouldRetryEndpoint(error)) {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

function shouldRetryEndpoint(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { status?: number };

  if (typeof maybeError.status === 'number') {
    return maybeError.status === 404 || maybeError.status === 405;
  }

  return false;
}

function normalizeRuleResponse(response: unknown): RawAlertRule[] {
  if (!response) {
    return [];
  }

  const ruleSets: RawAlertRule[] = [];
  const visited = new Set<object>();

  const visit = (value: unknown, folderHint?: string) => {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, folderHint);
      }
      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    const objectValue = value as Record<string, unknown> & {
      rules?: RawAlertRule[];
      groups?: unknown;
      folderTitle?: string;
      ruleGroup?: string;
      name?: string;
    };

    if (visited.has(objectValue)) {
      return;
    }

    visited.add(objectValue);

    const folderNameCandidate =
      (typeof objectValue.folderTitle === 'string' && objectValue.folderTitle) ||
      (typeof objectValue.ruleGroup === 'string' && objectValue.ruleGroup) ||
      (typeof objectValue.name === 'string' && objectValue.name) ||
      folderHint;

    const isRuleCandidate =
      !Array.isArray(objectValue.rules) &&
      (Object.prototype.hasOwnProperty.call(objectValue, 'state') ||
        Object.prototype.hasOwnProperty.call(objectValue, 'title') ||
        Object.prototype.hasOwnProperty.call(objectValue, 'name'));

    if (isRuleCandidate) {
      const ruleObject = objectValue as RawAlertRule;
      ruleSets.push({
        ...ruleObject,
        folderTitle: ruleObject.folderTitle ?? folderNameCandidate ?? ruleObject.ruleGroup,
      });
    }

    if (Array.isArray(objectValue.rules)) {
      for (const rule of objectValue.rules) {
        ruleSets.push({
          ...rule,
          folderTitle:
            rule.folderTitle ??
            folderNameCandidate ??
            rule.ruleGroup ??
            objectValue.folderTitle ??
            objectValue.ruleGroup,
        });
      }
    }

    if (objectValue.groups) {
      visit(objectValue.groups, folderNameCandidate);
    }

    for (const [key, nested] of Object.entries(objectValue)) {
      if (key === 'rules' || key === 'groups' || nested == null) {
        continue;
      }

      const nextHint =
        typeof nested === 'object' || Array.isArray(nested)
          ? typeof key === 'string' && key !== 'status' && key !== 'data'
            ? key
            : folderNameCandidate
          : folderNameCandidate;

      visit(nested, nextHint);
    }
  };

  visit(response);

  return ruleSets;
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

  return '無法取得告警規則資料，請稍後再試。';
}

function AlertRulesPanelRenderer({ model }: SceneComponentProps<AlertRulesPanel>) {
  const state = model.useState();

  useEffect(() => {
    model.ensureLoaded();
  }, [model]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Button icon="sync" onClick={() => model.refresh()} disabled={state.loading}>
          重新整理
        </Button>
        {state.loading && <Spinner inline={true} size={16} />} 
      </div>
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
              <th>資料夾 / 群組</th>
              <th>最近更新</th>
            </tr>
          </thead>
          <tbody>
            {state.rules.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.title}</td>
                <td>
                  <Badge text={rule.state.toUpperCase()} color={badgeColor(rule.state)} />
                </td>
                <td>{rule.folder}</td>
                <td>{rule.updatedText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function badgeColor(state: string): BadgeColor {
  switch (state.toLowerCase()) {
    case 'ok':
      return 'green';
    case 'pending':
      return 'blue';
    case 'firing':
      return 'red';
    default:
      return 'darkgrey';
  }
}
