import { describe, expect, it } from 'vitest';
import { estimateSpeed } from './location';

describe('estimateSpeed', () => {
  const first = { latitude: 37, longitude: 127, accuracy: 5, timestamp: 0 };

  it('waits for two reliable fixes and rejects implausible samples', () => {
    expect(estimateSpeed(null, first)).toBeNull();
    expect(estimateSpeed(first, { ...first, accuracy: 80, timestamp: 3000 })).toBeNull();
    expect(estimateSpeed(first, { ...first, timestamp: 1000 })).toBeNull();
    expect(estimateSpeed(first, { ...first, timestamp: 3000 })).toBe(0);
    expect(estimateSpeed(first, { ...first, latitude: 37.0001, timestamp: 3000 })).toBeGreaterThan(10);
  });
});
