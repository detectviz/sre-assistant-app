import React, { Suspense } from 'react';
import { SceneApp, useSceneApp } from '@grafana/scenes';
import { AppRootProps } from '@grafana/data';
import { Alert, ErrorBoundary, Spinner } from '@grafana/ui';
import { mcp } from '@grafana/llm';
import { PluginPropsContext } from '../../utils/utils.plugin';
import { helloWorldPage } from '../../pages/HelloWorld/helloWorldPage';
import { homePage } from '../../pages/Home/homePage';
import { realTimeMetricsPage } from '../../pages/RealTimeMetrics/realTimeMetricsPage';
import { logAnalysisPage } from '../../pages/LogAnalysis/logAnalysisPage';
import { alertManagementPage } from '../../pages/AlertManagement/alertManagementPage';
import { withDrilldownPage } from '../../pages/WithDrilldown/withDrilldownPage';
import { withTabsPage } from '../../pages/WithTabs/withTabsPage';
import { grafanaMcpToolsPage } from '../../pages/GrafanaMCPTools/grafanaMcpToolsPage';
import pluginJson from '../../plugin.json';

function getSceneApp() {
  return new SceneApp({
    pages: [
      homePage,
      realTimeMetricsPage,
      logAnalysisPage,
      alertManagementPage,
      grafanaMcpToolsPage,
      withDrilldownPage,
      withTabsPage,
      helloWorldPage,
    ],
    urlSyncOptions: {
      updateUrlOnInit: true,
      createBrowserHistorySteps: true,
    },
  });
}

function AppWithScenes() {
  const scene = useSceneApp(getSceneApp);

  return (
    <>
      <scene.Component model={scene} />
    </>
  );
}

function App(props: AppRootProps) {
  const pluginVersion = pluginJson.info?.version ?? '0.0.0';

  return (
    <PluginPropsContext.Provider value={props}>
      <Suspense
        fallback={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Spinner inline={true} size={18} />
            <span>Grafana MCP 初始化中…</span>
          </div>
        }
      >
        <ErrorBoundary>
          {({ error }) => {
            if (error) {
              return (
                <Alert title="MCP 初始化失敗" severity="error">
                  {error.message}
                </Alert>
              );
            }

            return (
              <mcp.MCPClientProvider appName={pluginJson.id} appVersion={pluginVersion}>
                <AppWithScenes />
              </mcp.MCPClientProvider>
            );
          }}
        </ErrorBoundary>
      </Suspense>
    </PluginPropsContext.Provider>
  );
}

export default App;
