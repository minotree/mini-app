# 구조 결정

## 2026-11-03 — 모두의 비트 토스 미니앱 분리

`apps/workout-metronome-toss`는 비게임 앱 `moduibeat`의 독립 React/Vite·Apps in Toss SDK·TDS 패키지다. PWA의 UI·라우팅·브라우저 위치 감시를 import하지 않는다. 현재 공통 계약 패키지는 만들지 않고 계산 규칙을 토스 패키지에 독립 보유한다. 실외 위치는 토스 SDK의 지속 위치 구독으로 받고 SDK가 속도를 반환하지 않으므로 좌표·시각·정확도에서 참고 속도를 계산한다. 로컬 빌드·`.ait` 생성과 토스 실기기·콘솔 업로드·출시는 분리한다. 토스 패키지는 기존 Cloudflare PWA Worker의 정적 자산이 아니다.

## 2026-11-03 — 앱별 운영 문서 소유권

루트 `AGENTS.md`와 `progress.md`는 workspace 공통 정책·전체 상태·교차 앱 결정을 관리한다. 각 PWA 패키지는 자기 제품 범위와 브라우저·배포 제약을 `apps/<app>/AGENTS.md`에, 구현 이력·자동 검사·실기기 미검증 항목을 `apps/<app>/progress.md`에 기록한다. 같은 상세 내용을 루트와 앱에 중복하지 않고, 새 앱도 패키지 생성 시 두 문서를 함께 만든다.

## 2026-11-01 — 앱별 독립 PWA에서 시작

`apps/*`의 각 패키지는 하나의 미니앱과 하나의 플랫폼 어댑터를 소유한다. 첫 패키지는 `@mini-apps/hud-pwa`다. 아직 두 앱이 공유하는 검증 규칙이나 데이터 계약이 없으므로 공통 패키지를 미리 만들지 않는다.

HUD는 PWA 단계에서 브라우저 Geolocation API만 사용한다. 지도, 제한속도, 단속 카메라, 사용자 계정, 원격 저장소의 필요성과 제공자 조건은 미확정이므로 Supabase·V-World·Vercel을 연결하지 않는다. Cloudflare는 정적 PWA 호스팅 설정만 두고 Worker 런타임 코드·계정·도메인·원격 데이터는 연결하지 않는다.

## 2026-11-01 — Cloudflare Workers Static Assets 배포 준비

HUD PWA의 Vite 빌드 결과 `apps/hud-pwa/dist`는 `wrangler.jsonc`의 Workers Static Assets로 제공한다. 이는 별도 Worker 런타임 코드나 저장소를 추가하지 않고 정적 PWA를 배포하기 위한 선택이다. SPA fallback을 명시해 향후 클라이언트 라우트를 새로고침해도 `index.html`을 제공할 수 있게 한다. 계정 인증, Worker 생성, 도메인 연결, `wrangler deploy`는 사용자 명시 승인 후에만 수행한다.

## 2026-11-02 — PWA의 기본 배포 경로

모든 PWA는 별도 Cloudflare Workers Static Assets Worker를 기본 배포 경로로 사용한다. 각 앱은 자기 `dist`만 제공하는 `wrangler.jsonc`와 고유 Worker 이름을 소유하고, GitHub `main` push에 연결된 Workers Builds가 앱별 빌드·배포를 수행한다. Worker 런타임 코드, 원격 데이터, 커스텀 도메인과 비밀값은 필요가 확정될 때만 추가한다.

새 Worker 이름은 `workers.dev` 기본 URL을 짧게 유지하도록 앱의 짧은 영문 슬러그를 우선 사용한다. 예를 들어 `metronome` Worker는 `metronome.<account>.workers.dev` 형식의 주소를 사용한다.

## 2026-11-01 — HUD 기본 거치 방향

현재 HUD PWA는 화면을 위로 두고 스마트폰의 물리적 상단이 운전자 쪽을 향하는 거치를 기본 안내로 사용한다. 시스템이 180도 가로 회전을 제공하지 않는 기기에서도 이 거치 방향을 지원하도록 HUD 표시 자체에 기본 180도 보정을 둔다. 180도 보정과 좌우 반사 모드는 별개의 변환이며, 정차 중 반사 결과를 보고 각각 조정한다. 스마트폰의 GNSS 안테나 위치·수신 방향은 기종별로 다르므로 이 방향을 GPS 정확도 보장으로 표현하지 않는다.

## 2026-11-01 — 가로 HUD 설정 패널

가로 화면의 560 CSS px 이상 너비에서는 HUD 속도 표시를 중앙에 유지하고 설정 패널을 오른쪽 세로 영역에 배치한다. 좁은 가로 화면에서는 본문 폭을 보존하기 위해 하단 메뉴 배치를 유지한다. 속도 10km/h 이상에서는 설정 패널을 숨기는 기존 안전 규칙이 우선한다.

메뉴가 숨겨진 주행 상태에서는 방향·직전 메뉴 위치와 무관하게 HUD가 전체 가용 화면의 중앙을 사용한다.

## 2026-11-02 — 운동 메트로놈 PWA의 로컬 리듬 처리

`apps/workout-metronome-pwa`는 독립 React/Vite PWA로 구현한다. BPM 계산·설정 검증·로컬 저장은 앱 안에 두며, 외부 데이터·인증·서버는 사용하지 않는다. 기본 시각 피드백은 CSS로 구현한 메트로놈 추의 왕복 움직임이고, 소리는 Web Audio API로 합성한 짧은 비트여서 별도 음원 자산을 필요로 하지 않는다. 진동은 Vibration API 지원 기기에서만 선택적으로 수행한다.

정밀 백그라운드 재생, 사용자 문구 음성화, 사전 생성 응원 MP3 및 Cloudflare 정적 배포는 별도 요구사항이 확정될 때 추가한다.

## 2026-11-02 — 운동 메트로놈 Cloudflare Static Assets 배포 준비

메트로놈 PWA의 `dist`는 `apps/workout-metronome-pwa/wrangler.jsonc`의 Workers Static Assets로 제공하도록 준비했다. SPA fallback을 설정했으며 별도 Worker 런타임 코드·비밀값·원격 데이터는 추가하지 않는다. `mini-apps-workout-metronome` Worker의 생성, 계정 인증, GitHub Workers Builds 연결과 실제 배포는 사용자 승인 후에만 수행한다.

