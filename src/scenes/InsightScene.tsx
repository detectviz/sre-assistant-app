import React from 'react';
import {
  EmbeddedScene,
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
import { Alert, Button, InlineField, InlineFieldRow, Select, Spinner, TextArea } from '@grafana/ui';
import type { SelectableValue } from '@grafana/data';
import type { InsightAnalyzeResult } from '../api/insight.api';
import { analyzeInsight } from '../api/insight.api';
import { normaliseTimeRange } from '../utils/timeRange';
import { useDataSourceOptions } from '../utils/datasource';

interface InsightAnalyzerState extends SceneObjectState {
  loading: boolean;
  query: string;
  logQuery: string;
  result?: InsightAnalyzeResult;
  error?: string;
  metricsDatasource?: string;
  logsDatasource?: string;
}

/**
 * @section 7.2 Insight Page
 * 依據架構描述，本 Scene 封裝使用者互動、Resource API 呼叫與結果呈現的流程。
 */
class InsightAnalyzer extends SceneObjectBase<InsightAnalyzerState> {
  static Component = InsightAnalyzerView;

  constructor(private readonly timeRange: SceneTimeRange) {
    super({
      loading: false,
      query: 'sum(rate(node_cpu_seconds_total{mode="idle"}[5m]))',
      logQuery: '{app="grafana"}',
    });
  }

  private normaliseRange() {
    return normaliseTimeRange(this.timeRange.state.value);
  }

  /**
   * 執行 `/resources/insight/analyze` 呼叫並更新狀態，實踐第 4.2 節的資料互動流程。
   */
  async runAnalysis() {
    const range = this.normaliseRange();
    this.setState({ loading: true, error: undefined });

    try {
      const { metricsDatasource, logsDatasource, query, logQuery } = this.state;
      if (!metricsDatasource) {
        throw new Error('請先選擇 Prometheus 資料來源');
      }
      if (!logsDatasource) {
        throw new Error('請先選擇 Loki 資料來源');
      }
      if (!query.trim()) {
        throw new Error('請輸入有效的指標查詢');
      }
      if (!logQuery.trim()) {
        throw new Error('請輸入有效的日誌查詢');
      }

      const result = await analyzeInsight({
        metricsDatasource,
        logsDatasource,
        metricQuery: query,
        logQuery,
        timeRange: range,
      });
      this.setState({ result, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      this.setState({ error: message, loading: false });
    }
  }

  updateQuery(query: string) {
    this.setState({ query });
  }

  updateLogQuery(logQuery: string) {
    this.setState({ logQuery });
  }

  updateMetricsDatasource(uid?: string) {
    this.setState({ metricsDatasource: uid });
  }

  updateLogsDatasource(uid?: string) {
    this.setState({ logsDatasource: uid });
  }
}

function InsightAnalyzerView({ model }: SceneComponentProps<InsightAnalyzer>) {
  const state = model.useState();
  const { options: promOptions, loading: loadingProm, error: promError } = useDataSourceOptions(['prometheus']);
  const { options: lokiOptions, loading: loadingLoki, error: lokiError } = useDataSourceOptions(['loki']);

  const currentProm = promOptions.find((option) => option.value === state.metricsDatasource);
  const currentLoki = lokiOptions.find((option) => option.value === state.logsDatasource);

  React.useEffect(() => {
    const defaultProm = promOptions[0]?.value;
    if (!state.metricsDatasource && defaultProm) {
      model.updateMetricsDatasource(defaultProm);
    }
  }, [state.metricsDatasource, promOptions, model]);

  React.useEffect(() => {
    const defaultLoki = lokiOptions[0]?.value;
    if (!state.logsDatasource && defaultLoki) {
      model.updateLogsDatasource(defaultLoki);
    }
  }, [state.logsDatasource, lokiOptions, model]);

  const handleMetricChange = (option: SelectableValue<string> | null) => {
    model.updateMetricsDatasource(option?.value);
  };

  const handleLogChange = (option: SelectableValue<string> | null) => {
    model.updateLogsDatasource(option?.value);
  };

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <InlineFieldRow>
        <InlineField label="Prometheus" grow>
          <Select
            menuShouldPortal
            options={promOptions}
            value={currentProm}
            isLoading={loadingProm}
            placeholder="選擇 Prometheus 資料源"
            onChange={handleMetricChange}
          />
        </InlineField>
        <InlineField label="Loki" grow>
          <Select
            menuShouldPortal
            options={lokiOptions}
            value={currentLoki}
            isLoading={loadingLoki}
            placeholder="選擇 Loki 資料源"
            onChange={handleLogChange}
          />
        </InlineField>
      </InlineFieldRow>
      {(promError || lokiError) && (
        <Alert severity="error" title="資料來源載入失敗">
          {[promError, lokiError].filter(Boolean).join(' / ')}
        </Alert>
      )}
      <TextArea
        rows={4}
        value={state.query}
        onChange={(evt) => model.updateQuery(evt.currentTarget.value)}
        placeholder="輸入 PromQL 指標查詢"
      />
      <TextArea
        rows={3}
        value={state.logQuery}
        onChange={(evt) => model.updateLogQuery(evt.currentTarget.value)}
        placeholder="輸入 LogQL 日誌查詢"
      />
      <Button variant="primary" onClick={() => model.runAnalysis()} disabled={state.loading}>
        {state.loading ? '分析中…' : '執行分析'}
      </Button>
      {state.loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Spinner inline={true} />
          <span>正在收集 MCP 資料與 AI 分析...</span>
        </div>
      )}
      {state.error && (
        <Alert severity="error" title="分析失敗">
          {state.error}
        </Alert>
      )}
      {state.result && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <Alert severity="info" title="AI 分析摘要 (AI 輔助)">
            {state.result.aiSummary}
          </Alert>
          <details>
            <summary>指標資料</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(state.result.metrics, null, 2)}</pre>
          </details>
          <details>
            <summary>相關日誌</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(state.result.logs, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

export function buildInsightScene() {
  const timeRange = new SceneTimeRange({ from: 'now-1h', to: 'now' });
  const analyzer = new InsightAnalyzer(timeRange);

  return new EmbeddedScene({
    $timeRange: timeRange,
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          minHeight: 400,
          body: analyzer,
        }),
      ],
    }),
    controls: [
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneControlsSpacer(),
      new SceneRefreshPicker({ intervals: ['30s', '1m', '5m'], isOnCanvas: true }),
    ],
  });
}
