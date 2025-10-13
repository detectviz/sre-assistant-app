import { getBackendSrv } from '@grafana/runtime';
import pluginJson from 'plugin.json';
import { InsightAnalyzeRequest, InsightAnalyzeResponse } from '../types/insight';

const resourcePath = `/api/plugins/${pluginJson.id}/resources/insight/analyze`;

/**
 * @description 對應 architecture.md 第 4.2 步驟 2→3，透過 Resource API 取得後端分析結果。
 */
export const analyzeInsight = async (payload: InsightAnalyzeRequest): Promise<InsightAnalyzeResponse> => {
  const backend = getBackendSrv();
  const response = await backend.post<InsightAnalyzeResponse>(resourcePath, payload);
  return response;
};
