import React from 'react';
import { css } from '@emotion/css';
import { Select } from '@grafana/ui';
import type { SelectableValue } from '@grafana/data';
import type { DataSourceInstanceSettings } from '@grafana/data';
import type { DataSourceRef } from '@grafana/schema';
import type { SceneComponentProps, SceneObjectState } from '@grafana/scenes';
import { SceneObjectBase } from '@grafana/scenes';
import { getDataSourceSrv } from '@grafana/runtime';

/**
 * 用於資料來源選擇器的狀態定義，負責維護選項與使用者選取值。
 */
interface DataSourceSelectControlState extends SceneObjectState {
  loading: boolean;
  options: Array<SelectableValue<DataSourceRef>>;
  value: SelectableValue<DataSourceRef> | null;
  error?: string;
}

/**
 * 資料來源選擇器的建構參數，限定資料來源類型並傳出選擇結果。
 */
interface DataSourceSelectControlOptions {
  pluginId: string;
  label: string;
  onChange: (ref: DataSourceRef | null) => void;
}

const containerStyles = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 240px;
`;

const labelStyles = css`
  font-size: 12px;
  font-weight: 500;
  color: var(--text-subtle, #6d7680);
`;

const errorStyles = css`
  font-size: 12px;
  color: var(--error-text, #e02f44);
`;

/**
 * Scene 物件版本的資料來源選擇控制元件，透過 getDataSourceSrv() 動態取得資料來源列表。
 */
export class DataSourceSelectControl extends SceneObjectBase<DataSourceSelectControlState> {
  static Component = DataSourceSelectControlRenderer;

  private readonly options: DataSourceSelectControlOptions;

  constructor(options: DataSourceSelectControlOptions) {
    super({
      loading: true,
      options: [],
      value: null,
    });

    this.options = options;
    this.loadOptions();
  }

  /**
   * 重新載入資料來源列表，並在找到唯一資料來源時自動套用。
   */
  reload() {
    this.loadOptions();
  }

  /**
   * 供 React renderer 呼叫，更新目前選擇值並通知查詢場景。
   */
  select(value: SelectableValue<DataSourceRef> | null) {
    this.setState({ value, error: undefined });
    this.options.onChange(value?.value ?? null);
  }

  /**
   * 回傳選擇器上顯示的標籤文字。
   */
  getLabel() {
    return this.options.label;
  }

  private loadOptions() {
    this.setState({ loading: true });

    try {
      const list = getDataSourceSrv().getList({ type: this.options.pluginId });
      const selectable = list.map(createOption);

      const previous = this.state.value?.value?.uid;
      const nextValue = selectable.find((item) => item.value?.uid === previous) ?? selectable[0] ?? null;

      this.setState({
        loading: false,
        options: selectable,
        value: nextValue,
        error: selectable.length === 0 ? `找不到 ${this.options.label} 資料來源` : undefined,
      });

      this.options.onChange(nextValue?.value ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '無法取得資料來源列表';
      this.setState({
        loading: false,
        options: [],
        value: null,
        error: message,
      });
      this.options.onChange(null);
    }
  }
}

function DataSourceSelectControlRenderer({ model }: SceneComponentProps<DataSourceSelectControl>) {
  const state = model.useState();

  return (
    <div className={containerStyles}>
      <span className={labelStyles}>{model.getLabel()} 資料來源</span>
      <Select
        menuShouldPortal
        aria-label={`${model.getLabel()} 資料來源選擇器`}
        placeholder={`選擇 ${model.getLabel()} 資料來源`}
        options={state.options}
        value={state.value ?? undefined}
        isLoading={state.loading}
        onChange={(next) => model.select(next ?? null)}
        isClearable
        noOptionsMessage="沒有可用的資料來源"
      />
      {state.error && <span className={errorStyles}>{state.error}</span>}
    </div>
  );
}

function createOption(instance: DataSourceInstanceSettings): SelectableValue<DataSourceRef> {
  return {
    label: instance.name,
    value: {
      uid: instance.uid,
      type: instance.type,
    },
    description: instance.type,
  };
}
