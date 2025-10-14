import { EmbeddedScene, SceneFlexItem, SceneFlexLayout } from '@grafana/scenes';
import { AlertRulesPanel } from './AlertRulesPanel';

export const alertManagementScene = () => {
  const panel = new AlertRulesPanel({
    loading: true,
    rules: [],
  });

  return new EmbeddedScene({
    body: new SceneFlexLayout({
      children: [
        new SceneFlexItem({
          minHeight: 320,
          body: panel,
        }),
      ],
    }),
  });
};
