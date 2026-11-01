# mini-apps 프로젝트 지침

공통 기준은 `D:/DEV/project-guidelines/README.md`와 `D:/DEV/project-guidelines/AGENTS.md`이며, 2026-11-01에 적용했다. 보고 언어는 한국어다.

| 항목 | 결정 |
| --- | --- |
| 프로젝트 / scope | mini-apps / `@mini-apps/*` |
| 서비스 목표 | 간단한 단일 목적 미니앱을 각각 독립 패키지로 개발·관리한다. |
| 첫 앱 / 핵심 흐름 | HUD PWA: 안전 고지 후 위치 권한을 요청해 GPS 속도를 표시하고, 반사·색상·글자 크기/두께 설정을 제공한다. |
| 다음 앱 후보 / 첫 범위 | Golf PWA: 사용자는 클럽만 선택하고 안내에 따라 스윙. 앱이 타구 영상에서 클럽 헤드 속도·임팩트 각도·볼 스피드 등을 자동 산출해 방향각·비거리를 추정. 스윙 모션·포즈 분석은 후속. |
| 플랫폼 순서 | 각 앱은 PWA → 토스 미니앱 → Android/iOS 하이브리드 순서로 개발한다. |
| 플랫폼 상태 | HUD PWA 구현 진행, Golf PWA는 런치 분석 MVP 기반 구현 대상. 토스·Android·iOS 앱은 미착수이며 준비 폴더도 만들지 않는다. |
| 데이터·인증 | 현재 로컬 브라우저 설정과 위치 정보만 사용한다. Supabase는 계정 동기화·원격 데이터가 확정될 때 검토한다. |
| 호스팅·서버 | HUD PWA는 Cloudflare Workers Static Assets로 GitHub `main` 자동 배포가 연결됐다. Golf PWA도 별도 Static Assets Worker 설정을 준비했으며 GitHub 연결·배포는 미완료다. 커스텀 도메인·Worker 런타임 코드·원격 데이터는 미연결이다. Vercel·지도는 필요가 확정될 때만 추가한다. |
| Node / pnpm | Node 24.22.0, pnpm 10.34.7 확인. 루트 `engines`와 `packageManager`에 기록한다. |
| 배포·출시 | 담당자 미정. 커밋·푸시·배포·Supabase/Cloudflare 계정 생성은 명시 승인 후 진행한다. |
| 문서 | HUD 기획: `docs/planning/hud-app-specifications-v3.md`; 구조: `docs/architecture.md`; 개발·Git 명령: `docs/development.md`; 진행: `progress.md` |

## 구조와 경계

- `apps/<app>-pwa`는 독립 React/Vite PWA다. UI·스타일·브라우저 API 어댑터는 해당 앱이 소유한다.
- 현재 공통 도메인 패키지는 만들지 않는다. 두 앱 이상에서 실제 공유되는 순수 계약 또는 규칙이 생길 때만 `packages/contracts`, `packages/core`, `packages/utils`를 추가하고 앱은 공개 export만 사용한다.
- 토스 앱은 `apps/<app>-toss`, 하이브리드 앱은 `apps/<app>-mobile`로 별도 생성한다. PWA의 UI·라우팅·브라우저 전역을 가져오지 않는다.
- HUD PWA의 위치 정보는 브라우저에서만 처리하며 서버로 전송하지 않는다. V-World 도로 제한속도·단속 카메라·Supabase·Cloudflare 연동은 키·데이터 출처·권한·비용이 확정되기 전에는 구현하지 않는다.
- `apps/hud-pwa/wrangler.jsonc`는 Cloudflare Workers Static Assets에서 `dist`를 제공하는 배포 설정이다. GitHub `main` push는 Cloudflare Workers Builds가 빌드·배포한다. 대시보드 Worker 이름은 `wrangler.jsonc`의 `name`과 일치해야 한다. 커스텀 도메인 연결, 직접 `wrangler deploy`, 계정·비밀값 변경은 사용자 명시 승인 후에만 진행한다.
- Golf PWA를 만들기 전 `docs/planning/golf-app-prd-trd-spec.md`의 ‘현재 우선 구현 범위’를 읽는다. 초기에는 타구 영상 기반 런치 분석과 계산을 구현하며, 측정 신뢰도·지원 기기·표준 환경 가정을 표시하지 않은 채 실제 방향·비거리를 확정값으로 주장하지 않는다.

## HUD PWA 범위

- 포함: 안전 고지 동의, 브라우저 위치 권한 요청, GPS 속도(km/h) 표시, EMA 보정과 3km/h 미만 0 처리, 반사 모드와 독립 180도 표시 보정, 색상·글자 크기·두께의 로컬 설정, 10km/h 이상 설정 메뉴 자동 숨김, 위치 오류/미지원 안내와 재시도.
- 제외: 실제 도로 제한속도·단속 카메라 데이터, 차량 운행 판단, 보장된 화면 꺼짐 방지·방향 잠금, 서버 저장·인증, 토스 SDK·Capacitor·배포.
- 실제 운전 중 조작하지 말고 안전하게 고정된 상태에서만 사용하도록 고지한다. 법률적 효력·면책을 주장하지 않으며, 출시 전 관할 법률 및 문구를 전문 검토받는다.
- 기본 거치 안내는 화면을 위로 두고 스마트폰의 물리적 상단이 운전자 쪽을 향하게 배치하는 것이다. 이 경우 시스템 가로 회전과 무관하게 HUD 표시의 기본 180도 보정을 사용하며, 반사 모드는 별도로 켠다. 이는 현재 HUD 표시 방향을 위한 제품 기준이며 GPS 안테나 위치·수신 감도를 보장하는 규칙이 아니다. 표시 방향과 수신 정확도는 정차 상태에서 기기별로 확인한다.

## 실행과 검증

- 실제 실행·검사·Git·배포 명령의 기준 문서는 `docs/development.md`다. 앱·서버·포트·배포 스크립트를 추가하거나 변경할 때 같은 변경에서 이 문서와 루트 스크립트·README·progress를 갱신한다.
- HUD 개발: `pnpm.cmd dev:hud` (`http://127.0.0.1:5173`)
- Golf 개발: `pnpm.cmd dev:golf` (`http://127.0.0.1:5180`)
- Cloudflare 로컬 미리보기: `pnpm.cmd dev:cloudflare:hud` (`http://localhost:8787`)
- Cloudflare 배포(명시 승인 후): `pnpm.cmd deploy:cloudflare:hud`
- Golf Cloudflare 로컬 미리보기: `pnpm.cmd dev:cloudflare:golf` (`http://localhost:8788`)
- Golf Cloudflare 배포(명시 승인 후): `pnpm.cmd deploy:cloudflare:golf`
- 타입 검사: `pnpm.cmd typecheck`
- 빌드: `pnpm.cmd build`
- 설치/서비스 워커·실기기 GPS·화면 회전·토스·Android·iOS 검증은 자동 검사와 구분해 `progress.md`에 기록한다.

