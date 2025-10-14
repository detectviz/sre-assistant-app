import React, { useMemo } from 'react';
import { AppRootProps } from '@grafana/data';
import OverviewPage from '../../pages/OverviewPage';
import InsightPage from '../../pages/InsightPage';
import IncidentPage from '../../pages/IncidentPage';
import { AppSection } from '../../pages/PageLayout';

const resolveSection = (path?: string): AppSection => {
  if (!path) {
    return 'overview';
  }

  const normalized = path.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!normalized) {
    return 'overview';
  }

  const [segment] = normalized.split('/');

  if (segment === 'insight' || segment === 'insights') {
    return 'insight';
  }

  if (segment === 'incident' || segment === 'incidents') {
    return 'incident';
  }

  return 'overview';
};

/**
 * @description 對應 architecture.md 第 4.2 節，根據路徑動態載入 Overview/Insight/Incident 頁面。
 */
const App: React.FC<AppRootProps> = (props) => {
  const section = useMemo(() => resolveSection(props.path), [props.path]);

  if (section === 'insight') {
    return <InsightPage activeSection="insight" />;
  }

  if (section === 'incident') {
    return <IncidentPage activeSection="incident" />;
  }

  return <OverviewPage pluginProps={props} activeSection="overview" />;
};

export default App;
