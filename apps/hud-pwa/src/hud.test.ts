import { describe, expect, it } from 'vitest';
import { DEFAULT_HUD_SETTINGS, loadHudSettings, smoothSpeed, speedKmhFromMetersPerSecond } from './hud';

describe('speedKmhFromMetersPerSecond', () => {
  it('converts speed and cuts off low speed', () => {
    expect(speedKmhFromMetersPerSecond(null)).toBe(0);
    expect(speedKmhFromMetersPerSecond(0.8)).toBe(0);
    expect(speedKmhFromMetersPerSecond(10)).toBe(36);
  });
});

describe('smoothSpeed', () => {
  it('uses the first reading then applies EMA', () => {
    expect(smoothSpeed(null, 30)).toBe(30);
    expect(smoothSpeed(30, 50, 0.25)).toBe(35);
  });
});

describe('loadHudSettings', () => {
  it('keeps only safe persisted display settings', () => {
    expect(loadHudSettings('{"color":"#00FFFF","fontScale":1.2,"fontWeight":700,"mirror":true}')).toEqual({
      color: '#00FFFF', fontScale: 1.2, fontWeight: 700, mirror: true
    });
    expect(loadHudSettings('{"color":"red","fontScale":9}')).toEqual(DEFAULT_HUD_SETTINGS);
    expect(loadHudSettings('{broken')).toEqual(DEFAULT_HUD_SETTINGS);
  });
});
