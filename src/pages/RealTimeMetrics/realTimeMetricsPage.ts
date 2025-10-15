import { SceneAppPage } from '@grafana/scenes';
import { ROUTES } from '../../constants';
import { prefixRoute } from '../../utils/utils.routing';
import { realTimeMetricsScene } from './realTimeMetricsScene';

export const realTimeMetricsPage = new SceneAppPage({
  title: '即時指標查詢',
  subTitle: '透過 PromQL 監看關鍵指標的即時變化。',
  url: prefixRoute(ROUTES.RealTimeMetrics),
  routePath: ROUTES.RealTimeMetrics,
  getScene: realTimeMetricsScene,
});
