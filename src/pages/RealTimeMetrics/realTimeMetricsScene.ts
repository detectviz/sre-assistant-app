import type { DataQuery } from '@grafana/data';
import type { DataSourceRef } from '@grafana/schema';
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
import { DataSourceSelectControl } from '../../components/DataSourceControls/DataSourceSelectControl';

interface PrometheusRangeQuery extends DataQuery {
  expr: string;
  legendFormat?: string;
  instant?: boolean;
  range?: boolean;
}

export const realTimeMetricsScene = () => {
  const timeRange = new SceneTimeRange({
    from: 'now-1h',
    to: 'now',
  });

  const queryRunner = new SceneQueryRunner({
    queries: [],
    maxDataPoints: 300,
  });

  const datasourceSelector = new DataSourceSelectControl({
    pluginId: 'prometheus',
    label: 'Prometheus',
    onChange: (ref: DataSourceRef | null) => {
      if (!ref) {
        queryRunner.cancelQuery();
        queryRunner.setState({ datasource: undefined, queries: [] });
        return;
      }

      const query: PrometheusRangeQuery = {
        refId: 'A',
        datasource: ref,
        expr: 'sum(rate(prometheus_http_requests_total[5m])) by (code)',
        legendFormat: 'HTTP {{code}}',
        range: true,
        instant: false,
      };

      queryRunner.setState({ datasource: ref, queries: [query] });
      queryRunner.runQueries();
    },
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
            .setDescription('請先於上方選擇 Prometheus 資料來源以執行查詢。')
            .setDisplayMode('transparent')
            .build(),
        }),
      ],
    }),
    controls: [
      datasourceSelector,
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneControlsSpacer(),
      new SceneRefreshPicker({
        intervals: ['5s', '30s', '1m'],
        isOnCanvas: true,
      }),
    ],
  });
};
