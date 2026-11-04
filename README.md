# mini-apps

작은 단일 목적 앱을 pnpm workspace로 관리한다. 앱마다 PWA를 먼저 만들고, 필요가 확정되면 토스 미니앱과 Capacitor 기반 Android/iOS 하이브리드 앱을 독립 구현한다.

현재 앱은 `apps/hud-pwa`의 스마트폰 HUD PWA, `apps/golf-pwa`의 런치 분석 MVP, `apps/workout-metronome-pwa`의 운동용 메트로놈 PWA, `apps/workout-metronome-toss`의 토스 미니앱이다. 메트로놈은 실내·실외 선택, 공통 BPM 템포, 실제 추 움직임을 제공하며 실외 운동 화면에서는 위치 기반 참고 속도를 표시한다.

## 시작

```powershell
pnpm.cmd install
pnpm.cmd dev:hud
pnpm.cmd dev:metronome
pnpm.cmd dev:metronome:toss
```

HUD 개발 서버는 `http://127.0.0.1:5173`, 메트로놈 PWA는 `http://127.0.0.1:5181`, 토스 Devtools 서버는 `http://127.0.0.1:5182`에서 열린다. 각 명령은 별도로 실행한다.

```powershell
pnpm.cmd typecheck
pnpm.cmd build
pnpm.cmd preview:hud
pnpm.cmd preview:metronome
pnpm.cmd build:ait:metronome
pnpm.cmd build:ait:metronome:test
pnpm.cmd build:ait:metronome:live
```

메트로놈 토스 `.ait`는 일반 명령에서 광고를 넣지 않는다. 광고 QR 테스트는 `:test`, 운영 광고가 포함된 출시 후보 생성은 `:live`를 사용한다. 생성만으로 업로드·출시되지는 않는다.

## Cloudflare Workers 배포 준비

HUD PWA는 Cloudflare Workers Static Assets로 `apps/hud-pwa/dist`를 배포한다. GitHub `main` 브랜치가 Cloudflare Workers Builds에 연결되어 있으므로, `main`에 push하면 Cloudflare가 자동 빌드·배포한다. 커스텀 도메인 연결은 아직 하지 않았다.

```powershell
# Cloudflare Workers 런타임으로 로컬 미리보기
pnpm.cmd dev:cloudflare:hud

# Git 연동과 별도로 직접 배포할 때만 사용
pnpm.cmd deploy:cloudflare:hud
```

`wrangler.jsonc`의 `name`을 배포 전 계정에서 사용할 Worker 이름으로 확인한다. 환경 변수·비밀값은 현재 필요하지 않으며, 필요해질 경우 `.env`나 클라이언트 번들에 넣지 않고 Cloudflare Secrets로 관리한다.

Golf는 `mini-apps-golf` Static Assets Worker가 GitHub 저장소에 연결되어 있고 배포 이력이 있다(2026-11-03 사용자 제공 Cloudflare 대시보드 화면 기준). 공개 주소는 `https://mini-apps-golf.minotree0902.workers.dev`다. 운동 메트로놈은 `mini-apps-workout-metronome` Worker의 GitHub Workers Builds production 연결을 완료했으며 `https://mini-apps-workout-metronome.minotree0902.workers.dev`에서 제공한다. 메트로놈의 로컬 Cloudflare 미리보기와 승인 후 직접 배포 명령은 `pnpm.cmd dev:cloudflare:metronome`, `pnpm.cmd deploy:cloudflare:metronome`이다.

## 안전 및 개인정보

HUD는 참고용 화면일 뿐 운전 보조 장치가 아니다. 운전 중 조작하지 말고, 기기는 시야·에어백·차량 조작을 방해하지 않도록 안전하게 고정해야 한다. 화면을 위로 두고 스마트폰의 물리적 상단이 운전자 쪽을 향하게 배치하면 HUD의 기본 180도 표시 보정을 사용하고 반사 모드를 별도로 켠다. 정차 상태에서 전면 유리의 글자 방향이 바르게 읽히는지 확인한다. 속도가 10km/h 이상이면 설정 메뉴를 자동으로 숨긴다. 이 방향은 GPS 수신 품질을 보장하지 않으며, 위치 정보는 현재 브라우저 세션에서 속도 표시를 위해서만 사용하고 서버로 보내지 않는다.

PWA 설치, 서비스 워커 갱신, 실제 기기 GPS, 화면 회전, 토스 및 네이티브 앱 검증은 아직 완료되지 않았다. 공통 규칙과 전체 현황은 [AGENTS.md](AGENTS.md), [progress.md](progress.md)를, 앱별 상세 기준과 이력은 각 앱 폴더의 `AGENTS.md`, `progress.md`를 참고한다.

실행·검사·Git·Cloudflare 자동 배포 명령은 [docs/development.md](docs/development.md)에 정리한다.

