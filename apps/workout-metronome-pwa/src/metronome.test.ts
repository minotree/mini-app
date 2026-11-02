import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, beatIntervalMs, clampDurationSeconds, clampTempo, isAccentBeat, loadSettings, swingDurationMs } from './metronome';

describe('metronome settings', () => {
  it('keeps tempo within the supported range', () => {
    expect(clampTempo(20)).toBe(40);
    expect(clampTempo(175.4)).toBe(175);
    expect(clampTempo(300)).toBe(240);
    expect(clampDurationSeconds(10)).toBe(600);
  });

  it('calculates an interval from BPM', () => {
    expect(beatIntervalMs(120)).toBe(500);
    expect(swingDurationMs(120)).toBe(500);
  });

  it('marks the first beat in every group as an accent', () => {
    expect(isAccentBeat(1, 4)).toBe(true);
    expect(isAccentBeat(4, 4)).toBe(false);
    expect(isAccentBeat(5, 4)).toBe(true);
    expect(isAccentBeat(1, 0)).toBe(false);
  });

  it('loads only valid persisted settings', () => {
    expect(loadSettings('{"mode":"cycling","tempo":90,"soundEnabled":false,"vibrationEnabled":true,"beatGroup":3,"countInEnabled":false,"durationSeconds":1200}')).toEqual({
      mode: 'cycling', tempo: 90, soundEnabled: false, vibrationEnabled: true, beatGroup: 3, countInEnabled: false, durationSeconds: 1200
    });
    expect(loadSettings('{broken')).toEqual(DEFAULT_SETTINGS);
  });
});
