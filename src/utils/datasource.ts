import { useEffect, useState } from 'react';
import type { DataSourceInstanceSettings, SelectableValue } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';

/**
 * @section 4.2 前端資料互動流程
 * 依據《docs/architecture.md》第 4.2 節，本工具函式協助 Scenes 元件載入使用者可選擇的資料來源，
 * 讓指標與日誌查詢能針對實際環境的 Prometheus 與 Loki 資料源執行。
 */
export type DataSourceOption = SelectableValue<string>;

async function fetchDataSources(): Promise<DataSourceInstanceSettings[]> {
  const srv = getDataSourceSrv();
  const list = await srv.getList();
  return Array.isArray(list) ? list : [];
}

function toOption(item: DataSourceInstanceSettings): DataSourceOption {
  const uid = item.uid ?? item.name;
  return {
    label: item.name ?? uid,
    value: uid,
    description: item.type ?? item.meta?.id,
  };
}

export async function loadDataSourceOptions(types: string[] = []): Promise<DataSourceOption[]> {
  const list = await fetchDataSources();
  const filtered = list.filter((item) => {
    if (!types.length) {
      return true;
    }
    const itemType = item.type ?? item.meta?.id;
    return itemType ? types.includes(itemType) : false;
  });

  return filtered
    .map(toOption)
    .sort((a, b) => (a.label ?? '').localeCompare(b.label ?? ''));
}

export function useDataSourceOptions(types: string[] = []): {
  options: DataSourceOption[];
  loading: boolean;
  error?: string;
} {
  const [options, setOptions] = useState<DataSourceOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>();
  const sortedTypes = [...types].sort();
  const key = sortedTypes.join(',');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    loadDataSourceOptions(sortedTypes)
      .then((result) => {
        if (!cancelled) {
          setOptions(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : '載入資料來源失敗';
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { options, loading, error };
}
