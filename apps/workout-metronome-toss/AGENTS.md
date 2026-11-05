# 모두의 비트 토스 미니앱 작업 지침

루트 [AGENTS.md](../../AGENTS.md)의 공통 정책을 먼저 적용한다. 이 앱은 `apps/workout-metronome-pwa`와 제품 흐름을 맞추되 React UI·스타일·앱 상태·토스 SDK 연동을 독립 소유한다. PWA 소스 파일을 경계 밖 상대 경로로 import하지 않는다.

## 앱 정보와 화면

| Key | Value |
| --- | --- |
| 콘솔 등록 | appName `moduibeat`, 표시 이름 `모두의 비트`, 비게임. 앱 ID를 임의 변경하지 않는다. |
| 시각 기준 | 배경 `#10131b`, 카드 `#191f2c`, 글자 `#f6f7fb`, 강조·TDS 브랜드 색 `#b7f1ff`. |
| 홈 화면 | 실내·실외, 40~240 BPM, 운동 시간, 인터벌 프리셋 2개·사용자 설정, 인터벌 워밍업·쿨다운, 비트 소리·진동을 설정한다. |
| 운동 화면 | 추·BPM·남은 시간·일시정지·이어하기를 표시한다. |
| 완료 화면 | 운동 요약과 재시작을 제공한다. |
| 도움말 | `?`를 항목 이름 옆에 두고 설명은 누른 버튼 가까이에 표시한다. 화면 경계를 넘으면 위치를 조정한다. 바깥 누르기·닫기·Escape로 해제하고 선택 상태를 색으로 구분한다. |

## 운동 데이터와 기기 기능

| Key | Value |
| --- | --- |
| 칼로리 입력 | 홈에서 운동 종류와 몸무게(20~300kg)를 선택적으로 입력해 로컬에 저장한다. 키·성별은 수집하지 않는다. |
| 인터벌 준비·정리 | 인터벌에 선택형 워밍업과 쿨다운을 제공한다. 기본값은 워밍업 5분·120 BPM, 쿨다운 5분·100 BPM이며 각각 1~30분·40~240 BPM 범위에서 설정한다. 반복 횟수에는 포함하지 않지만 총 운동 시간에는 포함한다. |
| 칼로리 표시 | 두 입력값이 유효할 때만 성인 활동별 MET와 설정 운동 시간으로 추정한다. 값이 없으면 완료 화면에 운동 종류 미선택·몸무게 미입력·범위 오류 중 해당 이유를 표시한다. 인터벌은 빠른 구간에 빠른 MET, 회복·워밍업·쿨다운에 회복 MET 가정을 적용한다. BPM·GPS 속도를 실제 운동 강도 측정값으로 사용하지 않는다. |
| 실외 위치 | `Device.subscribeLocation`으로 구독하고 화면 이탈 때 해제한다. SDK 좌표에서 계산한 속도는 GPS 참고값이다. 브라우저 `geolocation.speed`와 같다고 주장하지 않는다. |
| 날씨 | 사용자 선택 뒤 MET Norway API를 호출한다. 조회 전에 대략적 좌표·IP 전송을 알리고 출처·CC BY 4.0 링크를 표시한다. 토스 테스트/실서비스 Origin의 CORS 성공은 실기기 검증 전까지 미확인이다. |
| 소리 | Web Audio 비트와 인터벌 호르라기는 앱 내부 합성음이다. iOS·Android 토스 WebView의 화면 잠금·앱 전환 재생은 각 실기기에서 검증하며 연속 재생을 보장하지 않는다. |
| 화면 켜짐 유지 | 운동 재생·카운트인 중 지원 환경에서 Screen Wake Lock을 요청하고 일시정지·완료·초기화·앱 종료 시 해제한다. 시스템이 해제하면 화면 복귀 시 다시 요청하며, 미지원·실패 상태를 운동 화면에 표시한다. 토스 WebView의 실제 지원 여부는 iOS·Android 실기기에서 각각 검증한다. |

## 광고

| Key | Value |
| --- | --- |
| 표시 시점 | 목표 시간에 도달해 정상 완료한 뒤에만 전면형 광고를 한 번 시도한다. 운동 중 미리 로드하고 `loaded` 이벤트가 없거나 SDK가 미지원이면 완료 화면을 그대로 보여준다. 일시정지·초기화·설정 이동에는 표시하지 않는다. |
| 빌드 모드 | 일반 개발·빌드는 광고를 호출하지 않는다. `ad-test`는 공식 테스트 ID, `ad-live`는 사용자 제공 운영 ID를 쓴다. 운영 번들에 테스트 ID가 남지 않았는지 확인하고 운영 ID로 광고를 테스트하지 않는다. |

## 개발과 검사

| Key | Value |
| --- | --- |
| 실행 위치 | `D:\DEV\mini-apps` |
| 설치 버전 | `@apps-in-toss/web-framework`·Devtools 3.9.0, TDS 2.5.1, React 18.3.1. SDK/TDS peer 제약과 공식 문서를 변경 때 재확인한다. |
| 개발 서버 | `pnpm.cmd dev:metronome:toss` → `http://127.0.0.1:5182/` |
| 타입 검사 | `pnpm.cmd --filter @mini-apps/workout-metronome-toss typecheck` |
| 단위 검사 | `pnpm.cmd --filter @mini-apps/workout-metronome-toss test` |
| 빌드 | `pnpm.cmd --filter @mini-apps/workout-metronome-toss build` |
| 일반 `.ait` | `pnpm.cmd build:ait:metronome` → 광고 없음 |
| 광고 테스트 `.ait` | `pnpm.cmd build:ait:metronome:test` → 공식 테스트 ID |
| 운영 `.ait` | `pnpm.cmd build:ait:metronome:live` → 운영 ID |

## 토스 콘솔 `.ait` 업로드와 인수인계

| Key | Value |
| --- | --- |
| 실행 위치 | `D:\DEV\mini-apps\apps\workout-metronome-toss` |
| 최초 인증 | 토스 콘솔에서 API 키를 발급받아 `npx ait token add`로 등록한다. API 키를 명령 인수·문서·Git에 남기지 않는다. |
| 콘솔 업로드 | 최신 `moduibeat.ait`의 파일명·생성 시각·빌드 모드를 확인하고 사용자 명시 승인 후 `npx ait deploy`를 실행한다. [토스 공식 CLI 안내](https://developers-apps-in-toss.toss.im/guide/operation/toss.md) |
| 업로드 뒤 검사 | 새 테스트 스킴/QR의 `deploymentId`로 실기기를 확인한다. 업로드는 검수 요청이나 출시가 아니다. |
| 상태 기록 | Devtools 브라우저, `.ait` 생성, 콘솔 업로드, QR 실기기 테스트, 출시를 각각 기록한다. `.ait` 생성만으로 업로드·출시가 완료되지는 않는다. |
| 승인 범위 | 업로드·배포·Git 푸시는 사용자 명시 승인 후 진행한다. |
| 자료 기록 | 외부 자료·데이터의 출처·권리 조건과 이용일을 `progress.md`에 남긴다. |
