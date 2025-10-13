import { SceneAppPage } from '@grafana/scenes';
import { buildInsightScene } from '../scenes/InsightScene';

/**
 * @section 7.2 Insight Page
 * 建立 Insight 專屬 SceneAppPage，串連 Scene 與路由設定。
 */
export const insightPage = new SceneAppPage({
  title: 'Insight 分析',
  url: 'insight',
  routePath: 'insight',
  subTitle: '整合 Resource API 與 AI 分析的深入指標檢視。',
  getScene: () => buildInsightScene(),
});
