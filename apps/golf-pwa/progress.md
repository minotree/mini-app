# Golf PWA 진행표

## 현재 상태 (2026-11-03)

- 구현: 독립 React/Vite PWA에 세부 클럽 선택, 카메라 권한·미리보기 연결 및 오류 복구, 측면 카메라 안내, 선택형 Web Speech API 준비 안내, 런치 계산 규칙과 단위 검사를 구현했다.
- 배포: 2026-11-03 사용자 제공 Cloudflare 대시보드 화면에서 `mini-apps-golf` Worker의 GitHub 저장소 연결과 배포 이력, 공개 주소 `https://mini-apps-golf.minotree0902.workers.dev`를 확인했다. Build watch include paths는 `apps/golf-pwa/*`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`이다. 실제 URL의 PWA·카메라 동작은 확인하지 않았다.
- 최근 자동 검증: 기존 변경에서 단위 검사(4개)·타입 검사·PWA 빌드·`git diff --check`, Static Assets dry-run을 통과했다. 이번 문서 구조 변경에서는 코드를 변경하지 않아 재실행하지 않았다.

## 미검증 및 다음 작업

- 실제 휴대폰에서 카메라 권한과 미리보기 재생, 한국어 음성·음소거·재생 정책을 확인한다.
- 타구·볼·클럽 헤드 자동 추적과 카메라 보정 설계·구현, 신뢰도 기준, 실제 타구 데이터 검증을 진행한다.
- 공개 URL의 PWA·카메라 동작을 확인한다.

## 이력 요약

- 2026-11-03: 사용자 제공 Cloudflare 대시보드 화면으로 Golf Worker의 GitHub 연결·배포 이력과 공개 주소를 확인하고 오래된 미배포 기록을 정정했다.
- 2026-11-01: 런치 분석 우선 범위를 확정하고 Golf PWA 기본 구조·클럽 선택·카메라 미리보기·런치 계산 규칙을 추가했다.
- 2026-11-01: 카메라 배치 안내를 통일하고 Web Speech API 준비 안내를 추가했다. 조건부 `video` 요소 생성 뒤 스트림을 연결하도록 수정해 미리보기 실패를 복구했다.
- 2026-11-01: Cloudflare Static Assets 설정과 로컬 dry-run을 준비했다. 분리 전의 상세 기록은 루트 [progress.md](../../progress.md)에 보존한다.
