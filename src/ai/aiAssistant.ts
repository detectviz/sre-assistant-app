import { createLLMClient, LLMClient } from './llmClient';
import { createMCPClient, MCPClient, MCPMetricQuery, MCPLogQuery, MCPAlertQuery } from './mcpClient';
import type { InsightAnalyzeRequest, InsightAnalyzeResponse, OverviewSummaryContext } from '../types/insight';
import type { IncidentEvalRequest, IncidentEvalResponse } from '../types/incident';

/**
 * @description 對應 architecture.md 第 6 章，整合 LLM 與 MCP 的高階協作邏輯。
 */
export class AIAssistant {
  private readonly llmClient: LLMClient;
  private readonly mcpClient: MCPClient;

  constructor(llmClient: LLMClient = createLLMClient(), mcpClient: MCPClient = createMCPClient()) {
    this.llmClient = llmClient;
    this.mcpClient = mcpClient;
  }

  async summarizeOverview(context: OverviewSummaryContext): Promise<string> {
    return this.llmClient.summarizeOverview(context);
  }

  async buildInsightPrompt(request: InsightAnalyzeRequest): Promise<string> {
    const metricQuery: MCPMetricQuery | undefined = request.metricQuery
      ? { query: request.metricQuery, range: request.range }
      : undefined;
    const logQuery: MCPLogQuery | undefined = request.logQuery
      ? { query: request.logQuery, range: request.range, limit: 20 }
      : undefined;

    const alertQuery: MCPAlertQuery = {
      service: request.service,
      environment: request.environment,
    };

    const [metricResult, logResult, alertResult] = await Promise.allSettled([
      metricQuery ? this.mcpClient.queryMetrics(metricQuery) : Promise.resolve(undefined),
      logQuery ? this.mcpClient.getLogs(logQuery) : Promise.resolve(undefined),
      this.mcpClient.listAlerts(alertQuery),
    ]);

    return `Service: ${request.service}\nEnvironment: ${request.environment}\nMetric query: ${
      metricQuery?.query ?? 'n/a'
    }\nMetric tool result: ${JSON.stringify(metricResult)}\nLog query: ${logQuery?.query ?? 'n/a'}\nLog tool result: ${JSON.stringify(
      logResult
    )}\nAlert result: ${JSON.stringify(alertResult)}`;
  }

  async summarizeInsight(request: InsightAnalyzeRequest, result: InsightAnalyzeResponse): Promise<string> {
    const toolSummary = await this.buildInsightPrompt(request);
    return this.llmClient.summarizeInsight(result, toolSummary);
  }

  async summarizeIncident(request: IncidentEvalRequest, result: IncidentEvalResponse): Promise<string> {
    const logQuery: MCPLogQuery = {
      query: `{{${request.service}}} severity>="warning"`,
      range: request.range,
      limit: 50,
    };

    const metricsQuery: MCPMetricQuery = {
      query: `sum(rate(service_error_total{service="${request.service}"}[5m]))`,
      range: request.range,
    };

    const [logs, metrics] = await Promise.allSettled([
      this.mcpClient.getLogs(logQuery),
      this.mcpClient.queryMetrics(metricsQuery),
    ]);

    const context = `Alert UID: ${request.alertUid}\nService: ${request.service}\nEnvironment: ${request.environment}\nMCP Logs: ${JSON.stringify(
      logs
    )}\nMCP Metrics: ${JSON.stringify(metrics)}`;

    return this.llmClient.summarizeIncident(result, context);
  }
}
