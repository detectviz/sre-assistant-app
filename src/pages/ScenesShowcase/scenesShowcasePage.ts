import { SceneAppPage, SceneRouteMatch } from '@grafana/scenes';
import { ROUTES } from '../../constants';
import { prefixRoute } from '../../utils/utils.routing';
import {
  buildCoreAndLayoutsScene,
  buildDataAndVisualizationScene,
  buildInteractivityScene,
  buildMachineLearningScene,
  buildRuntimeMetricDrilldownScene,
  getDrilldownMetrics,
} from './scenesShowcaseScene';

const baseUrl = prefixRoute(ROUTES.ScenesShowcase);

export const scenesShowcasePage = new SceneAppPage({
  title: 'Scenes 元件總覽',
  subTitle: `此頁面示範核心元件、互動變數、版面配置與機器學習能力，並使用 Prometheus 作為主要資料來源。建議鑽取指標：${getDrilldownMetrics().join(', ')}`,
  url: baseUrl,
  routePath: `${ROUTES.ScenesShowcase}/*`,
  getScene: () => buildCoreAndLayoutsScene(),
  tabs: [
    new SceneAppPage({
      title: '核心與版面',
      url: baseUrl,
      routePath: '/',
      getScene: () => buildCoreAndLayoutsScene(),
    }),
    new SceneAppPage({
      title: '資料與視覺化',
      url: `${baseUrl}/visualizations`,
      routePath: 'visualizations',
      getScene: () => buildDataAndVisualizationScene(baseUrl),
    }),
    new SceneAppPage({
      title: '互動與變數',
      url: `${baseUrl}/interactivity`,
      routePath: 'interactivity',
      getScene: () => buildInteractivityScene(),
    }),
    new SceneAppPage({
      title: '機器學習',
      url: `${baseUrl}/ml`,
      routePath: 'ml',
      getScene: () => buildMachineLearningScene(),
    }),
  ],
  drilldowns: [
    {
      routePath: 'metric/:metricId',
      getPage: (routeMatch: SceneRouteMatch<{ metricId: string }>, parent) => {
        const metricId = routeMatch.params.metricId ?? '';

        return new SceneAppPage({
          title: `指標 ${decodeURIComponent(metricId)} 詳細分析`,
          subTitle: '使用相同 Prometheus 查詢展示時間序列、統計摘要與標籤切分。',
          url: `${baseUrl}/metric/${metricId}`,
          routePath: 'metric/:metricId',
          getScene: () => buildRuntimeMetricDrilldownScene(metricId),
          getParentPage: () => parent,
        });
      },
    },
  ],
  preserveUrlKeys: ['threshold', 'job', 'statusFilter', 'metricName'],
});
