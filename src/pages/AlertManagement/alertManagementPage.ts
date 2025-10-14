import { SceneAppPage } from '@grafana/scenes';
import { ROUTES } from '../../constants';
import { prefixRoute } from '../../utils/utils.routing';
import { alertManagementScene } from './alertManagementScene';

export const alertManagementPage = new SceneAppPage({
  title: '告警管理',
  subTitle: '掌握 Grafana 告警規則狀態並快速追蹤異常。',
  url: prefixRoute(ROUTES.AlertManagement),
  routePath: ROUTES.AlertManagement,
  getScene: alertManagementScene,
});
