# 개발·실행·Git 명령어

이 문서는 `mini-apps`의 실제 실행 명령을 모은 기준 문서다. 앱이나 서버를 추가·제거하거나 포트·배포 흐름이 바뀌면 같은 변경에서 이 문서, 루트 `package.json` 스크립트, 루트 `AGENTS.md`, 해당 앱의 `AGENTS.md`와 `progress.md`를 함께 갱신한다. 전체 상태에 영향을 주면 루트 `progress.md`도 갱신한다.

## 공통

```powershell
cd D:\DEV\mini-apps

# lockfile 기준 의존성 설치
pnpm.cmd install --frozen-lockfile

# 기능을 묶어 정리한 뒤 모든 앱의 단위 검사·타입 검사·프로덕션 빌드
pnpm.cmd test
pnpm.cmd typecheck
pnpm.cmd build
```

모든 앱은 반복 개발 중 각자의 Vite 개발 서버에서 화면을 확인하고 해당 앱의 `typecheck`·`test`를 실행한다. 기능을 묶어 정리한 다음 해당 앱의 `build`로 PWA 서비스 워커까지 검증한다. 빌드가 성공하기 전에는 배포 가능한 결과물로 간주하지 않는다. 앱별 실행 명령과 포트는 아래 표를 따른다.

## HUD PWA

| 목적 | 명령 | 주소 / 상태 |
| --- | --- | --- |
| Vite 개발 서버 | `pnpm.cmd dev:hud` | `http://127.0.0.1:5173` |
| 프로덕션 빌드 미리보기 | `pnpm.cmd preview:hud` | `http://127.0.0.1:4173` |
| Cloudflare Workers 로컬 미리보기 | `pnpm.cmd dev:cloudflare:hud` | `http://localhost:8787`; `workerd` 설치 스크립트 승인 전 미검증 |
| Cloudflare 직접 배포 | `pnpm.cmd deploy:cloudflare:hud` | 사용자 승인·계정 인증 후에만 실행 |

개발 서버 종료는 해당 터미널에서 `Ctrl+C`다. 실제 위치 정보는 HTTPS 또는 `localhost`의 지원 브라우저·휴대폰에서 확인한다.

## Golf PWA

| 목적 | 명령 | 주소 / 상태 |
| --- | --- | --- |
| Vite 개발 서버 | `pnpm.cmd dev:golf` | `http://127.0.0.1:5180` |
| 프로덕션 빌드 미리보기 | `pnpm.cmd preview:golf` | `http://127.0.0.1:4180` |
| Cloudflare Workers 로컬 미리보기 | `pnpm.cmd dev:cloudflare:golf` | `http://localhost:8788`; `workerd` 설치 스크립트 승인 전 미검증 |
| Cloudflare 직접 배포 | `pnpm.cmd deploy:cloudflare:golf` | 사용자 승인·계정 인증 후에만 실행 |

Golf MVP는 클럽 선택·카메라 권한/영상 준비와 표준 환경 런치 계산 엔진을 포함한다. 실제 영상에서 클럽 헤드·볼 측정값을 자동 추출하는 모델은 구현 전이므로, 아직 수치 결과를 표시하지 않는다.

Golf는 HUD와 별도 Cloudflare Worker(`mini-apps-golf`)로 배포한다. 2026-11-03 사용자 제공 Cloudflare 대시보드 화면에서 GitHub 저장소 연결·배포 이력과 공개 주소 `https://mini-apps-golf.minotree0902.workers.dev`를 확인했다. 아래 Build watch include paths도 대시보드 화면에서 확인했다.

```text
Project name: mini-apps-golf
Production branch: main
Root directory: /
Build command: pnpm --filter @mini-apps/golf-pwa build
Deploy command: pnpm --filter @mini-apps/golf-pwa exec wrangler deploy --config wrangler.jsonc
Preview command: pnpm --filter @mini-apps/golf-pwa exec wrangler preview --config wrangler.jsonc
Build watch include paths: apps/golf-pwa/*, package.json, pnpm-lock.yaml, pnpm-workspace.yaml
```

대시보드 Worker 이름은 `apps/golf-pwa/wrangler.jsonc`의 `name`과 같아야 한다. 같은 저장소에 연결된 Worker는 각자의 watch path에 포함된 변경에서만 빌드하도록 설정한다.

## 운동 메트로놈 PWA

| 목적 | 명령 | 주소 / 상태 |
| --- | --- | --- |
| Vite 개발 서버 | `pnpm.cmd dev:metronome` | `http://127.0.0.1:5181` |
| 프로덕션 빌드 미리보기 | `pnpm.cmd preview:metronome` | `http://127.0.0.1:4181` |
| Cloudflare Workers 로컬 미리보기 | `pnpm.cmd dev:cloudflare:metronome` | `http://localhost:8789`; 실제 workerd 실행은 미검증 |
| Cloudflare 직접 배포 | `pnpm.cmd deploy:cloudflare:metronome` | 사용자 승인·계정 인증 후에만 실행 |

기본 MVP는 실제 메트로놈 추 애니메이션, 실내·실외 선택과 공통 BPM 프리셋, 실외 운동 화면의 GPS 참고 속도, Web Audio 합성 비트와 선택형 진동을 제공한다. 실외 운동 화면에 들어가면 위치 권한을 요청하며 위치·속도는 서버에 전송하지 않는다. 재생 중에는 Screen Wake Lock을 요청해 화면 자동 꺼짐·어두워짐을 막고, 일시정지·초기화·운동 종료 시 해제한다. 시스템이 저전력·권한·브라우저 정책으로 잠금을 해제하거나 요청을 거부할 수 있어 화면에 상태를 표시한다. 일반 운동과 인터벌은 구간별 BPM을 계산하며 Web Audio로 20초 선행 예약한다. Media Session의 재생·일시정지 제어를 등록한다. 이는 화면 잠금·백그라운드 전환에서의 연속성을 높이기 위한 처리이며 OS·브라우저의 오디오 중단 또는 앱 종료를 막지는 못하므로 Android·iOS 실기기에서 별도 확인한다. iPhone Safari에서 화면 잠금 시 중단 제보가 있으며 잠금 재생은 보장하지 않는다. 워밍업·응원 MP3는 아직 구현하지 않았다.

메트로놈은 `모두의 비트` 이름으로 표시한다. 운동 준비 홈에서 환경·템포·목표 시간을 선택하고 하단 고정 버튼으로 시작한다. 인터벌은 펼침 영역에서 일반 운동·프리셋 2개·사용자 설정을 고른다. 직접 입력·박자·소리·진동·카운트인은 `세부 설정`을 펼쳐 조절한다. 운동 화면의 설정 버튼으로 돌아가면 일시정지한다. 홈의 이어하기는 남은 시간을 보존하고, 목표 시간과 인터벌 구성은 초기화 후 변경할 수 있다.

비트 소리는 `똑딱`·`비프`·`우드` 중 선택하며 선택하면 미리 들을 수 있다. 모두 Web Audio로 합성하고 로컬 설정에 저장한다. 기존 설정의 기본 소리는 `똑딱`이다.

인터벌에서는 세부 설정의 `구간 전환 호르라기`를 켤 수 있다. 기본값은 꺼짐이며, 비트 소리가 켜져 있을 때 빠른·회복 구간이 바뀌면 짧은 합성음을 낸다. 첫 구간 시작과 같은 구간에서의 재개에는 울리지 않는다.

실외 운동 화면은 추 왼쪽에 GPS 속도, 오른쪽에 현지 날씨 예보를 표시한다. 날씨는 사용자가 조회 버튼을 누른 뒤 MET Norway Locationforecast API에 대략적 좌표를 전송해 가져오며, GPS 속도·정밀 좌표는 전송하지 않는다. 예보 자료 출처와 CC BY 4.0 라이선스를 화면에 표시한다. 날씨 조회 실패나 위치 미수신은 별도 상태로 보여 준다.

목표 시간이 끝나면 완료 화면에서 환경·설정한 시간·템포 또는 인터벌 구성을 확인하고, 같은 설정으로 다시 시작하거나 홈에서 설정을 바꿀 수 있다. 전면 광고는 향후 토스 미니앱·하이브리드 앱에서 정상 완료 뒤에 검토하며 현재 PWA에는 연동하지 않았다.

메트로놈은 HUD·Golf와 별도 Cloudflare Worker(`mini-apps-workout-metronome`)로 배포하도록 준비했다. GitHub Workers Builds 연결 시 다음 값을 사용한다.

```text
Project name: mini-apps-workout-metronome
Production branch: main
Root directory: /
Build command: pnpm --filter @mini-apps/workout-metronome-pwa build
Deploy command: pnpm --filter @mini-apps/workout-metronome-pwa exec wrangler deploy --config wrangler.jsonc
Preview command: pnpm --filter @mini-apps/workout-metronome-pwa exec wrangler preview --config wrangler.jsonc
Build watch include paths: apps/workout-metronome-pwa/*, package.json, pnpm-lock.yaml, pnpm-workspace.yaml
```

대시보드 Worker 이름은 `apps/workout-metronome-pwa/wrangler.jsonc`의 `name`과 같아야 한다. `mini-apps-workout-metronome`의 GitHub Workers Builds production 연결은 완료됐으며, 공개 주소는 `https://mini-apps-workout-metronome.minotree0902.workers.dev`다. 커스텀 도메인·직접 배포·계정 변경은 사용자 승인 후에만 한다.

## GitHub 및 Cloudflare 자동 배포

현재 원격은 `origin`의 `https://github.com/minotree/mini-app.git`, 배포 브랜치는 `main`이다. HUD·Golf·메트로놈 Worker 모두 이 저장소에 연결되어 있다. 2026-11-03 사용자 제공 Cloudflare 설정 화면 기준, 세 Worker는 각자의 `apps/<app>/*`와 공통 `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`를 감시한다. 앱 폴더만 바뀐 `main` push는 해당 Worker만 빌드하고, 공통 패키지 파일이 바뀌면 세 Worker 모두 빌드한다. 이번 변경 파일을 모두 푸시하면 세 앱 폴더에 각각 변경이 있어 세 Worker 모두 빌드·배포 대상이다. `main` push 전에 변경 내용을 검사한다.

HUD와 메트로놈의 감시 경로는 사용자가 Cloudflare 대시보드에서 앱별 경로로 변경했고, 2026-11-03 제공한 설정 화면에서 위 값을 확인했다. 기존 Exclude paths는 유지됐다. Cloudflare OAuth 인증을 사용한 Builds API 호출은 HTTP 403을 반환했으므로 자동 재조회는 수행하지 못했다.

```powershell
# 변경 내용 확인
git status
git diff --check

# 변경을 검토한 뒤 커밋·푸시
git add <변경한-파일-또는-폴더>
git commit -m "feat: 변경 설명"
git push
```

현재 환경에서 Git이 `dubious ownership` 오류를 표시한다면 전역 설정을 바꾸지 않고 해당 명령에만 아래 접두사를 붙인다.

```powershell
git -c safe.directory=D:/DEV/mini-apps status
git -c safe.directory=D:/DEV/mini-apps add <변경한-파일-또는-폴더>
git -c safe.directory=D:/DEV/mini-apps commit -m "feat: 변경 설명"
git -c safe.directory=D:/DEV/mini-apps push
```

Cloudflare Workers Builds 설정값은 다음을 사용한다. 대시보드 Worker 이름은 `apps/hud-pwa/wrangler.jsonc`의 `name`과 같아야 한다.

```text
배포 브랜치: main
빌드 명령: pnpm --filter @mini-apps/hud-pwa build
배포 명령: pnpm --filter @mini-apps/hud-pwa exec wrangler deploy --config wrangler.jsonc
```

## 새 앱 또는 서버 추가 시

1. 앱 이름과 플랫폼을 확정하고 `apps/<이름>-pwa` 또는 해당 플랫폼 패키지를 만든다.
2. 포트가 필요한 서버는 기존 포트(5173 HUD Vite, 4173 HUD preview, 5180 Golf Vite, 4180 Golf preview, 5181 메트로놈 Vite, 4181 메트로놈 preview, 8787 HUD·8788 Golf·8789 메트로놈 Cloudflare local preview)와 충돌하지 않게 정한다.
3. 루트 `package.json`에 `dev:<앱>`처럼 대상을 드러내는 스크립트를 추가한다.
4. 이 문서의 표에 실행·미리보기·검사·배포 명령과 포트·검증 상태를 추가한다.
5. 해당 앱의 `AGENTS.md`와 `progress.md`에 플랫폼 상태·서비스 책임·실제 검증 결과를 기록하고, 루트 문서에는 공통 규칙 또는 전체 상태 변화만 반영한다.

