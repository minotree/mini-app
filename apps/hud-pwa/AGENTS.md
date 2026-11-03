# HUD PWA 작업 지침

루트 [AGENTS.md](../../AGENTS.md)의 공통 정책을 먼저 적용한다. 이 문서는 `@mini-apps/hud-pwa`에만 적용되는 제품 범위와 검증 기준의 단일 기준이다.

## 목표와 범위

- 안전 고지 동의 후 브라우저 위치 권한을 요청하고 GPS 속도를 km/h로 표시한다.
- EMA 보정과 3km/h 미만 0 처리, 반사 모드와 독립된 180도 표시 보정, 색상·글자 크기·두께의 로컬 설정, 10km/h 이상 설정 메뉴 자동 숨김, 위치 오류·미지원 안내와 재시도를 제공한다.
- 위치 정보와 설정은 브라우저 안에서만 처리한다. 서버 전송·계정·인증은 구현하지 않는다.
- 실제 도로 제한속도·단속 카메라 데이터, 차량 운행 판단, 화면 꺼짐 방지·방향 잠금 보장, 토스 SDK·Capacitor는 현재 범위에서 제외한다.

## 안전과 표시 기준

- 운전 중 조작하지 말고 시야·에어백·차량 조작을 방해하지 않도록 기기를 안전하게 고정한다. 법률적 효력 또는 면책을 주장하지 않으며, 출시 전 관할 법률과 문구를 전문 검토받는다.
- 기본 거치는 화면을 위로 두고 스마트폰의 물리적 상단이 운전자 쪽을 향하게 한다. 시스템 회전과 관계없이 기본 180도 보정을 사용하고 반사 모드는 별도로 켠다.
- 이 방향은 HUD 표시 기준일 뿐 GPS 안테나 위치·수신 감도를 보장하지 않는다. 정차 상태에서 표시 방향과 수신 정확도를 기기별로 확인한다.

## 배포와 검증

- `wrangler.jsonc`는 `dist`를 제공하는 Cloudflare Workers Static Assets 설정이다. Build watch include paths는 `apps/hud-pwa/*`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`이다(2026-11-03 사용자 제공 Cloudflare 설정 화면 기준). 해당 파일 변경의 GitHub `main` push는 Workers Builds로 배포를 유발하므로, 커밋·푸시·직접 배포·계정 및 비밀값 변경은 명시 승인 후에만 한다.
- 개발은 `pnpm.cmd dev:hud`, 타입 검사는 `pnpm.cmd --filter @mini-apps/hud-pwa typecheck`, 단위 검사는 `pnpm.cmd --filter @mini-apps/hud-pwa test`, 빌드는 `pnpm.cmd --filter @mini-apps/hud-pwa build`를 사용한다.
- 반복 개발과 기능 정리 후 PWA 빌드의 검증 순서는 루트 `AGENTS.md`의 공통 원칙을 따른다.
- 브라우저 위치 권한, 실제 GPS, PWA 설치·서비스 워커, 화면 회전, 차량 거치와 반사 표시는 자동 검사와 별도로 기록한다.
