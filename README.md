# mini-apps

작은 단일 목적 앱을 pnpm workspace로 관리한다. 앱마다 PWA를 먼저 만들고, 필요가 확정되면 토스 미니앱과 Capacitor 기반 Android/iOS 하이브리드 앱을 독립 구현한다.

현재 첫 앱은 `apps/hud-pwa`의 스마트폰 HUD PWA다. 위치 권한을 허용하면 GPS 기반 속도를 표시하며, 실제 제한속도·단속 카메라 정보는 아직 연결하지 않는다.

## 시작

```powershell
pnpm.cmd install
pnpm.cmd dev:hud
```

개발 서버는 `http://127.0.0.1:5173`에서 열린다.

```powershell
pnpm.cmd typecheck
pnpm.cmd build
pnpm.cmd preview:hud
```

## Cloudflare Workers 배포 준비

HUD PWA는 Cloudflare Workers Static Assets로 `apps/hud-pwa/dist`를 배포하도록 구성했다. Cloudflare 계정 로그인, Worker 이름·도메인 결정, 실제 업로드는 아직 하지 않았다.

```powershell
# Cloudflare Workers 런타임으로 로컬 미리보기
pnpm.cmd dev:cloudflare:hud

# Cloudflare 인증·배포 대상 확인 후에만 실행
pnpm.cmd deploy:cloudflare:hud
```

`wrangler.jsonc`의 `name`을 배포 전 계정에서 사용할 Worker 이름으로 확인한다. 환경 변수·비밀값은 현재 필요하지 않으며, 필요해질 경우 `.env`나 클라이언트 번들에 넣지 않고 Cloudflare Secrets로 관리한다.

## 안전 및 개인정보

HUD는 참고용 화면일 뿐 운전 보조 장치가 아니다. 운전 중 조작하지 말고, 기기는 시야·에어백·차량 조작을 방해하지 않도록 안전하게 고정해야 한다. 위치 정보는 현재 브라우저 세션에서 속도 표시를 위해서만 사용하며 서버로 보내지 않는다.

PWA 설치, 서비스 워커 갱신, 실제 기기 GPS, 화면 회전, 토스 및 네이티브 앱 검증은 아직 완료되지 않았다. 상세 결정과 진행 상태는 [AGENTS.md](AGENTS.md), [progress.md](progress.md)를 참고한다.

