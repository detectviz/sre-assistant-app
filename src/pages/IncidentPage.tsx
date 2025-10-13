import { SceneAppPage } from '@grafana/scenes';
import { buildIncidentScene } from '../scenes/IncidentScene';

/**
 * @section 7.3 Incident Page
 * 建立 Incident 專屬 SceneAppPage，提供告警評估與 AI 建議的入口。
 */
export const incidentPage = new SceneAppPage({
  title: 'Incident 評估',
  url: 'incident',
  routePath: 'incident',
  subTitle: '串接 MCP 工具與 LLM，協助值班人員判讀告警。',
  getScene: () => buildIncidentScene(),
});
