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

interface LokiRangeQuery extends DataQuery {
  expr: string;
  queryType?: 'range' | 'instant';
  maxLines?: number;
}

export const logAnalysisScene = () => {
  const timeRange = new SceneTimeRange({
    from: 'now-30m',
    to: 'now',
  });

  const queryRunner = new SceneQueryRunner({
    queries: [],
  });

  const datasourceSelector = new DataSourceSelectControl({
    pluginId: 'loki',
    label: 'Loki',
    onChange: (ref: DataSourceRef | null) => {
      if (!ref) {
        queryRunner.cancelQuery();
        queryRunner.setState({ datasource: undefined, queries: [] });
        return;
      }

      const query: LokiRangeQuery = {
        refId: 'A',
        datasource: ref,
        expr: '{job="grafana"} |= "error"',
        queryType: 'range',
        maxLines: 1000,
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
          minHeight: 420,
          body: PanelBuilders.logs()
            .setTitle('Grafana 錯誤日誌')
            .setDisplayMode('transparent')
            .setDescription('請於上方選擇 Loki 資料來源後執行 LogQL 查詢。')
            .setOption('showLabels', true)
            .setOption('showTime', true)
            .build(),
        }),
      ],
    }),
    controls: [
      datasourceSelector,
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneControlsSpacer(),
      new SceneRefreshPicker({
        intervals: ['10s', '1m', '5m'],
        isOnCanvas: true,
      }),
    ],
  });
};
