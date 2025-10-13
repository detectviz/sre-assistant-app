import { getBackendSrv } from '@grafana/runtime';
import pluginJson from 'plugin.json';
import { IncidentEvalRequest, IncidentEvalResponse } from '../types/incident';

const resourcePath = `/api/plugins/${pluginJson.id}/resources/incident/eval`;

/**
 * @description 對應 architecture.md 第 4.2 步驟 2→3，觸發 Incident Resource API 進行告警評估。
 */
export const evaluateIncident = async (payload: IncidentEvalRequest): Promise<IncidentEvalResponse> => {
  const backend = getBackendSrv();
  const response = await backend.post<IncidentEvalResponse>(resourcePath, payload);
  return response;
};
