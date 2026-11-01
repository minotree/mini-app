# 🚗 스마트폰 HUD 앱 통합 기획 및 개발 명세서 v3 (PRD / TRD / User Flow / Prompt Design / Legal)

> **v3 주요 개정 및 추가 사항**:
> 1. **법적 책임 및 리스크 방어 방안 (Legal Liability & Risk Mitigation)** 명세 추가:
>    - 대시보드 미고정 스마트폰 이탈 사고 시 **운전자 법적 책임(도로교통법, 민사 손해배상, 형사 책임)** 분석 명시
>    - **개발자 법적 면책 및 리스크 차단 3단계 방어 체계** (면책 동의 약관, 안전 거치 가이드, 주행 중 조작 잠금) 반영
> 2. **GPS 감도 최적화 및 신호 보정 파이프라인**: Kalman Filter / EMA, 저속 Cut-off(3km/h), 센서 융합
> 3. **차체 전파 차폐(A-Pillar) 대응 거치 가이드**: 대시보드 중앙 거치 및 GPS 안테나(스마트폰 상단) 방향 최적화
> 4. **화면 회전 강제 고정 (Orientation Lock)**: 대시보드 진동에 의한 화면 튐(180도 뒤집힘) 차단 및 좌/우 핸들 모드 지원

---

## 1. PRD (Product Requirement Document)

### 1.1 제품 개요
* **제품명**: 스마트폰 기반 모바일 HUD (Head-Up Display)
* **핵심 가치**: 운전 중 시선 이동을 최소화하여 안전성을 극대화하고, 차량 전면 유리에 최적화된 고대비 네온 그래픽, 실시간 도로 제한속도, 전방 단속 카메라 정보, GPS 수신 감도 최적화 거치 가이드 및 법적 면책 방어 체계를 갖춘 멀티플랫폼 HUD 서비스.
* **배포 형태**: `pnpm workspace` 모노레포 기반 **PWA ➔ 토스 미니앱 ➔ 하이브리드 앱(Capacitor)** 순차 출시.

### 1.2 타겟 사용자 및 페르소나
* **타겟**: 야간 주행이 많거나, 차량 내 순정 HUD가 없지만 실시간 속도 및 전방 속도 단속 카메라 정보를 전면 유리에 투영하고 싶은 운전자.
* **주요 사용 시나리오**: 대시보드 중앙에 스마트폰을 안전하게 거치하고, 면책 동의 및 운전석 위치(좌/우 핸들)에 맞춰 화면 회전을 고정한 후, 반사 모드(Mirror Mode)로 전환하여 전면 유리에서 주행 정보 확인.

### 1.3 핵심 기능 명세 (Feature Matrix)

| 기능 ID | 기능명 | 상세 요구사항 | 우선순위 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **F-1.1** | 실시간 주행 속도 | GPS 기반 m/s ➔ km/h 변환, Kalman Filter/EMA 보정, 3km/h 미만 Cut-off | P0 (Must) | PWA/토스/Capacitor 공통 |
| **F-1.2** | 현재 도로 제한 속도 | 차량 좌표 기반 V-World 도로 링크 조회 및 제한속도(예: 60, 80km/h) 표시 | P0 (Must) | V-World OpenAPI 연동 |
| **F-1.3** | 전방 단속 카메라 | 주행 방향(Heading) 전방 1km 이내 카메라 탐색 및 남은 거리(m) 실시간 연산 | P0 (Must) | 하버사인 공식 활용 |
| **F-1.4** | 카메라 유형 구분 | 전면 번호판 단속 vs 후면/이륜차 번호판 단속 카메라 시각적 구분 | P1 (High) | 텍스트/아이콘 구분 |
| **F-2.1** | 글자 색상 변경 | HUD 가시성에 최적화된 고대비 네온 컬러(Green, Cyan, Yellow, Red) 선택 | P0 (Must) | CSS Variables |
| **F-2.2** | 글자 크기/두께 변경 | 속도 및 단속 정보 텍스트의 크기(Font Size) 및 두께(Font Weight) 조절 | P0 (Must) | 컨트롤 패널 지원 |
| **F-2.3** | HUD 반사(Mirror) 모드 | 차량 전면 유리 반사 투영을 위한 좌우 반전 (`transform: scaleX(-1)`) 기능 | P0 (Must) | 토글 버튼 |
| **F-2.4** | 화면 꺼짐 방지 | 주행 중 스마트폰 화면이 꺼지지 않도록 Wake Lock 설정 | P0 (Must) | Web Wake Lock / Native |
| **F-3.1** | 화면 회전 강제 고정 | `landscape-primary`, `landscape-secondary`, `portrait-primary` 강제 고정 | P0 (Must) | Screen Orientation Lock |
| **F-3.2** | 거치 방향 안내 UI | 좌/우 핸들 및 가로/세로 거치 시 GPS 안테나 방향 최적화 가이드 제공 | P0 (Must) | 온보딩/설정 화면 |
| **F-4.1** | 면책 동의 약관 모달 | 앱 최초 진입 및 주행 전 운전자 거치 의무 및 법적 책임 안내/동의 | P0 (Must) | Disclaimer Modal |
| **F-4.2** | 주행 중 조작 잠금 | 차량 속도 10km/h 이상 시 설정 패널 조작 제한으로 운전자 시선 분산 방지 | P1 (High) | Drive Safety Lockout |

### 1.4 차량 내 거치 및 GPS 안테나 최적화 정책

```
[차량 대시보드 거치 배치도]

         [ 전 면 유 리 창 (Windshield) - 개활지 ]
   ──────────────────────────────────────────────────
   [A필러(차폐)]    (스마트폰 거치 위치: 대시보드 중앙)     [A필러(차폐)]
        │                                              │
        │      ┌───────────────────────────────┐       │
        │      │   [스마트폰 상단: GPS안테나]   │       │
        │      │   ─────────────────────────   │       │
        │      └───────────────────────────────┘       │
        │                   ▲                          │
        │            (차량 중앙 향함)                  │
        │                                              │
    [좌핸들 운전석]                              [조수석]
```

1. **거치 위치**: 문 쪽 A필러(차체 금속 기둥) 근처는 전파 차폐 및 반사파 간섭이 크므로 **대시보드 중앙 부근** 거치를 기본 권장.
2. **가로 모드 (Landscape)**:
   * **좌핸들 차량 (LHD)**: `landscape-primary` 고정 ➔ 스마트폰 상단(GPS 안테나)이 **우측(차량 중앙)**을 향함.
   * **우핸들 차량 (RHD)**: `landscape-secondary` 고정 ➔ 스마트폰 상단(GPS 안테나)이 **좌측(차량 중앙)**을 향함.
3. **세로 모드 (Portrait)**:
   * `portrait-primary` 고정 ➔ 스마트폰 상단(GPS 안테나)이 **전면 유리창(차량 밖 하늘)**을 향하고, 하단 충전 단자가 운전자 방향으로 위치함.

### 1.5 스마트폰 이탈 사고 시 법적 책임 및 개발자 면책 방어 체계 (Legal Policy)

#### 1) 운전자의 법적 책임 분석
* **도로교통법상 주의의무 위반**:
  * 대시보드 위 미고정 물품 배치는 **도로교통법 제39조(승차 및 적재 제한 / 시야 방해 물건 배치 금지)** 및 **제48조(안전운전 의무)** 위반으로 범칙금/과태료 부과 대상이 될 수 있음.
* **민사상 손해배상 책임**:
  * 급정거·충돌 시 스마트폰이 튕겨 나가 동승자나 타인을 타격하여 상해를 입히거나 타인의 기기가 파손된 경우, **민법 제750조(불법행위)** 및 **자동차손해배상 보장법 제3조**에 따라 운전자에게 손해배상 의무가 발생함.
* **형사상 과실 책임**:
  * 이탈한 기기 부상 사고 발생 시 **형법 제268조(업무상과실치상죄)** 및 **교통사고처리 특례법**에 따라 과실 책임을 질 수 있음.

#### 2) 개발자의 법적 책임 및 3단계 방어 체계 (Developer Risk Defense)
* **법적 책임 미성립 원인**:
  * 기기 낙하·파손·상해의 직접 원인은 스마트폰을 물리적으로 고정하지 않은 **운전자의 관리 과실**에 있으며, 소프트웨어 자체와 사고 간의 직접적 인과관계가 성립하지 않음. 또한 소프트웨어는 비물질적 서비스이므로 제조물책임법(PL법)의 물리적 결함 책임을 직접 적용하기 어려움.
* **개발자 3단계 방어 체계**:
  1. **면책 동의 약관 (Disclaimer Modal - `F-4.1`)**:
     - *"본 앱은 운전 참고용 보조 도구입니다. 스마트폰의 물리적 고정 및 안전운전 의무 책임은 전적으로 운전자 본인에게 있습니다."* 약관 필수 동의 후 앱 진입.
  2. **안전 거치 가이드 표출 (Mounting Guide - `F-3.2`)**:
     - 주행 시작 전 안전 거치 그래픽 가이드를 보여줌으로써 개발자의 주의의무 안내를 입증.
  3. **주행 중 조작 잠금 (Drive Safety Lockout - `F-4.2`)**:
     - 차량 속도 10km/h 초과 시 설정 변경 화면 접근을 잠궈 운전자 시선 분산 방지 및 안전성 확보.

### 1.6 단계별 출시 로드맵 (Release Roadmap)
1. **Phase 1 (PWA)**: Vite + Ionic React + Vercel 환경에서 웹 기반 HUD 핵심 기능, 면책 동의 모달 및 Screen Orientation API 제어 검증.
2. **Phase 2 (토스 미니앱)**: Granite SDK 기반 토스 미니앱 연동, 위치/화면 유지 브릿지 연동.
3. **Phase 3 (하이브리드 앱)**: Capacitor 기반 iOS/Android 네이티브 패키징, 고주파수(5Hz) GPS 및 센서 융합 처리.

---

## 2. TRD (Technical Requirement Document)

### 2.1 시스템 아키텍처 (pnpm workspace)

```text
hud-monorepo/
├── pnpm-workspace.yaml
├── package.json
├── packages/
│   ├── core/                  # [순수 TS/React Hook] GPS, V-World, 카메라 연산, Zustand 설정
│   │   ├── src/
│   │   │   ├── hooks/         # useGps, useVworldRoad, useCameraAlert, useHudSettings, useOrientationLock, useDriveSafety
│   │   │   ├── utils/         # haversine.ts, kalmanFilter.ts, headingFilter.ts
│   │   │   └── types/         # location, camera, settings, orientation, legal 타입 정의
│   └── ui/                    # [공통 UI Component] Ionic React 기반 HUD 디스플레이 및 설정
│       ├── src/
│       │   ├── components/    # HudDisplay, HudControlPanel, MountingGuideModal, DisclaimerModal, SpeedGauge
│       │   └── styles/        # hud-theme.css (Neon High-Contrast variables)
└── apps/
    ├── pwa/                   # [Phase 1] Vite + Ionic React + Vercel Deployment
    ├── toss-miniapp/          # [Phase 2] Granite SDK + Toss Bridge Adapter
    └── hybrid-app/            # [Phase 3] Capacitor Android/iOS Native Wrapper
```

### 2.2 모듈 및 인터페이스 설계 (`packages/core`)

#### ① `useGps()` Hook
* **역할**: 스마트폰 위치 센서에서 실시간 위도, 경도, 방위각(heading), 속도(speed) 수집 및 정밀 보정.
* **보정 파이프라인**:
  1. `enableHighAccuracy: true`, `maximumAge: 0`, `timeout: 3000` 설정.
  2. **Kalman Filter / EMA**: 노이즈 제거 및 수치 스무딩.
  3. **Low Speed Cut-off**: 3km/h 미만 시 0km/h 고정.
* **반환값**: `{ location: { lat, lng, speedKmh, heading, accuracy }, isGpsActive, error }`

#### ② `useVworldRoad()` Hook
* **역할**: V-World API 및 공간검색 API를 연동하여 현재 좌표의 도로 속성 조회.
* **반환값**: `{ roadName: string, speedLimit: number | null, isLoading: boolean }`

#### ③ `useCameraAlert()` Hook
* **역할**: 경찰청/공공데이터포털 단속카메라 DB 기반 전방 1km 단속 카메라 필터링.
* **반환값**: `{ nearestCamera: { distanceMeters: number, limitSpeed: number, type: 'FRONT' | 'REAR' } | null }`

#### ④ `useHudSettings()` State (Zustand)
* **역할**: HUD 디스플레이 스타일, 미러링, 거치 방향, 회전 고정 및 면책 약관 동의 상태 관리.
* **상태 구조**:
  ```ts
  interface HudSettings {
    fontColor: string;           # 네온 컬러 헥사코드 (#00FF00, #00FFFF 등)
    fontSizeRatio: number;       # 폰트 스케일 비율
    fontWeight: number;          # 폰트 두께 (400, 700, 900)
    isMirrorMode: boolean;       # 좌우 반전 미러링 여부
    orientationMode: 'landscape' | 'portrait'; # 화면 가로/세로 선호
    drivingPosition: 'LHD' | 'RHD';            # 운전석 위치 (좌/우 핸들)
    hasAgreedDisclaimer: boolean;              # 법적 면책 동의 여부
    
    // Actions
    setFontColor: (color: string) => void;
    setMirrorMode: (isMirror: boolean) => void;
    setOrientationMode: (mode: 'landscape' | 'portrait') => void;
    setDrivingPosition: (pos: 'LHD' | 'RHD') => void;
    setAgreeDisclaimer: (agreed: boolean) => void;
  }
  ```

#### ⑤ `useOrientationLock()` Hook
* **역할**: `orientationMode`와 `drivingPosition` 설정값에 따라 화면 회전을 강제로 고정(Lock).

#### ⑥ `useDriveSafety()` Hook
* **역할**: 주행 속도(speedKmh >= 10km/h) 감지 시 설정 컨트롤 패널 접근을 잠궈(`isLockout: true`) 운전자 주의 분산 방지.

### 2.3 타겟 플랫폼별 브릿지(Bridge) 구현 전략

| 구분 | PWA (`apps/pwa`) | 토스 미니앱 (`apps/toss-miniapp`) | 하이브리드 앱 (`apps/hybrid-app`) |
| :--- | :--- | :--- | :--- |
| **GPS 수집** | Navigator `geolocation.watchPosition` | 토스 브릿지 `getLocation` API | `@capacitor/geolocation` (5Hz 수신) |
| **화면 유지** | Navigator `wakeLock.request('screen')` | 토스 브릿지 `keepScreenOn` API | `@capacitor-community/keep-awake` |
| **화면 회전 고정** | `screen.orientation.lock()` | Granite SDK 회전 제어 API | `@capacitor/screen-orientation` |
| **배포/실행** | Vercel Edge Network | 토스 앱 내 Granite 프레임워크 | Google Play / Apple App Store |

---

## 3. User Flow (사용자 흐름도)

```text
[앱 최초 실행 / PWA 진입]
       │
       ▼
[법적 면책 동의 모달 (DisclaimerModal)] ── (동의 거부) ➔ [앱 종료 / 사용 불가]
       │ (동의 완료)
       ▼
[위치 및 화면 회전 권한 확인] ──── (권한 거부) ➔ [권한 요청 안내 모달]
       │ (권한 허용)
       ▼
[거치 모드 온보딩 / 설정]
  ├── ① 화면 방향 선택: [가로 모드 (권장)] vs [세로 모드]
  └── ② 운전석 위치 선택: [좌핸들 (LHD)] vs [우핸들 (RHD)]
       │
       ▼
[스마트폰 거치 안내 그래픽 표시 (MountingGuideModal) & Screen Orientation Lock]
  ├── 가로+좌핸들: landscape-primary 고정 (상단 우측 향함)
  ├── 가로+우핸들: landscape-secondary 고정 (상단 좌측 향함)
  └── 세로 모드 : portrait-primary 고정 (상단 유리창 향함)
       │
       ▼
[GPS 수신 및 V-World API 연결 (Kalman Filter 가동)]
       │
       ├─────────────────────────────────────────┐
       ▼                                         ▼
[일반 주행 모드 (Normal View)]             [HUD 반사 모드 (Mirror View)]
 ㆍ정방향 고대비 그래픽                      ㆍscaleX(-1) 좌우 반전 처리
 ㆍ속도/제한속도/카메라 거리                 ㆍ전면 유리 투영 최적화
       │                                         │
       └────────────────────┬────────────────────┘
                            │
                            ▼
               [HUD 스타일 & 거치 커스텀 패널]
                ㆍ speedKmh >= 10km/h 시 조작 잠금 모달 표출
                ㆍ 정차 시 글자 색상/크기/두께/거치모드 재설정
                            │
                            ▼
                 [설정값 Zustand/Storage 저장]
```

---

## 4. Prompt Design (AI 개발 보조용 프롬프트 명세)

### 4.1 Prompt #1: 모노레포 환경 및 패키지 뼈대 생성
```text
Role: Senior Frontend Engineer & Monorepo Specialist
Task: pnpm workspace 기반의 HUD 앱 모노레포 뼈대를 구축해주세요.

[프로젝트 구조]
- pnpm-workspace.yaml
- packages/core (TS/React 공통 로직, Zustand, Hooks)
- packages/ui (Ionic React 기반 공통 HUD 컴포넌트)
- apps/pwa (Vite + Ionic React + PWA 설정)

[요구사항]
1. Root package.json 및 pnpm-workspace.yaml 작성
2. packages/core의 package.json, tsconfig.json 구성 (React, Zustand, Typescript)
3. packages/ui의 package.json 구성 (Ionic React, @hud/core 의존성 연결)
4. apps/pwa의 package.json 구성 (@hud/core, @hud/ui 의존성 연결 및 Vite 설정)
```

### 4.2 Prompt #2: `@hud/core` 비즈니스 로직 구현 (면책 약관 및 안전 잠금 포함)
```text
Role: React Core Logic Developer
Task: packages/core 패키지에 HUD 모바일 앱에 필요한 핵심 Custom Hooks를 작성해주세요.

[작성할 파일]
1. src/hooks/useGps.ts: Geolocation API 기반 위치/속도(km/h)/방위각 수집, Kalman Filter 및 3km/h 미만 Cut-off
2. src/hooks/useVworldRoad.ts: V-World API 연동 도로 제한속도(speedLimit) 및 도로명 반환
3. src/hooks/useCameraAlert.ts: 하버사인 연산 전방 1km 카메라 거리 계산 및 전/후면 구분
4. src/hooks/useHudSettings.ts: Zustand 기반 fontColor, fontSize, fontWeight, isMirrorMode, orientationMode, drivingPosition, hasAgreedDisclaimer 상태 및 localStorage 저장
5. src/hooks/useOrientationLock.ts: useHudSettings 기반 Screen Orientation API 강제 고정
6. src/hooks/useDriveSafety.ts: 주행 속도(speedKmh >= 10km/h) 시 컨트롤 패널 조작 잠금(isLockout) 상태 반환

TypeScript 타입을 엄격히 적용하고 에러 핸들링 코드를 포함해주세요.
```

### 4.3 Prompt #3: `@hud/ui` Ionic React HUD 컴포넌트 및 법적 약관/가이드 모달 구현
```text
Role: UI/UX Frontend Specialist
Task: packages/ui 패키지에 고대비 HUD 디스플레이, 면책 약관 모달, 거치 가이드 모달, 설정 패널 컴포넌트를 구현해주세요.

[요구사항]
1. HudDisplay.tsx: 현재 속도, 제한 속도, 단속 카메라 거리, 미러링(`scaleX(-1)`) 적용
2. DisclaimerModal.tsx: 앱 진입 전 운전자 거치 책임 및 안전운전 의무 법적 면책 동의 약관 모달
3. MountingGuideModal.tsx: 좌/우 핸들 및 가로/세로 거치 시 스마트폰 상단(GPS 안테나) 방향 안내 그래픽 모달
4. HudControlPanel.tsx: Ionic React 기반 커스텀 패널 (useDriveSafety의 isLockout이 true일 경우 주행 중 조작 방지 경고 모달 표출)
```

### 4.4 Prompt #4: `apps/pwa` 앱 완성 및 Vercel 배포 설정
```text
Role: PWA & Deployment Engineer
Task: apps/pwa 디렉토리에 Vite 기반 Ionic React PWA 애플리케이션을 완성해주세요.

[요구사항]
1. src/App.tsx에서 @hud/core의 hooks와 @hud/ui의 DisclaimerModal, HudDisplay, MountingGuideModal, HudControlPanel 연결
2. Web Wake Lock API 및 Screen Orientation Lock 연동
3. vite-plugin-pwa 및 vercel.json 설정 파일 생성
```
