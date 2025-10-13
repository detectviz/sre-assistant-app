import React from 'react';
import {
  EmbeddedScene,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { Alert, Badge, Button, Field, Input, Spinner, Stack, TextArea } from '@grafana/ui';
import { analyzeInsight } from '../api/insight.api';
import { AIAssistant } from '../ai/aiAssistant';
import { InsightAnalyzeRequest, InsightAnalyzeResponse } from '../types/insight';

interface InsightSceneState extends SceneObjectState {
  request: InsightAnalyzeRequest;
  loading: boolean;
  response?: InsightAnalyzeResponse;
  aiSummary?: string;
  error?: string;
}

/**
 * @description 對應 architecture.md 第 4 與 6 章，建立 AI 驅動的洞察 Scene。
 */
class InsightSceneModel extends SceneObjectBase<InsightSceneState> {
  private readonly assistant = new AIAssistant();

  constructor() {
    super({
      loading: false,
      request: {
        service: 'orders-api',
        environment: 'production',
        range: {
          from: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        },
        metricQuery: 'sum(rate(http_requests_total{status="500"}[5m]))',
        logQuery: '{app="orders-api"} |= "error"',
      },
    });
  }

  updateRequest(patch: Partial<InsightAnalyzeRequest>) {
    this.setState({
      request: {
        ...this.state.request,
        ...patch,
        range: patch.range ?? this.state.request.range,
      },
    });
  }

  async runAnalysis() {
    const { request } = this.state;
    this.setState({ loading: true, error: undefined });
    try {
      const response = await analyzeInsight(request);
      let aiSummary: string | undefined;
      try {
        aiSummary = await this.assistant.summarizeInsight(request, response);
      } catch (aiError) {
        // 依據 architecture.md 第 2 章可靠性設計，若 LLM 摘要失敗仍回傳 MCP 數據並提示降級訊息。
        console.warn('summarizeInsight failed', aiError);
        aiSummary = 'AI 摘要暫時不可用，請檢查 LLM 設定。';
      }
      this.setState({ loading: false, response, aiSummary });
    } catch (err) {
      this.setState({
        loading: false,
        error: err instanceof Error ? err.message : '分析失敗',
      });
    }
  }

  static Component = ({ model }: SceneComponentProps<InsightSceneModel>) => {
    const state = model.useState();
    const { request, loading, response, error, aiSummary } = state;

    const children: React.ReactNode[] = [
      React.createElement(Field, {
        label: '服務名稱',
        children: React.createElement(Input, {
          value: request.service,
          onChange: (event) => model.updateRequest({ service: event.currentTarget.value }),
        }),
      }),
      React.createElement(Field, {
        label: '環境',
        children: React.createElement(Input, {
          value: request.environment,
          onChange: (event) => model.updateRequest({ environment: event.currentTarget.value }),
        }),
      }),
      React.createElement(Field, {
        label: 'Metrics 查詢 (PromQL)',
        children: React.createElement(TextArea, {
          value: request.metricQuery ?? '',
          rows: 3,
          onChange: (event) => model.updateRequest({ metricQuery: event.currentTarget.value }),
        }),
      }),
      React.createElement(Field, {
        label: 'Logs 查詢 (LogQL)',
        children: React.createElement(TextArea, {
          value: request.logQuery ?? '',
          rows: 3,
          onChange: (event) => model.updateRequest({ logQuery: event.currentTarget.value }),
        }),
      }),
      React.createElement(
        Button,
        {
          variant: 'primary',
          onClick: () => model.runAnalysis(),
          disabled: loading,
          children: loading ? 'AI 分析中...' : '開始分析',
        },
        null
      ),
    ];

    if (loading) {
      children.push(
        React.createElement(
          Stack,
          { direction: 'row', gap: 1, alignItems: 'center' },
          React.createElement(Spinner, { inline: true }),
          '正在整合 MCP 與 LLM 結果...'
        )
      );
    }

    if (error) {
      children.push(
        React.createElement(
          Alert,
          { severity: 'error', title: '分析失敗' },
          error
        )
      );
    }

    if (response) {
      const badges = React.createElement(
        Stack,
        { direction: 'row', gap: 1 },
        React.createElement(Badge, {
          text: `Metrics ${response.metrics.length}`,
          color: 'blue',
        }),
        React.createElement(Badge, {
          text: `Logs ${response.logs.length}`,
          color: 'orange',
        }),
        React.createElement(Badge, {
          text: `Alerts ${response.alerts.length}`,
          color: 'red',
        })
      );

      children.push(
        React.createElement(
          Stack,
          { direction: 'column', gap: 1 },
          badges,
          React.createElement(
            Alert,
            { severity: 'info', title: 'AI 洞察' },
            aiSummary ?? 'AI 尚未提供建議'
          )
        )
      );
    }

    return React.createElement(Stack, { direction: 'column', gap: 2 }, ...children);
  };
}

export const createInsightScene = () => {
  const sceneModel = new InsightSceneModel();
  return new EmbeddedScene({
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          height: 600,
          body: sceneModel,
        }),
      ],
    }),
  });
};
