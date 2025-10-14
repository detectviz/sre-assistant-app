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
import { PROMETHEUS_DATASOURCE_REF } from '../../constants';

export const realTimeMetricsScene = () => {
  const timeRange = new SceneTimeRange({
    from: 'now-1h',
    to: 'now',
  });

  const queryRunner = new SceneQueryRunner({
    datasource: PROMETHEUS_DATASOURCE_REF,
    queries: [
      {
        refId: 'A',
        datasource: PROMETHEUS_DATASOURCE_REF,
        expr: 'sum(rate(prometheus_http_requests_total[5m])) by (code)',
        legendFormat: 'HTTP {{code}}',
      },
    ],
    maxDataPoints: 300,
  });

  return new EmbeddedScene({
    $timeRange: timeRange,
    $data: queryRunner,
    body: new SceneFlexLayout({
      children: [
        new SceneFlexItem({
          minHeight: 360,
          body: PanelBuilders.timeseries()
            .setTitle('Prometheus 請求速率')
            .setUnit('req/s')
            .setDisplayMode('transparent')
            .build(),
        }),
      ],
    }),
    controls: [
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneControlsSpacer(),
      new SceneRefreshPicker({
        intervals: ['5s', '30s', '1m'],
        isOnCanvas: true,
      }),
    ],
  });
};
