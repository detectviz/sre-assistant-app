import React from 'react';
import { SceneApp, useSceneApp } from '@grafana/scenes';
import { AppRootProps } from '@grafana/data';
import { PluginPropsContext } from '../../utils/utils.plugin';
import { helloWorldPage } from '../../pages/HelloWorld/helloWorldPage';
import { homePage } from '../../pages/Home/homePage';
import { realTimeMetricsPage } from '../../pages/RealTimeMetrics/realTimeMetricsPage';
import { logAnalysisPage } from '../../pages/LogAnalysis/logAnalysisPage';
import { alertManagementPage } from '../../pages/AlertManagement/alertManagementPage';
import { withDrilldownPage } from '../../pages/WithDrilldown/withDrilldownPage';
import { withTabsPage } from '../../pages/WithTabs/withTabsPage';

function getSceneApp() {
  return new SceneApp({
    pages: [
      homePage,
      realTimeMetricsPage,
      logAnalysisPage,
      alertManagementPage,
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
  return (
    <PluginPropsContext.Provider value={props}>
      <AppWithScenes />
    </PluginPropsContext.Provider>
  );
}

export default App;
