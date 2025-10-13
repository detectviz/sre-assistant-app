import pluginJson from './plugin.json';

export const PLUGIN_BASE_URL = `/a/${pluginJson.id}`;

/**
 * @section 3 資料流總覽
 * 定義 App 內部使用的主要路徑，對應 Overview/Insight/Incident 三大頁面。
 */
export enum ROUTES {
  Overview = 'overview',
  Insight = 'insight',
  Incident = 'incident',
}
