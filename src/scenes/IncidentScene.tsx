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
import { Alert, Button, InlineField, InlineFieldRow, Input, Select, Spinner, TextArea } from '@grafana/ui';
import type { SelectableValue } from '@grafana/data';
import { aiAssistant } from '../ai/aiAssistant';
import { evaluateIncident, type IncidentEvalResult } from '../api/incident.api';
import { normaliseTimeRange } from '../utils/timeRange';
import { useDataSourceOptions } from '../utils/datasource';

interface IncidentEvaluatorState extends SceneObjectState {
  loading: boolean;
  incidentId: string;
  metricQuery: string;
  logQuery: string;
  result?: IncidentEvalResult;
  aiAdvice?: string;
  error?: string;
  metricsDatasource?: string;
  logsDatasource?: string;
}

/**
 * @section 7.3 Incident Page
 * 依據架構規格，本 Scene 將告警評估流程與 AI 建議整合，供值班人員快速決策。
 */
class IncidentEvaluator extends SceneObjectBase<IncidentEvaluatorState> {
  static Component = IncidentEvaluatorView;

  constructor(private readonly timeRange: SceneTimeRange) {
    super({
      loading: false,
      incidentId: 'INC-001',
      metricQuery: 'sum(rate(node_cpu_seconds_total{mode="system"}[5m]))',
      logQuery: '{app="grafana"}',
    });
  }

  private normaliseRange() {
    return normaliseTimeRange(this.timeRange.state.value);
  }

  async runEvaluation() {
    const range = this.normaliseRange();
    this.setState({ loading: true, error: undefined });

    try {
      const { metricsDatasource, logsDatasource, metricQuery, logQuery, incidentId } = this.state;
      if (!metricsDatasource) {
        throw new Error('請先選擇 Prometheus 資料來源');
      }
      if (!logsDatasource) {
        throw new Error('請先選擇 Loki 資料來源');
      }
      if (!metricQuery.trim()) {
        throw new Error('請輸入有效的指標查詢');
      }
      if (!logQuery.trim()) {
        throw new Error('請輸入有效的日誌查詢');
      }

      const payload = {
        incidentId,
        metricsDatasource,
        logsDatasource,
        metricQuery,
        logQuery,
        alertWindow: range,
      };

      const result = await evaluateIncident(payload);
      const insightContext = await aiAssistant.generateInsightAnalysis({
        metricsDatasource: payload.metricsDatasource,
        metricQuery: payload.metricQuery,
        logsDatasource: payload.logsDatasource,
        logQuery: payload.logQuery,
        timeRange: payload.alertWindow,
      });
      const aiAdvice = await aiAssistant.recommendIncidentActions({
        incident: result,
        metrics: insightContext.metrics,
        logs: insightContext.logs,
      });

      this.setState({ result, aiAdvice, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      this.setState({ error: message, loading: false });
    }
  }

  updateIncidentId(incidentId: string) {
    this.setState({ incidentId });
  }

  updateMetricQuery(metricQuery: string) {
    this.setState({ metricQuery });
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

function IncidentEvaluatorView({ model }: SceneComponentProps<IncidentEvaluator>) {
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
      <Input
        label="事件編號"
        value={state.incidentId}
        onChange={(evt) => model.updateIncidentId(evt.currentTarget.value)}
      />
      <TextArea
        rows={3}
        value={state.metricQuery}
        onChange={(evt) => model.updateMetricQuery(evt.currentTarget.value)}
        placeholder="輸入指標評估查詢"
      />
      <TextArea
        rows={3}
        value={state.logQuery}
        onChange={(evt) => model.updateLogQuery(evt.currentTarget.value)}
        placeholder="輸入日誌查詢"
      />
      <Button variant="primary" onClick={() => model.runEvaluation()} disabled={state.loading}>
        {state.loading ? '評估中…' : '執行告警評估'}
      </Button>
      {state.loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Spinner inline={true} />
          <span>正在整合 MCP 資料與 AI 建議...</span>
        </div>
      )}
      {state.error && (
        <Alert severity="error" title="評估失敗">
          {state.error}
        </Alert>
      )}
      {state.result && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <Alert severity="success" title={`規則狀態：${state.result.status}`}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{state.result.recommendations}</div>
          </Alert>
          {state.aiAdvice && (
            <Alert severity="info" title="AI Incident 建議 (AI 輔助)">
              <div style={{ whiteSpace: 'pre-wrap' }}>{state.aiAdvice}</div>
            </Alert>
          )}
          <details>
            <summary>驗證細節</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(state.result.validation, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

export function buildIncidentScene() {
  const timeRange = new SceneTimeRange({ from: 'now-30m', to: 'now' });
  const evaluator = new IncidentEvaluator(timeRange);

  return new EmbeddedScene({
    $timeRange: timeRange,
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          minHeight: 400,
          body: evaluator,
        }),
      ],
    }),
    controls: [
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneControlsSpacer(),
      new SceneRefreshPicker({ intervals: ['1m', '5m', '15m'], isOnCanvas: true }),
    ],
  });
}
