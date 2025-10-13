import React, { useEffect, useMemo, useState } from 'react';
import { AppRootProps } from '@grafana/data';
import { Alert, Card, Field, Label, LinkButton, Spinner, Stack } from '@grafana/ui';
import { css } from '@emotion/css';
import pluginJson from 'plugin.json';
import { analyzeInsight } from '../api/insight.api';
import { InsightAnalyzeRequest } from '../types/insight';
import { AIAssistant } from '../ai/aiAssistant';
import { AppSection, PageLayout } from './PageLayout';

interface OverviewPageProps {
  /** @description 依據 architecture.md 第 4.2 步驟 1，接收 Grafana AppRootProps 建立頁面狀態。 */
  pluginProps?: AppRootProps;
  activeSection?: AppSection;
}

/**
 * @description 對應 architecture.md 第 3 節資料流，展示 LLM 與 MCP 的整體健康狀態與快速導覽。
 */
const OverviewPage: React.FC<OverviewPageProps> = ({ pluginProps, activeSection = 'overview' }) => {
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [error, setError] = useState<string | undefined>();

  const assistant = useMemo(() => new AIAssistant(), []);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const request: InsightAnalyzeRequest = {
          service: 'bootstrap',
          environment: 'default',
          range: {
            from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
          },
        };
        const response = await analyzeInsight(request);
        setStatusMessage(
          `Metrics: ${response.metrics.length} · Logs: ${response.logs.length} · Alerts: ${response.alerts.length}`
        );
        try {
          const summary = await assistant.summarizeOverview({
            service: request.service,
            environment: request.environment,
            metrics: response.metrics,
            logs: response.logs,
            alerts: response.alerts,
          });
          setAiSummary(summary);
        } catch (aiError) {
          setAiSummary('AI 功能暫時不可用，請稍後再試。');
          setError(undefined);
          console.warn('LLM summary failed', aiError);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown bootstrap error');
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [assistant]);

  return (
    <PageLayout activeSection={activeSection} title="SRE Assistant Overview">
      {loading && (
        <div className={styles.loader}>
          <Spinner inline />
          <Label>SRE Assistant initializing...</Label>
        </div>
      )}

      {!loading && error && (
        <Alert title="初始化失敗" severity="error">
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Stack direction="column" gap={2}>
          <Card heading="平台整體健康狀態">
            <Card.Description>{statusMessage}</Card.Description>
            <Stack direction="row" gap={1} justifyContent="flex-end">
              <LinkButton icon="sync" href={`/a/${pluginJson.id}/insight`} variant="primary">
                前往 AI 洞察
              </LinkButton>
            </Stack>
          </Card>

          <Card heading="AI 助理摘要">
            <Card.Description>{aiSummary || 'AI 助理暫無額外建議。'}</Card.Description>
          </Card>

          <Card heading="開發環境資訊">
            <div className={styles.infoStack}>
              <Stack direction="row" gap={4}>
                <Field label="Instance" description="Grafana 目前租戶">
                  <Label>{pluginProps?.meta?.info?.author?.name ?? 'unknown'}</Label>
                </Field>
                <Field label="Plugin Version">
                  <Label>{pluginProps?.meta?.info?.version ?? 'dev'}</Label>
                </Field>
                <Field label="Plugin ID">
                  <Label>{pluginProps?.meta?.id ?? 'sre-assistant-app'}</Label>
                </Field>
              </Stack>
            </div>
          </Card>
        </Stack>
      )}
    </PageLayout>
  );
};

const styles = {
  loader: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  infoStack: css`
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  `,
};

export default OverviewPage;
