import { EmbeddedScene, SceneFlexItem, SceneFlexLayout } from '@grafana/scenes';
import { GrafanaMcpToolsPanel } from './GrafanaMcpToolsPanel';

/**
 * 建立 Grafana MCP 工具互動頁面的場景定義。
 */
export const grafanaMcpToolsScene = () => {
  const panel = new GrafanaMcpToolsPanel({
    loading: false,
  });

  return new EmbeddedScene({
    body: new SceneFlexLayout({
      children: [
        new SceneFlexItem({
          minHeight: 520,
          body: panel,
        }),
      ],
    }),
  });
};
