import { llm } from '@grafana/llm';
import type { InsightAnalyzeResponse, OverviewSummaryContext } from '../types/insight';
import type { IncidentEvalResponse } from '../types/incident';

export interface LLMChatOptions {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * @description 依據 architecture.md 第 6.1 節，封裝 LLM 呼叫流程並提供錯誤保護。
 */
export class LLMClient {
  async ensureAvailability(): Promise<void> {
    const enabled = await llm.enabled();
    if (!enabled) {
      throw new Error('LLM 服務尚未啟用，請先於 Grafana LLM App 中設定。');
    }
  }

  async chat({ systemPrompt, userPrompt }: LLMChatOptions): Promise<string> {
    await this.ensureAvailability();
    const messages: llm.Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
    const response = await llm.chatCompletions({
      model: llm.Model.BASE,
      messages,
    });
    return response.choices[0]?.message?.content?.trim() ?? 'AI 無回應';
  }

  async summarizeInsight(result: InsightAnalyzeResponse, requestSummary: string): Promise<string> {
    return this.chat({
      systemPrompt:
        '你是一位資深 SRE，負責分析 metrics 與 logs，請提供可執行的改善建議，並標記風險等級。',
      userPrompt: `${requestSummary}\nMetrics: ${JSON.stringify(result.metrics)}\nLogs: ${JSON.stringify(result.logs)}\nAlerts: ${JSON.stringify(result.alerts)}`,
    });
  }

  async summarizeIncident(result: IncidentEvalResponse, context: string): Promise<string> {
    return this.chat({
      systemPrompt: '你是一位值班指揮官，請協助判斷事故嚴重度並提供下一步行動建議。',
      userPrompt: `${context}\nStatus: ${result.status}\nTimeline: ${JSON.stringify(result.timeline)}\nRecommendations: ${JSON.stringify(result.recommendations)}`,
    });
  }

  async summarizeOverview(context: OverviewSummaryContext): Promise<string> {
    return this.chat({
      systemPrompt: '你是一位 SRE 值班顧問，請產出 3 點內的營運狀態摘要。',
      userPrompt: `Service: ${context.service}\nEnvironment: ${context.environment}\nMetrics: ${JSON.stringify(
        context.metrics
      )}\nLogs: ${JSON.stringify(context.logs)}\nAlerts: ${JSON.stringify(context.alerts)}`,
    });
  }
}

export const createLLMClient = () => new LLMClient();
