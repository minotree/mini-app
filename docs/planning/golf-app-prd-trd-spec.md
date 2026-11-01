# ⛳ 스마트폰 온디바이스 AI 골프 스윙 & 런치 분석 앱 명세서 (v9)
> **PRD, TRD, User Flow, MVP 표준 환경(평지 페어웨이 / 15℃ / 무풍) 규격화, 미래 필드 모드 로드맵 및 하이브리드 AI 개발 프롬프트 명세서**

## 현재 우선 구현 범위 — 런치 계산기 (2026-11-01)

이 절은 아래의 이전 전체 기획보다 우선한다. 골프 앱은 HUD 다음의 독립 PWA로 개발하며, 첫 구현은 **타구 영상을 분석해 클럽 헤드 속도·임팩트 각도·볼 스피드 등을 산출하고, 방향각과 비거리를 계산해 보여주는 런치 분석 기능**이다.

- 포함: 지면 거치 카메라 촬영, 타구·볼·클럽 헤드 자동 추적, 클럽 헤드 속도·임팩트 각도·볼 스피드·발사각·발사 방위각 산출, 클럽 선택(드라이버, 3/5/7 우드, 3/4/5 유틸, 4~9번 아이언, PW/AW/SW/LW 웨지), 표준 환경(평지 페어웨이·15℃·무풍) 가정, 방향각·캐리·토탈 비거리 추정, 결과와 신뢰도/가정/한계 표시.
- 사용자 흐름: 사용자는 클럽만 선택하고 앱의 카메라 배치·준비 안내에 따라 실제 스윙한다. 속도·각도·볼 데이터의 수치 입력이나 측정 시작을 위한 복잡한 조작은 요구하지 않는다.
- 카메라 배치: 초기 런치 분석의 모든 클럽은 **공 진행 방향의 측면에서 공과 임팩트 구간이 보이도록** 스마트폰을 고정한다.
- 측정 흐름: 앱은 타구 영상을 자동 분석해 필요한 값을 산출한다. 측정이 불충분하거나 신뢰도가 낮으면 결과를 확정값으로 표시하지 않고 재촬영·환경 점검을 안내한다.
- 계산 한계: 실제 발사 방위각·발사각·스핀을 영상에서 충분히 산출하지 못하면 방향각·비거리 추정 오차가 커진다. 실제 런치 모니터 수준의 정확도를 주장하지 않으며, 표준 환경 가정과 측정 신뢰도를 결과에 함께 표시한다.
- 포함 음성 안내: 테스트 단계에서는 카메라 배치·준비·스윙 시작 안내를 음성으로 제공하고 음소거·다시 듣기를 제공한다. 카메라가 자동으로 준비 상태를 판정하거나 타구 결과를 음성으로 읽는 기능은 측정 신뢰도 구현 후에 추가한다.
- 제외: 스윙 모션/포즈 분석, 골격 추적, 스윙 자세 피드백, 측면 거치 Mode B, 음성 자동 트리거, 자동 측정 결과 TTS, 퍼팅 분석, 사용자 프로필 동기화, 기상·지도·필드 모드.
- 카메라·하드웨어 조건: 카메라 프레임율·셔터·렌즈·거리와 타구 방향의 설정은 런치 측정 정확도를 위해 구현 단계에서 구체화한다. 지원하지 않는 기기에서는 지원 범위와 한계를 명시한다.

후속 단계는 스윙 모션 분석의 순서로 별도 확정한다. 이 문서의 Mode B, 골격/포즈 AI, 음성 UX, Supabase 관련 항목은 현재 구현 요구사항이 아니라 후보·후속 로드맵이다. Mode A의 타구·볼·클럽 헤드 영상 분석과 카메라 측정 조건은 현재 범위에 포함한다.

---

## 1. PRD (Product Requirement Document: 제품 요구사항 정의서)

### 1.1 제품 비전 및 목적
* **제품명 (가칭)**: SmartGolf Launch & Pose (스마트골프 런치 & 포즈)
* **비전**: 고가의 거치대나 전문 런치 모니터(TrackMan, GCQuad) 없이, **스마트폰 단 한 대만 지면/타석에 세워두고** 음성 가이드와 온디바이스 AI로 비거리, 구질, 스윙 폼, 퍼팅 롤을 즉시 피드백받는 차세대 스마트 골프 연습 보조 앱.
* **표준 단위계 적용**: 모든 거리, 속도, 질량, 공기 밀도 및 마찰 연산은 **SI 표준 단위계(m, m/s, kg, kg/m³)**를 엄격하게 적용하여 물리 연산 오차를 최소화함.
* **MVP 개발 단순화 및 명확한 전제 조건 적용**:
  * **MVP(초기 앱 버전)**: 스마트폰 센서 오차, 코스 지형/잔디 종류 측정 한계를 고려하여 **평지 페어웨이 지면($0^\circ$) 및 15℃ / 무풍(0 m/s)** 표준 환경을 기준으로 연산함.
  * **안내 문구 명확화**: UI 및 음성 안내로 *"평지 페어웨이 및 15℃ / 무풍 기준 비거리"*임을 명확히 제공하여 오해를 방지함.
  * **고도화 로드맵 (필드 모드)**: 누적된 골퍼의 클럽별 스윙 데이터 + 실시간 위치 기상 API(기온/풍속/풍향) + 스마트폰 전자 나침반(에이밍 방위각) 및 경사 센서를 결합하여 필드 전용 실시간 예상 비거리 제공 기능으로 연계함.

---

### 1.2 핵심 기능 요구사항 (Core Features)

#### [기능 1] 이중 분석 모드 (Dual Operation Modes)
* **Mode A: 지면 거치 (Launch Monitor Mode)**
  * **목적**: 볼 스피드(m/s), 발사각(°), 발사 방위각(°, 좌우 휨), 헤드 스피드(m/s), 정타율(Smash Factor), 최고 도달 높이 Apex(m), 퍼팅 롤 거리(m) 및 평지 페어웨이 캐리/토탈 비거리 추정.
  * **카메라 세팅**: 공의 진행 방향과 직각(90도) 측면 지면에 수직 세움. 초광각(0.5x) 렌즈 및 고속 셔터 제어.
* **Mode B: 측면 거치 (Swing Pose Analysis Mode)**
  * **목적**: 전신 관절 추적, 척추각 유지율, 머리 고정(Head Sway, m 단위 이동량), 어깨 회전각, 스윙 템포(백스윙:다운스윙 비율) 측정.
  * **카메라 세팅**: 골퍼 측후방 45도 방향, 스마트폰은 지면 수직 세움. 높이 1.0 m 내외 또는 바닥 초광각.

#### [기능 2] 계층형 클럽 선택 & 그린 스피드 마찰계수 UX
* **1차 메인 칩**: `[드라이버] [우드/유틸] [아이언 ▾] [웨지 ▾] [퍼터]`
* **2차 서브 칩 선택**:
  * **아이언**: `[ 4i | 5i | 6i | 7i (기본값) | 8i | 9i ]`
  * **웨지**: `[ PW (46°) | AW (50°) | SW (56°) | LW (60°) ]`
  * **퍼터 모드 서브 칩 (그린 스피드 마찰계수 $\mu$ 선택)**:
    * `[실내 매트 ($\mu=0.06$, Stimp 3.0 m)]` (기본값)
    * `[느린 그린 ($\mu=0.10$, Stimp 2.1 m)]`
    * `[보통 그린 ($\mu=0.08$, Stimp 2.7 m)]`
    * `[빠른 그린 ($\mu=0.05$, Stimp 3.4 m)]`

#### [기능 3] 카메라 하드웨어 진단 및 기종 호환성 가이던스 (Hardware Capability Check)
* **스마트폰 스펙 자동 진단**: 앱 첫 실행 시 카메라 최고 FPS(120/240), 0.5x 초광각 렌즈 탑재 여부, 수동 노출(Manual Exposure) 제어 가능 여부를 진단하여 맞춤형 설정 제공.

#### [기능 4] 표준 환경(평지 페어웨이 / 15℃ / 무풍) 비거리 제공 & 경사/코스 변수 안내 (MVP Scope)
* **평지 페어웨이 및 표준 기온/무풍 기준 수치해석**: 평지 페어웨이($0^\circ$, 표준 마찰계수 $\mu_{	ext{fairway}} pprox 0.12$), 공기 밀도 $ho_0 = 1.225 	ext{ kg/m}^3$ (15℃, 1013.25 hPa) 및 풍속 $0 	ext{ m/s}$ 표준 조건으로 볼 스피드, 발사각, 방위각 기반 정밀 비거리 산출.
* **경사/코스/기상 변수 안내 배너/디스플레이**: *"본 비거리는 평지 페어웨이 및 15℃ / 무풍 기준입니다. 코스 지형 경사(오르막/내리막), 잔디 상태(러프/페어웨이), 야외 기온 및 바람에 따라 실제 필드 비거리가 변동될 수 있습니다."* 안내 문구 노출.

#### [기능 5] 음성 기반 인터랙션 & 오토 트리거 (Hands-Free Voice UX)
* **자동 감지 (Auto-Trigger)**: 공 정지 포착(Mode A) 또는 1.5초간 어드레스 정지(Mode B) 시 오토 트리거 작동 + 마이크 타구음 서브 감지.
* **음성 브리핑 (TTS)**:
  * 준비 완료 시: 🔊 *"준비 되었습니다."* (시그널 알림음)
  * 일반 클럽 브리핑: 🔊 *"7번 아이언, 평지 페어웨이 기준 캐리 145 m, 토탈 150 m, 볼 스피드 48 m/s입니다."*
  * 퍼터 브리핑: 🔊 *"퍼팅 롤 거리 3.5 m, 페이스 각도 1도 열림입니다."*

#### [기능 6] 고도화 로드맵: 실제 필드 전용 예상 비거리 엔진 (Future Roadmap)
* **골퍼 스윙 프로필 누적**: 사용자의 클럽별 평균 볼 스피드, 발사각, 정타율 데이터 세션별 DB 저장.
* **필드 모드 융합 연산**: `누적 골퍼 프로필` + `지형 경사각` + `실시간 기상 API (기온, 풍속, 풍향)` + `스마트폰 전자 나침반 (에이밍 방위각)`을 조합하여 실전 필드 맞춤형 예상 캐리/비거리 제안.

---

## 2. TRD (Technical Requirement Document: 기술 요구사항 정의서)

### 2.1 표준 SI 단위계 적용 규격 (SI Unit Standards)

앱 내부의 모든 물리 엔진, 알고리즘, API 데이터 규격은 아래 표준 SI 단위를 엄격히 적용합니다:

| 물리량 (Quantity) | 표준 SI 단위 (Symbol) | 설명 및 앱 적용 기준 |
| :--- | :--- | :--- |
| **거리 / 위치 (Distance / Position)** | **미터 ($	ext{m}$)** | 공 이동 거리, 캐리, 높이, 롤 거리, Head Sway 이동량 ($1	ext{ mm} = 0.001	ext{ m}$) |
| **질량 (Mass)** | **킬로그램 ($	ext{kg}$)** | 골프공 표준 질량 $m = 0.0459	ext{ kg}$ ($45.9	ext{ g}$) 적용 |
| **속도 (Velocity / Speed)** | **미터 매 초 ($	ext{m/s}$)** | 볼 스피드, 헤드 스피드, 풍속 ($1	ext{ m/s} pprox 3.6	ext{ km/h}$) |
| **가속도 (Acceleration)** | **미터 매 초 제곱 ($	ext{m/s}^2$)** | 중력 가속도 $g = 9.81	ext{ m/s}^2$ |
| **공기 밀도 (Air Density)** | **킬로그램 매 세제곱미터 ($	ext{kg/m}^3$)** | 표준 공기 밀도 $ho_0 = 1.225	ext{ kg/m}^3$ ($15^\circ	ext{C}, 1013.25	ext{ hPa}$) |
| **힘 (Force)** | **뉴턴 ($	ext{N}$)** | 공기 저항력 $\mathbf{F}_d$, 마그누스 양력 $\mathbf{F}_l$ ($	ext{N} = 	ext{kg}\cdot	ext{m/s}^2$) |
| **그린/페어웨이 마찰** | **무차원 마찰계수 ($\mu$)** | 페어웨이 표준 구름 마찰계수 $\mu_{	ext{fairway}} pprox 0.12$ 적용 |

---

### 2.2 클럽별 물리 & 포즈 보정 파라미터 세부 기준표

| 클럽 종류 | 세부 선택 | 표준 발사각 | 목표 스매시 팩터 | 백스핀 범위 (RPM) | 주요 물리 / 분석 특성 (SI 단위) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **드라이버** | Driver | $10^\circ \sim 15^\circ$ | $1.45 \sim 1.50$ | $2,000 \sim 2,800$ | 평지 페어웨이 캐리/토탈 비거리(m), 발사 방위각($\phi$) |
| **우드/유틸** | Wood/Hybrid | $13^\circ \sim 18^\circ$ | $1.38 \sim 1.44$ | $3,000 \sim 4,000$ | 최고 도달 높이 Apex(m) 및 페어웨이 런 거리(m) 연산 |
| **아이언** | 4i ~ 6i | $14^\circ \sim 18^\circ$ | $1.33 \sim 1.38$ | $4,000 \sim 6,000$ | 롱아이언 캐리 및 토탈 비거리(m) |
| | 7i (Default) ~ 9i | $19^\circ \sim 24^\circ$ | $1.28 \sim 1.34$ | $6,000 \sim 8,000$ | 미들/숏아이언 캐리(m) 및 런 감쇄 연산 |
| **웨지** | PW (46°) | $25^\circ \sim 28^\circ$ | $1.22 \sim 1.25$ | $8,000 \sim 9,000$ | 피칭 갭 제어 및 풀스윙 캐리/토탈(m) |
| | AW (50°) / SW (56°) | $29^\circ \sim 34^\circ$ | $1.15 \sim 1.20$ | $9,000 \sim 10,500$ | 어프로치 캐리(m) 및 즉시 정지 |
| | LW (60°) | $35^\circ \sim 40^\circ$ | $1.05 \sim 1.12$ | $10,000+$ | 고발사각 롭샷 캐리(m) |
| **퍼터** | Putter | $2^\circ \sim 4^\circ$ | N/A | 순스핀 (Top Spin) | 초기 스키딩 구간 후 순스핀 롤 거리(m) 정밀 연산 |

---

### 2.3 MVP 평지 페어웨이 탄도학 수치해석 모델 (Ball Flight Physics Architecture)

#### [MVP 모드: 평지 페어웨이 지면($0^\circ$) & 표준 환경 4차 런게-쿠타 수치해석]
고속 프레임 픽셀 트래킹으로 산출한 초기 볼 스피드 $v_0	ext{ (m/s)}$, 발사각 $	heta	ext{ (rad)}$, 발사 방위각 $\phi	ext{ (rad)}$, 정타율(Smash Factor)을 입력으로 받아 평지 지면($z=0	ext{ m}$) 및 표준 공기 밀도 $ho_0 = 1.225	ext{ kg/m}^3$ 조건에서 런게-쿠타(RK4) 연산을 수행합니다:

$$egin{aligned}
m rac{d\mathbf{v}}{dt} &= -rac{1}{2} ho_0 A C_d |\mathbf{v}| \mathbf{v} + rac{1}{2} ho_0 A C_l |\mathbf{v}|^2 (\hat{oldsymbol{\omega}} 	imes \hat{\mathbf{v}}) + m\mathbf{g}
\end{aligned}$$

1. **캐리 비거리 ($d_{	ext{carry}}$)**: 공이 공중을 비행하여 평지 지면에 첫 접촉하는 지점까지의 직선거리 (m).
2. **페어웨이 런 거리 ($d_{	ext{run}}$)**: 착지 각도(Landing Angle $	heta_L$), 착지 속도, 스핀 감쇄율 및 페어웨이 잔디 수평/구름 마찰계수($\mu_{	ext{fairway}} pprox 0.12$)를 적용한 미끄러짐/굴림 거리 (m).
3. **토탈 비거리 ($d_{	ext{total}}$)**: $d_{	ext{total}} = d_{	ext{carry}} + d_{	ext{run}} \quad [	ext{m}]$

---

## 3. User Flow (사용자 흐름도)

```
[시작] 앱 실행 & 카메라 HW 호환성 자동 진단 (FPS, 초광각 렌즈, 수동 노출 확인)
  │
  ▼
[메인 화면] 모드 및 클럽 선택
  ├─ 모드 선택: (A) 지면 거치 (볼 궤적/런치) vs (B) 측면 거치 (스윙 분석)
  └─ 클럽 선택: [드라이버] [우드/유틸] [아이언 ▾] [웨지 ▾] [퍼터]
       ├─ 안내 표시: "💡 비거리는 평지 페어웨이 및 15℃/무풍 표준 조건 기준입니다."
       └─ 퍼터 선택 시: 그린 스피드 마찰계수 [매트|느림|보통|빠름] 원터치 조절
  │
  ▼
[카메라 프레임] 수직 평형 센서 확인 (IMU Check & LED 플래시 자동 제어)
  │
  ▼
[AI 오토 트리거 대기]
  ├─ Mode A: 공 포착 + 정지 감지 (퍼터: 공과 퍼터 헤드 정지)
  └─ Mode B: 어드레스 자세 1.5초 정지 감지 (타구음 감지 모듈 작동)
  │
  ▼
[음성 안내] 🔊 "준비 되었습니다." (알림 삐소리 + TTS)
  │
  ▼
[스윙/퍼팅 실행 & 고속 촬영] 240fps 캐시 버퍼에 고속 저장
  │
  ▼
[온디바이스 AI 물리 엔진 연산]
  ├─ 일반 클럽: 볼스피드, 발사각, 방위각, 스매시팩터 ➔ 평지 페어웨이 캐리/토탈 비거리 & Apex 계산
  └─ 퍼터 모드: 롤 거리, 헤드 임팩트 페이스 각도, 스트로크 템포 계산
  │
  ▼
[음성 브리핑] 🔊 "7번 아이언, 평지 페어웨이 기준 캐리 145미터, 토탈 150미터입니다."
  │
  ▼
[결과 화면 Display] 궤적/스켈레톤 오버레이 리플레이 + "평지 페어웨이 및 15℃/무풍 기준" 안내 문구 + Supabase 동기화
```

---

## 4. Prompt Design for AI Developer (Aider + Qwen2.5-Coder 16B + Gemini)

### 4.1 `.aider.conf.yml`
```yaml
model: ollama/qwen2.5-coder:16b
edit-format: diff
auto-commits: true
git: true
encoding: utf-8
architect: true
```

---

### 4.2 모듈별 Step-by-Step Aider 코딩 프롬프트

#### [프롬프트 1] 계층형 클럽 선택 UI (`ClubSelector.tsx`)
> `aider src/components/ClubSelector.tsx`
```text
Create a hierarchical club selector component `ClubSelector.tsx` using Ionic React Chips:
1. Primary categories: Driver, Wood/Hybrid, Iron, Wedge, Putter.
2. Sub-chip expandable drawer:
   - Iron: 4i, 5i, 6i, 7i (default), 8i, 9i.
   - Wedge: PW (46 deg), AW (50 deg), SW (56 deg), LW (60 deg).
   - Putter: Green speed friction chips [Mat (0.06), Slow (0.10), Normal (0.08), Fast (0.05)].
3. Display clear disclaimer notice banner: "Calculations based on Flat Fairway / 15C / Calm Wind standard."
```

#### [프롬프트 2] MVP 평지 페어웨이 탄도학 & 퍼터 롤 물리 엔진 (`physicsEngine.ts`)
> `aider src/utils/physicsEngine.ts`
```text
Implement `physicsEngine.ts` using SI units (m, m/s, kg):
1. Function `calculateLaunchParameters`: computes Ball Speed (m/s), Launch Angle (deg), Launch Azimuth (deg), and Smash Factor from 240 FPS ball coordinates.
2. Function `simulateTrajectory`: runs RK4 numerical integration under flat ground (0 deg incline), standard air density rho = 1.225 kg/m3 and zero wind vector. Calculates Carry Distance (m) and Fairway Roll Distance (m) using fairway friction mu = 0.12.
3. Function `calculatePutterRoll`: computes total roll distance (m) based on initial ball speed v0 (m/s) and green friction coefficient mu.
4. Returns carry distance (m), total distance (m), apex (m), offline distance (m), and 3D trajectory array.
```

#### [프롬프트 3] 핸즈프리 음성 브리핑 엔진 (`useVoiceStateEngine.ts`)
> `aider src/hooks/useVoiceStateEngine.ts`
```text
Update `useVoiceStateEngine.ts`:
1. Format TTS speech string to announce Club Name, Flat Fairway Carry Distance (m), Total Distance (m), and Ball Speed (m/s).
2. Example speech: "7번 아이언, 평지 페어웨이 기준 캐리 145미터, 토탈 150미터입니다."
3. If Putter mode: "퍼팅 롤 거리 3.5미터, 페이스 각도 1도 열림입니다."
```
