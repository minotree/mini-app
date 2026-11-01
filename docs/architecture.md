# 구조 결정

## 2026-11-01 — 앱별 독립 PWA에서 시작

`apps/*`의 각 패키지는 하나의 미니앱과 하나의 플랫폼 어댑터를 소유한다. 첫 패키지는 `@mini-apps/hud-pwa`다. 아직 두 앱이 공유하는 검증 규칙이나 데이터 계약이 없으므로 공통 패키지를 미리 만들지 않는다.

HUD는 PWA 단계에서 브라우저 Geolocation API만 사용한다. 지도, 제한속도, 단속 카메라, 사용자 계정, 원격 저장소의 필요성과 제공자 조건은 미확정이므로 Supabase·V-World·Vercel을 연결하지 않는다. Cloudflare는 정적 PWA 호스팅 설정만 두고 Worker 런타임 코드·계정·도메인·원격 데이터는 연결하지 않는다.

## 2026-11-01 — Cloudflare Workers Static Assets 배포 준비

HUD PWA의 Vite 빌드 결과 `apps/hud-pwa/dist`는 `wrangler.jsonc`의 Workers Static Assets로 제공한다. 이는 별도 Worker 런타임 코드나 저장소를 추가하지 않고 정적 PWA를 배포하기 위한 선택이다. SPA fallback을 명시해 향후 클라이언트 라우트를 새로고침해도 `index.html`을 제공할 수 있게 한다. 계정 인증, Worker 생성, 도메인 연결, `wrangler deploy`는 사용자 명시 승인 후에만 수행한다.

