import type { DateTime } from '@grafana/data';

/**
 * @section 4.2 資料互動流程
 * 將 SceneTimeRange 的 value 轉換為 RFC3339 時間字串，確保後端 Resource API 能解析。
 */
export interface GrafanaTimeRangeLike {
  from: unknown;
  to: unknown;
}

type ConvertibleTime = DateTime | Date | string | null | undefined;

/**
 * 依據 architecture.md 的資料流程，前端需將 Scenes 提供的時間範圍統一序列化為 ISO 字串。
 */
export const toIsoString = (value: ConvertibleTime): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (value == null) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const maybeTime = value as { toISOString?: () => string; toDate?: () => Date };
    if (typeof maybeTime.toISOString === 'function') {
      return maybeTime.toISOString();
    }
    if (typeof maybeTime.toDate === 'function') {
      return maybeTime.toDate().toISOString();
    }
  }

  return String(value);
};

/**
 * 提供 SceneTimeRange.value 的統一序列化結果，避免出現相對時間字串造成後端解析失敗。
 */
export const normaliseTimeRange = (range: GrafanaTimeRangeLike): { from: string; to: string } => {
  return {
    from: toIsoString(range.from as ConvertibleTime),
    to: toIsoString(range.to as ConvertibleTime),
  };
};
