import { useEffect, useState, type CSSProperties } from 'react';
import { requestPermission } from '@apps-in-toss/web-framework';
import { DEFAULT_HUD_SETTINGS, isDriveSafetyLocked, loadHudSettings, SETTINGS_STORAGE_KEY, smoothSpeed, type HudSettings } from './hud';
import { watchSpeed } from './location';

type PositionState =
  | { kind: 'idle' }
  | { kind: 'waiting' }
  | { kind: 'ready'; speedKmh: number; accuracy: number | null }
  | { kind: 'error'; message: string };

type View = 'safety' | 'hud' | 'complete';

export function App() {
  const [view, setView] = useState<View>('safety');
  const [position, setPosition] = useState<PositionState>({ kind: 'idle' });
  const [settings, setSettings] = useState<HudSettings>(DEFAULT_HUD_SETTINGS);
  const [retryKey, setRetryKey] = useState(0);
  const [previewDriving, setPreviewDriving] = useState(false);

  useEffect(() => {
    setSettings(loadHudSettings(localStorage.getItem(SETTINGS_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (view !== 'hud') {
      setPosition({ kind: 'idle' });
      return;
    }
    setPosition({ kind: 'waiting' });
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void requestPermission({ name: 'geolocation', access: 'access' })
      .then((permission) => {
        if (cancelled) return;
        if (permission !== 'allowed') {
          setPosition({ kind: 'error', message: '위치 권한이 허용되지 않았습니다. 토스 앱의 위치 권한을 확인하세요.' });
          return;
        }
        unsubscribe = watchSpeed(
          ({ speedKmh, accuracy }) => setPosition((previous) => speedKmh === null
            ? { kind: 'waiting' }
            : { kind: 'ready', speedKmh: Math.round(smoothSpeed(previous.kind === 'ready' ? previous.speedKmh : null, speedKmh)), accuracy: Math.round(accuracy) }),
          () => setPosition({ kind: 'error', message: '위치 정보를 받을 수 없습니다. GPS 상태를 확인하세요.' })
        );
      })
      .catch(() => {
        if (!cancelled) setPosition({ kind: 'error', message: '위치 기능을 시작하지 못했습니다. 토스 앱에서 다시 시도하세요.' });
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [view, retryKey]);

  const speed = position.kind === 'ready' ? position.speedKmh : 0;
  const isSafetyLocked = isDriveSafetyLocked(speed);
  const speedDigits = String(speed).length;
  const displayTransform = [settings.rotate180 ? 'rotate(180deg)' : '', settings.mirror ? 'scaleX(-1)' : '']
    .filter(Boolean)
    .join(' ');

  if (view === 'safety') {
    return (
      <main className="disclaimer">
        <section aria-labelledby="safety-title">
          <p className="eyebrow">HUD · 참고용 도구</p>
          <h1 id="safety-title">안전하게 고정한 뒤 사용하세요</h1>
          <p>운전 중 앱을 조작하지 마세요. 기기는 시야, 에어백, 차량 조작을 방해하지 않도록 안전하게 고정해야 합니다.</p>
          <p>화면을 위로 두고 스마트폰의 물리적 상단이 운전자 쪽을 향하게 배치한 뒤, 정차 상태에서 전면 유리의 표시가 바르게 읽히는지 확인하세요.</p>
          <p>토스 위치 권한을 요청합니다. 위치 좌표는 이 기기에서 참고 속도를 계산할 때만 사용하며 서버로 전송하지 않습니다.</p>
          <button type="button" onClick={() => setView('hud')}>안내를 확인했고 시작하기</button>
        </section>
      </main>
    );
  }

  if (view === 'complete') {
    return (
      <main className="completion">
        <section aria-labelledby="completion-title">
          <p className="eyebrow">HUD 사용 종료</p>
          <h1 id="completion-title">위치 확인을 종료했습니다</h1>
          <p>GPS 위치 구독을 해제했습니다. 다시 사용할 때는 기기를 안전하게 고정하고 정차 상태에서 표시 방향을 확인하세요.</p>
          <div className="completion-actions">
            <button type="button" onClick={() => setView('hud')}>같은 설정으로 다시 시작</button>
            <button className="secondary" type="button" onClick={() => setView('safety')}>안전 안내 다시 보기</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`hud-shell${isSafetyLocked ? ' driving' : previewDriving ? ' preview-driving' : ''}`} style={{ '--hud-color': settings.color, '--hud-font-scale': settings.fontScale } as CSSProperties}>
      <section className="hud" style={{ transform: displayTransform || undefined }} aria-label="현재 주행 속도">
        <p>GPS 참고 속도</p>
        <output className={`digits-${Math.min(speedDigits, 3)}`} aria-live="polite" style={{ fontWeight: settings.fontWeight }}>{speed}</output>
        <span>km/h</span>
        {position.kind === 'waiting' && <small>GPS 신호와 이동 속도를 확인하는 중입니다.</small>}
        {position.kind === 'ready' && position.accuracy !== null && <small>정확도 약 ±{position.accuracy}m</small>}
        {position.kind === 'error' && <small role="alert">{position.message} <button className="retry" type="button" onClick={() => setRetryKey((value) => value + 1)}>다시 시도</button></small>}
        {isSafetyLocked && <small className="driving-status" role="status">주행 중: 설정 메뉴를 숨겼습니다.</small>}
      </section>

      {!isSafetyLocked && <section className="controls" aria-label="HUD 설정">
        <p>정차 중 화면 표시를 조절하세요.</p>
        <div>
          <label>
            표시 색상
            <input type="color" value={settings.color} onChange={(event) => setSettings((value) => ({ ...value, color: event.target.value }))} disabled={isSafetyLocked} />
          </label>
          <label>
            글자 크기
            <input type="range" min="0.75" max="1.25" step="0.05" value={settings.fontScale} onFocus={() => setPreviewDriving(true)} onBlur={() => setPreviewDriving(false)} onChange={(event) => setSettings((value) => ({ ...value, fontScale: Number(event.target.value) }))} disabled={isSafetyLocked} />
          </label>
          <label>
            글자 두께
            <select value={settings.fontWeight} onChange={(event) => setSettings((value) => ({ ...value, fontWeight: Number(event.target.value) as HudSettings['fontWeight'] }))} disabled={isSafetyLocked}>
              <option value={400}>보통</option>
              <option value={700}>굵게</option>
              <option value={900}>매우 굵게</option>
            </select>
          </label>
          <button type="button" aria-pressed={settings.rotate180} onClick={() => setSettings((value) => ({ ...value, rotate180: !value.rotate180 }))} disabled={isSafetyLocked}>
            표시 180° {settings.rotate180 ? '끄기' : '켜기'}
          </button>
          <button type="button" aria-pressed={settings.mirror} onClick={() => setSettings((value) => ({ ...value, mirror: !value.mirror }))} disabled={isSafetyLocked}>
            반사 모드 {settings.mirror ? '끄기' : '켜기'}
          </button>
          <button className="finish" type="button" onClick={() => setView('complete')}>
            HUD 사용 종료
          </button>
        </div>
      </section>}
    </main>
  );
}
