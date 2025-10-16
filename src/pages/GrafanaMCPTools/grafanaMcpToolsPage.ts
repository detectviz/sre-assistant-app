import { SceneAppPage } from '@grafana/scenes';
import { ROUTES } from '../../constants';
import { prefixRoute } from '../../utils/utils.routing';
import { grafanaMcpToolsScene } from './grafanaMcpToolsScene';

export const grafanaMcpToolsPage = new SceneAppPage({
  title: 'Grafana MCP Tools',
  subTitle: '集中瀏覽與測試所有 Grafana MCP 工具，包含參數提示與原始回傳結果。',
  url: prefixRoute(ROUTES.GrafanaMcpTools),
  routePath: ROUTES.GrafanaMcpTools,
  getScene: grafanaMcpToolsScene,
});
