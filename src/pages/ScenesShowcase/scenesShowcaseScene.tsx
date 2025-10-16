import React from 'react';
import {
  AdHocFiltersVariable,
  CustomVariable,
  DataSourceVariable,
  EmbeddedScene,
  PanelBuilders,
  QueryVariable,
  RuntimeDataSource,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneComponentProps,
  SceneControlsSpacer,
  SceneDataTransformer,
  SceneDataQuery,
  SceneFlexItem,
  SceneFlexLayout,
  SceneGridItem,
  SceneGridLayout,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneQueryRunner,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  SplitLayout,
  TextBoxVariable,
  VariableValueSelectors,
  VizPanel,
  behaviors,
  sceneUtils,
} from '@grafana/scenes';
import { DashboardCursorSync, DataSourceRef } from '@grafana/schema';
import {
  DataFrame,
  DataQuery,
  DataQueryRequest,
  DataQueryResponse,
  FieldType,
  LoadingState,
  MutableDataFrame,
  PanelPlugin,
  PanelProps,
  TestDataSourceResponse,
} from '@grafana/data';
import { SceneBaseliner, SceneChangepointDetector, SceneOutlierDetector, MLDemoDS } from '@grafana/scenes-ml';
import { DataSourceSelectControl } from '../../components/DataSourceControls/DataSourceSelectControl';

const CUSTOM_VIZ_PLUGIN_ID = 'sre-assistant-scenes-showcase-custom-viz';
const RUNTIME_DS_TYPE = 'sre-assistant-scenes-runtime';
const RUNTIME_DS_UID = 'sre-assistant-scenes-runtime';
const ML_DEMO_DS_TYPE = 'ml-test';
const ML_DEMO_DS_UID = 'sre-assistant-ml-demo';

const DRILLDOWN_METRICS = [
  'prometheus_http_requests_total',
  'prometheus_http_request_duration_seconds_sum',
  'prometheus_http_request_duration_seconds_count',
];

let showcaseRegistrationsCompleted = false;

interface ShowcaseRuntimeQuery extends DataQuery {
  scenario: 'slo' | 'workload' | 'summary';
}

function createSloFrame(): DataFrame {
  return new MutableDataFrame({
    name: 'SLO 分佈',
    fields: [
      { name: '分類', type: FieldType.string, values: ['達成', '違反'] },
      { name: '百分比', type: FieldType.number, values: [92, 8] },
    ],
  });
}

function createWorkloadFrame(): DataFrame {
  return new MutableDataFrame({
    name: '請求分佈',
    fields: [
      { name: '端點', type: FieldType.string, values: ['/api/v1/query', '/api/v1/rules', '/api/v1/targets'] },
      { name: '每秒請求數', type: FieldType.number, values: [320, 140, 95] },
    ],
  });
}

function createSummaryFrame(): DataFrame {
  return new MutableDataFrame({
    name: '摘要指標',
    fields: [
      { name: '指標', type: FieldType.string, values: ['ErrorBudget', 'AlertCount', 'ActiveSeries'] },
      { name: '數值', type: FieldType.number, values: [98.2, 3, 128] },
    ],
  });
}

class ShowcaseRuntimeDataSource extends RuntimeDataSource<DataQuery> {
  constructor(pluginId: string, uid: string) {
    super(pluginId, uid);
  }

  async query(request: DataQueryRequest<DataQuery>): Promise<DataQueryResponse> {
    const frames: DataFrame[] = request.targets.map((target) => {
      const runtimeTarget = target as ShowcaseRuntimeQuery;

      switch (runtimeTarget.scenario) {
        case 'slo':
          return createSloFrame();
        case 'workload':
          return createWorkloadFrame();
        default:
          return createSummaryFrame();
      }
    });

    return Promise.resolve({
      state: LoadingState.Done,
      data: frames,
    });
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    return Promise.resolve({ status: 'success', message: 'OK' });
  }
}

interface ShowcaseVizOptions {
  message: string;
  highlight?: number;
}

function ShowcaseCustomVizPanel(props: PanelProps<ShowcaseVizOptions>) {
  const { options, data } = props;
  const firstFrame = data.series[0];

  const summaryText = firstFrame
    ? firstFrame.fields
        .map((field, index) => {
          const value = field.values.get(0);
          return `${field.name}: ${value}`;
        })
        .join(' | ')
    : '尚無資料';

  return (
    <div style={{ padding: '12px' }}>
      <h3 style={{ marginBottom: '8px' }}>自訂視覺化概覽</h3>
      <p style={{ marginBottom: '4px' }}>{options.message}</p>
      <p style={{ marginBottom: '8px' }}>資料摘要：{summaryText}</p>
      {typeof options.highlight === 'number' && (
        <p style={{ fontWeight: 600 }}>建議優先關注指標索引：{options.highlight}</p>
      )}
      <p style={{ fontSize: '12px', color: '#888' }}>點擊下方連結可導覽至對應的鑽取頁面。</p>
    </div>
  );
}

function createCustomVizPlugin() {
  return new PanelPlugin<ShowcaseVizOptions>(ShowcaseCustomVizPanel);
}

function ensureShowcaseRegistrations() {
  if (showcaseRegistrationsCompleted) {
    return;
  }

  sceneUtils.registerRuntimeDataSource({ dataSource: new ShowcaseRuntimeDataSource(RUNTIME_DS_TYPE, RUNTIME_DS_UID) });
  sceneUtils.registerRuntimeDataSource({ dataSource: new MLDemoDS(ML_DEMO_DS_TYPE, ML_DEMO_DS_UID) });
  sceneUtils.registerRuntimePanelPlugin({ pluginId: CUSTOM_VIZ_PLUGIN_ID, plugin: createCustomVizPlugin() });

  showcaseRegistrationsCompleted = true;
}

/**
 * 當資料來源被清除時，重置查詢執行器的狀態並停止進行中的請求。
 */
function resetRunnerData(runner: SceneQueryRunner) {
  runner.cancelQuery();
  runner.setState({ datasource: undefined, queries: [] });
}

/**
 * 指定實際資料來源後，更新查詢定義並立即執行查詢。
 */
function runRunnerWithDatasource(
  runner: SceneQueryRunner,
  datasource: DataSourceRef & { uid: string },
  queries: SceneDataQuery[]
) {
  runner.setState({ datasource, queries });
  runner.runQueries();
}

interface LatencyThresholdState extends SceneObjectState {
  threshold: number;
}

class LatencyThresholdController extends SceneObjectBase<LatencyThresholdState> {
  static Component = LatencyThresholdRenderer;

  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['threshold'] });

  private readonly baseQueries: SceneDataQuery[];
  private currentDatasource: DataSourceRef | null = null;

  constructor(private readonly runner: SceneQueryRunner, baseQueries: SceneDataQuery[]) {
    super({ threshold: 300 });
    this.baseQueries = baseQueries.map((query) => ({ ...query }));

    this.addActivationHandler(() => {
      const sub = this.subscribeToState((state) => {
        if (!this.currentDatasource) {
          return;
        }

        this.runner.setState({ queries: this.buildQueries(state.threshold) });
        this.runner.runQueries();
      });

      return () => sub.unsubscribe();
    });
  }

  /**
   * 套用使用者選擇的資料來源並執行查詢，若未選擇則重置狀態。
   */
  applyDatasource(ref: DataSourceRef | null) {
    this.currentDatasource = ref;

    if (!ref || !ref.uid) {
      resetRunnerData(this.runner);
      return;
    }

    const targetRef = { ...ref, uid: ref.uid };

    runRunnerWithDatasource(this.runner, targetRef, this.buildQueries(this.state.threshold));
  }

  getUrlState(): SceneObjectUrlValues {
    return { threshold: String(this.state.threshold) };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    const urlValue = values.threshold;
    if (typeof urlValue === 'string') {
      const parsed = Number(urlValue);
      if (!Number.isNaN(parsed)) {
        this.setState({ threshold: parsed });
      }
    }
  }

  onThresholdChange = (value: number) => {
    this._urlSync.performBrowserHistoryAction(() => {
      this.setState({ threshold: value });
    });
  };

  private buildQueries(threshold: number): SceneDataQuery[] {
    return this.baseQueries.map((query, index) => {
      if (index === 1) {
        return { ...query, expr: `vector(${threshold})` };
      }

      return { ...query };
    });
  }
}

function LatencyThresholdRenderer({ model }: SceneComponentProps<LatencyThresholdController>) {
  const { threshold } = model.useState();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <label style={{ fontWeight: 600 }}>延遲閾值 (毫秒)</label>
      <input
        type="number"
        value={threshold}
        onChange={(event) => model.onThresholdChange(Number(event.target.value))}
        style={{ width: '120px' }}
      />
    </div>
  );
}

interface QueryStatusState extends SceneObjectState {
  lastRun?: string;
  lastError?: string | null;
}

class QueryStatusIndicator extends SceneObjectBase<QueryStatusState> {
  static Component = QueryStatusRenderer;

  constructor(private readonly runner: SceneQueryRunner) {
    super({ lastRun: undefined, lastError: null });

    this.addActivationHandler(() => {
      const sub = this.runner.subscribeToState((state) => {
        const lastError = state.data?.error?.message ?? null;
        this.setState({
          lastRun: new Date().toISOString(),
          lastError,
        });
      });

      return () => sub.unsubscribe();
    });
  }
}

function QueryStatusRenderer({ model }: SceneComponentProps<QueryStatusIndicator>) {
  const { lastRun, lastError } = model.useState();

  return (
    <div style={{ padding: '12px', border: '1px solid var(--border-weak)', borderRadius: '4px' }}>
      <strong>查詢狀態監視器</strong>
      <div>最後執行時間：{lastRun ?? '尚未執行'}</div>
      <div style={{ color: lastError ? 'var(--error-text)' : 'var(--success-text)' }}>
        {lastError ? `最近錯誤：${lastError}` : '目前狀態：正常'}
      </div>
    </div>
  );
}

interface DrilldownListState extends SceneObjectState {
  basePath: string;
}

class DrilldownList extends SceneObjectBase<DrilldownListState> {
  static Component = DrilldownListRenderer;

  constructor(basePath: string) {
    super({ basePath });
  }
}

function DrilldownListRenderer({ model }: SceneComponentProps<DrilldownList>) {
  const { basePath } = model.useState();

  return (
    <div style={{ padding: '12px' }}>
      <h4 style={{ marginBottom: '8px' }}>鑽取導覽</h4>
      <p style={{ marginBottom: '8px' }}>選擇任一指標進入對應的鑽取頁面：</p>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        {DRILLDOWN_METRICS.map((metric) => (
          <li key={metric} style={{ marginBottom: '4px' }}>
            <a href={`${basePath}/metric/${encodeURIComponent(metric)}`}>{metric}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface DescriptionBlockState extends SceneObjectState {
  title: string;
  detail: string;
  docsLink?: string;
}

class DescriptionBlock extends SceneObjectBase<DescriptionBlockState> {
  static Component = DescriptionBlockRenderer;

  constructor(state: DescriptionBlockState) {
    super(state);
  }
}

function DescriptionBlockRenderer({ model }: SceneComponentProps<DescriptionBlock>) {
  const { title, detail, docsLink } = model.useState();

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '6px',
        border: '1px solid var(--border-weak)',
        background: 'var(--panel-bg)',
        boxShadow: 'var(--shadow-median)',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '8px' }}>{title}</h3>
      <p style={{ margin: 0, lineHeight: 1.6 }}>{detail}</p>
      {docsLink && (
        <p style={{ margin: '8px 0 0' }}>
          <a href={docsLink} target="_blank" rel="noreferrer">
            參考官方文件
          </a>
        </p>
      )}
    </div>
  );
}

interface DescribedFlexItemOptions {
  description: DescriptionBlockState;
  content:
    | VizPanel
    | SplitLayout
    | SceneGridLayout
    | SceneCSSGridLayout
    | DrilldownList
    | QueryStatusIndicator
    | SceneObjectBase<any>;
  minHeight?: number;
  descriptionMinHeight?: number;
  contentMinHeight?: number;
}

function createDescribedFlexItem({
  description,
  content,
  minHeight = 320,
  descriptionMinHeight = 112,
  contentMinHeight,
}: DescribedFlexItemOptions): SceneFlexItem {
  const effectiveContentMinHeight = contentMinHeight ?? Math.max(minHeight - descriptionMinHeight, 160);

  return new SceneFlexItem({
    minHeight,
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          minHeight: descriptionMinHeight,
          body: new DescriptionBlock(description),
        }),
        new SceneFlexItem({
          minHeight: effectiveContentMinHeight,
          body: content,
        }),
      ],
    }),
  });
}

export function buildCoreAndLayoutsScene(): EmbeddedScene {
  ensureShowcaseRegistrations();

  const timeRange = new SceneTimeRange({ from: 'now-6h', to: 'now' });

  const httpRequestQueries = () => [
    {
      refId: 'A',
      expr: 'sum by (instance)(rate(prometheus_http_requests_total{job="prometheus"}[5m]))',
    },
  ];
  const httpRequests = new SceneQueryRunner({
    queries: [],
    $timeRange: timeRange,
    maxDataPoints: 300,
  });

  const statusBreakdownQueries = () => [
    {
      refId: 'B',
      expr: 'topk(5, sum by (code)(rate(prometheus_http_requests_total{job="prometheus"}[5m])))',
    },
  ];
  const statusBreakdown = new SceneQueryRunner({
    queries: [],
    $timeRange: timeRange,
  });

  const statusTableQueries = () => [
    {
      refId: 'C',
      expr: 'sum by (handler)(rate(prometheus_http_requests_total{job="prometheus"}[5m]))',
      format: 'table',
      instant: true,
    },
  ];
  const statusTable = new SceneQueryRunner({
    queries: [],
  });

  const cpuUsageQueries = () => [
    {
      refId: 'D',
      expr: 'avg by (instance)(rate(process_cpu_seconds_total{job="prometheus"}[5m]))',
    },
  ];
  const cpuUsage = new SceneQueryRunner({
    queries: [],
    $timeRange: timeRange,
  });

  const latencyQueries: SceneDataQuery[] = [
    {
      refId: 'A',
      expr: 'histogram_quantile(0.9, sum by (le)(rate(prometheus_http_request_duration_seconds_bucket{job="prometheus"}[5m]))) * 1000',
      legendFormat: 'P90 延遲 (毫秒)',
    },
    {
      refId: 'B',
      expr: 'vector(300)',
      legendFormat: '目標閾值 (毫秒)',
    },
  ];

  const latencyRunner = new SceneQueryRunner({
    queries: [],
    $timeRange: timeRange,
  });

  const latencyController = new LatencyThresholdController(latencyRunner, latencyQueries);
  const statusIndicator = new QueryStatusIndicator(httpRequests);

  const prometheusRunners = [
    { runner: httpRequests, getQueries: httpRequestQueries },
    { runner: statusBreakdown, getQueries: statusBreakdownQueries },
    { runner: statusTable, getQueries: statusTableQueries },
    { runner: cpuUsage, getQueries: cpuUsageQueries },
  ];

  const datasourceSelector = new DataSourceSelectControl({
    pluginId: 'prometheus',
    label: 'Prometheus',
    onChange: (ref: DataSourceRef | null) => {
      if (!ref || !ref.uid) {
        prometheusRunners.forEach(({ runner }) => resetRunnerData(runner));
        latencyController.applyDatasource(null);
        return;
      }

      const targetRef = { ...ref, uid: ref.uid };

      prometheusRunners.forEach(({ runner, getQueries }) => {
        runRunnerWithDatasource(runner, targetRef, getQueries());
      });

      latencyController.applyDatasource(targetRef);
    },
  });

  return new EmbeddedScene({
    $timeRange: timeRange,
    $behaviors: [new behaviors.CursorSync({ key: 'scenes-showcase-cursor', sync: DashboardCursorSync.Tooltip })],
    controls: [
      datasourceSelector,
      latencyController,
      new SceneControlsSpacer(),
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneRefreshPicker({ intervals: ['15s', '1m', '5m'], isOnCanvas: true }),
    ],
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          minHeight: 160,
          body: new DescriptionBlock({
            title: 'EmbeddedScene 與 SceneFlexLayout',
            detail:
              '根容器使用 EmbeddedScene 並結合 SceneFlexLayout 管理整體頁面配置，同時示範 CursorSync 行為與時間控制元件的擴充能力。',
          }),
        }),
        createDescribedFlexItem({
          description: {
            title: 'SplitLayout 可調整分割視圖',
            detail:
              'SplitLayout 透過滑桿讓使用者自由調整左右區塊比例，左側呈現 PanelBuilders.timeseries 建立的時間序列，右側顯示表格視圖。',
          },
          content: new SplitLayout({
            direction: 'row',
            primary: PanelBuilders.timeseries().setTitle('HTTP 請求速率').setData(httpRequests).build(),
            secondary: PanelBuilders.table().setTitle('端點請求明細').setData(statusTable).build(),
          }),
          minHeight: 360,
        }),
        createDescribedFlexItem({
          description: {
            title: 'SceneGridLayout 傳統儀表板網格',
            detail:
              'SceneGridLayout 模擬傳統儀表板的格線排版，結合 PanelBuilders.barchart 與 PanelBuilders.timeseries 呈現多面向指標。',
          },
          content: new SceneGridLayout({
            children: [
              new SceneGridItem({
                x: 0,
                y: 0,
                width: 12,
                height: 8,
                body: PanelBuilders.barchart().setTitle('狀態碼分佈').setData(statusBreakdown).build(),
              }),
              new SceneGridItem({
                x: 12,
                y: 0,
                width: 12,
                height: 8,
                body: PanelBuilders.timeseries()
                  .setTitle('CPU 使用率')
                  .setData(cpuUsage)
                  .setUnit('percentunit')
                  .build(),
              }),
            ],
          }),
          minHeight: 360,
        }),
        createDescribedFlexItem({
          description: {
            title: 'SceneCSSGridLayout 現代化彈性網格',
            detail:
              'SceneCSSGridLayout 建立自動換行的彈性卡片區塊，適合展示多個統計與趨勢面板，並支援 PanelBuilders.stat 搭配單位設定。',
          },
          content: new SceneCSSGridLayout({
            templateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            columnGap: 2,
            rowGap: 2,
            children: [
              new SceneCSSGridItem({
                body: PanelBuilders.stat().setTitle('P90 延遲').setData(latencyRunner).setUnit('ms').build(),
              }),
              new SceneCSSGridItem({
                body: PanelBuilders.stat()
                  .setTitle('平均 CPU 使用率')
                  .setData(cpuUsage)
                  .setUnit('percentunit')
                  .build(),
              }),
              new SceneCSSGridItem({
                body: PanelBuilders.timeseries()
                  .setTitle('延遲追蹤')
                  .setData(latencyRunner)
                  .build(),
              }),
            ],
          }),
          minHeight: 360,
        }),
        createDescribedFlexItem({
          description: {
            title: 'Activation Handler 與查詢狀態監控',
            detail:
              '自訂 QueryStatusIndicator 透過 Activation Handler 訂閱 SceneQueryRunner 狀態，示範在場景中嵌入營運監控資訊的方式。',
          },
          content: statusIndicator,
          minHeight: 220,
          descriptionMinHeight: 112,
          contentMinHeight: 108,
        }),
      ],
    }),
  });
}

export function buildDataAndVisualizationScene(basePath: string): EmbeddedScene {
  ensureShowcaseRegistrations();

  const timeRange = new SceneTimeRange({ from: 'now-1h', to: 'now' });

  const latencyTrendQueries = () => [
    {
      refId: 'A',
      expr: 'sum by (handler)(rate(prometheus_http_request_duration_seconds_sum{job="prometheus"}[5m])) * 1000',
    },
  ];
  const latencyTrendRunner = new SceneQueryRunner({
    queries: [],
    $timeRange: timeRange,
  });

  const rawLatencyTableQueries = () => [
    {
      refId: 'B',
      expr: 'sort_desc(avg by(handler) (rate(prometheus_http_request_duration_seconds_sum{job="prometheus"}[5m]) * 1e3))',
      format: 'table',
      instant: true,
    },
  ];
  const rawLatencyTable = new SceneQueryRunner({
    queries: [],
  });

  const transformedLatency = new SceneDataTransformer({
    $data: rawLatencyTable,
    transformations: [
      {
        id: 'organize',
        options: {
          renameByName: {
            Value: '平均延遲 (毫秒)',
          },
        },
      },
    ],
  });

  const runtimePieRunner = new SceneQueryRunner({
    datasource: { uid: RUNTIME_DS_UID, type: RUNTIME_DS_TYPE },
    queries: [{ refId: 'C', scenario: 'slo' }],
  });

  const runtimeWorkloadRunner = new SceneQueryRunner({
    datasource: { uid: RUNTIME_DS_UID, type: RUNTIME_DS_TYPE },
    queries: [{ refId: 'D', scenario: 'workload' }],
  });

  const runtimeSummaryRunner = new SceneQueryRunner({
    datasource: { uid: RUNTIME_DS_UID, type: RUNTIME_DS_TYPE },
    queries: [{ refId: 'E', scenario: 'summary' }],
  });

  const datasourceSelector = new DataSourceSelectControl({
    pluginId: 'prometheus',
    label: 'Prometheus',
    onChange: (ref: DataSourceRef | null) => {
      if (!ref || !ref.uid) {
        resetRunnerData(latencyTrendRunner);
        resetRunnerData(rawLatencyTable);
        return;
      }

      const targetRef = { ...ref, uid: ref.uid };

      runRunnerWithDatasource(latencyTrendRunner, targetRef, latencyTrendQueries());
      runRunnerWithDatasource(rawLatencyTable, targetRef, rawLatencyTableQueries());
    },
  });

  return new EmbeddedScene({
    $timeRange: timeRange,
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          minHeight: 160,
          body: new DescriptionBlock({
            title: '資料管線與視覺化概觀',
            detail:
              '此分頁聚焦 SceneQueryRunner、SceneDataTransformer 以及自訂 RuntimeDataSource，展示如何從 Prometheus 與自訂資料混合組裝視覺化。',
          }),
        }),
        createDescribedFlexItem({
          description: {
            title: 'SceneQueryRunner 與 PanelBuilders.timeseries',
            detail: '使用 SceneQueryRunner 連接 Prometheus，再透過 PanelBuilders.timeseries 呈現延遲趨勢。',
          },
          content: PanelBuilders.timeseries().setTitle('延遲趨勢').setData(latencyTrendRunner).build(),
          minHeight: 320,
        }),
        createDescribedFlexItem({
          description: {
            title: 'SceneDataTransformer 整理資料表',
            detail: 'SceneDataTransformer 以 organize 轉換重新命名欄位，搭配 PanelBuilders.table 呈現指標排行榜。',
          },
          content: PanelBuilders.table().setTitle('資料轉換：延遲排行榜').setData(transformedLatency).build(),
          minHeight: 300,
        }),
        createDescribedFlexItem({
          description: {
            title: 'RuntimeDataSource 搭配 PieChart',
            detail: '自訂 RuntimeDataSource 回傳的 SLO 分類透過 PanelBuilders.piechart 展示，適合臨時計算或整合外部 API。',
          },
          content: PanelBuilders.piechart().setTitle('SLO 自訂資料源').setData(runtimePieRunner).build(),
          minHeight: 300,
        }),
        createDescribedFlexItem({
          description: {
            title: '自訂資料源長條圖',
            detail: '同一 RuntimeDataSource 也可生成負載長條圖，說明 Scenes 可重複利用查詢邏輯。',
          },
          content: PanelBuilders.barchart().setTitle('端點負載 (自訂資料源)').setData(runtimeWorkloadRunner).build(),
          minHeight: 300,
        }),
        createDescribedFlexItem({
          description: {
            title: '自訂 VizPanel 與外掛註冊',
            detail:
              '透過 sceneUtils.registerRuntimePanelPlugin 註冊自訂 VizPanel，展示自訂訊息並提供鑽取建議。',
          },
          content: new VizPanel({
            pluginId: CUSTOM_VIZ_PLUGIN_ID,
            title: '自訂視覺化 (Drilldown 入口)',
            options: { message: '以下指標可協助鎖定需要深度分析的服務', highlight: 1 },
            fieldConfig: { defaults: {}, overrides: [] },
            $data: runtimeSummaryRunner,
          }),
          minHeight: 280,
        }),
        createDescribedFlexItem({
          description: {
            title: 'Drilldown 導覽元件',
            detail: '自訂 DrilldownList 場景物件提供指標清單，串接 SceneAppPage 鑽取路由完成分層分析流程。',
          },
          content: new DrilldownList(basePath),
          minHeight: 220,
          descriptionMinHeight: 120,
          contentMinHeight: 80,
        }),
      ],
    }),
    controls: [datasourceSelector, new SceneControlsSpacer(), new SceneTimePicker({ isOnCanvas: true })],
  });
}

export function buildInteractivityScene(): EmbeddedScene {
  ensureShowcaseRegistrations();

  const timeRange = new SceneTimeRange({ from: 'now-1h', to: 'now' });

  const dataSourceVariable = new DataSourceVariable({
    name: 'promSource',
    label: 'Prometheus 資料源',
    pluginId: 'prometheus',
    regex: '',
  });

  const jobVariable = new QueryVariable({
    name: 'job',
    label: '服務工作',
    datasource: null,
    query: {
      refId: 'Job',
      query: 'label_values(up, job)',
    },
    value: 'prometheus',
  });

  const statusVariable = new CustomVariable({
    name: 'statusFilter',
    label: 'HTTP 狀態範圍',
    query: '全部:.*,成功:2..*,重新導向:3..*,用戶錯誤:4..*,伺服器錯誤:5..*',
    value: '.*',
  });

  const metricVariable = new TextBoxVariable({
    name: 'metricName',
    label: '指標名稱',
    value: 'prometheus_http_requests_total',
  });

  const adhocVariable = new AdHocFiltersVariable({
    name: 'Filters',
    label: '臨時篩選',
    datasource: null,
    filters: [],
    applyMode: 'manual',
  });

  const variableSet = new SceneVariableSet({
    variables: [dataSourceVariable, jobVariable, statusVariable, metricVariable, adhocVariable],
  });

  const interactiveRunner = new SceneQueryRunner({
    datasource: { uid: '${promSource}', type: 'prometheus' },
    queries: [
      {
        refId: 'A',
        expr: 'sum by (instance)(rate(${metricName:raw}{job=~"$job",code=~"$statusFilter",$Filters}[5m]))',
      },
    ],
    $timeRange: timeRange,
  });

  const datasourceSelector = new DataSourceSelectControl({
    pluginId: 'prometheus',
    label: 'Prometheus',
    onChange: (ref: DataSourceRef | null) => {
      if (!ref || !ref.uid) {
        adhocVariable.setState({ datasource: null, filters: [] });
        jobVariable.setState({ datasource: null });
        interactiveRunner.cancelQuery();
        return;
      }

      const targetRef = { ...ref, uid: ref.uid };

      dataSourceVariable.changeValueTo(targetRef.uid, targetRef.uid, true);
      jobVariable.setState({ datasource: targetRef });
      jobVariable.refreshOptions();
      adhocVariable.setState({ datasource: targetRef, filters: [] });
      interactiveRunner.runQueries();
    },
  });

  return new EmbeddedScene({
    $timeRange: timeRange,
    $variables: variableSet,
    $data: interactiveRunner,
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          minHeight: 160,
          body: new DescriptionBlock({
            title: '變數、臨時篩選與 URL 同步',
            detail:
              'SceneVariableSet 集中管理 DataSourceVariable、QueryVariable、CustomVariable、TextBoxVariable 與 AdHocFiltersVariable，搭配 URL 同步讓互動狀態可分享。',
          }),
        }),
        createDescribedFlexItem({
          description: {
            title: 'VariableValueSelectors 與動態查詢',
            detail:
              'VariableValueSelectors 在控制列呈現變數介面，PanelBuilders.timeseries 使用插值語法引用使用者選項並即時更新查詢結果。',
          },
          content: PanelBuilders.timeseries().setTitle('互動查詢結果').build(),
          minHeight: 340,
        }),
      ],
    }),
    controls: [
      datasourceSelector,
      new VariableValueSelectors({}),
      new SceneControlsSpacer(),
      new SceneTimePicker({ isOnCanvas: true }),
    ],
  });
}

export function buildMachineLearningScene(): EmbeddedScene {
  ensureShowcaseRegistrations();

  const forecastRunner = new SceneQueryRunner({
    queries: [{ refId: 'A', datasource: { uid: ML_DEMO_DS_UID, type: ML_DEMO_DS_TYPE }, type: 'forecasts' }],
  });

  const outlierRunner = new SceneQueryRunner({
    queries: [{ refId: 'B', datasource: { uid: ML_DEMO_DS_UID, type: ML_DEMO_DS_TYPE }, type: 'outliers' }],
  });

  const changepointRunner = new SceneQueryRunner({
    queries: [{ refId: 'C', datasource: { uid: ML_DEMO_DS_UID, type: ML_DEMO_DS_TYPE }, type: 'changepoints' }],
  });

  return new EmbeddedScene({
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          minHeight: 160,
          body: new DescriptionBlock({
            title: 'Scenes ML 能力總覽',
            detail:
              'Scenes ML 套件提供基線預測、離群值與變更點偵測。以下範例透過 MLDemoDS 提供的資料模擬常見監控情境。',
          }),
        }),
        createDescribedFlexItem({
          description: {
            title: 'SceneBaseliner 預測與容忍區間',
            detail:
              'SceneBaseliner 在圖表上套用基線模型與上下限視覺化，可用於容量規畫或異常偵測的預測先驗。',
          },
          content: PanelBuilders.timeseries()
            .setTitle('預測與基線')
            .setData(forecastRunner)
            .setHeaderActions([new SceneBaseliner({ interval: 0.95 })])
            .build(),
          minHeight: 340,
        }),
        createDescribedFlexItem({
          description: {
            title: 'SceneOutlierDetector 離群值標註',
            detail: '離群值偵測器可自動標示異常序列並新增標註，以協助即時調查。',
          },
          content: PanelBuilders.timeseries()
            .setTitle('離群值偵測')
            .setData(outlierRunner)
            .setHeaderActions([
              new SceneOutlierDetector({
                sensitivity: 0.6,
                addAnnotations: true,
              }),
            ])
            .build(),
          minHeight: 340,
        }),
        createDescribedFlexItem({
          description: {
            title: 'SceneChangepointDetector 變更點分析',
            detail: '變更點偵測器偵測指標趨勢轉折，可依需要啟用或停用並搭配自訂回呼處理。',
          },
          content: PanelBuilders.timeseries()
            .setTitle('變更點偵測')
            .setData(changepointRunner)
            .setHeaderActions([
              new SceneChangepointDetector({
                enabled: false,
              }),
            ])
            .build(),
          minHeight: 340,
        }),
      ],
    }),
  });
}

export function buildRuntimeMetricDrilldownScene(metricId: string): EmbeddedScene {
  ensureShowcaseRegistrations();

  const timeRange = new SceneTimeRange({ from: 'now-12h', to: 'now' });

  const detailQueries = () => [
    {
      refId: 'A',
      expr: `sum by (instance)(rate(${metricId}{job="prometheus"}[5m]))`,
    },
  ];
  const detailRunner = new SceneQueryRunner({
    queries: [],
    $timeRange: timeRange,
  });

  const totalQueries = () => [
    {
      refId: 'B',
      expr: `sum(rate(${metricId}{job="prometheus"}[5m]))`,
    },
  ];
  const totalRunner = new SceneQueryRunner({
    queries: [],
    $timeRange: timeRange,
  });

  const labelBreakdownQueries = () => [
    {
      refId: 'C',
      expr: `sum by (job, instance)(rate(${metricId}{job="prometheus"}[5m]))`,
      format: 'table',
      instant: true,
    },
  ];
  const labelBreakdownRunner = new SceneQueryRunner({
    queries: [],
  });

  const datasourceSelector = new DataSourceSelectControl({
    pluginId: 'prometheus',
    label: 'Prometheus',
    onChange: (ref: DataSourceRef | null) => {
      if (!ref || !ref.uid) {
        resetRunnerData(detailRunner);
        resetRunnerData(totalRunner);
        resetRunnerData(labelBreakdownRunner);
        return;
      }

      const targetRef = { ...ref, uid: ref.uid };

      runRunnerWithDatasource(detailRunner, targetRef, detailQueries());
      runRunnerWithDatasource(totalRunner, targetRef, totalQueries());
      runRunnerWithDatasource(labelBreakdownRunner, targetRef, labelBreakdownQueries());
    },
  });

  return new EmbeddedScene({
    $timeRange: timeRange,
    controls: [datasourceSelector, new SceneControlsSpacer(), new SceneTimePicker({ isOnCanvas: true })],
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          minHeight: 160,
          body: new DescriptionBlock({
            title: '鑽取頁面與 URL 參數',
            detail:
              'SceneAppPage drilldown 透過路由參數取得 metricId，並沿用 SceneTimePicker 控制時間範圍，維持上下頁面狀態一致。',
          }),
        }),
        createDescribedFlexItem({
          description: {
            title: '時間序列詳圖',
            detail: 'PanelBuilders.timeseries 以 SceneQueryRunner 取得的鑽取查詢提供逐實例分析。',
          },
          content: PanelBuilders.timeseries().setTitle(`${metricId} - 時間序列`).setData(detailRunner).build(),
          minHeight: 340,
        }),
        createDescribedFlexItem({
          description: {
            title: '統計摘要',
            detail: 'PanelBuilders.stat 彙整整體指標趨勢，方便快速評估影響程度。',
          },
          content: PanelBuilders.stat().setTitle('總體趨勢').setData(totalRunner).build(),
          minHeight: 220,
          descriptionMinHeight: 112,
          contentMinHeight: 108,
        }),
        createDescribedFlexItem({
          description: {
            title: '標籤切分表格',
            detail: 'PanelBuilders.table 展現各標籤的切分資訊，可結合臨時篩選快速縮小問題範圍。',
          },
          content: PanelBuilders.table().setTitle('標籤切分詳情').setData(labelBreakdownRunner).build(),
          minHeight: 300,
        }),
      ],
    }),
  });
}

export function getDrilldownMetrics() {
  return DRILLDOWN_METRICS;
}
