import { getBackendSrv } from '@grafana/runtime';
import pluginJson from '../plugin.json';

/**
 * @section 4.2 前端資料互動流程
 * 封裝 `/resources/incident/eval` 呼叫，讓 Incident Scene 得以依據第 7.3 節規劃串接後端分析。
 */

export interface IncidentEvalPayload {
  incidentId: string;
  metricsDatasource: string;
  logsDatasource: string;
  metricQuery: string;
  logQuery: string;
  alertWindow: { from: string; to: string };
}

export interface IncidentEvalResult {
  status: string;
  recommendations: string;
  validation: unknown;
}

const RESOURCE_BASE = `/api/plugins/${pluginJson.id}/resources`;

export async function evaluateIncident(payload: IncidentEvalPayload): Promise<IncidentEvalResult> {
  return getBackendSrv().post<IncidentEvalResult>(`${RESOURCE_BASE}/incident/eval`, payload);
}
