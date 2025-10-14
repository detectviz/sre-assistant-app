import { SceneAppPage } from '@grafana/scenes';
import { ROUTES } from '../../constants';
import { prefixRoute } from '../../utils/utils.routing';
import { logAnalysisScene } from './logAnalysisScene';

export const logAnalysisPage = new SceneAppPage({
  title: '日誌分析',
  subTitle: '以 LogQL 鎖定錯誤訊息並協助快速排除。',
  url: prefixRoute(ROUTES.LogAnalysis),
  routePath: ROUTES.LogAnalysis,
  getScene: logAnalysisScene,
});
