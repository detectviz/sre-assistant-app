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
import { handleLokiChat } from './actions';

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
          await handleLokiChat(
            message,
            mllm,
            queryRunner,
            { from: timeRangeValue.from.toString(), to: timeRangeValue.to.toString() }
          );
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
