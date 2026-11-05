import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, estimateCalories, intervalPlanFor, intervalPosition, intervalTotalSeconds, loadSettings, normalizeIntervalPlan } from './domain';

describe('토스 메트로놈 운동 규칙', () => {
  it('짧은 반복은 빠른·회복 구간을 10회 진행한다', () => {
    const plan = intervalPlanFor({ ...DEFAULT_SETTINGS, intervalMode: 'short' });
    expect(plan).not.toBeNull();
    if (!plan) return;
    expect(intervalTotalSeconds(plan)).toBe(1200);
    expect(intervalPosition(plan, 60).segment).toBe('recovery');
    expect(intervalPosition(plan, 120).round).toBe(2);
  });
  it('인터벌 앞뒤에 워밍업과 쿨다운을 포함한다', () => {
    const plan = { workSeconds: 60, recoverySeconds: 60, workTempo: 180, recoveryTempo: 150, rounds: 1 };
    const edges = { warmupEnabled: true, warmupSeconds: 300, warmupTempo: 120, cooldownEnabled: true, cooldownSeconds: 300, cooldownTempo: 100 };
    expect(intervalTotalSeconds(plan, edges)).toBe(720);
    expect(intervalPosition(plan, 0, edges)).toMatchObject({ segment: 'warmup', tempo: 120, segmentRemaining: 300 });
    expect(intervalPosition(plan, 300, edges)).toMatchObject({ segment: 'work', round: 1 });
    expect(intervalPosition(plan, 420, edges)).toMatchObject({ segment: 'cooldown', tempo: 100, segmentRemaining: 300 });
    expect(estimateCalories('walking', 70, 720, plan, edges)).toBe(46);
  });
  it('손상된 저장값은 안전한 기본 설정으로 복구한다', () => {
    expect(loadSettings('{')).toEqual(DEFAULT_SETTINGS);
  });
  it('사용자 인터벌의 빠른 구간은 최소 10초로 보정한다', () => {
    expect(normalizeIntervalPlan({ workSeconds: 10 }).workSeconds).toBe(10);
    expect(normalizeIntervalPlan({ workSeconds: 9 }).workSeconds).toBe(10);
  });
  it('몸무게와 활동이 없으면 칼로리를 표시하지 않고 인터벌 구간은 따로 합산한다', () => {
    expect(estimateCalories(null, 70, 1800, null)).toBeNull();
    expect(estimateCalories('walking', 0, 1800, null)).toBeNull();
    expect(estimateCalories('walking', 70, 1800, null)).toBe(140);
    expect(estimateCalories('walking', 70, 120, { workSeconds: 60, recoverySeconds: 60, workTempo: 180, recoveryTempo: 150, rounds: 1 })).toBe(10);
  });
  it('저장된 칼로리 입력값은 유효 범위만 복구한다', () => {
    expect(loadSettings(JSON.stringify({ weightKg: 70, calorieActivity: 'walking' })).weightKg).toBe(70);
    expect(loadSettings(JSON.stringify({ weightKg: 0, calorieActivity: 'unknown' })).calorieActivity).toBeNull();
  });
  it('워밍업과 쿨다운 설정을 저장 범위 안에서 복구한다', () => {
    const settings = loadSettings(JSON.stringify({ warmupEnabled: false, warmupSeconds: 30, warmupTempo: 300, cooldownEnabled: true, cooldownSeconds: 3600, cooldownTempo: 80 }));
    expect(settings).toMatchObject({ warmupEnabled: false, warmupSeconds: 60, warmupTempo: 240, cooldownEnabled: true, cooldownSeconds: 1800, cooldownTempo: 80 });
  });
  it('실외 자전거 선택을 저장하고 실내 자전거와 구별해 추정한다', () => {
    expect(loadSettings(JSON.stringify({ calorieActivity: 'outdoorCycling', weightKg: 70 })).calorieActivity).toBe('outdoorCycling');
    expect(estimateCalories('outdoorCycling', 70, 1800, null)).toBe(257);
    expect(estimateCalories('cycling', 70, 1800, null)).toBe(250);
  });
});
