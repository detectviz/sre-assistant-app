/**
 * @description 依據 architecture.md 第 5.1 節，定義 Incident API 的請求與回應資料結構。
 */
export interface IncidentEvalRequest {
  alertUid: string;
  service: string;
  environment: string;
  range: {
    from: string;
    to: string;
  };
}

export interface IncidentTimelineEntry {
  timestamp: string;
  message: string;
  source: string;
  severity: string;
}

export interface IncidentRecommendation {
  title: string;
  detail: string;
  impact: 'low' | 'medium' | 'high';
}

export interface IncidentEvalResponse {
  status: 'healthy' | 'degraded' | 'critical';
  timeline: IncidentTimelineEntry[];
  recommendations: IncidentRecommendation[];
  aiSynopsis?: string;
}
