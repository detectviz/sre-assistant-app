import React from 'react';
import {
  EmbeddedScene,
  SceneAppPage,
  SceneComponentProps,
  SceneControlsSpacer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
} from '@grafana/scenes';
import { Alert, Button, InlineField, InlineFieldRow, Select, Spinner } from '@grafana/ui';
import type { SelectableValue } from '@grafana/data';
import { aiAssistant } from '../ai/aiAssistant';
import { mcpClient } from '../ai/mcpClient';
import { normaliseTimeRange } from '../utils/timeRange';
import { useDataSourceOptions } from '../utils/datasource';

interface OverviewState extends SceneObjectState {
  loading: boolean;
  metrics?: unknown;
  alerts?: unknown;
  summary?: string;
  error?: string;
  metricDatasource?: string;
}

/**
 * @section 7.1 Overview Page
 * 依據架構規劃，本 Page 彙整 MCP 指標與告警資料並透過 LLM 產出摘要。
 */
class OverviewSummary extends SceneObjectBase<OverviewState> {
  static Component = OverviewSummaryView;

  constructor(private readonly timeRange: SceneTimeRange) {
    super({ loading: false });
  }

  private normaliseRange() {
    return normaliseTimeRange(this.timeRange.state.value);
  }

  async refresh() {
    this.setState({ loading: true, error: undefined });
    const range = this.normaliseRange();
    const { metricDatasource } = this.state;

    if (!metricDatasource) {
      this.setState({ loading: false, error: '請先選擇 Prometheus 資料來源' });
      return;
    }

    try {
      const [metrics, alerts] = await Promise.all([
        mcpClient.queryMetrics({ datasource: metricDatasource, query: 'sum(rate(node_cpu_seconds_total[5m]))', range }),
        mcpClient.listAlerts({ datasource: metricDatasource, range }),
      ]);
      const summary = await aiAssistant.summarizeOverview({ metrics, alerts });
      this.setState({ metrics, alerts, summary, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      this.setState({ error: message, loading: false });
    }
  }

  updateMetricDatasource(uid?: string) {
    this.setState({ metricDatasource: uid });
  }
}

function OverviewSummaryView({ model }: SceneComponentProps<OverviewSummary>) {
  const state = model.useState();
  const hasMetrics = state.metrics !== undefined && state.metrics !== null;
  const hasAlerts = state.alerts !== undefined && state.alerts !== null;
  const { options: promOptions, loading: loadingProm, error: promError } = useDataSourceOptions(['prometheus']);

  const currentProm = promOptions.find((option) => option.value === state.metricDatasource);

  React.useEffect(() => {
    const defaultValue = promOptions[0]?.value;
    if (!state.metricDatasource && defaultValue) {
      model.updateMetricDatasource(defaultValue);
    }
  }, [state.metricDatasource, promOptions, model]);

  const handleSelect = (option: SelectableValue<string> | null) => {
    model.updateMetricDatasource(option?.value);
  };

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <InlineFieldRow>
        <InlineField label="Prometheus 資料源" grow>
          <Select
            menuShouldPortal
            isLoading={loadingProm}
            options={promOptions}
            value={currentProm}
            placeholder="選擇 Prometheus"
            onChange={handleSelect}
          />
        </InlineField>
      </InlineFieldRow>
      {promError && (
        <Alert severity="error" title="資料來源載入失敗">
          {promError}
        </Alert>
      )}
      <Button variant="secondary" onClick={() => model.refresh()} disabled={state.loading}>
        {state.loading ? '更新中…' : '重新整理總覽'}
      </Button>
      {state.loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Spinner inline={true} />
          <span>正在擷取 MCP 資料...</span>
        </div>
      )}
      {state.error && (
        <Alert severity="error" title="載入失敗">
          {state.error}
        </Alert>
      )}
      {state.summary && (
        <Alert severity="info" title="可靠性摘要 (AI 輔助)">
          <div style={{ whiteSpace: 'pre-wrap' }}>{state.summary}</div>
        </Alert>
      )}
      {hasMetrics && (
        <details>
          <summary>指標原始資料</summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(state.metrics, null, 2)}</pre>
        </details>
      )}
      {hasAlerts && (
        <details>
          <summary>告警列表</summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(state.alerts, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

export const overviewPage = new SceneAppPage({
  title: 'SRE Overview',
  url: 'overview',
  getScene: () => createOverviewScene(),
  routePath: 'overview',
  subTitle: '依據 MCP 與 LLM 數據提供即時可靠性摘要。',
});

function createOverviewScene() {
  const timeRange = new SceneTimeRange({ from: 'now-6h', to: 'now' });
  const overviewSummary = new OverviewSummary(timeRange);

  return new EmbeddedScene({
    $timeRange: timeRange,
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          minHeight: 400,
          body: overviewSummary,
        }),
      ],
    }),
    controls: [
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneControlsSpacer(),
      new SceneRefreshPicker({ intervals: ['5m', '15m', '1h'], isOnCanvas: true }),
    ],
  });
}
