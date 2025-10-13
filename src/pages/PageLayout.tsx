import React from 'react';
import { PluginPage } from '@grafana/runtime';
import { TabsBar, Tab } from '@grafana/ui';
import { css } from '@emotion/css';
import pluginJson from 'plugin.json';

export type AppSection = 'overview' | 'insight' | 'incident';

interface PageLayoutProps {
  activeSection: AppSection;
  title: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

const navItems: Array<{ section: AppSection; label: string; path: string }> = [
  { section: 'overview', label: 'Overview', path: `/a/${pluginJson.id}/overview` },
  { section: 'insight', label: 'Insights', path: `/a/${pluginJson.id}/insight` },
  { section: 'incident', label: 'Incidents', path: `/a/${pluginJson.id}/incident` },
];

/**
 * @description 對應 architecture.md 第 4.2 節，集中管理頁面框架與導覽，確保三大工作流程一致。
 */
export const PageLayout: React.FC<PageLayoutProps> = ({ activeSection, title, headerExtra, children }) => {
  return (
    <PluginPage>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h2>{title}</h2>
            {headerExtra ? <div className={styles.headerExtra}>{headerExtra}</div> : null}
          </div>
          <TabsBar>
            {navItems.map((item) => (
              <Tab key={item.section} label={item.label} href={item.path} active={item.section === activeSection} />
            ))}
          </TabsBar>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </PluginPage>
  );
};

const styles = {
  container: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  header: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 16px 0 16px;
  `,
  titleRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  headerExtra: css`
    margin-left: auto;
  `,
  content: css`
    padding: 0 16px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
};

export default PageLayout;
