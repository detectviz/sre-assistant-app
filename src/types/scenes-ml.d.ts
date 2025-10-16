/**
 * 為 @grafana/scenes-ml 套件提供最小型 TypeScript 宣告，確保編譯時能正確解析匯入的類別。
 */
declare module '@grafana/scenes-ml' {
  import type { SceneObjectBase, SceneObjectState, RuntimeDataSource } from '@grafana/scenes';
  import type { DataQuery } from '@grafana/data';

  export class SceneBaseliner extends SceneObjectBase<SceneObjectState> {
    constructor(options: Record<string, unknown>);
  }

  export class SceneOutlierDetector extends SceneObjectBase<SceneObjectState> {
    constructor(options: Record<string, unknown>);
  }

  export class SceneChangepointDetector extends SceneObjectBase<SceneObjectState> {
    constructor(options: Record<string, unknown>);
  }

  export class MLDemoDS extends RuntimeDataSource<DataQuery> {
    constructor(pluginId: string, uid: string);
  }
}
