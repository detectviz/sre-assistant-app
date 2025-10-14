import React, { useEffect } from 'react';
import { getBackendSrv } from '@grafana/runtime';
import { Badge, Button, Spinner, Alert } from '@grafana/ui';
import type { BadgeColor } from '@grafana/ui';
import { css } from '@emotion/css';
import type { SceneComponentProps, SceneObjectState } from '@grafana/scenes';
import { SceneObjectBase } from '@grafana/scenes';

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
      const response = await getBackendSrv().get('/api/ruler/grafana/api/v1/rules');
      const list = normalizeRuleResponse(response);

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

function normalizeRuleResponse(response: unknown): RawAlertRule[] {
  if (!response) {
    return [];
  }

  const ruleSets: RawAlertRule[] = [];

  const collectFromGroup = (group: unknown, folderHint?: string) => {
    if (!group || typeof group !== 'object') {
      return;
    }

    const groupObj = group as { rules?: RawAlertRule[]; name?: string };
    const folderName = groupObj.name ?? folderHint;

    if (!Array.isArray(groupObj.rules)) {
      return;
    }

    for (const rule of groupObj.rules) {
      ruleSets.push({
        ...rule,
        folderTitle: rule.folderTitle ?? folderName ?? rule.ruleGroup,
      });
    }
  };

  if (Array.isArray(response)) {
    for (const entry of response) {
      collectFromGroup(entry);
    }
    return ruleSets;
  }

  if (typeof response !== 'object') {
    return [];
  }

  for (const [folder, value] of Object.entries(response as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const group of value) {
        collectFromGroup(group, folder);
      }
      continue;
    }

    collectFromGroup(value, folder);
  }

  return ruleSets;
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeError = error as { statusText?: string; message?: string; data?: { message?: string } };
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
