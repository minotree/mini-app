# mini-apps

작은 단일 목적 앱을 pnpm workspace로 관리한다. 앱마다 PWA를 먼저 만들고, 필요가 확정되면 토스 미니앱과 Capacitor 기반 Android/iOS 하이브리드 앱을 독립 구현한다.

현재 앱은 `apps/hud-pwa`의 스마트폰 HUD PWA, `apps/golf-pwa`의 런치 분석 MVP, `apps/workout-metronome-pwa`의 운동용 메트로놈 PWA다. 메트로놈은 러닝·사이클 템포 프리셋과 실제 추 움직임 기반 시각 피드백을 제공한다.

## 시작

```powershell
pnpm.cmd install
pnpm.cmd dev:hud
pnpm.cmd dev:metronome
```

개발 서버는 `http://127.0.0.1:5173`에서 열린다.

```powershell
pnpm.cmd typecheck
pnpm.cmd build
pnpm.cmd preview:hud
pnpm.cmd preview:metronome
```

## Cloudflare Workers 배포 준비

HUD PWA는 Cloudflare Workers Static Assets로 `apps/hud-pwa/dist`를 배포한다. GitHub `main` 브랜치가 Cloudflare Workers Builds에 연결되어 있으므로, `main`에 push하면 Cloudflare가 자동 빌드·배포한다. 커스텀 도메인 연결은 아직 하지 않았다.

```powershell
# Cloudflare Workers 런타임으로 로컬 미리보기
pnpm.cmd dev:cloudflare:hud

# Git 연동과 별도로 직접 배포할 때만 사용
pnpm.cmd deploy:cloudflare:hud
```

`wrangler.jsonc`의 `name`을 배포 전 계정에서 사용할 Worker 이름으로 확인한다. 환경 변수·비밀값은 현재 필요하지 않으며, 필요해질 경우 `.env`나 클라이언트 번들에 넣지 않고 Cloudflare Secrets로 관리한다.

Golf와 운동 메트로놈도 각각 `mini-apps-golf`, `mini-apps-workout-metronome` 이름의 Static Assets Worker 설정을 준비했지만, GitHub 연결·배포는 아직 하지 않았다. 메트로놈의 로컬 Cloudflare 미리보기와 승인 후 직접 배포 명령은 `pnpm.cmd dev:cloudflare:metronome`, `pnpm.cmd deploy:cloudflare:metronome`이다.

## 안전 및 개인정보

HUD는 참고용 화면일 뿐 운전 보조 장치가 아니다. 운전 중 조작하지 말고, 기기는 시야·에어백·차량 조작을 방해하지 않도록 안전하게 고정해야 한다. 화면을 위로 두고 스마트폰의 물리적 상단이 운전자 쪽을 향하게 배치하면 HUD의 기본 180도 표시 보정을 사용하고 반사 모드를 별도로 켠다. 정차 상태에서 전면 유리의 글자 방향이 바르게 읽히는지 확인한다. 속도가 10km/h 이상이면 설정 메뉴를 자동으로 숨긴다. 이 방향은 GPS 수신 품질을 보장하지 않으며, 위치 정보는 현재 브라우저 세션에서 속도 표시를 위해서만 사용하고 서버로 보내지 않는다.

PWA 설치, 서비스 워커 갱신, 실제 기기 GPS, 화면 회전, 토스 및 네이티브 앱 검증은 아직 완료되지 않았다. 상세 결정과 진행 상태는 [AGENTS.md](AGENTS.md), [progress.md](progress.md)를 참고한다.

실행·검사·Git·Cloudflare 자동 배포 명령은 [docs/development.md](docs/development.md)에 정리한다.

