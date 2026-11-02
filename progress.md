# mini-apps 구현 진행표

## 운동 메트로놈 PWA 기본 리듬 MVP (2026-11-02)

- 요청/결정: 러닝·사이클 메트로놈을 시작하며, 시각 피드백은 화면 플래시보다 실제 메트로놈 추 움직임을 기본으로 한다.
- 변경: 독립 `apps/workout-metronome-pwa`를 추가. 종목별 프리셋·템포 조절·추 왕복 애니메이션·Web Audio 합성 비트·선택형 진동·시작/일시정지·로컬 설정 저장을 구현.
- 제외: 워밍업·인터벌·사용자 문구·사전 생성 음성 MP3·Cloudflare 배포. 사용자 입력 문구의 TTS는 지원하지 않는다.
- 권리: 외부 음원·문구·이미지를 포함하지 않는다. 비트 소리는 Web Audio API로 합성한다.
- 검증: `pnpm.cmd test`, `pnpm.cmd typecheck`, `pnpm.cmd build`, `git diff --check` 통과. 실제 기기 음향·진동·PWA 설치 및 백그라운드 동작은 미검증.
- 후속 수정: 추의 한쪽 끝→반대쪽 끝 이동 시간을 한 박자 간격과 같게 조정해, 매 박자마다 반대쪽 끝에 도달하도록 동기화했다. 메트로놈 단위 검사·타입 검사·PWA 빌드를 다시 통과.
- 후속 수정: 재생 제어를 `시작`·`일시정지`·`초기화`의 독립 버튼으로 구성했다. 초기화는 재생을 멈추고 박자 카운터와 설정을 기본값으로 되돌린다.
- 후속 확장: 2·3·4박 묶음과 첫 박의 고음 강조, 선택형 4박 카운트인을 추가했다.
- 후속 수정: 박자 묶음에 `적용 안 함`을 추가했다. 선택 시 첫 박 강조 없이 모든 비트를 동일한 소리로 재생하며 카운트인 설정에는 영향을 주지 않는다.
- 후속 확장: 재생 제어와 모든 주요 설정 옆에 토글식 `?` 말풍선 설명을 추가했다. 한 번에 하나만 열리고 키보드·스크린리더에서 열림 상태를 확인할 수 있다.
- 후속 확장: 현재 설정 화면에 목표 운동 시간 프리셋·직접 분 입력을 추가했다. 카운트인 종료 뒤 남은 시간을 차감하고 0초가 되면 메트로놈을 자동 정지한다.
- 후속 확장: 템포 슬라이더·증감 버튼과 별도로 40~240 범위의 직접 숫자 입력을 추가했다.
- 후속 수정: 숫자 입력은 타이핑을 마치거나 Enter/포커스 이탈 시에만 범위 보정을 적용하도록 변경했다. 목표 운동 시간의 직접 입력 범위는 10~240분이다.
- 검증 상태 갱신: 직접 입력 수정의 메트로놈 단위 검사 4개와 타입 검사는 통과. PWA 서비스 워커 빌드는 기존 pnpm 전이 의존성 링크 오류로 다시 실패했으며, 의존성 복구 후 재검증이 필요하다.
- 검증 상태 갱신: 개발 서버 종료 뒤 pnpm 의존성 링크를 복구했다. 목표 시간·템포 직접 입력 수정의 메트로놈 단위 검사 4개, 타입 검사와 PWA 서비스 워커를 포함한 프로덕션 빌드가 통과했다.
- 검증 상태 갱신: 재생 제어·강박·카운트인 수정의 메트로놈 단위 검사 4개와 타입 검사는 통과. 개발 서버 종료 후 pnpm 의존성 링크를 복구했고, 서비스 워커를 포함한 메트로놈 PWA 프로덕션 빌드도 통과했다.
- 의존성 복구: pnpm의 격리형 링크 재생성으로 `path-scurry`가 `lru-cache` 11을 정상 해석하도록 복구했다. 메트로놈 테스트 4개, 타입 검사, PWA 서비스 워커를 포함한 프로덕션 빌드와 `git diff --check`를 다시 통과했다.
- 배포 준비: `mini-apps-workout-metronome` Cloudflare Workers Static Assets 설정과 로컬 미리보기·승인 후 직접 배포 명령을 추가했다. `wrangler deploy --config wrangler.jsonc --dry-run`은 `dist`의 정적 파일 8개를 읽고 업로드 없이 통과했다. Cloudflare 계정 인증·Worker 생성·GitHub 연결·실제 배포는 수행하지 않았다.
- 배포 원칙: 거의 모든 PWA는 앱별 Cloudflare Workers Static Assets Worker와 GitHub `main` 자동 배포를 기본 경로로 사용하도록 기록했다. 실제 계정·Worker·연결·배포 변경은 명시 승인 후에만 수행한다.
- 배포 주소 원칙: 새 Worker 이름은 `workers.dev` 주소가 짧아지도록 앱의 짧은 영문 슬러그를 우선 사용한다. 기존 Worker의 URL 변경은 별도 승인 대상이다.
- 출시 순서: 운동 메트로놈은 PWA와 토스 미니앱을 모두 고려하되, 첫 출시는 토스 미니앱을 우선한다. 화면 잠금·백그라운드 비트는 PWA와 토스 실기기에서 각각 별도 검증한다.
- 검증 상태 갱신: 배포 설정 수정의 메트로놈 단위 검사 4개와 타입 검사는 통과. PWA 서비스 워커 빌드는 기존 pnpm 전이 의존성 링크 오류가 재발해 실패했으며, 배포 전 의존성 복구 후 다시 확인해야 한다.
- 후속 확장: 재생 중 Web Audio 비트를 20초 앞까지 예약하고 Media Session의 재생·일시정지·중지 제어를 등록해 백그라운드 전환 재생 연속성을 높였다. 화면 잠금·백그라운드 재생은 OS·브라우저가 중단하거나 종료할 수 있어 보장하지 않으며, Android·iOS와 토스에서 별도 실기기 검증이 필요하다.
- 검증 상태 갱신: 백그라운드 재생 보완의 메트로놈 단위 검사 4개, 타입 검사와 `git diff --check`는 통과했다. PWA 서비스 워커 빌드는 기존 pnpm 전이 의존성 링크 오류(`path-scurry`의 `lru-cache` 해석)로 다시 실패했다.
- 후속 확장: 운동 재생 중 Screen Wake Lock을 요청해 트레드밀·실내 자전거 사용 중 화면 자동 꺼짐·어두워짐을 막고, 일시정지·초기화·운동 종료 시 해제하도록 추가했다. 시스템 해제·미지원 상태는 화면에 표시하며, 실제 Android·iOS와 토스에서 검증이 필요하다.
- 검증 상태 갱신: 화면 유지 추가의 메트로놈 단위 검사 4개, 타입 검사와 `git diff --check`는 통과했다. PWA 서비스 워커 빌드는 기존 pnpm 전이 의존성 링크 오류(`path-scurry`의 `lru-cache` 해석)로 실패했다.

## 콘텐츠 권리 확인 원칙 기록 (2026-11-02)

- 요청/결정: 모든 작업에서 저작권 등 법적 문제가 없도록 권리 확인을 필수 기준으로 적용.
- 변경: 루트 `AGENTS.md`에 콘텐츠·음성·이미지·데이터·모델·라이브러리의 권리·라이선스·출처 확인, 기록 및 불명확 자료 제외 원칙을 추가.
- 검증: `git diff --check` 통과.

## Golf 카메라 미리보기 연결 수정 (2026-11-01)

- 요청/문제: 배포된 Golf PWA에서 카메라 권한 요청 후 미리보기가 켜지지 않음.
- 원인: 카메라 스트림을 얻는 시점에는 조건부 렌더링된 `video` 요소가 아직 생성되지 않아 스트림을 연결하지 못함.
- 변경: 카메라 준비 상태가 된 뒤 생성된 `video` 요소에 스트림을 연결하고 재생하도록 effect를 추가. 재생 실패 시 스트림을 정리하고 재시도 가능한 오류를 표시.
- 검증: `pnpm.cmd --filter @mini-apps/golf-pwa test`, `typecheck`, `build`, `git diff --check` 통과.
- 남은 작업: 이 수정 사항을 GitHub `main`에 push해 Cloudflare 자동 배포 후 실제 기기에서 카메라 권한·미리보기 확인.

## Golf PWA Cloudflare 배포 설정 준비 (2026-11-01)

- 요청/문제: Golf PWA도 GitHub push를 통해 Cloudflare에 별도 배포.
- 변경: Golf PWA의 Workers Static Assets 설정(`wrangler.jsonc`)과 Cloudflare 로컬 미리보기·직접 배포 스크립트를 추가. GitHub Workers Builds에서 사용할 루트/빌드/배포/preview 명령과 monorepo watch path를 개발 명령 문서에 기록.
- 검증: Golf 테스트 4개·typecheck·PWA build 통과. `wrangler deploy --config wrangler.jsonc --dry-run`으로 정적 자산 8개를 읽는 설정을 검증. Cloudflare 계정 연결·실제 업로드·배포 없음.
- 사용자 확인: Cloudflare에서 `mini-apps-golf` Worker 생성, GitHub 저장소 연결, `main` 자동 배포와 watch path 설정 대기.
- 적용: 로컬 배포 설정만 추가. Golf Worker·도메인·Cloudflare 계정 상태 변경 없음.
- 남은 작업: 변경 사항을 GitHub `main`에 push한 뒤 Cloudflare 대시보드에서 GitHub 연결, 첫 production 배포와 공개 URL 확인.

## Golf 테스트용 준비 음성 안내 (2026-11-01)

- 요청/문제: 사용자 테스트를 위해 카메라 배치와 스윙 시작을 음성으로 안내.
- 변경: 카메라 준비 후 선택한 클럽과 측면 카메라 배치·스윙 시작 안내를 Web Speech API로 재생. 음성 켜기/끄기와 다시 듣기를 추가. 자동 타구 감지·자동 준비 판정·결과 TTS는 아직 구현하지 않음.
- 검증: `pnpm.cmd --filter @mini-apps/golf-pwa test` 통과(4개), typecheck 통과, build 통과(PWA precache 5개·221.39 KiB), `git diff --check` 통과.
- 사용자 확인: 실제 브라우저/휴대폰에서 한국어 음성 재생, 음소거, 카메라 권한 이후 자동 재생은 미검증.
- 적용: 로컬 변경만 수행. Golf Cloudflare 배포 없음.
- 남은 작업: 실제 기기 음성 테스트 및 자동 타구 측정 구현 후 상태 기반 안내 확장.

## Golf 카메라 배치 안내 통일 (2026-11-01)

- 요청/문제: 클럽별로 서로 다른 임시 카메라 배치 안내가 표시됨.
- 변경: 드라이버·우드/유틸·아이언·웨지 모두 ‘공 진행 방향의 측면에서 공과 임팩트 구간이 보이도록 놓으세요.’로 안내를 통일. Golf 기획 문서에도 초기 런치 분석 카메라 배치 기준을 기록.
- 검증: `pnpm.cmd --filter @mini-apps/golf-pwa typecheck` 통과, build 통과(PWA precache 5개·220.56 KiB), `git diff --check` 통과.
- 사용자 확인: 실제 기기/타석에서 카메라 위치·높이·화각과 자동 측정 결과는 미검증.
- 적용: 로컬 변경만 수행. Golf Cloudflare 배포 없음.
- 남은 작업: 측면 카메라의 구체적 거리·높이·프레임 영역과 추적 알고리즘 확정.

## Golf 세부 클럽 선택 추가 (2026-11-01)

- 요청/문제: 우드·유틸, 아이언, 웨지의 세부 번호도 선택.
- 변경: Golf PWA에 드라이버, 3/5/7 우드, 3/4/5 유틸, 4~9번 아이언, PW/AW/SW/LW 선택 칩을 추가. 선택한 클럽 분류는 이후 런치 계산의 클럽별 보정에 사용할 수 있게 유지.
- 검증: `pnpm.cmd --filter @mini-apps/golf-pwa test` 통과(3개), typecheck 통과, build 통과(PWA precache 5개·220.80 KiB), `git diff --check` 통과.
- 사용자 확인: 클럽 선택 구성·명칭과 실제 타구 자동 분석 연결은 미검증.
- 적용: 로컬 변경만 수행. Golf Cloudflare 배포 없음.
- 남은 작업: 클럽별 런치 보정 기준과 자동 측정 결과 연결.

## Golf PWA 런치 분석 MVP 기반 (2026-11-01)

- 요청/문제: 사용자는 클럽만 선택하고 안내에 따라 스윙하며, 앱이 자동 측정·계산하는 Golf MVP 시작.
- 변경: `apps/golf-pwa`에 독립 React/Vite PWA를 추가. 클럽 선택·후면 카메라 권한/미리보기·안전한 카메라 배치 안내와 표준 환경 런치 추정 엔진을 구현. 측정값 검증과 캐리·토탈·오프라인 거리 계산 단위 검사를 추가.
- 검증: `pnpm.cmd install --no-frozen-lockfile`로 workspace lockfile 갱신. `pnpm.cmd test` 통과(HUD 4개, Golf 3개), `pnpm.cmd typecheck` 통과, `pnpm.cmd build` 통과(Golf PWA precache 5개·219.70 KiB, HUD PWA precache 5개·223.20 KiB), `git diff --check` 통과. 간접 의존성 `glob@11.1.0` deprecation 경고 1건과 `esbuild`/`workerd` 설치 스크립트 보류 경고가 있음.
- 사용자 확인: 실제 기기 카메라, 타구·클럽 헤드·볼 자동 추적과 측정 수치 생성은 미구현/미검증. 없는 측정값으로 결과를 표시하지 않음.
- 적용: 로컬 변경만 수행. Golf Cloudflare 배포 설정·계정 연동 없음.
- 남은 작업: 타구/클럽 헤드/볼 자동 추적 알고리즘과 카메라 보정 설계·구현, 신뢰도 기준과 실제 타구 검증.

## Golf PWA 초기 범위 확정 (2026-11-01)

- 요청/문제: 스윙 모션 분석은 나중에 개발하고, 먼저 타구에서 헤드 속도·각도·볼 스피드 등을 자동 측정해 방향각과 비거리를 계산하는 기능만 개발.
- 변경: 골프 기획 문서에 카메라 기반 런치 분석 우선 범위를 추가. 사용자는 클럽만 선택하고 안내에 따라 실제 스윙하며, 앱이 타구·볼·클럽 헤드를 자동 추적해 계산한다. 수치 입력·복잡한 측정 시작 조작은 요구하지 않는다. 측정 신뢰도/표준 환경/지원 기기 한계를 기록하고 스윙 모션 분석은 후속으로 분리. 루트 AGENTS에 다음 앱 후보와 범위를 기록.
- 검증: `git diff --check` 통과.
- 사용자 확인: Golf PWA의 카메라 배치·지원 기기 기준·클럽/물리 모델·결과 표현 방식은 구현 전 별도 확정 필요.
- 적용: 로컬 문서 변경만 수행. Golf 앱 패키지·외부 서비스·배포 없음.
- 남은 작업: HUD 작업 정리 후 Golf 계산기 요구사항과 입력 단위·검증 규칙 확정.

## 주행 상태 HUD 중앙 정렬 고정 (2026-11-01)

- 요청/문제: 속도 증가로 메뉴가 숨겨질 때 가로·세로 모두 HUD를 중앙에 유지.
- 변경: `driving` 레이아웃을 단일 전체 화면 그리드로 명시하고 HUD를 첫 행·열에 고정. 가로 오른쪽 메뉴 패널 규칙은 메뉴가 있을 때만 적용.
- 검증: `pnpm.cmd typecheck` 통과. `pnpm.cmd build` 통과(PWA precache 5개·223.20 KiB). `git diff --check` 통과.
- 사용자 확인: 실제 가로·세로 기기에서 주행 상태 전환 시 중앙 정렬 미검증.
- 적용: 로컬 변경만 수행. 다음 `main` push는 Cloudflare production 배포를 유발함.
- 남은 작업: 실제 기기에서 메뉴 숨김/복귀 시 HUD 위치 확인.

## 가로 화면 오른쪽 설정 패널 (2026-11-01)

- 요청/문제: 가로 모드에서는 하단보다 좌우 배치가 HUD 가독성에 유리함.
- 변경: 가로 560 CSS px 이상에서 설정 메뉴를 오른쪽 세로 패널로 배치하고 HUD는 왼쪽의 남은 공간을 사용하게 변경. 좁은 가로 화면은 하단 메뉴를 유지하며, 주행 중 메뉴 숨김 규칙이 우선.
- 검증: `pnpm.cmd typecheck` 통과. `pnpm.cmd build` 통과(PWA precache 5개·223.11 KiB). `git diff --check` 통과.
- 사용자 확인: 실제 휴대폰 가로 화면에서 오른쪽 패널 폭·조작성·HUD 가독성 미검증.
- 적용: 로컬 변경만 수행. 다음 `main` push는 Cloudflare production 배포를 유발함.
- 남은 작업: 실제 기기 가로 화면에서 오른쪽 패널 확인 및 필요 시 최소 폭 조정.

## 가로 화면 HUD와 설정 메뉴 공존 보정 (2026-11-01)

- 요청/문제: 가로 모드에서 속도 숫자가 커져 하단 설정 메뉴가 화면 아래로 밀려 보이지 않음.
- 변경: HUD 레이아웃을 고정 viewport 높이의 `minmax(0, 1fr)` 본문과 자동 높이 메뉴로 분리. 가로 모드에서는 속도 숫자를 화면 높이 기준으로 제한하고 HUD·메뉴 여백과 버튼 높이를 줄였다. 글자 크기 설정은 CSS 변수로 유지.
- 검증: `pnpm.cmd typecheck` 통과. `pnpm.cmd build` 통과(PWA precache 5개·222.57 KiB). `git diff --check` 통과.
- 사용자 확인: 실제 가로 화면의 메뉴 노출과 HUD 가독성은 미검증.
- 적용: 로컬 변경만 수행. 다음 `main` push는 Cloudflare production 배포를 유발함.
- 남은 작업: 휴대폰 가로 화면 및 실제 차량 거치에서 표시·메뉴 영역 확인.

## 주행 중 설정 메뉴 자동 숨김 (2026-11-01)

- 요청/문제: 주행 속도가 오르면 하단 설정 메뉴를 숨겨 시선 분산을 줄임.
- 변경: 10km/h 이상이면 하단 설정 메뉴를 렌더링하지 않고 HUD에 짧은 잠금 상태만 표시한다. 속도가 다시 기준 아래가 되면 메뉴가 자동으로 돌아온다. 잠금 기준을 순수 함수로 분리하고 경계값 회귀 검사를 추가.
- 검증: `pnpm.cmd test` 통과(4개), `pnpm.cmd typecheck` 통과, `pnpm.cmd build` 통과(PWA precache 5개·222.30 KiB), `git diff --check` 통과.
- 사용자 확인: 실제 차량에서 메뉴 숨김/복귀와 GPS 속도 갱신을 미검증.
- 적용: 로컬 변경만 수행. 다음 `main` push는 Cloudflare production 배포를 유발함.
- 남은 작업: 실제 기기·차량 환경에서 설정 메뉴 자동 숨김 확인.

## HUD 180도 표시 보정 추가 (2026-11-01)

- 요청/문제: 물리적 상단을 운전자 방향으로 두면 시스템이 가로 180도 회전을 제공하지 않는 경우가 있음.
- 변경: 반사 모드와 독립된 HUD 180도 표시 보정을 추가하고, 물리적 상단을 운전자 쪽으로 두는 기본 거치 기준에서는 이 보정을 기본값으로 사용. 정차 중에만 180도 보정·반사 모드를 개별 전환할 수 있으며 설정은 로컬에 저장.
- 검증: `pnpm.cmd test` 통과(3개), `pnpm.cmd typecheck` 통과, `pnpm.cmd build` 통과(PWA precache 5개·222.13 KiB), `git diff --check` 통과.
- 사용자 확인: 실제 차량과 기기별 전면 유리 반사에서 180도 보정·반사 모드 조합 확인 대기.
- 적용: 로컬 변경만 수행. 다음 `main` push는 Cloudflare production 배포를 유발함.
- 남은 작업: 실제 차량 조건에서 기본 조합이 맞는지 확인하고 필요 시 기본값 조정.

## HUD 물리적 상단 거치 안내 추가 (2026-11-01)

- 요청/문제: 스마트폰의 물리적 상단을 운전자 방향으로 둔다는 HUD 거치 기준 반영.
- 변경: 첫 진입 안전 안내, README, AGENTS, 구조 결정에 화면을 위로 두고 물리적 상단을 운전자 쪽으로 배치하는 기준과 정차 상태에서 반사 표시 확인 절차를 추가.
- 검증: `pnpm.cmd typecheck` 통과. `pnpm.cmd build` 통과(PWA precache 5개·221.82 KiB). `git diff --check` 통과.
- 사용자 확인: 실제 차량·스마트폰 기종별 반사 표시와 GPS 정확도는 미검증.
- 적용: 로컬 변경만 수행. 다음 `main` push는 Cloudflare production 배포를 유발함.
- 남은 작업: 실제 차량 환경에서 거치 방향·반사 모드·GPS 정확도 검증.

## HUD PWA GitHub → Cloudflare 첫 자동 배포 (2026-11-01)

- 요청/문제: 로컬 Git push를 통해 Cloudflare에서 PWA를 자동 배포.
- 변경: GitHub `minotree/mini-app`의 `main`을 Cloudflare Workers Builds에 연결. HUD 앱 기준 빌드 명령과 배포 명령을 설정했다.
- 검증: 대시보드에서 Cloudflare Build `147e1f46`이 `Ready`로 완료(약 33초). 이전 deploy 명령은 설정 경로 중복으로 실패했으며 수정 후 재배포 성공. 실제 HTTPS URL·휴대폰 GPS·PWA 설치는 미검증.
- 적용: Cloudflare Workers Static Assets에 첫 Git 기반 production 배포 완료. 커스텀 도메인 연결 없음.
- 남은 작업: 배포 URL에서 HUD 로드·PWA 설치·서비스 워커 및 휴대폰 GPS 확인, 필요 시 preview 브랜치 정책 결정.

## 개발·Git 명령 기준 문서화 (2026-11-01)

- 요청/문제: HUD와 이후 서브 프로젝트의 서버 구동·Git 명령을 파일로 남기고, 명령이 추가될 때 갱신하는 기준 마련.
- 변경: `docs/development.md`에 HUD의 개발/미리보기/Cloudflare 명령, GitHub push→Cloudflare 자동 배포 흐름, 현재 환경의 Git 소유권 오류 대응, 새 앱·서버 추가 시 갱신 절차를 기록. `AGENTS.md`와 README에서 이 문서를 기준으로 연결.
- 검증: `git diff --check` 통과.
- 사용자 확인: Cloudflare Workers Builds Git 연결과 실제 자동 배포는 아직 미완료.
- 적용: 초기 GitHub 푸시 완료(`376ac8b`, `main` → `origin/main`). Cloudflare 배포 없음.
- 남은 작업: Cloudflare 대시보드에서 GitHub 저장소와 Worker 연결, 빌드·배포 명령 설정, 첫 자동 배포 검증.

## HUD PWA Cloudflare 배포 설정 (2026-11-01)

- 요청/문제: PWA를 Cloudflare로 배포할 기반 구성.
- 변경: Cloudflare Workers Static Assets 방식으로 `dist`를 제공하는 `apps/hud-pwa/wrangler.jsonc`과 로컬 미리보기·배포 스크립트를 추가. SPA fallback을 설정.
- 검증: `pnpm.cmd test` 통과(3개), `pnpm.cmd typecheck` 통과, `pnpm.cmd build` 통과. `pnpm.cmd --filter @mini-apps/hud-pwa exec wrangler deploy --config wrangler.jsonc --dry-run` 통과(`dist` 자산 8개 인식, 업로드 없음). `esbuild@0.28.2`, `workerd@1.20261023.1`의 설치 스크립트는 pnpm 정책으로 보류되어 `wrangler dev`는 미검증. 간접 의존성 `glob@11.1.0` deprecation 경고 1건.
- 사용자 확인: Cloudflare 계정, 사용할 Worker 이름·도메인, 배포 대상과 승인 범위 대기.
- 적용: 로컬 배포 설정만 추가. Cloudflare 계정 생성·로그인·업로드·배포 없음.
- 남은 작업: 필요한 경우 사용자 승인 후 `pnpm approve-builds`로 Workers 로컬 런타임 의존성 검토, Cloudflare 인증 후 사용자 승인에 따른 Preview 또는 production 배포.

### Git 연동 첫 배포 경로 수정 (2026-11-01)

- 문제: Cloudflare Workers Builds에서 `pnpm --filter @mini-apps/hud-pwa exec`는 작업 디렉터리를 `apps/hud-pwa`로 바꾼다. 기존 deploy 명령의 `--config apps/hud-pwa/wrangler.jsonc`는 경로를 중복해 `ENOENT`로 실패했다.
- 변경: Git 연동 배포 명령을 `pnpm --filter @mini-apps/hud-pwa exec wrangler deploy --config wrangler.jsonc`로 수정해 문서화.
- 검증: `pnpm.cmd --filter @mini-apps/hud-pwa exec wrangler deploy --config wrangler.jsonc --dry-run`이 `dist` 자산 8개를 인식하고 통과. 현재 샌드박스는 Wrangler 로그 폴더 쓰기 경고를 냈으나 dry-run 결과에는 영향이 없었다. 실제 Cloudflare 재배포는 사용자 대시보드에서 명령 변경 후 수행 예정.

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

- 공통 기반: pnpm workspace, Git 저장소, GitHub 원격 초기 푸시 완료(`376ac8b`).
- HUD Web/PWA: GPS 속도·안전 고지·표시 설정·속도 보정 구현, 단위 검사·타입·프로덕션 빌드 통과. 브라우저·설치·서비스 워커·실기기 GPS·캐시 검증 미완료.
- Toss: 미착수.
- Android: 미착수.
- iOS: 미착수.

