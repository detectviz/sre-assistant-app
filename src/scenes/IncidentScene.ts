import React from 'react';
import {
  EmbeddedScene,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { Alert, Badge, Button, Field, Input, Spinner, Stack } from '@grafana/ui';
import { evaluateIncident } from '../api/incident.api';
import { AIAssistant } from '../ai/aiAssistant';
import { IncidentEvalRequest, IncidentEvalResponse } from '../types/incident';

interface IncidentSceneState extends SceneObjectState {
  request: IncidentEvalRequest;
  loading: boolean;
  response?: IncidentEvalResponse;
  aiSummary?: string;
  error?: string;
}

/**
 * @description 對應 architecture.md 第 4 與 6 章，建立事件指揮 Scene。
 */
class IncidentSceneModel extends SceneObjectBase<IncidentSceneState> {
  private readonly assistant = new AIAssistant();

  constructor() {
    super({
      loading: false,
      request: {
        alertUid: 'alert-rule-1',
        service: 'orders-api',
        environment: 'production',
        range: {
          from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        },
      },
    });
  }

  updateRequest(patch: Partial<IncidentEvalRequest>) {
    this.setState({
      request: {
        ...this.state.request,
        ...patch,
        range: patch.range ?? this.state.request.range,
      },
    });
  }

  async runEvaluation() {
    const { request } = this.state;
    this.setState({ loading: true, error: undefined });
    try {
      const response = await evaluateIncident(request);
      let aiSummary: string | undefined;
      try {
        aiSummary = await this.assistant.summarizeIncident(request, response);
      } catch (aiError) {
        // 依據 architecture.md 第 2 章可靠性設計，AI 建議失敗時提供降級訊息。
        console.warn('summarizeIncident failed', aiError);
        aiSummary = 'AI 指揮建議暫時不可用，請稍後重試。';
      }
      this.setState({ loading: false, response, aiSummary });
    } catch (err) {
      this.setState({
        loading: false,
        error: err instanceof Error ? err.message : '評估失敗',
      });
    }
  }

  static Component = ({ model }: SceneComponentProps<IncidentSceneModel>) => {
    const state = model.useState();
    const { request, loading, response, error, aiSummary } = state;

    const children: React.ReactNode[] = [
      React.createElement(Field, {
        label: 'Alert UID',
        children: React.createElement(Input, {
          value: request.alertUid,
          onChange: (event) => model.updateRequest({ alertUid: event.currentTarget.value }),
        }),
      }),
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
      React.createElement(
        Button,
        {
          variant: 'primary',
          onClick: () => model.runEvaluation(),
          disabled: loading,
          children: loading ? 'AI 評估中...' : '評估告警',
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
          '正在向 MCP 查詢告警上下文並請求 LLM 建議...'
        )
      );
    }

    if (error) {
      children.push(
        React.createElement(
          Alert,
          { severity: 'error', title: '評估失敗' },
          error
        )
      );
    }

    if (response) {
      const timelineItems = response.timeline.map((item) => {
        const timestamp = new Date(item.timestamp);
        return React.createElement(
          'div',
          { key: `${item.timestamp}-${item.message}` },
          `${timestamp.toISOString()} [${item.severity}] ${item.source}: ${item.message}`
        );
      });

      const recommendationItems = response.recommendations.map((item) =>
        React.createElement(
          'div',
          { key: item.title },
          `${item.title} (${item.impact}) — ${item.detail}`
        )
      );

      children.push(
        React.createElement(
          Stack,
          { direction: 'column', gap: 1 },
          React.createElement(Badge, {
            text: `狀態 ${response.status}`,
            color: response.status === 'critical' ? 'red' : 'orange',
          }),
          React.createElement(
            Alert,
            { severity: 'warning', title: '事件時間線' },
            React.createElement(Stack, { direction: 'column', gap: 1 }, ...timelineItems)
          ),
          React.createElement(
            Alert,
            { severity: 'info', title: 'AI 指揮建議' },
            aiSummary ?? '尚未取得 AI 建議'
          ),
          React.createElement(
            Alert,
            { severity: 'success', title: '推薦動作' },
            React.createElement(Stack, { direction: 'column', gap: 1 }, ...recommendationItems)
          )
        )
      );
    }

    return React.createElement(Stack, { direction: 'column', gap: 2 }, ...children);
  };
}

export const createIncidentScene = () => {
  const sceneModel = new IncidentSceneModel();
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
