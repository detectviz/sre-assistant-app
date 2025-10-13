import { dateTime } from '@grafana/data';
import { normaliseTimeRange, toIsoString } from '../timeRange';

describe('timeRange helpers', () => {
  it('將 DateTime 轉換為 ISO 字串以處理相對時間 now-6h', () => {
    const end = dateTime('2024-01-01T12:00:00Z');
    const start = dateTime('2024-01-01T12:00:00Z').subtract(6, 'hour');
    const result = normaliseTimeRange({ from: start, to: end });

    expect(result.from).toBe(dateTime('2024-01-01T06:00:00Z').toISOString());
    expect(result.to).toBe(end.toISOString());
  });

  it('保留已為字串的輸入，避免破壞既有序列化結果', () => {
    const from = '2024-01-01T00:00:00Z';
    const to = '2024-01-01T06:00:00Z';
    const result = normaliseTimeRange({ from, to });

    expect(result).toEqual({ from, to });
  });

  it('支援原生 Date 物件並轉成 ISO 字串', () => {
    const from = new Date('2024-01-01T00:00:00Z');
    const to = new Date('2024-01-01T06:00:00Z');

    expect(toIsoString(from)).toBe('2024-01-01T00:00:00.000Z');
    expect(toIsoString(to)).toBe('2024-01-01T06:00:00.000Z');
  });
});
