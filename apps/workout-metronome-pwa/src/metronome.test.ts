import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, INTERVAL_PRESETS, beatIntervalMs, clampDurationSeconds, clampTempo, gpsSpeedKmh, intervalPosition, intervalTotalSeconds, isAccentBeat, loadSettings, normalizeIntervalPlan, shouldPlayIntervalCue, swingDurationMs } from './metronome';

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
    expect(loadSettings('{"environment":"outdoor","tempo":90,"soundEnabled":false,"vibrationEnabled":true,"beatGroup":3,"countInEnabled":false,"durationSeconds":1200}')).toEqual({
      ...DEFAULT_SETTINGS, environment: 'outdoor', tempo: 90, soundEnabled: false, vibrationEnabled: true, beatGroup: 3, countInEnabled: false, durationSeconds: 1200
    });
    expect(loadSettings('{"mode":"cycling","tempo":90}')).toEqual({ ...DEFAULT_SETTINGS, tempo: 90 });
    expect(loadSettings('{"beatSound":"wood"}').beatSound).toBe('wood');
    expect(loadSettings('{"beatSound":"unknown"}').beatSound).toBe('tick');
    expect(loadSettings('{"whistleEnabled":true}').whistleEnabled).toBe(true);
    expect(loadSettings('{broken')).toEqual(DEFAULT_SETTINGS);
  });

  it('shows only valid GPS speed in km/h', () => {
    expect(gpsSpeedKmh(5)).toBe(18);
    expect(gpsSpeedKmh(0)).toBe(0);
    expect(gpsSpeedKmh(null)).toBeNull();
    expect(gpsSpeedKmh(-1)).toBeNull();
  });

  it('switches interval segments and stops after the final recovery', () => {
    const plan = INTERVAL_PRESETS.short;
    expect(intervalTotalSeconds(plan)).toBe(1200);
    expect(intervalPosition(plan, 0)).toEqual({ round: 1, segment: 'work', segmentRemaining: 60, tempo: 180 });
    expect(intervalPosition(plan, 60)).toEqual({ round: 1, segment: 'recovery', segmentRemaining: 60, tempo: 150 });
    expect(intervalPosition(plan, 120)).toEqual({ round: 2, segment: 'work', segmentRemaining: 60, tempo: 180 });
    expect(intervalPosition(plan, 1199)).toEqual({ round: 10, segment: 'recovery', segmentRemaining: 1, tempo: 150 });
  });

  it('alerts only when an interval segment changes', () => {
    expect(shouldPlayIntervalCue(null, '1-work')).toBe(false);
    expect(shouldPlayIntervalCue('1-work', '1-work')).toBe(false);
    expect(shouldPlayIntervalCue('1-work', '1-recovery')).toBe(true);
    expect(shouldPlayIntervalCue('1-recovery', '2-work')).toBe(true);
  });

  it('clamps custom interval settings loaded from storage', () => {
    expect(normalizeIntervalPlan({ workSeconds: 5, recoverySeconds: 2000, workTempo: 300, recoveryTempo: 20, rounds: 100 })).toEqual({ workSeconds: 30, recoverySeconds: 1800, workTempo: 240, recoveryTempo: 40, rounds: 30 });
    expect(loadSettings('{"intervalMode":"custom","customInterval":{"workSeconds":60,"recoverySeconds":60,"workTempo":180,"recoveryTempo":140,"rounds":3}}').customInterval.rounds).toBe(3);
  });
});
