import { describe, expect, it } from 'vitest';
import { estimateLaunch, isLaunchMeasurementValid } from './launch';

describe('isLaunchMeasurementValid', () => {
  it('accepts plausible launch measurements only', () => {
    expect(isLaunchMeasurementValid({ ballSpeedMps: 60, launchAngleDeg: 14, launchAzimuthDeg: -2 })).toBe(true);
    expect(isLaunchMeasurementValid({ ballSpeedMps: 0, launchAngleDeg: 14, launchAzimuthDeg: 0 })).toBe(false);
  });
});

describe('estimateLaunch', () => {
  it('calculates a standard-environment estimate from a valid measurement', () => {
    const estimate = estimateLaunch('driver', { ballSpeedMps: 60, launchAngleDeg: 45, launchAzimuthDeg: 0 });
    expect(estimate?.carryMeters).toBeCloseTo(367.1, 0);
    expect(estimate?.totalMeters).toBeGreaterThan(estimate?.carryMeters ?? 0);
  });

  it('retains direction as signed offline distance', () => {
    const estimate = estimateLaunch('iron', { ballSpeedMps: 40, launchAngleDeg: 30, launchAzimuthDeg: 10 });
    expect(estimate?.directionDeg).toBe(10);
    expect(estimate?.offlineMeters).toBeGreaterThan(0);
  });
});
