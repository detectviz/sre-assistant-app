import React, { Suspense, lazy } from 'react';
import { initPluginTranslations } from '@grafana/i18n';
import { AppPlugin, AppRootProps } from '@grafana/data';
import { LoadingPlaceholder } from '@grafana/ui';
import type { AppConfigProps } from './components/AppConfig/AppConfig';
import pluginJson from 'plugin.json';

await initPluginTranslations(pluginJson.id);

const LazyApp = lazy(() => import('./components/App/App'));
const LazyConfig = lazy(() => import('./components/AppConfig/AppConfig'));

/**
 * @description 對應 architecture.md 第 4 章，透過 lazy loading 建立根頁面並確保各子頁面載入流程一致。
 */
const RootApp = (props: AppRootProps) =>
  React.createElement(
    Suspense,
    { fallback: React.createElement(LoadingPlaceholder, { text: 'SRE Assistant 正在載入' }) },
    React.createElement(LazyApp, { ...props })
  );

/**
 * @description 對應 architecture.md 第 4.2 節，提供設定頁讓使用者管理 API 與安全參數。
 */
const ConfigPage = (props: AppConfigProps) =>
  React.createElement(
    Suspense,
    { fallback: React.createElement(LoadingPlaceholder, { text: '設定頁面載入中' }) },
    React.createElement(LazyConfig, { ...props })
  );

export const plugin = new AppPlugin<{}>()
  .setRootPage(RootApp)
  .addConfigPage({
    title: 'Configuration',
    icon: 'cog',
    body: ConfigPage,
    id: 'configuration',
  });
