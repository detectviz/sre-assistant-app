import { llm } from '@grafana/llm';
import { llmClient } from './llmClient';
import { mcpClient } from './mcpClient';

/**
 * @section 7 四大頁面資料流
 * 本 AI 協助器串接 LLM 與 MCP，提供 Overview/Insight/Incident 三個頁面共用的分析邏輯。
 */
export class AIAssistant {
  /**
   * 針對 Overview 頁面整合 MCP 指標與告警資訊，輸出 AI 摘要。
   */
  async summarizeOverview(context: { metrics: unknown; alerts: unknown }): Promise<string> {
    const messages: llm.Message[] = [
      {
        role: 'system',
        content: '你是 Grafana SRE 助理，請以繁體中文提供可靠性摘要，並清楚標記為 AI 產生的建議。',
      },
      {
        role: 'user',
        content: `請根據以下指標與告警資訊產出摘要：\n指標:${JSON.stringify(context.metrics)}\n告警:${JSON.stringify(context.alerts)}`,
      },
    ];

    const response = await llmClient.chat({
      model: llm.Model.BASE,
      messages,
    });

    return response.choices[0]?.message?.content ?? '⚠️ AI 未提供摘要';
  }

  /**
   * 針對 Insight 頁面提供深入分析，同步使用 MCP 的 queryMetrics 與 getLogs。
   */
  async generateInsightAnalysis(args: {
    metricsDatasource: string;
    metricQuery: string;
    logsDatasource?: string;
    logQuery?: string;
    timeRange: { from: string; to: string };
  }): Promise<{ metrics: unknown; logs: unknown }> {
    const metrics = await mcpClient.queryMetrics({
      datasource: args.metricsDatasource,
      query: args.metricQuery,
      range: args.timeRange,
    });

    let logs: unknown = [];
    if (args.logsDatasource && args.logQuery) {
      logs = await mcpClient.getLogs({
        datasource: args.logsDatasource,
        query: args.logQuery,
        range: args.timeRange,
        limit: 100,
      });
    }

    return { metrics, logs };
  }

  /**
   * 針對 Incident 頁面整合 MCP 告警列表並請求 LLM 提出處置建議。
   */
  async recommendIncidentActions(context: { incident: unknown; metrics: unknown; logs?: unknown }): Promise<string> {
    const messages: llm.Message[] = [
      {
        role: 'system',
        content: '你是值班 SRE，請提供安全且可驗證的 incident 處理建議，並提示使用者再次確認。',
      },
      {
        role: 'user',
        content: `事件上下文:${JSON.stringify(context.incident)}\n相關指標:${JSON.stringify(
          context.metrics
        )}\n相關日誌:${JSON.stringify(context.logs)}`,
      },
    ];

    const response = await llmClient.chat({
      model: llm.Model.BASE,
      messages,
    });

    return response.choices[0]?.message?.content ?? '⚠️ AI 未提供建議';
  }
}

export const aiAssistant = new AIAssistant();
