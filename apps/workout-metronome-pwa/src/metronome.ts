export type WorkoutMode = 'running' | 'cycling';

export const MODE_INFO: Record<WorkoutMode, { label: string; unit: string; presets: number[] }> = {
  running: { label: '러닝', unit: 'SPM', presets: [170, 175, 180] },
  cycling: { label: '사이클', unit: 'RPM', presets: [80, 90, 100] }
};

export const TEMPO_LIMITS = { min: 40, max: 240 } as const;
export const DURATION_LIMITS = { min: 10 * 60, max: 4 * 60 * 60 } as const;
export const SETTINGS_STORAGE_KEY = 'mini-apps.workout-metronome.settings.v1';

export type MetronomeSettings = {
  mode: WorkoutMode;
  tempo: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  beatGroup: 0 | 2 | 3 | 4;
  countInEnabled: boolean;
  durationSeconds: number;
};

export const DEFAULT_SETTINGS: MetronomeSettings = {
  mode: 'running',
  tempo: 175,
  soundEnabled: true,
  vibrationEnabled: false,
  beatGroup: 4,
  countInEnabled: true,
  durationSeconds: 30 * 60
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
      mode: value.mode === 'running' || value.mode === 'cycling' ? value.mode : DEFAULT_SETTINGS.mode,
      tempo: typeof value.tempo === 'number' ? clampTempo(value.tempo) : DEFAULT_SETTINGS.tempo,
      soundEnabled: typeof value.soundEnabled === 'boolean' ? value.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
      vibrationEnabled: typeof value.vibrationEnabled === 'boolean' ? value.vibrationEnabled : DEFAULT_SETTINGS.vibrationEnabled,
      beatGroup: value.beatGroup === 0 || value.beatGroup === 2 || value.beatGroup === 3 || value.beatGroup === 4 ? value.beatGroup : DEFAULT_SETTINGS.beatGroup,
      countInEnabled: typeof value.countInEnabled === 'boolean' ? value.countInEnabled : DEFAULT_SETTINGS.countInEnabled,
      durationSeconds: typeof value.durationSeconds === 'number' ? clampDurationSeconds(value.durationSeconds) : DEFAULT_SETTINGS.durationSeconds
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};
