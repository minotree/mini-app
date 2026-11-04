# HUD 토스 미니앱 작업 지침

루트 [AGENTS.md](../../AGENTS.md)의 공통 정책을 따른다. 이 앱은 HUD PWA와 같은 제품 흐름을 제공하지만 React 화면·상태·토스 SDK 위치 구독을 독립 소유한다. PWA 소스를 경계 밖 경로로 import하지 않는다.

| Key | Value |
| --- | --- |
| 앱 ID | `apps-in-toss.config.ts`의 `moduihud`는 임시값이다. 토스 콘솔 등록 후 발급된 appName으로 교체해야 콘솔 업로드를 진행할 수 있다. |
| 안전 흐름 | 안전 고지 확인 뒤에만 토스 위치 구독을 시작한다. 운전 중 조작하지 않으며 기기를 안전하게 고정한다. |
| 위치·속도 | `Device.subscribeLocation`의 연속 좌표로 GPS 참고 속도를 계산한다. 두 위치 사이 시간·정확도·이상 속도를 검사하고, EMA·3km/h 미만 0 처리와 10km/h 이상 설정 숨김을 적용한다. 위치는 서버로 보내지 않는다. |
| 표시 설정 | 180도 표시 보정과 반사 모드, 색상·크기·두께를 로컬 저장한다. 잠금·백그라운드 위치 지속과 실제 운전 중 성능은 보장하지 않는다. |
| 종료 흐름 | 10km/h 미만에서만 설정 영역의 `HUD 사용 종료`를 제공한다. 종료 즉시 위치 구독을 해제하고 종료 화면에서 같은 설정으로 다시 시작하거나 안전 안내를 다시 볼 수 있다. |
| 전면 광고 위치 | 향후 종료 조작 뒤 위치 구독을 해제하고 종료 화면으로 전환되는 시점에 세션당 최대 1회만 검토한다. 시작·권한 요청·주행·설정·오류 중에는 표시하지 않으며, 광고 실패나 미지원 상태가 종료 화면 진입을 막지 않아야 한다. 운영 광고 ID가 확정되기 전에는 SDK를 연결하지 않는다. |
| 실행 위치 | `D:\DEV\mini-apps` |
| 개발 서버 | `pnpm.cmd dev:hud:toss` → `http://127.0.0.1:5183/` |
| 타입 검사 | `pnpm.cmd --filter @mini-apps/hud-toss typecheck` |
| 단위 검사 | `pnpm.cmd --filter @mini-apps/hud-toss test` |
| 빌드 | `pnpm.cmd --filter @mini-apps/hud-toss build` |
| 웹 빌드 / `.ait` 생성 | `pnpm.cmd build:hud:toss`, `pnpm.cmd build:ait:hud` |
| 출시 경계 | Devtools·토스 실기기·콘솔 업로드·검수·출시는 각각 별도 확인한다. 커밋·푸시·업로드·배포는 사용자 명시 승인 후 진행한다. |

## 토스 콘솔 `.ait` 업로드

| Key | Value |
| --- | --- |
| 실행 위치 | `D:\DEV\mini-apps\apps\hud-toss` |
| 업로드 전 조건 | 콘솔에서 발급된 실제 appName으로 `moduihud`를 교체하고 최신 `.ait` 파일명·생성 시각을 확인한다. appName 확정 전에는 업로드하지 않는다. |
| 최초 인증 | 토스 콘솔에서 API 키를 발급받아 `npx ait token add`로 로컬 프로필에 등록한다. API 키를 명령 인수·문서·Git에 남기지 않는다. |
| 콘솔 업로드 | 사용자 명시 승인 후 `npx ait deploy`를 실행한다. [토스 공식 CLI 안내](https://developers-apps-in-toss.toss.im/guide/operation/toss.md) |
| 업로드 뒤 검사 | 새 QR/테스트 스킴의 `deploymentId`로 토스 실기기에서 확인한다. 업로드는 검수 요청이나 출시가 아니다. |

