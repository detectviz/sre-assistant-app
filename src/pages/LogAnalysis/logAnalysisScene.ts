import {
  EmbeddedScene,
  PanelBuilders,
  SceneControlsSpacer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneQueryRunner,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
} from '@grafana/scenes';
import { LOKI_DATASOURCE_REF } from '../../constants';

export const logAnalysisScene = () => {
  const timeRange = new SceneTimeRange({
    from: 'now-30m',
    to: 'now',
  });

  const queryRunner = new SceneQueryRunner({
    datasource: LOKI_DATASOURCE_REF,
    queries: [
      {
        refId: 'A',
        datasource: LOKI_DATASOURCE_REF,
        expr: '{job="grafana"} |= "error"',
        queryType: 'range',
        maxLines: 1000,
      },
    ],
  });

  return new EmbeddedScene({
    $timeRange: timeRange,
    $data: queryRunner,
    body: new SceneFlexLayout({
      children: [
        new SceneFlexItem({
          minHeight: 420,
          body: PanelBuilders.logs()
            .setTitle('Grafana 錯誤日誌')
            .setDisplayMode('transparent')
            .setOption('showLabels', true)
            .setOption('showTime', true)
            .build(),
        }),
      ],
    }),
    controls: [
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneControlsSpacer(),
      new SceneRefreshPicker({
        intervals: ['10s', '1m', '5m'],
        isOnCanvas: true,
      }),
    ],
  });
};
