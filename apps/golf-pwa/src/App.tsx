import { useEffect, useRef, useState } from 'react';
import type { Club } from './launch';
import { preparationGuide } from './voice';

type ClubChoice = { id: string; category: Club; label: string; guide: string };
const cameraPlacementGuide = '공 진행 방향의 측면에서 공과 임팩트 구간이 보이도록 놓으세요.';

const clubs: ClubChoice[] = [
  { id: 'driver', category: 'driver', label: '드라이버', guide: cameraPlacementGuide },
  ...['3W', '5W', '7W', '3H', '4H', '5H'].map((label) => ({ id: label, category: 'wood' as const, label, guide: cameraPlacementGuide })),
  ...['4i', '5i', '6i', '7i', '8i', '9i'].map((label) => ({ id: label, category: 'iron' as const, label, guide: cameraPlacementGuide })),
  ...['PW 46°', 'AW 50°', 'SW 56°', 'LW 60°'].map((label) => ({ id: label, category: 'wedge' as const, label, guide: cameraPlacementGuide }))
];

type CameraState = 'idle' | 'requesting' | 'ready' | 'error';

export function App() {
  const [clubId, setClubId] = useState('driver');
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const selectedClub = clubs.find((item) => item.id === clubId)!;

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const announcePreparation = () => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const message = new SpeechSynthesisUtterance(preparationGuide(selectedClub.label));
    message.lang = 'ko-KR';
    message.rate = 0.9;
    window.speechSynthesis.speak(message);
  };

  const prepareCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('이 브라우저는 카메라 접근을 지원하지 않습니다.');
      setCameraState('error');
      return;
    }

    setCameraState('requesting');
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } }
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('ready');
      announcePreparation();
    } catch {
      setCameraError('카메라 권한 또는 후면 카메라를 확인해 주세요.');
      setCameraState('error');
    }
  };

  return (
    <main>
      <header>
        <p>GOLF LAUNCH · MVP</p>
        <h1>클럽을 고르고 스윙하세요</h1>
        <span>평지 페어웨이 · 15℃ · 무풍 기준</span>
      </header>

      <section className="club-selector" aria-label="클럽 선택">
        <div className="club-group"><p>드라이버</p>{clubs.filter((item) => item.category === 'driver').map((item) => <button key={item.id} type="button" className={clubId === item.id ? 'selected' : ''} onClick={() => setClubId(item.id)}>{item.label}</button>)}</div>
        <div className="club-group"><p>우드 · 유틸</p>{clubs.filter((item) => item.category === 'wood').map((item) => <button key={item.id} type="button" className={clubId === item.id ? 'selected' : ''} onClick={() => setClubId(item.id)}>{item.label}</button>)}</div>
        <div className="club-group"><p>아이언</p>{clubs.filter((item) => item.category === 'iron').map((item) => <button key={item.id} type="button" className={clubId === item.id ? 'selected' : ''} onClick={() => setClubId(item.id)}>{item.label}</button>)}</div>
        <div className="club-group"><p>웨지</p>{clubs.filter((item) => item.category === 'wedge').map((item) => <button key={item.id} type="button" className={clubId === item.id ? 'selected' : ''} onClick={() => setClubId(item.id)}>{item.label}</button>)}</div>
      </section>

      <section className="camera-card" aria-labelledby="camera-title">
        <div>
          <p className="step">1. 카메라 배치</p>
          <h2 id="camera-title">{selectedClub.guide}</h2>
          <p>휴대폰을 안전하게 고정하고, 사람이 프레임 안으로 들어가지 않도록 확인하세요.</p>
        </div>
        {cameraState === 'ready' ? <video ref={videoRef} muted playsInline aria-label="후면 카메라 미리보기" /> : <div className="camera-placeholder">카메라 준비 전</div>}
        {cameraState !== 'ready' && <button className="primary" type="button" onClick={prepareCamera} disabled={cameraState === 'requesting'}>{cameraState === 'requesting' ? '카메라 연결 중…' : '카메라 허용하고 준비하기'}</button>}
        <div className="voice-controls">
          <button type="button" aria-pressed={voiceEnabled} onClick={() => setVoiceEnabled((value) => !value)}>음성 안내 {voiceEnabled ? '켜짐' : '꺼짐'}</button>
          {cameraState === 'ready' && <button type="button" onClick={announcePreparation}>안내 다시 듣기</button>}
        </div>
        {cameraError && <p className="error" role="alert">{cameraError}</p>}
      </section>

      <section className="analysis-card" aria-live="polite">
        <p className="step">2. 자동 타구 분석</p>
        {cameraState === 'ready'
          ? <><h2>카메라가 준비됐습니다</h2><p>스윙 모션·포즈 분석은 하지 않습니다. 다음 단계에서 타구·클럽 헤드·볼을 자동 추적해 런치 수치를 산출합니다.</p></>
          : <><h2>클럽을 선택한 뒤 카메라를 준비하세요</h2><p>사용자 수치 입력 없이 영상 측정값으로 방향각과 비거리를 계산하는 흐름입니다.</p></>}
      </section>
    </main>
  );
}
