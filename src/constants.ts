import pluginJson from './plugin.json';

export const PLUGIN_BASE_URL = `/a/${pluginJson.id}`;

export enum ROUTES {
  Home = 'home',
  WithTabs = 'page-with-tabs',
  WithDrilldown = 'page-with-drilldown',
  HelloWorld = 'hello-world',
  RealTimeMetrics = 'real-time-metrics',
  LogAnalysis = 'log-analysis',
  AlertManagement = 'alert-management',
  GrafanaMcpTools = 'grafana-mcp-tools',
}

export const DATASOURCE_REF = {
  uid: 'gdev-testdata',
  type: 'testdata',
};

