import { describe, expect, it } from 'vitest';
import { estimateSpeedKmh } from './location';

describe('위치 기반 참고 속도', () => {
  const first = { latitude: 37.5, longitude: 127, accuracy: 5, timestamp: 1_000 };
  it('첫 위치나 정확도가 낮은 위치는 속도로 표시하지 않는다', () => {
    expect(estimateSpeedKmh(null, first)).toBeNull();
    expect(estimateSpeedKmh(first, { ...first, accuracy: 100, timestamp: 4_000 })).toBeNull();
  });
  it('의미 있는 이동이 없으면 0으로 표시한다', () => {
    expect(estimateSpeedKmh(first, { ...first, timestamp: 4_000 })).toBe(0);
  });
  it('짧은 이동의 속도를 km/h로 계산하고 비현실적인 급변은 버린다', () => {
    const walking = estimateSpeedKmh(first, { ...first, latitude: 37.50009, timestamp: 4_000 });
    expect(walking).toBeGreaterThan(10);
    expect(walking).toBeLessThan(15);
    expect(estimateSpeedKmh(first, { ...first, latitude: 37.51, timestamp: 4_000 })).toBeNull();
  });
});
