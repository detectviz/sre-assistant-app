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
import { MllmChat, type MllmClient } from '@grafana/llm';
import { DataSourceSelectControl } from '../../components/DataSourceControls/DataSourceSelectControl';

interface LokiRangeQuery extends DataQuery {
  expr: string;
  queryType?: 'range' | 'instant';
  maxLines?: number;
}

export const logAnalysisScene = (mllm: MllmClient) => {
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
      queryRunner.setState({ datasource: ref || undefined });
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
      new MllmChat({
        title: 'Loki 日誌查詢助理',
        onSend: async (message: string) => {
          const timeRangeValue = timeRange.state.value;
          const contextMessage = `Grafana time range is: from=${timeRangeValue.from}, to=${timeRangeValue.to}.`;
          const fullMessage = `${contextMessage}\n\nUser query: ${message}`;

          const response = await mllm.llm.chat({
            messages: [{ role: 'user', content: fullMessage }],
            tools: [{ type: 'loki:query' }],
          });

          const toolCall = response.choices[0].message.tool_calls?.[0];
          if (toolCall?.function.name !== 'loki:query') {
            return;
          }

          const args = JSON.parse(toolCall.function.arguments);
          const query: LokiRangeQuery = {
            refId: 'A',
            expr: args.expr,
            queryType: 'range',
          };

          queryRunner.setState({ queries: [query] });
          queryRunner.runQueries();
        },
      }),
      new SceneControlsSpacer(),
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneRefreshPicker({
        intervals: ['10s', '1m', '5m'],
        isOnCanvas: true,
      }),
    ],
  });
};
