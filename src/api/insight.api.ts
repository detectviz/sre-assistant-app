import { getBackendSrv } from '@grafana/runtime';
import pluginJson from '../plugin.json';

/**
 * @section 4.2 前端資料互動流程
 * 對應《docs/architecture.md》第 4.2 與 5.1 節，此模組封裝 `/resources/insight/analyze` 呼叫，
 * 將 Scenes 觸發的互動請求送往後端 Resource API。
 */

export interface InsightAnalyzePayload {
  metricsDatasource: string;
  logsDatasource: string;
  metricQuery: string;
  logQuery: string;
  timeRange: { from: string; to: string };
  dimensions?: Record<string, string>;
}

export interface InsightAnalyzeResult {
  metrics: unknown;
  logs: unknown;
  aiSummary: string;
}

const RESOURCE_BASE = `/api/plugins/${pluginJson.id}/resources`;

export async function analyzeInsight(payload: InsightAnalyzePayload): Promise<InsightAnalyzeResult> {
  const response = await getBackendSrv().post<InsightAnalyzeResult>(`${RESOURCE_BASE}/insight/analyze`, payload);
  return response;
}
