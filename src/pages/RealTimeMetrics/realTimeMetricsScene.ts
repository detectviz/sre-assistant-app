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

interface PrometheusRangeQuery extends DataQuery {
  expr: string;
  legendFormat?: string;
  instant?: boolean;
  range?: boolean;
}

export const realTimeMetricsScene = (mllm: MllmClient) => {
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
      queryRunner.setState({ datasource: ref || undefined });
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
      new MllmChat({
        title: 'Prometheus 指標查詢助理',
        onSend: async (message: string) => {
          const timeRangeValue = timeRange.state.value;
          const contextMessage = `Grafana time range is: from=${timeRangeValue.from}, to=${timeRangeValue.to}.`;
          const fullMessage = `${contextMessage}\n\nUser query: ${message}`;

          const response = await mllm.llm.chat({
            messages: [{ role: 'user', content: fullMessage }],
            tools: [{ type: 'prometheus:query' }],
          });

          const toolCall = response.choices[0].message.tool_calls?.[0];
          if (toolCall?.function.name !== 'prometheus:query') {
            return;
          }

          const args = JSON.parse(toolCall.function.arguments);
          const query: PrometheusRangeQuery = {
            refId: 'A',
            expr: args.expr,
            range: true,
          };

          queryRunner.setState({ queries: [query] });
          queryRunner.runQueries();
        },
      }),
      new SceneControlsSpacer(),
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneRefreshPicker({
        intervals: ['5s', '30s', '1m'],
        isOnCanvas: true,
      }),
    ],
  });
};
