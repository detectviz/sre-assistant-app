/**
 * @description 依據 architecture.md 第 5.1 節，定義 Insight API 所需的請求與回應資料結構。
 */
export interface InsightAnalyzeRequest {
  service: string;
  environment: string;
  range: {
    from: string;
    to: string;
  };
  metricQuery?: string;
  logQuery?: string;
}

export interface InsightMetricPoint {
  timestamp: string;
  value: number;
  unit?: string;
  label?: string;
}

export interface InsightLogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

export interface InsightAlertSummary {
  id: string;
  name: string;
  severity: string;
  state: string;
  description?: string;
}

export interface InsightAnalyzeResponse {
  metrics: InsightMetricPoint[];
  logs: InsightLogEntry[];
  alerts: InsightAlertSummary[];
  aiAssessment?: string;
}

export interface OverviewSummaryContext {
  service: string;
  environment: string;
  metrics: InsightMetricPoint[];
  logs: InsightLogEntry[];
  alerts: InsightAlertSummary[];
}
