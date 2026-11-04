import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, TEMPO_PRESETS, beatIntervalMs, clampDurationSeconds, clampTempo, gpsSpeedKmh, intervalPlanFor, intervalPosition, intervalTotalSeconds, isAccentBeat, loadSettings, normalizeIntervalPlan, shouldPlayIntervalCue, swingDurationMs, type BeatSound, type IntervalPlan, type MetronomeSettings } from './metronome';
import { parseWeatherForecast, type WeatherForecast } from './weather';

type SessionPhase = 'idle' | 'count-in' | 'playing';
type ScreenLockState = 'active' | 'unavailable' | 'off';
type AppView = 'home' | 'session' | 'complete';
type LocationState = 'waiting' | 'ready' | 'unavailable' | 'denied' | 'error';

const usePlaybackAudioSession = () => {
  const audioSession = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (!audioSession) return;
  try {
    audioSession.type = 'playback';
  } catch {
    // 지원하지 않는 환경에서는 기존 Web Audio 재생을 유지한다.
  }
};

const scheduleTick = (context: AudioContext, at: number, accent: boolean, sound: BeatSound, scheduled: Set<OscillatorNode>) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = sound === 'wood' ? 'triangle' : 'sine';
  const baseFrequency = sound === 'beep' ? 660 : sound === 'wood' ? 440 : 880;
  oscillator.frequency.setValueAtTime(accent ? baseFrequency * 1.5 : baseFrequency, at);
  if (sound === 'wood') oscillator.frequency.exponentialRampToValueAtTime(accent ? 330 : 220, at + 0.08);
  const peak = sound === 'wood' ? 0.18 : sound === 'beep' ? 0.11 : 0.12;
  const length = sound === 'beep' ? 0.13 : sound === 'wood' ? 0.09 : 0.06;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(accent ? peak * 1.35 : peak, at + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  oscillator.connect(gain).connect(context.destination);
  scheduled.add(oscillator);
  oscillator.onended = () => scheduled.delete(oscillator);
  oscillator.start(at);
  oscillator.stop(at + length + 0.01);
};

const scheduleWhistle = (context: AudioContext, at: number, scheduled: Set<OscillatorNode>) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(900, at);
  oscillator.frequency.exponentialRampToValueAtTime(1_500, at + 0.1);
  oscillator.frequency.exponentialRampToValueAtTime(1_050, at + 0.23);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.12, at + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
  oscillator.connect(gain).connect(context.destination);
  scheduled.add(oscillator);
  oscillator.onended = () => scheduled.delete(oscillator);
  oscillator.start(at);
  oscillator.stop(at + 0.26);
};

const stopScheduledTicks = (context: AudioContext, scheduled: Set<OscillatorNode>) => {
  scheduled.forEach((oscillator) => oscillator.stop(context.currentTime));
  scheduled.clear();
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

function HelpTip({ id, text, open, onToggle }: { id: string; text: ReactNode; open: boolean; onToggle: () => void }) {
  const [offset, setOffset] = useState(0);
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const width = Math.min(320, window.innerWidth - 32);
    setOffset(Math.min(0, window.innerWidth - 16 - event.currentTarget.getBoundingClientRect().left - width));
    onToggle();
  };
  return <span className="help-tip">
    <button type="button" className="help-button" aria-label="기능 설명" aria-expanded={open} aria-controls={open ? id : undefined} onClick={toggle}>?</button>
    {open && <span id={id} className="help-bubble" role="status" style={{ left: offset }}><span className="help-bubble-heading"><strong>기능 설명</strong><button type="button" aria-label="기능 설명 닫기" onClick={onToggle}>닫기</button></span><span className="help-bubble-text">{text}</span></span>}
  </span>;
}

export function App() {
  const [settings, setSettings] = useState<MetronomeSettings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [beat, setBeat] = useState(0);
  const [countIn, setCountIn] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_SETTINGS.durationSeconds);
  const [tempoDraft, setTempoDraft] = useState(String(DEFAULT_SETTINGS.tempo));
  const [durationDraft, setDurationDraft] = useState(String(DEFAULT_SETTINGS.durationSeconds / 60));
  const [view, setView] = useState<AppView>('home');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [openHelp, setOpenHelp] = useState<string | null>(null);
  const [screenLockState, setScreenLockState] = useState<ScreenLockState>('off');
  const [audioInterrupted, setAudioInterrupted] = useState(false);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const [locationState, setLocationState] = useState<LocationState>('waiting');
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const [locationRetry, setLocationRetry] = useState(0);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [weatherCoords, setWeatherCoords] = useState<string | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null);
  const [weatherRetry, setWeatherRetry] = useState(0);
  const audioContext = useRef<AudioContext | null>(null);
  const schedule = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioSchedule = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduledOscillators = useRef(new Set<OscillatorNode>());
  const screenWakeLock = useRef<WakeLockSentinel | null>(null);
  const screenWakeLockRequesting = useRef(false);
  const screenLockGeneration = useRef(0);
  const beatNumber = useRef(0);
  const remainingAtPause = useRef(DEFAULT_SETTINGS.durationSeconds);
  const startGeneration = useRef(0);
  const remainingWhenHidden = useRef<number | null>(null);
  const lastIntervalCueKey = useRef<string | null>(null);
  const lastWeatherFetch = useRef<{ at: number; coords: string } | null>(null);
  const intervalPlan = intervalPlanFor(settings);
  const totalSeconds = intervalPlan ? intervalTotalSeconds(intervalPlan) : settings.durationSeconds;
  const intervalStatus = intervalPlan && remainingSeconds > 0 ? intervalPosition(intervalPlan, totalSeconds - remainingSeconds) : null;
  const activeTempo = intervalStatus?.tempo ?? settings.tempo;

  useEffect(() => {
    if (view === 'complete') window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    if (!openHelp) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('.help-tip')) setOpenHelp(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenHelp(null);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openHelp]);

  const requestScreenWakeLock = async () => {
    if (!('wakeLock' in navigator)) {
      setScreenLockState('unavailable');
      return;
    }
    if (screenWakeLock.current || screenWakeLockRequesting.current) return;
    screenWakeLockRequesting.current = true;
    const requestGeneration = screenLockGeneration.current;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (requestGeneration !== screenLockGeneration.current) {
        await sentinel.release();
        return;
      }
      screenWakeLock.current = sentinel;
      setScreenLockState('active');
      sentinel.addEventListener('release', () => {
        if (screenWakeLock.current === sentinel) {
          screenWakeLock.current = null;
          setScreenLockState('off');
        }
      });
    } catch {
      setScreenLockState('unavailable');
    } finally {
      screenWakeLockRequesting.current = false;
    }
  };

  const releaseScreenWakeLock = async () => {
    screenLockGeneration.current += 1;
    const sentinel = screenWakeLock.current;
    screenWakeLock.current = null;
    if (sentinel) await sentinel.release();
    setScreenLockState('off');
  };

  useEffect(() => {
    const saved = loadSettings(localStorage.getItem(SETTINGS_STORAGE_KEY));
    setSettings(saved);
    const initialSeconds = intervalPlanFor(saved) ? intervalTotalSeconds(intervalPlanFor(saved)!) : saved.durationSeconds;
    setRemainingSeconds(initialSeconds);
    setTempoDraft(String(saved.tempo));
    setDurationDraft(String(saved.durationSeconds / 60));
    remainingAtPause.current = initialSeconds;
  }, []);
  useEffect(() => localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)), [settings]);
  useEffect(() => setTempoDraft(String(settings.tempo)), [settings.tempo]);
  useEffect(() => setDurationDraft(String(settings.durationSeconds / 60)), [settings.durationSeconds]);

  useEffect(() => {
    if (settings.environment !== 'outdoor' || view !== 'session') return;
    setLocationState('waiting');
    setSpeedKmh(null);
    if (!navigator.geolocation) {
      setLocationState('unavailable');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setSpeedKmh(gpsSpeedKmh(position.coords.speed));
        setLocationState('ready');
        const roundedCoords = `${position.coords.latitude.toFixed(2)},${position.coords.longitude.toFixed(2)}`;
        setWeatherCoords((previous) => previous === roundedCoords ? previous : roundedCoords);
      },
      (error) => {
        setSpeedKmh(null);
        setLocationState(error.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [settings.environment, view, locationRetry]);

  useEffect(() => {
    if (!weatherEnabled || !weatherCoords || settings.environment !== 'outdoor' || view !== 'session') return;
    if (lastWeatherFetch.current && Date.now() - lastWeatherFetch.current.at < 30 * 60_000 && weatherForecast) return;
    const controller = new AbortController();
    const [latitude, longitude] = weatherCoords.split(',');
    setWeatherStatus('loading');
    void fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(`Weather HTTP ${response.status}`); return response.json() as Promise<unknown>; })
      .then((data) => {
        const forecast = parseWeatherForecast(data);
        if (!forecast) throw new Error('Weather data unavailable');
        setWeatherForecast(forecast);
        setWeatherStatus('ready');
        lastWeatherFetch.current = { at: Date.now(), coords: weatherCoords };
      })
      .catch(() => { if (!controller.signal.aborted) setWeatherStatus('error'); });
    return () => controller.abort();
  }, [weatherEnabled, weatherCoords, weatherRetry, settings.environment, view]);

  useEffect(() => {
    if (!weatherEnabled || settings.environment !== 'outdoor' || view !== 'session') return;
    const timer = setInterval(() => setWeatherRetry((value) => value + 1), 31 * 60_000);
    return () => clearInterval(timer);
  }, [weatherEnabled, settings.environment, view]);

  useEffect(() => {
    if (phase !== 'playing') return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const nextBeat = beatNumber.current + 1;
      beatNumber.current = nextBeat;
      setBeat(nextBeat);
      if (settings.vibrationEnabled && 'vibrate' in navigator) navigator.vibrate(18);
      schedule.current = setTimeout(tick, beatIntervalMs(activeTempo));
    };
    tick();
    return () => {
      cancelled = true;
      if (schedule.current) clearTimeout(schedule.current);
      if ('vibrate' in navigator) navigator.vibrate(0);
    };
  }, [phase, activeTempo, settings.vibrationEnabled]);

  useEffect(() => {
    if (phase !== 'count-in') return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (settings.vibrationEnabled && 'vibrate' in navigator) navigator.vibrate(18);
      setCountIn((remaining) => {
        if (remaining <= 1) {
          setPhase('playing');
          return 0;
        }
        return remaining - 1;
      });
      schedule.current = setTimeout(tick, beatIntervalMs(settings.tempo));
    };
    tick();
    return () => { cancelled = true; if (schedule.current) clearTimeout(schedule.current); };
  }, [phase, settings.tempo, settings.vibrationEnabled]);

  useEffect(() => {
    if (phase === 'idle' || !settings.soundEnabled || !audioContext.current) return;
    const context = audioContext.current;
    const intervalSeconds = beatIntervalMs(activeTempo) / 1_000;
    let nextBeatAt = context.currentTime + 0.08;
    const scheduledFrom = context.currentTime;
    const elapsedAtStart = totalSeconds - remainingSeconds;
    let scheduledBeat = phase === 'playing' ? beatNumber.current : 0;
    let cancelled = false;
    const scheduleAudio = () => {
      if (cancelled || context.state !== 'running') return;
      const scheduleThrough = context.currentTime + 20;
      while (nextBeatAt < scheduleThrough) {
        const tempoAtBeat = intervalPlan ? intervalPosition(intervalPlan, elapsedAtStart + (nextBeatAt - scheduledFrom)).tempo : activeTempo;
        scheduledBeat += 1;
        scheduleTick(context, nextBeatAt, phase === 'playing' && isAccentBeat(scheduledBeat, settings.beatGroup), settings.beatSound, scheduledOscillators.current);
        nextBeatAt += intervalPlan ? beatIntervalMs(tempoAtBeat) / 1_000 : intervalSeconds;
      }
    };
    scheduleAudio();
    audioSchedule.current = setInterval(scheduleAudio, 1_000);
    return () => {
      cancelled = true;
      if (audioSchedule.current) clearInterval(audioSchedule.current);
      stopScheduledTicks(context, scheduledOscillators.current);
    };
  }, [phase, activeTempo, settings.soundEnabled, settings.beatGroup, settings.beatSound, settings.intervalMode]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const startedAt = Date.now();
    const startingSeconds = remainingAtPause.current;
    const updateRemaining = () => {
      if (document.visibilityState === 'hidden' && audioContext.current?.state !== 'running') return;
      const next = Math.max(0, startingSeconds - Math.floor((Date.now() - startedAt) / 1_000));
      remainingAtPause.current = next;
      setRemainingSeconds(next);
      if (next === 0) {
        setPhase('idle');
        setView('complete');
      }
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 250);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing') setSessionStarted(true);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing' || !intervalStatus) return;
    const key = `${intervalStatus.round}-${intervalStatus.segment}`;
    if (shouldPlayIntervalCue(lastIntervalCueKey.current, key) && settings.whistleEnabled && settings.soundEnabled && audioContext.current?.state === 'running') {
      scheduleWhistle(audioContext.current, audioContext.current.currentTime + 0.02, scheduledOscillators.current);
    }
    lastIntervalCueKey.current = key;
  }, [phase, intervalStatus?.round, intervalStatus?.segment, settings.whistleEnabled, settings.soundEnabled]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const mediaSession = navigator.mediaSession;
    mediaSession.playbackState = phase === 'idle' ? 'none' : 'playing';
    try {
      mediaSession.setActionHandler('play', () => void start());
      mediaSession.setActionHandler('pause', pause);
      mediaSession.setActionHandler('stop', pause);
    } catch {
      // 일부 브라우저는 지원하지 않는 Media Session 동작을 등록할 수 없다.
    }
    return () => {
      mediaSession.setActionHandler('play', null);
      mediaSession.setActionHandler('pause', null);
      mediaSession.setActionHandler('stop', null);
    };
  }, [phase]);

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
    if (phase === 'idle' || !settings.soundEnabled) return;
    const checkAudioOnReturn = () => {
      if (document.visibilityState === 'hidden') {
        remainingWhenHidden.current = remainingAtPause.current;
        return;
      }
      if (audioContext.current && audioContext.current.state !== 'running') {
        pause();
        if (remainingWhenHidden.current !== null) {
          remainingAtPause.current = remainingWhenHidden.current;
          setRemainingSeconds(remainingWhenHidden.current);
        }
        setAudioInterrupted(true);
      }
      remainingWhenHidden.current = null;
    };
    document.addEventListener('visibilitychange', checkAudioOnReturn);
    return () => document.removeEventListener('visibilitychange', checkAudioOnReturn);
  }, [phase, settings.soundEnabled]);

  useEffect(() => () => {
    if (audioSchedule.current) clearInterval(audioSchedule.current);
    if (audioContext.current) stopScheduledTicks(audioContext.current, scheduledOscillators.current);
    void releaseScreenWakeLock();
    void audioContext.current?.close();
  }, []);

  const update = (next: Partial<MetronomeSettings>) => setSettings((value) => ({ ...value, ...next }));
  const chooseBeatSound = async (beatSound: BeatSound) => {
    update({ beatSound });
    try {
      audioContext.current ??= new AudioContext();
      await audioContext.current.resume();
      scheduleTick(audioContext.current, audioContext.current.currentTime + 0.04, false, beatSound, scheduledOscillators.current);
      setPreviewUnavailable(false);
    } catch {
      setPreviewUnavailable(true);
    }
  };
  const chooseWhistle = async (enabled: boolean) => {
    update({ whistleEnabled: enabled });
    if (!enabled) return;
    try {
      audioContext.current ??= new AudioContext();
      await audioContext.current.resume();
      scheduleWhistle(audioContext.current, audioContext.current.currentTime + 0.04, scheduledOscillators.current);
      setPreviewUnavailable(false);
    } catch {
      setPreviewUnavailable(true);
    }
  };
  const selectInterval = (intervalMode: MetronomeSettings['intervalMode']) => {
    if (sessionStarted) return;
    update({ intervalMode });
    const nextPlan = intervalPlanFor({ intervalMode, customInterval: settings.customInterval });
    const seconds = nextPlan ? intervalTotalSeconds(nextPlan) : settings.durationSeconds;
    remainingAtPause.current = seconds;
    setRemainingSeconds(seconds);
  };
  const updateCustomInterval = (part: keyof IntervalPlan, value: number) => {
    if (sessionStarted) return;
    const customInterval = normalizeIntervalPlan({ ...settings.customInterval, [part]: value });
    update({ customInterval });
    if (settings.intervalMode === 'custom') {
      const seconds = intervalTotalSeconds(customInterval);
      remainingAtPause.current = seconds;
      setRemainingSeconds(seconds);
    }
  };
  const setDurationMinutes = (minutes: number) => {
    if (sessionStarted || settings.intervalMode !== 'steady') return;
    const durationSeconds = clampDurationSeconds(minutes * 60);
    update({ durationSeconds });
    if (phase === 'idle') {
      remainingAtPause.current = durationSeconds;
      setRemainingSeconds(durationSeconds);
    }
  };
  const commitTempo = () => {
    const parsed = Number(tempoDraft);
    const tempo = clampTempo(Number.isFinite(parsed) ? parsed : settings.tempo);
    update({ tempo });
    setTempoDraft(String(tempo));
  };
  const commitDuration = () => {
    const parsed = Number(durationDraft);
    const minutes = Number.isFinite(parsed) ? parsed : settings.durationSeconds / 60;
    setDurationMinutes(minutes);
  };
  const start = async (fresh = false) => {
    if (phase !== 'idle' || remainingAtPause.current === 0) return;
    const generation = ++startGeneration.current;
    void requestScreenWakeLock();
    if (settings.soundEnabled) {
      usePlaybackAudioSession();
      audioContext.current ??= new AudioContext();
      try {
        await audioContext.current.resume();
      } catch {
        setAudioInterrupted(true);
        return;
      }
    }
    if (generation !== startGeneration.current) return;
    setAudioInterrupted(false);
    if ((fresh || !sessionStarted) && settings.countInEnabled) {
      setCountIn(4);
      setPhase('count-in');
    } else {
      setPhase('playing');
    }
  };
  const pause = () => {
    startGeneration.current += 1;
    setPhase('idle');
  };
  const openHome = () => {
    pause();
    setOpenHelp(null);
    setView('home');
  };
  const enterWorkout = () => {
    setOpenHelp(null);
    setView('session');
    void start();
  };
  const prepareAnotherWorkout = () => {
    startGeneration.current += 1;
    setBeat(0);
    setCountIn(0);
    setSessionStarted(false);
    setAudioInterrupted(false);
    beatNumber.current = 0;
    lastIntervalCueKey.current = null;
    remainingAtPause.current = totalSeconds;
    setRemainingSeconds(totalSeconds);
  };
  const repeatWorkout = () => {
    prepareAnotherWorkout();
    setView('session');
    void start(true);
  };
  const changeWorkoutSettings = () => {
    prepareAnotherWorkout();
    setView('home');
  };
  const reset = () => {
    startGeneration.current += 1;
    setPhase('idle');
    setBeat(0);
    setCountIn(0);
    setSessionStarted(false);
    setAudioInterrupted(false);
    remainingWhenHidden.current = null;
    beatNumber.current = 0;
    lastIntervalCueKey.current = null;
    setSettings(DEFAULT_SETTINGS);
    remainingAtPause.current = DEFAULT_SETTINGS.durationSeconds;
    setRemainingSeconds(DEFAULT_SETTINGS.durationSeconds);
  };
  const toggleHelp = (id: string) => {
    const closing = openHelp === id;
    setOpenHelp(closing ? null : id);
    if (closing) return;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };
  const help = (id: string, text: ReactNode) => <HelpTip id={id} text={text} open={openHelp === id} onToggle={() => toggleHelp(id)} />;
  const pendulum = <div className={phase === 'playing' ? 'pendulum playing' : 'pendulum'} style={{ '--swing-duration': `${swingDurationMs(activeTempo)}ms` } as CSSProperties}>
    <span className="pivot" />
    <span className="arm"><span className="weight" /></span>
  </div>;

  return <main className={`app-shell ${view}-view`}>
    <header className="app-header">
      <h1>모두의 비트</h1>
      {view === 'session' && <button type="button" className="settings-link" onClick={openHome} aria-label="운동 일시정지하고 설정 열기">⚙ 설정</button>}
    </header>

    {view === 'complete' && <section className="completion-card" aria-labelledby="completion-title">
      <div className="completion-mark" aria-hidden="true">✓</div>
      <p className="completion-eyebrow">오늘의 운동</p>
      <h2 id="completion-title">운동 완료!</h2>
      <p className="completion-intro">설정한 운동 시간을 모두 채웠어요.</p>
      <dl className="completion-summary">
        <div><dt>운동 환경</dt><dd>{settings.environment === 'indoor' ? '실내' : '실외'}</dd></div>
        <div><dt>운동 시간</dt><dd>{formatDuration(totalSeconds)}</dd></div>
        {intervalPlan ? <><div><dt>운동 방식</dt><dd>인터벌 · {intervalPlan.rounds}회</dd></div><div><dt>구간 리듬</dt><dd>빠른 {intervalPlan.workTempo} / 회복 {intervalPlan.recoveryTempo} BPM</dd></div></> : <div><dt>템포</dt><dd>{settings.tempo} BPM</dd></div>}
      </dl>
      <div className="completion-actions"><button type="button" className="start-button" onClick={repeatWorkout}>같은 설정으로 다시</button><button type="button" onClick={changeWorkoutSettings}>설정 바꾸기</button></div>
    </section>}

    {view === 'session' && <section className="metronome-card" aria-label={`${activeTempo} BPM 메트로놈`}>
      {settings.environment === 'outdoor' ? <div className="outdoor-stage">
        <div className="outdoor-metric speed-metric"><span>속도</span><strong>{speedKmh === null ? '—' : speedKmh}</strong><small>km/h</small></div>
        {pendulum}
        <div className="outdoor-metric weather-metric"><span className="weather-heading">날씨 {help('weather-help', <>예보 자료: <a href="https://api.met.no/" target="_blank" rel="noreferrer">MET Norway</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a><br />기온과 날씨 상태를 간추려 표시합니다.</>)}</span>{weatherStatus === 'ready' && weatherForecast ? <><strong>{weatherForecast.temperatureC}°</strong><small>{weatherForecast.condition}</small></> : weatherStatus === 'loading' ? <small>조회 중</small> : weatherStatus === 'error' ? <button type="button" onClick={() => setWeatherRetry((value) => value + 1)}>다시 조회</button> : weatherEnabled && !weatherCoords ? <small>{locationState === 'denied' || locationState === 'error' || locationState === 'unavailable' ? '위치 필요' : '위치 대기'}</small> : <button type="button" onClick={() => setWeatherEnabled(true)}>날씨 조회</button>}</div>
      </div> : pendulum}
      {settings.environment === 'outdoor' && <div className="outdoor-details">
        {locationState !== 'ready' || speedKmh === null ? <p>{locationState === 'waiting' ? 'GPS 속도 확인 중' : locationState === 'unavailable' ? '위치 정보 미지원' : locationState === 'denied' ? '위치 권한이 거부되었습니다.' : locationState === 'error' ? '위치 정보를 받을 수 없습니다.' : 'GPS 속도 값이 없습니다.'}</p> : null}
        {(locationState === 'denied' || locationState === 'error') && <button type="button" onClick={() => setLocationRetry((value) => value + 1)}>위치 다시 시도</button>}
        {!weatherEnabled && <p>날씨 조회 시 대략적 위치와 IP가 MET Norway에 전달됩니다.</p>}
      </div>}
      <output aria-live="polite">{activeTempo}<small>BPM</small></output>
      {intervalStatus && <div className="interval-session" aria-live="polite"><strong>{intervalStatus.segment === 'work' ? '빠른 구간' : '회복 구간'} · {intervalStatus.round}/{intervalPlan!.rounds}회</strong><span>구간 남은 시간 {formatDuration(intervalStatus.segmentRemaining)}</span></div>}
      <time className="remaining-time" dateTime={`PT${remainingSeconds}S`}>남은 시간 {formatDuration(remainingSeconds)}</time>
      <p className="beat-label">{phase === 'count-in' ? `시작까지 ${countIn}` : phase === 'playing' ? `박자 ${beat}` : remainingSeconds === 0 ? '운동 완료 — 초기화 후 다시 시작' : '일시정지됨'}</p>
      {audioInterrupted && <p className="audio-interrupted" role="status">오디오가 중단되었습니다. 화면을 켠 상태에서 이어하기를 눌러 주세요.</p>}
      {phase !== 'idle' && <p className="background-status">{screenLockState === 'active' ? '화면 켜짐 유지 중' : screenLockState === 'unavailable' ? '화면 켜짐 유지 미지원' : '화면 켜짐 유지 요청 중'}</p>}
      <div className="session-actions" aria-label="메트로놈 재생 제어">
        <span><button className="start-button" type="button" onClick={() => void start()} disabled={phase !== 'idle' || remainingSeconds === 0}>이어하기</button>{help('start-help', '일시정지된 운동을 남은 시간부터 다시 시작합니다.')}</span>
        <span><button type="button" onClick={pause} disabled={phase === 'idle'}>일시정지</button>{help('pause-help', '현재 템포·박자·남은 시간을 유지한 채 비트를 멈춥니다.')}</span>
        <span><button type="button" onClick={reset}>초기화</button>{help('reset-help', '운동을 멈추고 기본 설정과 30분 목표 시간으로 되돌립니다.')}</span>
      </div>
    </section>
    }

    {view === 'home' && <section className="controls" aria-label="운동 준비와 메트로놈 설정">
      <h2>운동 설정</h2>
      {sessionStarted && <p className="home-session-status">{remainingSeconds === 0 ? '운동이 완료되었습니다. 초기화 후 다시 시작할 수 있습니다.' : `일시정지된 운동 · 남은 시간 ${formatDuration(remainingSeconds)}`}</p>}
      <div className="setting-heading">운동 환경 {help('environment-help', '실내에서는 리듬만 표시합니다. 실외 운동 화면에서는 위치 권한을 요청해 GPS 속도를 km/h로 표시합니다.')}</div>
      <div className="mode-tabs" role="group" aria-label="운동 환경">
        <button type="button" className={settings.environment === 'indoor' ? 'selected' : ''} aria-pressed={settings.environment === 'indoor'} onClick={() => update({ environment: 'indoor' })}>실내</button>
        <button type="button" className={settings.environment === 'outdoor' ? 'selected' : ''} aria-pressed={settings.environment === 'outdoor'} onClick={() => update({ environment: 'outdoor' })}>실외</button>
      </div>
      <details className="interval-settings"><summary>인터벌 {settings.intervalMode === 'steady' ? '사용 안 함' : settings.intervalMode === 'short' ? '짧은 반복' : settings.intervalMode === 'balanced' ? '균형 반복' : '사용자 설정'}</summary>
        <div className="interval-options" role="group" aria-label="인터벌 선택">
          {([['steady', '사용 안 함'], ['short', '짧은 반복'], ['balanced', '균형 반복'], ['custom', '사용자 설정']] as const).map(([mode, label]) => <button key={mode} type="button" className={settings.intervalMode === mode ? 'selected' : ''} aria-pressed={settings.intervalMode === mode} disabled={sessionStarted} onClick={() => selectInterval(mode)}>{label}</button>)}
        </div>
        <p className="interval-description">{intervalPlan ? `빠른 ${formatDuration(intervalPlan.workSeconds)} · 회복 ${formatDuration(intervalPlan.recoverySeconds)} × ${intervalPlan.rounds}회 · 총 ${formatDuration(totalSeconds)}` : '일정한 BPM으로 운동합니다.'}</p>
        {intervalPlan && <div className="interval-custom">
          {([['workSeconds', '빠른 구간(초)', 30, 1800, 30], ['workTempo', '빠른 BPM', 40, 240, 1], ['recoverySeconds', '회복 구간(초)', 30, 1800, 30], ['recoveryTempo', '회복 BPM', 40, 240, 1], ['rounds', '반복 횟수', 1, 30, 1]] as const).map(([part, label, min, max, step]) => <div className="interval-field" key={part}><span className="interval-field-title">{label}{settings.intervalMode === 'custom' && <small>{min}~{max}</small>}</span>{settings.intervalMode === 'custom' ? <input type="number" aria-label={`${label}, 허용 범위 ${min}~${max}`} min={min} max={max} step={step} defaultValue={settings.customInterval[part]} disabled={sessionStarted} onBlur={(event) => { const raw = event.target.value; const value = raw === '' ? settings.customInterval[part] : Number(raw); const normalized = normalizeIntervalPlan({ ...settings.customInterval, [part]: value }); updateCustomInterval(part, value); event.target.value = String(normalized[part]); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /> : <output>{intervalPlan[part]}</output>}</div>)}
        </div>}
      </details>
      {settings.intervalMode === 'steady' && <>
      <div className="tempo-control">
        <div className="setting-heading">템포 {help('tempo-help', '1분 동안의 비트 수입니다. 슬라이더·증감 버튼·직접 입력으로 40~240까지 설정할 수 있습니다.')}</div>
        <div className="tempo-current"><strong>{settings.tempo}</strong><span>BPM</span></div>
        <div className="tempo-slider"><button type="button" aria-label="템포 1 감소" onClick={() => update({ tempo: clampTempo(settings.tempo - 1) })}>−</button><input id="tempo" type="range" min="40" max="240" value={settings.tempo} onChange={(event) => update({ tempo: Number(event.target.value) })} /><button type="button" aria-label="템포 1 증가" onClick={() => update({ tempo: clampTempo(settings.tempo + 1) })}>+</button></div>
        <div className="presets" aria-label="BPM 프리셋">{TEMPO_PRESETS.map((tempo) => <button key={tempo} type="button" className={tempo === settings.tempo ? 'selected' : ''} aria-pressed={tempo === settings.tempo} onClick={() => update({ tempo })}>{tempo} BPM</button>)}</div>
      </div>
      <fieldset className="duration" disabled={sessionStarted}><legend>목표 운동 시간 {help('duration-help', '운동 세션의 전체 시간입니다. 카운트인이 끝난 뒤부터 남은 시간이 줄고, 0초가 되면 자동으로 멈춥니다.')}</legend><div className="duration-presets">{[10, 20, 30, 45, 60].map((minutes) => <button key={minutes} type="button" className={settings.durationSeconds === minutes * 60 ? 'selected' : ''} aria-pressed={settings.durationSeconds === minutes * 60} onClick={() => setDurationMinutes(minutes)}>{minutes}<small>분</small></button>)}</div>{sessionStarted && <p className="duration-locked">목표 시간을 바꾸려면 운동을 초기화하세요.</p>}</fieldset>
      </>}
      <details className="more-settings"><summary>세부 설정 · 직접 입력</summary>
      {settings.intervalMode === 'steady' && <><label className="tempo-input" htmlFor="tempo-number">템포 직접 입력 <input id="tempo-number" type="number" min="40" max="240" value={tempoDraft} onChange={(event) => setTempoDraft(event.target.value)} onBlur={commitTempo} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /> BPM</label>
      <label className="duration-input">시간 직접 입력 <input type="number" min="10" max="240" value={durationDraft} disabled={sessionStarted} onChange={(event) => setDurationDraft(event.target.value)} onBlur={commitDuration} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /> 분</label></>}
      <fieldset className="beat-group"><legend>박자 묶음 · 첫 박 강조 {help('group-help', '2·3·4박을 고르면 각 묶음의 첫 비트를 높은 소리로 강조합니다. 적용 안 함은 모든 비트를 같은 소리로 재생합니다.')}</legend><div>{([0, 2, 3, 4] as const).map((group) => <button key={group} type="button" className={settings.beatGroup === group ? 'selected' : ''} aria-pressed={settings.beatGroup === group} onClick={() => update({ beatGroup: group })}>{group === 0 ? '적용 안 함' : `${group}박`}</button>)}</div></fieldset>
      <div className="toggles">
        <span className="toggle-help"><label><input type="checkbox" checked={settings.soundEnabled} onChange={(event) => update({ soundEnabled: event.target.checked })} /> 비트 소리</label>{help('sound-help', '운동 박자에 맞춰 짧은 합성 비트를 재생합니다.')}</span>
        {settings.intervalMode !== 'steady' && <span className="toggle-help"><label><input type="checkbox" checked={settings.whistleEnabled} onChange={(event) => void chooseWhistle(event.target.checked)} /> 구간 전환 호르라기</label>{help('whistle-help', '인터벌 구간이 바뀔 때 짧은 호르라기 소리를 냅니다. 비트 소리가 켜져 있어야 운동 중에 울립니다.')}</span>}
        <span className="toggle-help"><label><input type="checkbox" checked={settings.vibrationEnabled} onChange={(event) => update({ vibrationEnabled: event.target.checked })} /> 진동</label>{help('vibration-help', '지원 기기에서는 각 박자에 짧게 진동합니다.')}</span>
        <span className="toggle-help"><label><input type="checkbox" checked={settings.countInEnabled} onChange={(event) => update({ countInEnabled: event.target.checked })} /> 4박 카운트인</label>{help('countin-help', '시작을 누르면 준비 비트 4번을 낸 뒤 운동 비트와 목표 시간을 시작합니다.')}</span>
      </div>
      <div className="sound-choice"><div className="setting-heading">비트 소리 종류 {help('beat-sound-help', '소리를 고르면 짧게 미리 듣습니다. 운동 중에는 선택한 소리로 비트를 재생합니다.')}</div><div className="sound-options" role="group" aria-label="비트 소리 종류">{([['tick', '똑딱'], ['beep', '비프'], ['wood', '우드']] as const).map(([sound, label]) => <button key={sound} type="button" className={settings.beatSound === sound ? 'selected' : ''} aria-pressed={settings.beatSound === sound} onClick={() => void chooseBeatSound(sound)}>{label}</button>)}</div></div>
      {previewUnavailable && <p className="audio-interrupted" role="status">미리 듣기를 재생할 수 없습니다.</p>}
      </details>
    </section>
    }
    {view === 'home' && <div className="home-action-bar"><div className="home-action-inner">{sessionStarted && <button className="home-reset-button" type="button" onClick={reset}>초기화</button>}<button className="home-start-button" type="button" onClick={enterWorkout} disabled={remainingSeconds === 0}>{sessionStarted ? '운동 이어하기' : '운동 시작'}</button></div></div>}
  </main>;
}
