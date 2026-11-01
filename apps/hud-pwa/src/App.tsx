import { useEffect, useState, type CSSProperties } from 'react';
import { DEFAULT_HUD_SETTINGS, loadHudSettings, SETTINGS_STORAGE_KEY, smoothSpeed, speedKmhFromMetersPerSecond, type HudSettings } from './hud';

type PositionState =
  | { kind: 'idle' }
  | { kind: 'waiting' }
  | { kind: 'ready'; speedKmh: number; accuracy: number | null }
  | { kind: 'error'; message: string };

const speedFromPosition = (position: GeolocationPosition, previousSpeed: number | null): PositionState => {
  const rawKmh = smoothSpeed(previousSpeed, speedKmhFromMetersPerSecond(position.coords.speed));
  return {
    kind: 'ready',
    speedKmh: Math.round(rawKmh),
    accuracy: Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : null
  };
};

const locationError = (error: GeolocationPositionError): string => {
  if (error.code === error.PERMISSION_DENIED) return '위치 권한이 허용되지 않았습니다.';
  if (error.code === error.POSITION_UNAVAILABLE) return '현재 위치를 받을 수 없습니다.';
  return '위치 확인 시간이 초과되었습니다.';
};

export function App() {
  const [agreed, setAgreed] = useState(false);
  const [position, setPosition] = useState<PositionState>({ kind: 'idle' });
  const [settings, setSettings] = useState<HudSettings>(DEFAULT_HUD_SETTINGS);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setSettings(loadHudSettings(localStorage.getItem(SETTINGS_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!agreed) return;
    if (!('geolocation' in navigator)) {
      setPosition({ kind: 'error', message: '이 브라우저는 위치 정보를 지원하지 않습니다.' });
      return;
    }

    setPosition({ kind: 'waiting' });
    const watchId = navigator.geolocation.watchPosition(
      (nextPosition) => setPosition((previous) => speedFromPosition(nextPosition, previous.kind === 'ready' ? previous.speedKmh : null)),
      (error) => setPosition({ kind: 'error', message: locationError(error) }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [agreed, retryKey]);

  const speed = position.kind === 'ready' ? position.speedKmh : 0;
  const isSafetyLocked = speed >= 10;

  if (!agreed) {
    return (
      <main className="disclaimer">
        <section aria-labelledby="safety-title">
          <p className="eyebrow">HUD · 참고용 도구</p>
          <h1 id="safety-title">안전하게 고정한 뒤 사용하세요</h1>
          <p>운전 중 앱을 조작하지 마세요. 기기는 시야, 에어백, 차량 조작을 방해하지 않도록 안전하게 고정해야 합니다.</p>
          <p>위치 정보는 이 기기에서 현재 속도를 표시할 때만 사용하며 서버로 전송하지 않습니다.</p>
          <button type="button" onClick={() => setAgreed(true)}>안내를 확인했고 시작하기</button>
        </section>
      </main>
    );
  }

  return (
    <main className="hud-shell" style={{ '--hud-color': settings.color } as CSSProperties}>
      <section className={settings.mirror ? 'hud mirrored' : 'hud'} aria-label="현재 주행 속도">
        <p>GPS SPEED</p>
        <output aria-live="polite" style={{ fontSize: `clamp(${8 * settings.fontScale}rem, ${45 * settings.fontScale}vw, ${22 * settings.fontScale}rem)`, fontWeight: settings.fontWeight }}>{speed}</output>
        <span>km/h</span>
        {position.kind === 'waiting' && <small>GPS 신호를 확인하는 중입니다.</small>}
        {position.kind === 'ready' && position.accuracy !== null && <small>정확도 약 ±{position.accuracy}m</small>}
        {position.kind === 'error' && <small role="alert">{position.message} <button className="retry" type="button" onClick={() => setRetryKey((value) => value + 1)}>다시 시도</button></small>}
      </section>

      <section className="controls" aria-label="HUD 설정">
        <p>{isSafetyLocked ? '10km/h 이상에서는 설정을 바꿀 수 없습니다.' : '정차 중 화면 표시를 조절하세요.'}</p>
        <div>
          <label>
            표시 색상
            <input type="color" value={settings.color} onChange={(event) => setSettings((value) => ({ ...value, color: event.target.value }))} disabled={isSafetyLocked} />
          </label>
          <label>
            글자 크기
            <input type="range" min="0.75" max="1.25" step="0.05" value={settings.fontScale} onChange={(event) => setSettings((value) => ({ ...value, fontScale: Number(event.target.value) }))} disabled={isSafetyLocked} />
          </label>
          <label>
            글자 두께
            <select value={settings.fontWeight} onChange={(event) => setSettings((value) => ({ ...value, fontWeight: Number(event.target.value) as HudSettings['fontWeight'] }))} disabled={isSafetyLocked}>
              <option value={400}>보통</option>
              <option value={700}>굵게</option>
              <option value={900}>매우 굵게</option>
            </select>
          </label>
          <button type="button" aria-pressed={settings.mirror} onClick={() => setSettings((value) => ({ ...value, mirror: !value.mirror }))} disabled={isSafetyLocked}>
            반사 모드 {settings.mirror ? '끄기' : '켜기'}
          </button>
        </div>
      </section>
    </main>
  );
}
