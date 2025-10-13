import React from 'react';
import { AppPlugin } from '@grafana/data';
import { initPluginTranslations } from '@grafana/i18n';
import { SceneApp, useSceneApp } from '@grafana/scenes';
import { LoadingPlaceholder } from '@grafana/ui';
import pluginJson from './plugin.json';
import { overviewPage } from './pages/OverviewPage';
import { insightPage } from './pages/InsightPage';
import { incidentPage } from './pages/IncidentPage';

/**
 * @section 4 前端架構
 * 根據架構要求建立 Scenes App，統一管理三大頁面的導覽與資料流程。
 */
await initPluginTranslations(pluginJson.id);

function createSceneApp() {
  return new SceneApp({
    pages: [overviewPage, insightPage, incidentPage],
    urlSyncOptions: {
      updateUrlOnInit: true,
      createBrowserHistorySteps: true,
    },
  });
}

function SREAssistantApp() {
  const scene = useSceneApp(createSceneApp);
  return React.createElement(scene.Component, { model: scene });
}

const Root = () =>
  React.createElement(
    React.Suspense,
    { fallback: React.createElement(LoadingPlaceholder, { text: '載入中' }) },
    React.createElement(SREAssistantApp)
  );

export const plugin = new AppPlugin<{}>().setRootPage(Root);
