# mini-apps 구현 진행표

## HUD PWA Cloudflare 배포 설정 (2026-11-01)

- 요청/문제: PWA를 Cloudflare로 배포할 기반 구성.
- 변경: Cloudflare Workers Static Assets 방식으로 `dist`를 제공하는 `apps/hud-pwa/wrangler.jsonc`과 로컬 미리보기·배포 스크립트를 추가. SPA fallback을 설정.
- 검증: `pnpm.cmd test` 통과(3개), `pnpm.cmd typecheck` 통과, `pnpm.cmd build` 통과. `pnpm.cmd --filter @mini-apps/hud-pwa exec wrangler deploy --config wrangler.jsonc --dry-run` 통과(`dist` 자산 8개 인식, 업로드 없음). `esbuild@0.28.2`, `workerd@1.20261023.1`의 설치 스크립트는 pnpm 정책으로 보류되어 `wrangler dev`는 미검증. 간접 의존성 `glob@11.1.0` deprecation 경고 1건.
- 사용자 확인: Cloudflare 계정, 사용할 Worker 이름·도메인, 배포 대상과 승인 범위 대기.
- 적용: 로컬 배포 설정만 추가. Cloudflare 계정 생성·로그인·업로드·배포 없음.
- 남은 작업: 필요한 경우 사용자 승인 후 `pnpm approve-builds`로 Workers 로컬 런타임 의존성 검토, Cloudflare 인증 후 사용자 승인에 따른 Preview 또는 production 배포.

## HUD 표시 설정·속도 보정·오류 복구 보강 (2026-11-01)

- 요청/문제: HUD PWA 개발 진행.
- 변경: GPS m/s→km/h 변환과 3km/h 미만 0 처리·EMA 보정을 `hud.ts`로 분리했다. 반사·색상·글자 크기·두께를 로컬 브라우저에 저장하고, 위치 권한/수신 오류에서 재시도할 수 있게 했다. 10km/h 이상에서는 모든 표시 설정을 잠근다.
- 검증: `pnpm.cmd test` 통과(3개: 저속 처리·EMA·손상/범위 밖 로컬 설정). `pnpm.cmd typecheck` 통과. `pnpm.cmd build` 통과(Vite 8.3.5, PWA precache 5개·221.61 KiB). 설치 중 간접 의존성 `glob@11.1.0` deprecation 경고 1건.
- 사용자 확인: 브라우저 위치 권한 거부/허용, 실제 GPS 속도·설정 잠금, PWA 설치·서비스 워커·화면 회전은 미검증.
- 적용: 로컬 변경만 수행. 커밋·푸시·배포·외부 계정 생성 없음.
- 남은 작업: 실제 기기 PWA 검증, 위치 데이터 품질 기준 결정, 제한속도·단속 카메라 데이터 제공자 및 법률·안전 문구 검토.

## workspace 및 HUD PWA 최소 구조 생성 (2026-11-01)

- 요청/문제: 여러 간단한 미니앱을 pnpm workspace로 관리하고 PWA부터 개발할 기반을 구성.
- 변경: 루트 workspace 설정, 프로젝트 지침, HUD React/Vite PWA의 최소 위치 속도·안전 고지·표시 설정 구조를 추가.
- 검증: `pnpm.cmd install` 통과(잠금 파일 생성, deprecated transitive `glob@11.1.0` 경고 1건). `pnpm.cmd typecheck` 통과. `pnpm.cmd build` 통과(Vite 8.3.5, PWA precache 5개·219.83 KiB). `git -c safe.directory=D:/DEV/mini-apps diff --check` 통과.
- 사용자 확인: HUD 안전 문구, 실제 기기 GPS·PWA 설치·화면 회전은 미검증.
- 적용: 로컬 변경만 수행. 커밋·푸시·배포·외부 계정 생성 없음.
- 남은 작업: 의존성 설치 및 자동 검사, PWA 설치/서비스 워커 검증, HUD 외 다음 앱의 요구사항 확정.

## 단계별 진행 현황

- 공통 기반: pnpm workspace, Git 저장소, 문서 구성 완료. 커밋은 아직 없음.
- HUD Web/PWA: GPS 속도·안전 고지·표시 설정·속도 보정 구현, 단위 검사·타입·프로덕션 빌드 통과. 브라우저·설치·서비스 워커·실기기 GPS·캐시 검증 미완료.
- Toss: 미착수.
- Android: 미착수.
- iOS: 미착수.

