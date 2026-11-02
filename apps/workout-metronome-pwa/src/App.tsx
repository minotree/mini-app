import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DEFAULT_SETTINGS, MODE_INFO, SETTINGS_STORAGE_KEY, beatIntervalMs, clampDurationSeconds, clampTempo, isAccentBeat, loadSettings, swingDurationMs, type MetronomeSettings, type WorkoutMode } from './metronome';

type SessionPhase = 'idle' | 'count-in' | 'playing';

const playTick = (context: AudioContext, accent = false) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(accent ? 1_320 : 880, context.currentTime);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.17 : 0.12, context.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.07);
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export function App() {
  const [settings, setSettings] = useState<MetronomeSettings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [beat, setBeat] = useState(0);
  const [countIn, setCountIn] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_SETTINGS.durationSeconds);
  const [tempoDraft, setTempoDraft] = useState(String(DEFAULT_SETTINGS.tempo));
  const [durationDraft, setDurationDraft] = useState(String(DEFAULT_SETTINGS.durationSeconds / 60));
  const audioContext = useRef<AudioContext | null>(null);
  const schedule = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beatNumber = useRef(0);
  const remainingAtPause = useRef(DEFAULT_SETTINGS.durationSeconds);

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
      if (settings.soundEnabled && audioContext.current) playTick(audioContext.current, isAccentBeat(nextBeat, settings.beatGroup));
      if (settings.vibrationEnabled && 'vibrate' in navigator) navigator.vibrate(18);
      schedule.current = setTimeout(tick, beatIntervalMs(settings.tempo));
    };
    tick();
    return () => {
      cancelled = true;
      if (schedule.current) clearTimeout(schedule.current);
      if ('vibrate' in navigator) navigator.vibrate(0);
    };
  }, [phase, settings.tempo, settings.soundEnabled, settings.vibrationEnabled, settings.beatGroup]);

  useEffect(() => {
    if (phase !== 'count-in') return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (settings.soundEnabled && audioContext.current) playTick(audioContext.current);
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
  }, [phase, settings.tempo, settings.soundEnabled, settings.vibrationEnabled]);

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

  useEffect(() => () => { void audioContext.current?.close(); }, []);

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
      <div className="session-actions" aria-label="메트로놈 재생 제어">
        <button className="start-button" type="button" onClick={() => void start()} disabled={phase !== 'idle' || remainingSeconds === 0}>시작</button>
        <button type="button" onClick={pause} disabled={phase === 'idle'}>일시정지</button>
        <button type="button" onClick={reset}>초기화</button>
      </div>
    </section>

    <section className="controls" aria-label="메트로놈 설정">
      <div className="mode-tabs" role="group" aria-label="운동 종목">
        {(Object.keys(MODE_INFO) as WorkoutMode[]).map((mode) => <button key={mode} type="button" className={settings.mode === mode ? 'selected' : ''} aria-pressed={settings.mode === mode} onClick={() => selectMode(mode)}>{MODE_INFO[mode].label}</button>)}
      </div>
      <div className="tempo-control">
        <label htmlFor="tempo">템포</label>
        <div><button type="button" aria-label="템포 1 감소" onClick={() => update({ tempo: clampTempo(settings.tempo - 1) })}>−</button><input id="tempo" type="range" min="40" max="240" value={settings.tempo} onChange={(event) => update({ tempo: Number(event.target.value) })} /><button type="button" aria-label="템포 1 증가" onClick={() => update({ tempo: clampTempo(settings.tempo + 1) })}>+</button></div>
        <label className="tempo-input" htmlFor="tempo-number">직접 입력 <input id="tempo-number" type="number" min="40" max="240" value={tempoDraft} onChange={(event) => setTempoDraft(event.target.value)} onBlur={commitTempo} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /> {info.unit}</label>
      </div>
      <div className="presets" aria-label={`${info.label} 프리셋`}>{info.presets.map((tempo) => <button key={tempo} type="button" className={tempo === settings.tempo ? 'selected' : ''} onClick={() => update({ tempo })}>{tempo} {info.unit}</button>)}</div>
      <fieldset className="duration"><legend>목표 운동 시간</legend><div className="duration-presets">{[10, 20, 30, 45, 60].map((minutes) => <button key={minutes} type="button" className={settings.durationSeconds === minutes * 60 ? 'selected' : ''} onClick={() => setDurationMinutes(minutes)}>{minutes}분</button>)}</div><label>직접 입력 <input type="number" min="10" max="240" value={durationDraft} onChange={(event) => setDurationDraft(event.target.value)} onBlur={commitDuration} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /> 분</label></fieldset>
      <fieldset className="beat-group"><legend>박자 묶음 · 첫 박 강조</legend><div>{([2, 3, 4] as const).map((group) => <button key={group} type="button" className={settings.beatGroup === group ? 'selected' : ''} aria-pressed={settings.beatGroup === group} onClick={() => update({ beatGroup: group })}>{group}박</button>)}</div></fieldset>
      <div className="toggles">
        <label><input type="checkbox" checked={settings.soundEnabled} onChange={(event) => update({ soundEnabled: event.target.checked })} /> 비트 소리</label>
        <label><input type="checkbox" checked={settings.vibrationEnabled} onChange={(event) => update({ vibrationEnabled: event.target.checked })} /> 진동</label>
        <label><input type="checkbox" checked={settings.countInEnabled} onChange={(event) => update({ countInEnabled: event.target.checked })} /> 4박 카운트인</label>
      </div>
      <p className="notice">진동 지원 여부와 재생 동작은 기기·브라우저 설정에 따라 달라질 수 있습니다.</p>
    </section>
  </main>;
}
