# mini-apps 프로젝트 지침

공통 기준은 `D:/DEV/project-guidelines/README.md`와 `D:/DEV/project-guidelines/AGENTS.md`이며, 2026-11-01에 적용했다. 보고 언어는 한국어다.

| 항목 | 결정 |
| --- | --- |
| 프로젝트 / scope | mini-apps / `@mini-apps/*` |
| 서비스 목표 | 간단한 단일 목적 미니앱을 각각 독립 패키지로 개발·관리한다. |
| 첫 앱 / 핵심 흐름 | HUD PWA: 안전 고지 후 위치 권한을 요청해 GPS 속도를 표시하고, 반사·색상·글자 크기/두께 설정을 제공한다. |
| 플랫폼 순서 | 각 앱은 PWA → 토스 미니앱 → Android/iOS 하이브리드 순서로 개발한다. |
| 플랫폼 상태 | HUD PWA만 구현 대상이다. 토스·Android·iOS 앱은 미착수이며 준비 폴더도 만들지 않는다. |
| 데이터·인증 | 현재 로컬 브라우저 설정과 위치 정보만 사용한다. Supabase는 계정 동기화·원격 데이터가 확정될 때 검토한다. |
| 호스팅·서버 | HUD PWA는 Cloudflare Workers Static Assets로 배포하도록 설정했다. Worker 런타임 코드·계정·도메인·배포는 미연결이다. Vercel·지도는 필요가 확정될 때만 추가한다. |
| Node / pnpm | Node 24.22.0, pnpm 10.34.7 확인. 루트 `engines`와 `packageManager`에 기록한다. |
| 배포·출시 | 담당자 미정. 커밋·푸시·배포·Supabase/Cloudflare 계정 생성은 명시 승인 후 진행한다. |
| 문서 | HUD 기획: `docs/planning/hud-app-specifications-v3.md`; 구조: `docs/architecture.md`; 진행: `progress.md` |

## 구조와 경계

- `apps/<app>-pwa`는 독립 React/Vite PWA다. UI·스타일·브라우저 API 어댑터는 해당 앱이 소유한다.
- 현재 공통 도메인 패키지는 만들지 않는다. 두 앱 이상에서 실제 공유되는 순수 계약 또는 규칙이 생길 때만 `packages/contracts`, `packages/core`, `packages/utils`를 추가하고 앱은 공개 export만 사용한다.
- 토스 앱은 `apps/<app>-toss`, 하이브리드 앱은 `apps/<app>-mobile`로 별도 생성한다. PWA의 UI·라우팅·브라우저 전역을 가져오지 않는다.
- HUD PWA의 위치 정보는 브라우저에서만 처리하며 서버로 전송하지 않는다. V-World 도로 제한속도·단속 카메라·Supabase·Cloudflare 연동은 키·데이터 출처·권한·비용이 확정되기 전에는 구현하지 않는다.
- `apps/hud-pwa/wrangler.jsonc`는 Cloudflare Workers Static Assets에서 `dist`를 제공하는 배포 설정이다. `name`은 첫 배포 전에 Cloudflare 계정의 실제 Worker 이름으로 확인한다. `wrangler deploy`는 계정·대상·도메인 확인과 사용자 명시 승인이 있어야 실행한다.

## HUD PWA 범위

- 포함: 안전 고지 동의, 브라우저 위치 권한 요청, GPS 속도(km/h) 표시, EMA 보정과 3km/h 미만 0 처리, 반사 모드, 색상·글자 크기·두께의 로컬 설정, 10km/h 이상 설정 잠금, 위치 오류/미지원 안내와 재시도.
- 제외: 실제 도로 제한속도·단속 카메라 데이터, 차량 운행 판단, 보장된 화면 꺼짐 방지·방향 잠금, 서버 저장·인증, 토스 SDK·Capacitor·배포.
- 실제 운전 중 조작하지 말고 안전하게 고정된 상태에서만 사용하도록 고지한다. 법률적 효력·면책을 주장하지 않으며, 출시 전 관할 법률 및 문구를 전문 검토받는다.

## 실행과 검증

- HUD 개발: `pnpm.cmd dev:hud` (`http://127.0.0.1:5173`)
- Cloudflare 로컬 미리보기: `pnpm.cmd dev:cloudflare:hud` (`http://localhost:8787`)
- Cloudflare 배포(명시 승인 후): `pnpm.cmd deploy:cloudflare:hud`
- 타입 검사: `pnpm.cmd typecheck`
- 빌드: `pnpm.cmd build`
- 설치/서비스 워커·실기기 GPS·화면 회전·토스·Android·iOS 검증은 자동 검사와 구분해 `progress.md`에 기록한다.

