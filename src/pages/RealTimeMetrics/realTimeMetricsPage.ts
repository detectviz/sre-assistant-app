import { SceneAppPage } from '@grafana/scenes';
import { MllmClient } from '@grafana/llm';
import { ROUTES } from '../../constants';
import { prefixRoute } from '../../utils/utils.routing';
import { realTimeMetricsScene } from './realTimeMetricsScene';

const getPage = () => {
  const mllm = new MllmClient({
    appUrl: '/a/grafana-llm-app',
  });

  return new SceneAppPage({
    title: '即時指標查詢',
    subTitle: '透過 PromQL 監看關鍵指標的即時變化。',
    url: prefixRoute(ROUTES.RealTimeMetrics),
    routePath: ROUTES.RealTimeMetrics,
    getScene: () => realTimeMetricsScene(mllm),
  });
};

export const realTimeMetricsPage = getPage();
