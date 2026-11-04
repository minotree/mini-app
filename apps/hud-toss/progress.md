# HUD 토스 미니앱 진행표

## 현재 상태 (2026-11-04)

- HUD PWA의 안전 고지·속도 표시·설정 흐름을 독립 React/Toss 패키지로 옮겼다. PWA 소스에 대한 경계 밖 import는 없다.
- 토스 SDK `Device.subscribeLocation`으로 연속 위치 좌표를 받아 이동 거리와 시간으로 GPS 참고 속도를 추정한다. 좌표 정확도가 50m를 넘거나 시간 간격이 2~30초 밖이거나 속도가 비정상적이면 속도를 표시하지 않는다. 위치 좌표는 서버로 보내지 않는다.
- 10km/h 미만의 설정 영역에 `HUD 사용 종료`를 추가했다. 종료하면 HUD 화면을 벗어나 위치 구독 정리가 실행되고, 종료 화면에서 같은 설정으로 다시 시작하거나 안전 안내를 다시 볼 수 있다. 향후 전면 광고는 이 종료 전환에서 세션당 최대 1회만 검토하며 운영 광고 ID가 없어 현재 광고 호출은 구현하지 않았다.
- 안전 고지 확인 뒤 [토스 공식 권한 요청 API](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/permissions/requestpermission)로 위치 권한을 요청하고 허용된 경우에만 [위치 구독 API](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/device/device.subscribelocation)를 시작한다. 구독 해제 함수를 화면 정리 때 호출한다(2026-11-04 확인).
- `moduihud`는 아직 콘솔 appName 확인 전 임시값이다. 실제 콘솔 등록값으로 교체하기 전에는 업로드하지 않는다.
- PowerShell 토스 콘솔 업로드 절차를 문서화했다. 앱 폴더에서 `npx ait token add`로 최초 인증하고, 실제 appName·최신 `.ait` 확인과 사용자 명시 승인 뒤 `npx ait deploy`를 실행한다. 문서만 추가했으며 실제 인증·업로드는 수행하지 않았다.
- `pnpm.cmd --filter @mini-apps/hud-toss typecheck`, `test`(5개), `build`를 실행해 통과했다. `pnpm.cmd install --frozen-lockfile --offline`도 새 패키지를 포함한 6개 workspace 대상으로 통과했다. 개발 서버 `http://127.0.0.1:5183/`는 HTTP 200을 반환했다. Devtools 화면 조작과 `.ait` 생성은 아직 미실행이며 `.ait`는 appName 확정 뒤 생성한다.
- 브라우저 Devtools 조작, iPhone/Android 토스 실기기 GPS·권한 거부·정차/이동·화면 회전·반사·차량 거치, 콘솔 업로드·검수·출시는 미검증이다. 운전 중 조작 금지 문구의 법률 검토도 출시 전 필요하다.

## 다음 작업

- 실제 콘솔 appName과 위치 권한 구성을 확인하고 실기기에서 속도·안전 잠금·설정 저장을 검증한다.
