export type WorkoutEnvironment = 'indoor' | 'outdoor';
export type CalorieActivity = 'walking' | 'jogging' | 'cycling' | 'outdoorCycling' | 'bodyweight';
export const CALORIE_ACTIVITIES: Record<CalorieActivity, { label: string; steadyMet: number; workMet: number; recoveryMet: number }> = {
  walking: { label: '걷기', steadyMet: 3.8, workMet: 4.8, recoveryMet: 3.0 },
  jogging: { label: '조깅', steadyMet: 7.5, workMet: 8.5, recoveryMet: 3.8 },
  cycling: { label: '실내 자전거', steadyMet: 6.8, workMet: 9.0, recoveryMet: 4.0 },
  outdoorCycling: { label: '실외 자전거', steadyMet: 7.0, workMet: 9.0, recoveryMet: 4.3 },
  bodyweight: { label: '맨몸 운동', steadyMet: 3.8, workMet: 7.5, recoveryMet: 2.8 },
};
export type BeatSound = 'tick' | 'beep' | 'wood';
export const TEMPO_PRESETS = [80, 100, 120, 160, 175, 180] as const;
export const gpsSpeedKmh = (metersPerSecond: number | null): number | null =>
  metersPerSecond === null || !Number.isFinite(metersPerSecond) || metersPerSecond < 0
    ? null
    : Math.round(metersPerSecond * 3.6);

export const TEMPO_LIMITS = { min: 40, max: 240 } as const;
export const DURATION_LIMITS = { min: 10 * 60, max: 4 * 60 * 60 } as const;
export const SETTINGS_STORAGE_KEY = 'mini-apps.workout-metronome.toss.settings.v1';
export type IntervalMode = 'steady' | 'short' | 'balanced' | 'custom';
export type IntervalPlan = { workSeconds: number; recoverySeconds: number; workTempo: number; recoveryTempo: number; rounds: number };
export const DEFAULT_INTERVAL_PLAN: IntervalPlan = { workSeconds: 180, recoverySeconds: 120, workTempo: 180, recoveryTempo: 150, rounds: 5 };
export const INTERVAL_PRESETS: Record<'short' | 'balanced', IntervalPlan> = {
  short: { workSeconds: 60, recoverySeconds: 60, workTempo: 180, recoveryTempo: 150, rounds: 10 },
  balanced: { workSeconds: 180, recoverySeconds: 120, workTempo: 180, recoveryTempo: 150, rounds: 5 }
};
const clampWhole = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));
export const normalizeIntervalPlan = (value: Partial<IntervalPlan>): IntervalPlan => ({
  workSeconds: clampWhole(Number.isFinite(value.workSeconds) ? value.workSeconds! : DEFAULT_INTERVAL_PLAN.workSeconds, 30, 1800),
  recoverySeconds: clampWhole(Number.isFinite(value.recoverySeconds) ? value.recoverySeconds! : DEFAULT_INTERVAL_PLAN.recoverySeconds, 30, 1800),
  workTempo: clampTempo(Number.isFinite(value.workTempo) ? value.workTempo! : DEFAULT_INTERVAL_PLAN.workTempo),
  recoveryTempo: clampTempo(Number.isFinite(value.recoveryTempo) ? value.recoveryTempo! : DEFAULT_INTERVAL_PLAN.recoveryTempo),
  rounds: clampWhole(Number.isFinite(value.rounds) ? value.rounds! : DEFAULT_INTERVAL_PLAN.rounds, 1, 30)
});
export const intervalPlanFor = (settings: Pick<MetronomeSettings, 'intervalMode' | 'customInterval'>): IntervalPlan | null =>
  settings.intervalMode === 'steady' ? null : settings.intervalMode === 'custom' ? settings.customInterval : INTERVAL_PRESETS[settings.intervalMode];
export const intervalTotalSeconds = (plan: IntervalPlan) => (plan.workSeconds + plan.recoverySeconds) * plan.rounds;
export const estimateCalories = (activity: CalorieActivity | null, weightKg: number | null, durationSeconds: number, plan: IntervalPlan | null): number | null => {
  if (!activity || weightKg === null || !Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
  const mets = CALORIE_ACTIVITIES[activity];
  const metMinutes = plan
    ? (mets.workMet * plan.workSeconds + mets.recoveryMet * plan.recoverySeconds) * plan.rounds / 60
    : mets.steadyMet * durationSeconds / 60;
  return Math.round(metMinutes * 3.5 * weightKg / 200);
};
export const shouldPlayIntervalCue = (previous: string | null, current: string): boolean => previous !== null && previous !== current;
export const intervalPosition = (plan: IntervalPlan, elapsedSeconds: number) => {
  const cycle = plan.workSeconds + plan.recoverySeconds;
  const elapsed = Math.min(Math.max(0, elapsedSeconds), intervalTotalSeconds(plan) - 1);
  const round = Math.floor(elapsed / cycle) + 1;
  const inCycle = elapsed % cycle;
  const isWork = inCycle < plan.workSeconds;
  return { round, segment: isWork ? 'work' as const : 'recovery' as const, segmentRemaining: (isWork ? plan.workSeconds : cycle) - inCycle, tempo: isWork ? plan.workTempo : plan.recoveryTempo };
};

export type MetronomeSettings = {
  environment: WorkoutEnvironment;
  calorieActivity: CalorieActivity | null;
  weightKg: number | null;
  tempo: number;
  soundEnabled: boolean;
  whistleEnabled: boolean;
  beatSound: BeatSound;
  vibrationEnabled: boolean;
  beatGroup: 0 | 2 | 3 | 4;
  countInEnabled: boolean;
  durationSeconds: number;
  intervalMode: IntervalMode;
  customInterval: IntervalPlan;
};

export const DEFAULT_SETTINGS: MetronomeSettings = {
  environment: 'indoor',
  calorieActivity: null,
  weightKg: null,
  tempo: 175,
  soundEnabled: true,
  whistleEnabled: false,
  beatSound: 'tick',
  vibrationEnabled: false,
  beatGroup: 4,
  countInEnabled: true,
  durationSeconds: 30 * 60,
  intervalMode: 'steady',
  customInterval: DEFAULT_INTERVAL_PLAN
};

export const clampTempo = (tempo: number): number => Math.min(TEMPO_LIMITS.max, Math.max(TEMPO_LIMITS.min, Math.round(tempo)));
export const clampDurationSeconds = (seconds: number): number => Math.min(DURATION_LIMITS.max, Math.max(DURATION_LIMITS.min, Math.round(seconds)));
export const beatIntervalMs = (tempo: number): number => 60_000 / clampTempo(tempo);
// 메트로놈은 매 박자마다 반대쪽 끝에 도달한다. CSS alternate 애니메이션의 duration은 한쪽 끝 사이 이동 시간이다.
export const swingDurationMs = (tempo: number): number => beatIntervalMs(tempo);
export const isAccentBeat = (beat: number, beatGroup: MetronomeSettings['beatGroup']): boolean => beatGroup !== 0 && (beat - 1) % beatGroup === 0;

export const loadSettings = (raw: string | null): MetronomeSettings => {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== 'object') return DEFAULT_SETTINGS;
    const value = candidate as Partial<MetronomeSettings>;
    return {
      environment: value.environment === 'indoor' || value.environment === 'outdoor' ? value.environment : DEFAULT_SETTINGS.environment,
      calorieActivity: value.calorieActivity && value.calorieActivity in CALORIE_ACTIVITIES ? value.calorieActivity : null,
      weightKg: typeof value.weightKg === 'number' && Number.isFinite(value.weightKg) && value.weightKg >= 20 && value.weightKg <= 300 ? value.weightKg : null,
      tempo: typeof value.tempo === 'number' ? clampTempo(value.tempo) : DEFAULT_SETTINGS.tempo,
      soundEnabled: typeof value.soundEnabled === 'boolean' ? value.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
      whistleEnabled: typeof value.whistleEnabled === 'boolean' ? value.whistleEnabled : DEFAULT_SETTINGS.whistleEnabled,
      beatSound: value.beatSound === 'beep' || value.beatSound === 'wood' ? value.beatSound : 'tick',
      vibrationEnabled: typeof value.vibrationEnabled === 'boolean' ? value.vibrationEnabled : DEFAULT_SETTINGS.vibrationEnabled,
      beatGroup: value.beatGroup === 0 || value.beatGroup === 2 || value.beatGroup === 3 || value.beatGroup === 4 ? value.beatGroup : DEFAULT_SETTINGS.beatGroup,
      countInEnabled: typeof value.countInEnabled === 'boolean' ? value.countInEnabled : DEFAULT_SETTINGS.countInEnabled,
      durationSeconds: typeof value.durationSeconds === 'number' ? clampDurationSeconds(value.durationSeconds) : DEFAULT_SETTINGS.durationSeconds,
      intervalMode: value.intervalMode === 'short' || value.intervalMode === 'balanced' || value.intervalMode === 'custom' ? value.intervalMode : 'steady',
      customInterval: value.customInterval && typeof value.customInterval === 'object' ? normalizeIntervalPlan(value.customInterval) : DEFAULT_INTERVAL_PLAN
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};
