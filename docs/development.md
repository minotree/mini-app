# 개발·실행·Git 명령어

이 문서는 `mini-apps`의 실제 실행 명령을 모은 기준 문서다. 앱이나 서버를 추가·제거하거나 포트·배포 흐름이 바뀌면 같은 변경에서 이 문서, 루트 `package.json` 스크립트, `AGENTS.md`, `progress.md`를 함께 갱신한다.

## 공통

```powershell
cd D:\DEV\mini-apps

# lockfile 기준 의존성 설치
pnpm.cmd install --frozen-lockfile

# 모든 구현된 앱의 단위 검사·타입 검사·프로덕션 빌드
pnpm.cmd test
pnpm.cmd typecheck
pnpm.cmd build
```

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

Golf는 HUD와 별도 Cloudflare Worker(`mini-apps-golf`)로 배포한다. GitHub `main` 자동 배포 연결 시 대시보드에서 다음 값을 사용한다.

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

기본 MVP는 실제 메트로놈 추 애니메이션, 러닝·사이클 템포 프리셋, Web Audio 합성 비트와 선택형 진동을 제공한다. 워밍업·인터벌·응원 MP3는 아직 구현하지 않았다.

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

대시보드 Worker 이름은 `apps/workout-metronome-pwa/wrangler.jsonc`의 `name`과 같아야 한다. Cloudflare 계정 연결, Worker 생성, GitHub 연결과 배포는 아직 하지 않았다.

## GitHub 및 Cloudflare 자동 배포

현재 원격은 `origin`의 `https://github.com/minotree/mini-app.git`, 배포 브랜치는 `main`이다. Cloudflare Workers Builds가 이 저장소의 `main`에 연결되어 있으므로, `main`에 push하면 Cloudflare가 빌드·배포한다. `main` push는 production 배포를 유발하므로, 변경 내용을 검사한 뒤에만 실행한다.

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
5. `AGENTS.md`와 `progress.md`에 플랫폼 상태·서비스 책임·실제 검증 결과를 기록한다.

