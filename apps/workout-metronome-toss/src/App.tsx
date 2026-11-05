import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type InputHTMLAttributes } from 'react';
import { Button } from '@toss/tds-mobile';
import { Device, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import { COMPLETION_AD_GROUP_ID } from './ads';
import { CALORIE_ACTIVITIES, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, TEMPO_PRESETS, beatIntervalMs, clampTempo, estimateCalories, intervalPlanFor, intervalPosition, intervalTotalSeconds, isAccentBeat, loadSettings, normalizeIntervalPlan, type BeatSound, type CalorieActivity, type IntervalMode, type MetronomeSettings } from './domain';
import { watchTossLocation, type LocationSnapshot } from './location';
import { parseWeatherForecast, type WeatherForecast } from './weather';

type Page = 'home' | 'workout' | 'complete';
type Phase = 'idle' | 'count-in' | 'playing';
type TempoStep = 1 | 5 | 10;
type ScreenLockState = 'off' | 'requesting' | 'active' | 'unavailable';

const WORKOUT_RUNTIME_STORAGE_KEY = 'mini-apps.workout-metronome.toss.runtime.v1';
type WorkoutRuntime = { total: number; remaining: number; endAt: number | null; started: boolean };

const loadWorkoutRuntime = (): WorkoutRuntime | null => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(WORKOUT_RUNTIME_STORAGE_KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Partial<WorkoutRuntime>;
    if (!Number.isFinite(value.total) || !Number.isFinite(value.remaining) || typeof value.started !== 'boolean') return null;
    return {
      total: Math.max(1, Math.round(value.total!)),
      remaining: Math.max(0, Math.round(value.remaining!)),
      endAt: typeof value.endAt === 'number' && Number.isFinite(value.endAt) ? value.endAt : null,
      started: value.started,
    };
  } catch {
    return null;
  }
};

const runtimeRemaining = (runtime: WorkoutRuntime, now = Date.now()) =>
  runtime.endAt === null ? runtime.remaining : Math.max(0, Math.ceil((runtime.endAt - now) / 1000));

const intervalEdgesFor = (settings: MetronomeSettings) => ({
  warmupEnabled: settings.warmupEnabled,
  warmupSeconds: settings.warmupSeconds,
  warmupTempo: settings.warmupTempo,
  cooldownEnabled: settings.cooldownEnabled,
  cooldownSeconds: settings.cooldownSeconds,
  cooldownTempo: settings.cooldownTempo,
});

const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

type DeferredNumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'onBlur'> & {
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
};

const DeferredNumberInput = ({ value, min, max, onCommit, ...props }: DeferredNumberInputProps) => {
  const [draft, setDraft] = useState(String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(String(value));
  }, [value]);

  return <input
    {...props}
    type="number"
    min={min}
    max={max}
    value={draft}
    onFocus={() => { focusedRef.current = true; }}
    onChange={(event) => setDraft(event.target.value)}
    onBlur={() => {
      focusedRef.current = false;
      const parsed = Number(draft);
      const committed = draft.trim() === '' || !Number.isFinite(parsed)
        ? value
        : Math.min(max, Math.max(min, Math.round(parsed)));
      setDraft(String(committed));
      if (committed !== value) onCommit(committed);
    }}
  />;
};

const HELP_TEXT = {
  environment: '실내에서는 리듬만 표시합니다. 실외에서는 위치 권한을 요청해 GPS 참고 속도와 날씨를 표시합니다.',
  tempo: '1분 동안의 비트 수입니다. 슬라이더·프리셋·직접 입력으로 40~240 BPM까지 설정할 수 있습니다.',
  duration: '운동 세션의 전체 시간입니다. 카운트인이 끝난 뒤부터 남은 시간이 줄고, 0초가 되면 자동으로 멈춥니다.',
  interval: '짧은 반복과 균형 반복의 세부 수치를 볼 수 있습니다. 사용자 설정에서는 구간 시간·BPM·반복 횟수를 직접 바꿀 수 있습니다.',
  calories: '운동 종류와 몸무게를 입력하면 완료 화면에 추정 칼로리를 표시합니다. 비트 BPM이나 GPS 속도로 실제 운동 강도를 측정하지는 않습니다.',
  group: '2·3·4박을 고르면 각 묶음의 첫 비트를 높은 소리로 강조합니다. 적용 안 함은 모든 비트를 같은 소리로 재생합니다.',
  beatSound: '소리를 고르면 짧게 미리 듣습니다. 운동 중에는 선택한 소리로 비트를 재생합니다.',
  soundEnabled: '운동 박자에 맞춰 짧은 합성 비트를 재생합니다.',
  vibrationEnabled: '지원 기기에서는 각 박자에 짧게 진동합니다.',
  countInEnabled: '시작을 누르면 준비 비트 4번을 낸 뒤 운동 비트와 목표 시간을 시작합니다.',
  whistleEnabled: '인터벌 구간이 바뀔 때 호르라기 소리를 냅니다. 비트 소리가 켜져 있어야 울립니다.',
  start: '선택한 설정으로 운동을 시작하거나 일시정지된 운동을 남은 시간부터 이어갑니다.',
  pause: '현재 템포·박자·남은 시간을 유지한 채 비트를 멈춥니다.',
  reset: '운동을 멈추고 설정 화면으로 돌아갑니다.',
  weather: '예보 자료: MET Norway · CC BY 4.0. 현재 위치의 기온과 날씨 상태를 간추려 표시합니다.',
} as const;
type HelpId = keyof typeof HELP_TEXT;

const playBeat = (context: AudioContext, at: number, sound: BeatSound, accent: boolean, nodes: Set<OscillatorNode>) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const frequency = sound === 'beep' ? 660 : sound === 'wood' ? 440 : 880;
  const length = sound === 'beep' ? .13 : sound === 'wood' ? .09 : .06;
  oscillator.type = sound === 'wood' ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(accent ? frequency * 1.5 : frequency, at);
  if (sound === 'wood') oscillator.frequency.exponentialRampToValueAtTime(accent ? 330 : 220, at + .08);
  gain.gain.setValueAtTime(.0001, at);
  gain.gain.exponentialRampToValueAtTime((accent ? 1.35 : 1) * (sound === 'wood' ? .18 : .12), at + .005);
  gain.gain.exponentialRampToValueAtTime(.0001, at + length);
  oscillator.connect(gain).connect(context.destination);
  nodes.add(oscillator);
  oscillator.onended = () => nodes.delete(oscillator);
  oscillator.start(at);
  oscillator.stop(at + length + .01);
};

const playWhistle = (context: AudioContext, nodes: Set<OscillatorNode>) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const at = context.currentTime + .02;
  oscillator.frequency.setValueAtTime(900, at);
  oscillator.frequency.exponentialRampToValueAtTime(1600, at + .12);
  oscillator.frequency.exponentialRampToValueAtTime(1350, at + .38);
  oscillator.frequency.exponentialRampToValueAtTime(1050, at + .58);
  gain.gain.setValueAtTime(.0001, at);
  gain.gain.exponentialRampToValueAtTime(.12, at + .025);
  gain.gain.setValueAtTime(.12, at + .42);
  gain.gain.exponentialRampToValueAtTime(.0001, at + .62);
  oscillator.connect(gain).connect(context.destination);
  nodes.add(oscillator);
  oscillator.onended = () => nodes.delete(oscillator);
  oscillator.start(at);
  oscillator.stop(at + .64);
};

export function App() {
  const [settings, setSettings] = useState<MetronomeSettings>(() => loadSettings(localStorage.getItem(SETTINGS_STORAGE_KEY)));
  const initialRuntimeRef = useRef<WorkoutRuntime | null>(loadWorkoutRuntime());
  const initialRuntime = initialRuntimeRef.current;
  const initialRemaining = initialRuntime ? runtimeRemaining(initialRuntime) : null;
  const [tempoStep, setTempoStep] = useState<TempoStep>(1);
  const [weightDraft, setWeightDraft] = useState(() => settings.weightKg?.toString() ?? '');
  const [page, setPage] = useState<Page>(() => initialRuntime?.started ? (initialRemaining === 0 ? 'complete' : 'workout') : 'home');
  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState(() => {
    const savedPlan = intervalPlanFor(settings);
    return initialRemaining ?? (savedPlan ? intervalTotalSeconds(savedPlan, intervalEdgesFor(settings)) : settings.durationSeconds);
  });
  const [countIn, setCountIn] = useState(4);
  const [beat, setBeat] = useState(0);
  const [started, setStarted] = useState(() => initialRuntime?.started ?? false);
  const [location, setLocation] = useState<LocationSnapshot | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [locationAttempt, setLocationAttempt] = useState(0);
  const [weatherAllowed, setWeatherAllowed] = useState(false);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [screenLockState, setScreenLockState] = useState<ScreenLockState>('off');
  const [completionAdLoaded, setCompletionAdLoaded] = useState(false);
  const completionAdAttemptedRef = useRef(false);
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  const [openHelp, setOpenHelp] = useState<HelpId | null>(null);
  const [helpPosition, setHelpPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const helpTriggerRef = useRef<HTMLButtonElement | null>(null);
  const helpPanelRef = useRef<HTMLDivElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef(new Set<OscillatorNode>());
  const screenWakeLockRef = useRef<WakeLockSentinel | null>(null);
  const screenWakeLockRequestingRef = useRef(false);
  const screenLockGenerationRef = useRef(0);
  const elapsedRef = useRef(initialRuntime ? Math.max(0, initialRuntime.total - (initialRemaining ?? initialRuntime.remaining)) : 0);
  const startedAtRef = useRef(0);
  const endAtRef = useRef<number | null>(initialRuntime?.endAt ?? null);
  const startRemainingRef = useRef(initialRemaining ?? 0);
  const intervalKeyRef = useRef<string | null>(null);
  const beatRef = useRef(0);

  const plan = intervalPlanFor(settings);
  const intervalEdges = intervalEdgesFor(settings);
  const total = plan ? intervalTotalSeconds(plan, intervalEdges) : settings.durationSeconds;
  const estimatedCalories = estimateCalories(settings.calorieActivity, settings.weightKg, total, plan, intervalEdges);
  const calorieMissingReasons = [
    !settings.calorieActivity ? '운동 종류 미선택' : null,
    settings.weightKg === null ? (weightDraft.trim() ? '몸무게 범위 오류(20~300kg)' : '몸무게 미입력') : null,
  ].filter((reason): reason is string => reason !== null);
  const elapsed = Math.max(0, total - remaining);
  const segment = plan && remaining > 0 ? intervalPosition(plan, elapsed, intervalEdges) : null;
  const tempo = segment?.tempo ?? settings.tempo;
  const countInTempo = plan ? intervalPosition(plan, 0, intervalEdges).tempo : settings.tempo;

  const saveRuntime = (nextRemaining: number, endAt: number | null, nextStarted = true) => {
    localStorage.setItem(WORKOUT_RUNTIME_STORAGE_KEY, JSON.stringify({ total, remaining: nextRemaining, endAt, started: nextStarted } satisfies WorkoutRuntime));
  };
  const clearRuntime = () => localStorage.removeItem(WORKOUT_RUNTIME_STORAGE_KEY);
  const requestScreenWakeLock = async () => {
    if (!('wakeLock' in navigator)) {
      setScreenLockState('unavailable');
      return;
    }
    if (screenWakeLockRef.current || screenWakeLockRequestingRef.current) return;
    screenWakeLockRequestingRef.current = true;
    setScreenLockState('requesting');
    const requestGeneration = screenLockGenerationRef.current;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (requestGeneration !== screenLockGenerationRef.current) {
        await sentinel.release();
        return;
      }
      screenWakeLockRef.current = sentinel;
      setScreenLockState('active');
      sentinel.addEventListener('release', () => {
        if (screenWakeLockRef.current === sentinel) {
          screenWakeLockRef.current = null;
          setScreenLockState('off');
        }
      });
    } catch {
      setScreenLockState('unavailable');
    } finally {
      screenWakeLockRequestingRef.current = false;
    }
  };
  const releaseScreenWakeLock = async () => {
    screenLockGenerationRef.current += 1;
    const sentinel = screenWakeLockRef.current;
    screenWakeLockRef.current = null;
    if (sentinel) await sentinel.release().catch(() => {});
    setScreenLockState('off');
  };

  useEffect(() => { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => {
    if (page !== 'workout' || !started || !COMPLETION_AD_GROUP_ID || !loadFullScreenAd.isSupported()) return;
    setCompletionAdLoaded(false);
    try {
      return loadFullScreenAd({
        options: { adGroupId: COMPLETION_AD_GROUP_ID },
        onEvent: (event) => { if (event.type === 'loaded') setCompletionAdLoaded(true); },
        onError: (error) => { console.warn('전면형 광고 로드 실패', error); setCompletionAdLoaded(false); },
      });
    } catch (error) {
      console.warn('전면형 광고 로드 실패', error);
    }
  }, [page, started]);
  useEffect(() => {
    if (page !== 'complete' || !visible || !completionAdLoaded || completionAdAttemptedRef.current || !COMPLETION_AD_GROUP_ID || !showFullScreenAd.isSupported()) return;
    completionAdAttemptedRef.current = true;
    try {
      return showFullScreenAd({
        options: { adGroupId: COMPLETION_AD_GROUP_ID },
        onEvent: (event) => { if (event.type === 'failedToShow') console.warn('전면형 광고 표시 실패'); },
        onError: (error) => console.warn('전면형 광고 표시 실패', error),
      });
    } catch (error) {
      console.warn('전면형 광고 표시 실패', error);
    }
  }, [page, visible, completionAdLoaded]);
  useEffect(() => {
    if (!openHelp) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('.help-trigger, .help-panel')) setOpenHelp(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenHelp(null); };
    const closeOnScroll = () => setOpenHelp(null);
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnScroll);
    document.addEventListener('scroll', closeOnScroll, true);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape); window.removeEventListener('resize', closeOnScroll); document.removeEventListener('scroll', closeOnScroll, true); };
  }, [openHelp]);
  useLayoutEffect(() => {
    if (!openHelp || !helpTriggerRef.current || !helpPanelRef.current) return;
    const trigger = helpTriggerRef.current.getBoundingClientRect();
    const panel = helpPanelRef.current;
    const width = Math.min(320, window.innerWidth - 32);
    const left = Math.max(16, Math.min(trigger.left, window.innerWidth - width - 16));
    const below = trigger.bottom + 8;
    const top = below + panel.offsetHeight + 16 <= window.innerHeight
      ? below
      : Math.max(16, trigger.top - panel.offsetHeight - 8);
    setHelpPosition({ top, left, width });
  }, [openHelp]);
  useEffect(() => {
    const onVisibilityChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);
  useEffect(() => {
    if (phase === 'idle') {
      void releaseScreenWakeLock();
      return;
    }
    void requestScreenWakeLock();
    const restoreWhenVisible = () => {
      if (document.visibilityState === 'visible') void requestScreenWakeLock();
    };
    document.addEventListener('visibilitychange', restoreWhenVisible);
    return () => document.removeEventListener('visibilitychange', restoreWhenVisible);
  }, [phase]);
  useEffect(() => {
    if (page !== 'workout' || settings.environment !== 'outdoor') return;
    setLocationError(false);
    try {
      return watchTossLocation(setLocation, () => setLocationError(true));
    } catch {
      setLocationError(true);
    }
  }, [page, settings.environment, locationAttempt]);
  useEffect(() => {
    if (page !== 'workout' || !visible || !weatherAllowed || !location) return;
    let cancelled = false;
    const load = async () => {
      const lat = location.latitude.toFixed(2);
      const lon = location.longitude.toFixed(2);
      try {
        const response = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`);
        if (!response.ok) throw new Error('예보 요청 실패');
        const forecast = parseWeatherForecast(await response.json());
        if (!forecast) throw new Error('예보 형식 오류');
        if (!cancelled) { setWeather(forecast); setWeatherError(false); }
      } catch {
        if (!cancelled) setWeatherError(true);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [page, visible, weatherAllowed, location && `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`]);

  useEffect(() => {
    if (phase !== 'count-in') return;
    const timer = window.setTimeout(() => {
      if (countIn === 1) {
        const now = Date.now();
        const nextRemaining = startRemainingRef.current;
        startedAtRef.current = now;
        endAtRef.current = now + nextRemaining * 1000;
        saveRuntime(nextRemaining, endAtRef.current);
        setRemaining(nextRemaining);
        setPhase('playing');
        setCountIn(0);
      }
      else setCountIn(countIn - 1);
    }, beatIntervalMs(countInTempo));
    return () => clearTimeout(timer);
  }, [phase, countIn, countInTempo]);
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => {
      const nextRemaining = endAtRef.current === null
        ? Math.max(0, Math.ceil(total - elapsedRef.current - (Date.now() - startedAtRef.current) / 1000))
        : Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(nextRemaining);
      if (nextRemaining === 0) {
        elapsedRef.current = total;
        endAtRef.current = null;
        clearRuntime();
        setPhase('idle');
        setPage('complete');
      }
    }, 250);
    return () => clearInterval(timer);
  }, [phase, total]);
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => {
      beatRef.current += 1;
      setBeat(beatRef.current);
      if (settings.vibrationEnabled) void Device.triggerHaptic({ type: 'tickWeak' }).catch(() => {});
    }, beatIntervalMs(tempo));
    return () => clearInterval(timer);
  }, [phase, tempo, settings.vibrationEnabled]);
  useEffect(() => {
    if (phase === 'idle') return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') return;
      const nextRemaining = endAtRef.current === null ? remaining : Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(nextRemaining);
      if (nextRemaining === 0) {
        elapsedRef.current = total;
        endAtRef.current = null;
        clearRuntime();
        setPhase('idle');
        setPage('complete');
        return;
      }
      if (settings.soundEnabled && contextRef.current?.state !== 'running') {
        elapsedRef.current = total - nextRemaining;
        endAtRef.current = null;
        saveRuntime(nextRemaining, null);
        setPhase('idle');
        setAudioError(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [phase, settings.soundEnabled, total, remaining]);
  useEffect(() => {
    const context = contextRef.current;
    if (phase === 'idle' || !settings.soundEnabled || !context) return;
    let nextAt = context.currentTime + .08;
    let scheduledBeat = beatRef.current;
    const baseElapsed = total - remaining;
    const baseAt = context.currentTime;
    const schedule = () => {
      if (context.state !== 'running') return;
      while (nextAt < context.currentTime + 20) {
        const beatTempo = phase === 'count-in' ? countInTempo : plan ? intervalPosition(plan, baseElapsed + nextAt - baseAt, intervalEdges).tempo : settings.tempo;
        scheduledBeat += 1;
        playBeat(context, nextAt, settings.beatSound, phase === 'playing' && isAccentBeat(scheduledBeat, settings.beatGroup), nodesRef.current);
        nextAt += beatIntervalMs(beatTempo) / 1000;
      }
    };
    schedule();
    const timer = window.setInterval(schedule, 1000);
    return () => {
      clearInterval(timer);
      nodesRef.current.forEach((node) => { try { node.stop(); } catch { /* 이미 끝난 비트 */ } });
      nodesRef.current.clear();
    };
  }, [phase, tempo, countInTempo, settings.soundEnabled, settings.beatSound, settings.beatGroup]);
  useEffect(() => {
    if (phase !== 'playing' || !segment) return;
    const key = `${segment.round}:${segment.segment}`;
    if (intervalKeyRef.current && intervalKeyRef.current !== key && settings.whistleEnabled && settings.soundEnabled && contextRef.current?.state === 'running') playWhistle(contextRef.current, nodesRef.current);
    intervalKeyRef.current = key;
  }, [phase, segment?.round, segment?.segment, settings.whistleEnabled, settings.soundEnabled]);
  useEffect(() => () => { void releaseScreenWakeLock(); void contextRef.current?.close(); }, []);

  const update = (patch: Partial<MetronomeSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const pause = () => {
    if (phase === 'playing') {
      const nextRemaining = endAtRef.current === null ? remaining : Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      elapsedRef.current = total - nextRemaining;
      endAtRef.current = null;
      setRemaining(nextRemaining);
      saveRuntime(nextRemaining, null);
    }
    setPhase('idle');
  };
  const ensureAudioContext = async (forceNew = false) => {
    let context = contextRef.current;
    if (forceNew && context) {
      await context.close().catch(() => {});
      context = null;
      contextRef.current = null;
    }
    if (!context || context.state === 'closed') {
      context = new AudioContext();
      contextRef.current = context;
    }
    await context.resume();
    if (context.state !== 'running') {
      await context.close().catch(() => {});
      context = new AudioContext();
      contextRef.current = context;
      await context.resume();
    }
    if (context.state !== 'running') throw new Error(`AudioContext state: ${context.state}`);
    return context;
  };
  const start = async (fresh = false) => {
    if (phase !== 'idle' || (!fresh && remaining === 0)) return;
    if (settings.soundEnabled) {
      try {
        const audioSession = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
        if (audioSession) { try { audioSession.type = 'playback'; } catch { /* 지원하지 않으면 기본 오디오 세션 사용 */ } }
        await ensureAudioContext(fresh);
      } catch { setAudioError(true); return; }
    }
    setAudioError(false);
    if (fresh || !started) completionAdAttemptedRef.current = false;
    const nextRemaining = fresh ? total : remaining;
    startRemainingRef.current = nextRemaining;
    if (fresh) { elapsedRef.current = 0; endAtRef.current = null; intervalKeyRef.current = null; beatRef.current = 0; setBeat(0); setRemaining(nextRemaining); }
    setPage('workout');
    if ((fresh || !started) && settings.countInEnabled) { setCountIn(4); setPhase('count-in'); }
    else {
      const now = Date.now();
      startedAtRef.current = now;
      endAtRef.current = now + nextRemaining * 1000;
      saveRuntime(nextRemaining, endAtRef.current);
      setPhase('playing');
    }
    setStarted(true);
  };
  const reset = () => {
    pause();
    elapsedRef.current = 0;
    endAtRef.current = null;
    intervalKeyRef.current = null;
    beatRef.current = 0;
    setBeat(0);
    setRemaining(total);
    setStarted(false);
    clearRuntime();
    setPage('home');
  };
  const setIntervalMode = (mode: IntervalMode) => {
    update({ intervalMode: mode });
    const next = mode === 'steady' ? settings.durationSeconds : intervalTotalSeconds(mode === 'custom' ? settings.customInterval : mode === 'short' ? { workSeconds: 60, recoverySeconds: 60, workTempo: 180, recoveryTempo: 150, rounds: 10 } : { workSeconds: 180, recoverySeconds: 120, workTempo: 180, recoveryTempo: 150, rounds: 5 }, intervalEdges);
    setRemaining(next);
  };
  const chooseBeatSound = async (sound: BeatSound) => {
    update({ beatSound: sound });
    if (!settings.soundEnabled) return;
    try {
      const context = await ensureAudioContext();
      playBeat(context, context.currentTime + .04, sound, false, nodesRef.current);
    } catch {
      setAudioError(true);
    }
  };

  const help = (id: HelpId) => <button type="button" className="help-trigger" aria-label={`${id === 'weather' ? '날씨' : '기능'} 설명`} aria-expanded={openHelp === id} aria-controls={openHelp === id ? 'help-panel' : undefined} onClick={(event) => { event.preventDefault(); event.stopPropagation(); helpTriggerRef.current = event.currentTarget; setHelpPosition(null); setOpenHelp(openHelp === id ? null : id); }}>?</button>;

  return <div className={`toss-app ${page}`}>
    <header className="app-title"><strong>모두의 비트</strong>{page === 'workout' && <button type="button" onClick={() => { pause(); setPage('home'); }}>설정</button>}</header>
    {page === 'home' && <>
      <div className="home-scroll">
        <section className="field"><h2>운동 환경 {help('environment')}</h2><div className="choices two">{(['indoor', 'outdoor'] as const).map((mode) => <button key={mode} type="button" className={settings.environment === mode ? 'selected' : ''} onClick={() => update({ environment: mode })}>{mode === 'indoor' ? '실내' : '실외'}</button>)}</div></section>
        <section className="field tempo-field"><h2>템포 {help('tempo')} <span>{settings.tempo} BPM</span></h2><input type="range" aria-label="템포" min="40" max="240" value={settings.tempo} onChange={(event) => update({ tempo: Number(event.target.value) })} /><div className="tempo-adjust"><button type="button" aria-label={`템포 ${tempoStep} BPM 감소`} disabled={settings.tempo <= 40} onClick={() => update({ tempo: clampTempo(settings.tempo - tempoStep) })}>−</button><div className="tempo-steps" role="group" aria-label="템포 증감 단위">{([1, 5, 10] as const).map((step) => <button key={step} type="button" className={tempoStep === step ? 'selected' : ''} aria-pressed={tempoStep === step} onClick={() => setTempoStep(step)}>{step}</button>)}</div><button type="button" aria-label={`템포 ${tempoStep} BPM 증가`} disabled={settings.tempo >= 240} onClick={() => update({ tempo: clampTempo(settings.tempo + tempoStep) })}>+</button></div><div className="choices three">{TEMPO_PRESETS.map((value) => <button key={value} type="button" className={settings.tempo === value ? 'selected' : ''} onClick={() => update({ tempo: value })}>{value}</button>)}</div></section>
        <section className="field"><h2>목표 운동 시간 {help('duration')}{plan && <span>총 {formatTime(total)}</span>}</h2><div className="choices five">{[10, 20, 30, 45, 60].map((minutes) => <button key={minutes} type="button" disabled={started || !!plan} className={settings.durationSeconds === minutes * 60 && !plan ? 'selected' : ''} onClick={() => { update({ durationSeconds: minutes * 60 }); setRemaining(minutes * 60); }}>{minutes}분</button>)}</div></section>
        <details className="field"><summary>인터벌 {settings.intervalMode === 'steady' ? '사용 안 함' : settings.intervalMode === 'short' ? '짧은 반복' : settings.intervalMode === 'balanced' ? '균형 반복' : '사용자 설정'} {help('interval')}</summary>
          <div className="choices two">{([['steady', '사용 안 함'], ['short', '짧은 반복'], ['balanced', '균형 반복'], ['custom', '사용자 설정']] as const).map(([mode, label]) => <button key={mode} type="button" disabled={started} className={settings.intervalMode === mode ? 'selected' : ''} onClick={() => setIntervalMode(mode)}>{label}</button>)}</div>
          {plan && <>
            <div className="interval-grid">{([['workSeconds', '빠른 구간(초)', 10, 1800], ['workTempo', '빠른 BPM', 40, 240], ['recoverySeconds', '회복 구간(초)', 30, 1800], ['recoveryTempo', '회복 BPM', 40, 240], ['rounds', '반복 횟수', 1, 30]] as const).map(([key, label, min, max]) => <label key={key}><span className="interval-label">{label} <small>{min}~{max}</small></span><DeferredNumberInput min={min} max={max} value={plan[key]} disabled={started || settings.intervalMode !== 'custom'} onCommit={(value) => { const normalized = normalizeIntervalPlan({ ...settings.customInterval, [key]: value }); update({ customInterval: normalized }); setRemaining(intervalTotalSeconds(normalized, intervalEdges)); }} /></label>)}</div>
            <div className="interval-grid interval-edges">
              <label className="check"><span className="interval-label">워밍업 사용</span><input type="checkbox" checked={settings.warmupEnabled} disabled={started} onChange={(event) => { const warmupEnabled = event.target.checked; update({ warmupEnabled }); setRemaining(intervalTotalSeconds(plan, { ...intervalEdges, warmupEnabled })); }} /></label>
              <label><span className="interval-label">워밍업 시간(분) <small>1~30</small></span><DeferredNumberInput min={1} max={30} value={settings.warmupSeconds / 60} disabled={started || !settings.warmupEnabled} onCommit={(minutes) => { const warmupSeconds = minutes * 60; update({ warmupSeconds }); setRemaining(intervalTotalSeconds(plan, { ...intervalEdges, warmupSeconds })); }} /></label>
              <label><span className="interval-label">워밍업 BPM <small>40~240</small></span><DeferredNumberInput min={40} max={240} value={settings.warmupTempo} disabled={started || !settings.warmupEnabled} onCommit={(warmupTempo) => update({ warmupTempo })} /></label>
              <label className="check"><span className="interval-label">쿨다운 사용</span><input type="checkbox" checked={settings.cooldownEnabled} disabled={started} onChange={(event) => { const cooldownEnabled = event.target.checked; update({ cooldownEnabled }); setRemaining(intervalTotalSeconds(plan, { ...intervalEdges, cooldownEnabled })); }} /></label>
              <label><span className="interval-label">쿨다운 시간(분) <small>1~30</small></span><DeferredNumberInput min={1} max={30} value={settings.cooldownSeconds / 60} disabled={started || !settings.cooldownEnabled} onCommit={(minutes) => { const cooldownSeconds = minutes * 60; update({ cooldownSeconds }); setRemaining(intervalTotalSeconds(plan, { ...intervalEdges, cooldownSeconds })); }} /></label>
              <label><span className="interval-label">쿨다운 BPM <small>40~240</small></span><DeferredNumberInput min={40} max={240} value={settings.cooldownTempo} disabled={started || !settings.cooldownEnabled} onCommit={(cooldownTempo) => update({ cooldownTempo })} /></label>
            </div>
          </>}
        </details>
        <details className="field calorie-settings"><summary>칼로리 추정 설정 {help('calories')}</summary><p>실제로 한 운동을 선택해 주세요. 입력하지 않아도 메트로놈을 사용할 수 있습니다.</p><label><span>운동 종류</span><select value={settings.calorieActivity ?? ''} onChange={(event) => update({ calorieActivity: (event.target.value || null) as CalorieActivity | null })}><option value="">선택 안 함</option>{Object.entries(CALORIE_ACTIVITIES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label><label><span>몸무게</span><span className="setting-value"><input type="number" inputMode="decimal" min="20" max="300" step="0.1" placeholder="20~300" value={weightDraft} onChange={(event) => { const draft = event.target.value; const weight = Number(draft); setWeightDraft(draft); update({ weightKg: draft !== '' && Number.isFinite(weight) && weight >= 20 && weight <= 300 ? weight : null }); }} /><span>kg</span></span></label><p>20~300kg 입력 시 완료 화면에 추정값을 표시합니다. 값은 이 기기의 브라우저 설정에 저장됩니다.</p></details>
        <details className="field details-settings">
          <summary>세부 설정</summary>
          <label className="setting-row">
            <span className="setting-label">템포 직접 입력 <small>40~240</small></span>
            <span className="setting-value"><DeferredNumberInput min={40} max={240} disabled={!!plan} value={settings.tempo} onCommit={(tempo) => update({ tempo: clampTempo(tempo) })} /><span>BPM</span></span>
          </label>
          <label className="setting-row">
            <span className="setting-label">운동 시간 직접 입력 <small>10~240</small></span>
            <span className="setting-value"><DeferredNumberInput min={10} max={240} disabled={started || !!plan} value={settings.durationSeconds / 60} onCommit={(value) => { update({ durationSeconds: value * 60 }); setRemaining(value * 60); }} /><span>분</span></span>
          </label>
          <label className="setting-row">
            <span className="setting-label">박자 묶음 {help('group')}</span>
            <select value={settings.beatGroup} onChange={(event) => update({ beatGroup: Number(event.target.value) as MetronomeSettings['beatGroup'] })}><option value="0">적용 안 함</option><option value="2">2박</option><option value="3">3박</option><option value="4">4박</option></select>
          </label>
          <label className="setting-row">
            <span className="setting-label">비트 소리 {help('beatSound')}</span>
            <select value={settings.beatSound} onChange={(event) => void chooseBeatSound(event.target.value as BeatSound)}><option value="tick">똑딱</option><option value="beep">비프</option><option value="wood">우드</option></select>
          </label>
          {([['soundEnabled', '비트 소리'], ['vibrationEnabled', '진동'], ['countInEnabled', '4박 카운트인'], ['whistleEnabled', '구간 전환 호르라기']] as const).map(([key, label]) => <label key={key} className="check"><input type="checkbox" checked={settings[key]} onChange={(event) => update({ [key]: event.target.checked })} /><span className="setting-label">{label} {help(key)}</span></label>)}
        </details>
        {started && <p className="resume-note">일시정지된 운동 · 남은 시간 {formatTime(remaining)}</p>}
        {audioError && <p role="alert">소리를 시작할 수 없습니다. 기기 소리 설정을 확인해 주세요.</p>}
      </div>
      <div className="bottom-action">{started && <Button variant="weak" onClick={reset}>초기화</Button>}<Button display="block" onClick={() => void start()}>{started ? '운동 이어하기' : '운동 시작'}</Button></div>
    </>}
    {page === 'workout' && <section className="workout-content">
      <div className="stage">{settings.environment === 'outdoor' && <div className="side-metric"><span>속도</span><strong>{location?.speedKmh ?? '—'}</strong><small>km/h · 참고값</small></div>}<div className={phase === 'playing' ? 'pendulum playing' : 'pendulum'} style={{ '--swing-duration': `${beatIntervalMs(tempo)}ms` } as CSSProperties}><i className="pivot" /><i className="arm"><i className="weight" /></i></div>{settings.environment === 'outdoor' && <div className="side-metric"><span>날씨 {help('weather')}</span><strong>{weather ? `${weather.temperatureC}°` : '—'}</strong><small>{weather?.condition ?? (weatherError ? '조회 실패' : '미조회')}</small></div>}</div>
      {settings.environment === 'outdoor' && <div className="outdoor-info">{locationError ? <button type="button" onClick={() => setLocationAttempt((value) => value + 1)}>위치 권한·수신 다시 시도</button> : !location ? '위치 수신 중' : !weatherAllowed ? <><span>날씨 조회 시 대략적 위치와 IP가 MET Norway에 전달됩니다.</span><button type="button" onClick={() => setWeatherAllowed(true)}>날씨 조회</button></> : null}<details><summary>날씨 정보</summary><p>예보 자료: <a href="https://api.met.no/" target="_blank" rel="noreferrer">MET Norway</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. 기온과 날씨 상태를 간추려 표시합니다.</p></details></div>}
      <div className="readout"><strong>{tempo}</strong><span>BPM</span></div>
      {segment && <p className="segment">{segment.segment === 'warmup' ? '워밍업' : segment.segment === 'cooldown' ? '쿨다운' : `${segment.segment === 'work' ? '빠른 구간' : '회복 구간'} · ${segment.round}/${plan!.rounds}회`} · 남은 {formatTime(segment.segmentRemaining)}</p>}
      <p className="remaining">남은 시간 {formatTime(remaining)}</p><p className="beat-state">{phase === 'count-in' ? `시작까지 ${countIn}` : phase === 'playing' ? `박자 ${beat}` : '일시정지됨'}</p>
      <div className="workout-actions"><span className="action-help"><Button onClick={() => void start()} disabled={phase !== 'idle'}>이어하기</Button>{help('start')}</span><span className="action-help"><Button variant="weak" onClick={pause} disabled={phase === 'idle'}>일시정지</Button>{help('pause')}</span><span className="action-help"><Button variant="weak" onClick={reset}>초기화</Button>{help('reset')}</span></div>
      {phase !== 'idle' && <p className="screen-lock-status">{screenLockState === 'active' ? '화면 켜짐 유지 중' : screenLockState === 'unavailable' ? '화면 켜짐 유지 미지원' : '화면 켜짐 유지 요청 중'}</p>}
      <p className="background-note">화면 잠금·앱 전환 시 소리 재생은 기기와 토스 환경에 따라 중단될 수 있습니다.</p>
    </section>}
    {openHelp && <div ref={helpPanelRef} id="help-panel" className="help-panel" role="status" style={helpPosition ? { ...helpPosition } : { visibility: 'hidden' }}><div><strong>기능 설명</strong><button type="button" onClick={() => setOpenHelp(null)}>닫기</button></div><p>{HELP_TEXT[openHelp]}</p></div>}
    {page === 'complete' && <section className="complete-content">
      <div className="complete-summary">
        <div className="complete-heading"><span className="complete-icon" aria-hidden="true">✓</span><div><p className="complete-eyebrow">운동 완료</p><h1>리듬을 끝까지 지켰어요!</h1></div></div>
        <div className="complete-result">
          <div><span>운동 시간</span><strong>{formatTime(total)}</strong></div>
        </div>
        <div className="complete-details">
          <div className="complete-detail-card"><span>운동 종류</span><strong>{settings.calorieActivity ? CALORIE_ACTIVITIES[settings.calorieActivity].label : '미선택'}</strong><small>{settings.environment === 'indoor' ? '실내' : '실외'} 운동</small></div>
          <div className="complete-detail-card"><span>{plan ? '인터벌 구성' : '리듬 설정'}</span><strong>{plan ? `${plan.rounds}회 반복` : `${settings.tempo} BPM`}</strong><small>{plan ? `${settings.warmupEnabled ? `워밍업 ${formatTime(settings.warmupSeconds)} · ` : ''}빠른 ${formatTime(plan.workSeconds)} · 회복 ${formatTime(plan.recoverySeconds)}${settings.cooldownEnabled ? ` · 쿨다운 ${formatTime(settings.cooldownSeconds)}` : ''}` : `박자 ${settings.beatGroup || '적용 안 함'}`}</small></div>
        </div>
        {estimatedCalories !== null && <div className="complete-calories"><div><span>추정 소모 칼로리</span><strong>약 {estimatedCalories} kcal</strong></div><small><span>{CALORIE_ACTIVITIES[settings.calorieActivity!].label}의 평균 MET와 설정 시간으로 추정했어요.</span><span>실제 움직임과 강도에 따라 달라질 수 있어요. <a href="https://pacompendium.com/adult-compendium/" target="_blank" rel="noreferrer">MET 자료</a></span></small></div>}
        {estimatedCalories === null && <p className="complete-calorie-unavailable">칼로리 추정값을 표시할 수 없어요: {calorieMissingReasons.join(' · ') || '계산에 필요한 설정을 확인해 주세요'}. 설정에서 입력하면 다음 운동 완료 시 표시됩니다.</p>}
      </div>
      <div className="complete-actions"><Button display="block" onClick={() => void start(true)}>같은 설정으로 다시</Button><Button display="block" variant="weak" onClick={reset}>설정으로</Button></div>
    </section>}
  </div>;
}
