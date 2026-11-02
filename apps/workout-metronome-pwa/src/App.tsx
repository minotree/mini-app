import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DEFAULT_SETTINGS, MODE_INFO, SETTINGS_STORAGE_KEY, beatIntervalMs, clampDurationSeconds, clampTempo, isAccentBeat, loadSettings, swingDurationMs, type MetronomeSettings, type WorkoutMode } from './metronome';

type SessionPhase = 'idle' | 'count-in' | 'playing';
type ScreenLockState = 'active' | 'unavailable' | 'off';

const scheduleTick = (context: AudioContext, at: number, accent: boolean, scheduled: Set<OscillatorNode>) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(accent ? 1_320 : 880, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.17 : 0.12, at + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  oscillator.connect(gain).connect(context.destination);
  scheduled.add(oscillator);
  oscillator.onended = () => scheduled.delete(oscillator);
  oscillator.start(at);
  oscillator.stop(at + 0.07);
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

function HelpTip({ id, text, open, onToggle }: { id: string; text: string; open: boolean; onToggle: () => void }) {
  return <span className="help-tip">
    <button type="button" className="help-button" aria-label="기능 설명" aria-expanded={open} aria-controls={id} onClick={onToggle}>?</button>
    {open && <span id={id} className="help-bubble" role="status">{text}</span>}
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
  const [openHelp, setOpenHelp] = useState<string | null>(null);
  const [screenLockState, setScreenLockState] = useState<ScreenLockState>('off');
  const audioContext = useRef<AudioContext | null>(null);
  const schedule = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioSchedule = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduledOscillators = useRef(new Set<OscillatorNode>());
  const screenWakeLock = useRef<WakeLockSentinel | null>(null);
  const screenWakeLockRequesting = useRef(false);
  const screenLockGeneration = useRef(0);
  const beatNumber = useRef(0);
  const remainingAtPause = useRef(DEFAULT_SETTINGS.durationSeconds);

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
    setRemainingSeconds(saved.durationSeconds);
    setTempoDraft(String(saved.tempo));
    setDurationDraft(String(saved.durationSeconds / 60));
    remainingAtPause.current = saved.durationSeconds;
  }, []);
  useEffect(() => localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)), [settings]);
  useEffect(() => setTempoDraft(String(settings.tempo)), [settings.tempo]);
  useEffect(() => setDurationDraft(String(settings.durationSeconds / 60)), [settings.durationSeconds]);

  useEffect(() => {
    if (phase !== 'playing') return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const nextBeat = beatNumber.current + 1;
      beatNumber.current = nextBeat;
      setBeat(nextBeat);
      if (settings.vibrationEnabled && 'vibrate' in navigator) navigator.vibrate(18);
      schedule.current = setTimeout(tick, beatIntervalMs(settings.tempo));
    };
    tick();
    return () => {
      cancelled = true;
      if (schedule.current) clearTimeout(schedule.current);
      if ('vibrate' in navigator) navigator.vibrate(0);
    };
  }, [phase, settings.tempo, settings.vibrationEnabled]);

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
    const intervalSeconds = beatIntervalMs(settings.tempo) / 1_000;
    let nextBeatAt = context.currentTime + 0.08;
    let scheduledBeat = phase === 'playing' ? beatNumber.current : 0;
    let cancelled = false;
    const scheduleAudio = () => {
      if (cancelled || context.state !== 'running') return;
      const scheduleThrough = context.currentTime + 20;
      while (nextBeatAt < scheduleThrough) {
        scheduledBeat += 1;
        scheduleTick(context, nextBeatAt, phase === 'playing' && isAccentBeat(scheduledBeat, settings.beatGroup), scheduledOscillators.current);
        nextBeatAt += intervalSeconds;
      }
    };
    scheduleAudio();
    audioSchedule.current = setInterval(scheduleAudio, 1_000);
    return () => {
      cancelled = true;
      if (audioSchedule.current) clearInterval(audioSchedule.current);
      stopScheduledTicks(context, scheduledOscillators.current);
    };
  }, [phase, settings.tempo, settings.soundEnabled, settings.beatGroup]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const startedAt = Date.now();
    const startingSeconds = remainingAtPause.current;
    const updateRemaining = () => {
      const next = Math.max(0, startingSeconds - Math.floor((Date.now() - startedAt) / 1_000));
      remainingAtPause.current = next;
      setRemainingSeconds(next);
      if (next === 0) setPhase('idle');
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 250);
    return () => clearInterval(interval);
  }, [phase]);

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

  useEffect(() => () => {
    if (audioSchedule.current) clearInterval(audioSchedule.current);
    if (audioContext.current) stopScheduledTicks(audioContext.current, scheduledOscillators.current);
    void releaseScreenWakeLock();
    void audioContext.current?.close();
  }, []);

  const update = (next: Partial<MetronomeSettings>) => setSettings((value) => ({ ...value, ...next }));
  const setDurationMinutes = (minutes: number) => {
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
  const selectMode = (mode: WorkoutMode) => update({ mode, tempo: MODE_INFO[mode].presets[1] });
  const start = async () => {
    if (phase !== 'idle' || remainingAtPause.current === 0) return;
    void requestScreenWakeLock();
    if (settings.soundEnabled) {
      audioContext.current ??= new AudioContext();
      await audioContext.current.resume();
    }
    if (settings.countInEnabled) {
      setCountIn(4);
      setPhase('count-in');
    } else {
      setPhase('playing');
    }
  };
  const pause = () => setPhase('idle');
  const reset = () => {
    setPhase('idle');
    setBeat(0);
    setCountIn(0);
    beatNumber.current = 0;
    setSettings(DEFAULT_SETTINGS);
    remainingAtPause.current = DEFAULT_SETTINGS.durationSeconds;
    setRemainingSeconds(DEFAULT_SETTINGS.durationSeconds);
  };
  const info = MODE_INFO[settings.mode];
  const help = (id: string, text: string) => <HelpTip id={id} text={text} open={openHelp === id} onToggle={() => setOpenHelp((current) => current === id ? null : id)} />;

  return <main className="app-shell">
    <header>
      <p className="eyebrow">WORKOUT METRONOME</p>
      <h1>운동 리듬 맞추기</h1>
      <p className="subtle">화면의 추 움직임을 기준으로 일정한 리듬을 유지하세요.</p>
    </header>

    <section className="metronome-card" aria-label={`${settings.tempo} ${info.unit} 메트로놈`}>
      <div className={phase === 'playing' ? 'pendulum playing' : 'pendulum'} style={{ '--swing-duration': `${swingDurationMs(settings.tempo)}ms` } as CSSProperties}>
        <span className="pivot" />
        <span className="arm"><span className="weight" /></span>
      </div>
      <output aria-live="polite">{settings.tempo}<small>{info.unit}</small></output>
      <time className="remaining-time" dateTime={`PT${remainingSeconds}S`}>남은 시간 {formatDuration(remainingSeconds)}</time>
      <p className="beat-label">{phase === 'count-in' ? `시작까지 ${countIn}` : phase === 'playing' ? `박자 ${beat}` : remainingSeconds === 0 ? '운동 완료 — 초기화 후 다시 시작' : '준비됨'}</p>
      {phase !== 'idle' && <p className="background-status">{screenLockState === 'active' ? '화면 켜짐 유지 중 · ' : screenLockState === 'unavailable' ? '화면 켜짐 유지 미지원 · ' : '화면 켜짐 유지 요청 중 · '}화면을 끄거나 다른 앱으로 전환해도 소리를 미리 예약해 재생을 이어갑니다.</p>}
      <div className="session-actions" aria-label="메트로놈 재생 제어">
        <span><button className="start-button" type="button" onClick={() => void start()} disabled={phase !== 'idle' || remainingSeconds === 0}>시작</button>{help('start-help', '카운트인을 켠 경우 준비 비트 4번 뒤에 운동과 시간이 시작됩니다.')}</span>
        <span><button type="button" onClick={pause} disabled={phase === 'idle'}>일시정지</button>{help('pause-help', '현재 템포·박자·남은 시간을 유지한 채 비트를 멈춥니다.')}</span>
        <span><button type="button" onClick={reset}>초기화</button>{help('reset-help', '운동을 멈추고 기본 설정과 30분 목표 시간으로 되돌립니다.')}</span>
      </div>
    </section>

    <section className="controls" aria-label="메트로놈 설정">
      <p className="help-notice">각 <span aria-hidden="true">?</span> 버튼을 누르면 기능 설명을 볼 수 있습니다.</p>
      <div className="setting-heading">운동 종목 {help('mode-help', '러닝은 분당 걸음 수(SPM), 사이클은 분당 페달 회전수(RPM)를 기준으로 템포를 설정합니다.')}</div>
      <div className="mode-tabs" role="group" aria-label="운동 종목">
        {(Object.keys(MODE_INFO) as WorkoutMode[]).map((mode) => <button key={mode} type="button" className={settings.mode === mode ? 'selected' : ''} aria-pressed={settings.mode === mode} onClick={() => selectMode(mode)}>{MODE_INFO[mode].label}</button>)}
      </div>
      <div className="tempo-control">
        <div className="setting-heading">템포 {help('tempo-help', '1분 동안의 비트 수입니다. 슬라이더·증감 버튼·직접 입력으로 40~240까지 설정할 수 있습니다.')}</div>
        <div className="tempo-slider"><button type="button" aria-label="템포 1 감소" onClick={() => update({ tempo: clampTempo(settings.tempo - 1) })}>−</button><input id="tempo" type="range" min="40" max="240" value={settings.tempo} onChange={(event) => update({ tempo: Number(event.target.value) })} /><button type="button" aria-label="템포 1 증가" onClick={() => update({ tempo: clampTempo(settings.tempo + 1) })}>+</button></div>
        <label className="tempo-input" htmlFor="tempo-number">직접 입력 <input id="tempo-number" type="number" min="40" max="240" value={tempoDraft} onChange={(event) => setTempoDraft(event.target.value)} onBlur={commitTempo} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /> {info.unit}</label>
      </div>
      <div className="presets" aria-label={`${info.label} 프리셋`}>{info.presets.map((tempo) => <button key={tempo} type="button" className={tempo === settings.tempo ? 'selected' : ''} onClick={() => update({ tempo })}>{tempo} {info.unit}</button>)}</div>
      <fieldset className="duration"><legend>목표 운동 시간 {help('duration-help', '운동 세션의 전체 시간입니다. 카운트인이 끝난 뒤부터 남은 시간이 줄고, 0초가 되면 자동으로 멈춥니다.')}</legend><div className="duration-presets">{[10, 20, 30, 45, 60].map((minutes) => <button key={minutes} type="button" className={settings.durationSeconds === minutes * 60 ? 'selected' : ''} onClick={() => setDurationMinutes(minutes)}>{minutes}분</button>)}</div><label>직접 입력 <input type="number" min="10" max="240" value={durationDraft} onChange={(event) => setDurationDraft(event.target.value)} onBlur={commitDuration} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /> 분</label></fieldset>
      <fieldset className="beat-group"><legend>박자 묶음 · 첫 박 강조 {help('group-help', '2·3·4박을 고르면 각 묶음의 첫 비트를 높은 소리로 강조합니다. 적용 안 함은 모든 비트를 같은 소리로 재생합니다.')}</legend><div>{([0, 2, 3, 4] as const).map((group) => <button key={group} type="button" className={settings.beatGroup === group ? 'selected' : ''} aria-pressed={settings.beatGroup === group} onClick={() => update({ beatGroup: group })}>{group === 0 ? '적용 안 함' : `${group}박`}</button>)}</div></fieldset>
      <div className="toggles">
        <span className="toggle-help"><label><input type="checkbox" checked={settings.soundEnabled} onChange={(event) => update({ soundEnabled: event.target.checked })} /> 비트 소리</label>{help('sound-help', '운동 박자에 맞춰 짧은 합성 비트를 재생합니다.')}</span>
        <span className="toggle-help"><label><input type="checkbox" checked={settings.vibrationEnabled} onChange={(event) => update({ vibrationEnabled: event.target.checked })} /> 진동</label>{help('vibration-help', '지원 기기에서는 각 박자에 짧게 진동합니다.')}</span>
        <span className="toggle-help"><label><input type="checkbox" checked={settings.countInEnabled} onChange={(event) => update({ countInEnabled: event.target.checked })} /> 4박 카운트인</label>{help('countin-help', '시작을 누르면 준비 비트 4번을 낸 뒤 운동 비트와 목표 시간을 시작합니다.')}</span>
      </div>
      <p className="notice">진동 지원 여부와 재생 동작은 기기·브라우저 설정에 따라 달라질 수 있습니다.</p>
    </section>
  </main>;
}
