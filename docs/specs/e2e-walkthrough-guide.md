# 4대 원칙 E2E 데모 시연 시나리오 및 핸즈온 가이드 (Demo Walkthrough Script)

> **상위 이슈**: [#7 [Map] Next.js 16 서버 컴포넌트 에러 처리 최소 기능 데모 앱 기획](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/7)  
> **해당 티켓**: [#13 [종합] 4대 원칙 E2E 데모 시연 시나리오 및 핸즈온 가이드 설계](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/13)  
> **표준 문서**: [ADR-0001](../adr/0001-server-component-error-handling-policy.md) · [멘탈 모델](../mental-model.md) · [용어 사전](../../GLOSSARY.md)  
> **선행 명세**: [공통 기반 명세](./demo-app-foundation.md) · [원칙 1 명세](./principle-1-taxonomy.md) · [원칙 2 명세](./principle-2-boundaries.md) · [원칙 3 명세](./principle-3-blast-radius.md) · [원칙 4 명세](./principle-4-observability.md)

---

## 1. 개요 및 목적

본 가이드는 팀원 및 기술 의사결정권자가 **ADR-0001의 4대 원칙**을 실제 Next.js 16 애플리케이션 환경에서 **5분 내에 직접 실행, 검증, 체득**할 수 있도록 설계된 종합 시연 대본(Walkthrough Script)이자 핸즈온 실습 지침서입니다.

복잡한 외부 인프라(SaaS, 원격 DB, APM) 설정 없이 **Zero-Config 로컬 환경**에서 개발 모드(`dev`)와 프로덕션 모드(`production`)를 교차 검증하며, 각 원칙별 "정상 동작 - 장애 유발 - 실패 안티패턴 - 표준 복구/대조"의 전 과정을 체계적으로 안내합니다.

---

## 2. 환경 준비 및 투-트랙 실행 가이드 (Two-Track Setup)

Next.js 16의 서버 컴포넌트 에러 처리는 개발 모드와 프로덕션 모드의 동작에 결정적인 차이가 존재합니다. 특히 **원칙 4(보안 마스킹 및 Digest 연계)**는 `NODE_ENV=production`에서만 온전히 검증할 수 있으므로, 목적에 따라 아래 투-트랙 중 적절한 모드를 선택합니다.

```
+---------------------------------------------------------------------------------------------------+
|                                  데모 앱 실행 트랙 (Two-Track)                                    |
+-------------------------------------------------+-------------------------------------------------+
| [트랙 A: 빠른 개발 및 탐색 모드]                 | [트랙 B: 프로덕션 마스킹 및 실전 검증 모드]     |
| command: `npm run dev`                          | command: `npm run build && npm run start`       |
+-------------------------------------------------+-------------------------------------------------+
| - 용도: UI 수정, 라우트 탐색, 핫 리로딩          | - 용도: 4대 원칙 E2E 최종 검증, 팀 데모 시연     |
| - 특징: React 개발 오버레이 노출                 | - 특징: 완벽한 CWE-209 보안 마스킹 작동         |
| - 주의: 원본 에러 스택이 브라우저에 표시됨      | - 필수: 브라우저 UI와 서버 stdout 1:1 대조 가능 |
+-------------------------------------------------+-------------------------------------------------+
```

### 2.1 사전 요구사항
- Node.js 20.x 이상
- 패키지 매니저: `npm` (또는 `pnpm`)
- 터미널 1개 (서버 로그 관측용), 모던 웹 브라우저 (Chrome 권장)

### 2.2 트랙 B (프로덕션 모드) 권장 실행 절차
5분 퀵 시연 코스를 완전히 완주하기 위해 **트랙 B** 실행을 기본 권장합니다.

```bash
# 1. 의존성 설치
npm install

# 2. Next.js 16 프로덕션 빌드 (authInterrupts 활성화 빌드)
npm run build

# 3. 프로덕션 서버 실행 (터미널 창을 화면 한쪽에 유지)
npm run start
```
- 브라우저 접속: `http://localhost:3000` (또는 `http://localhost:3000/demo`)
- 터미널 창: `instrumentation.ts`가 출력하는 JSON 구조화 로그(`[instrumentation.ts] onRequestError`)를 실시간으로 볼 수 있도록 브라우저 옆에 배치합니다.

---

## 3. 원클릭 카오스 URL 치트시트 (Quick Reference)

주소창에 쿼리스트링을 직접 타이핑하지 않고 바로 테스트할 수 있는 원클릭 URL 프리셋입니다.

| 단계 | 원칙 | 테스트 시나리오 | 딥링크 URL | 핵심 검증 포인트 |
|:---:|:---|:---|:---|:---|
| **Step 1** | 원칙 1 | 404 Not Found 프리미티브 | `/demo/taxonomy?chaos=not_found` | HTTP 404, `not-found.tsx` 직행, EB 비활성 |
| | | 401 Unauthorized 프리미티브 | `/demo/taxonomy?chaos=unauthorized` | HTTP 401, `unauthorized.tsx` 직행 (`authInterrupts`) |
| | | 403 Forbidden 프리미티브 | `/demo/taxonomy?chaos=forbidden` | HTTP 403, `forbidden.tsx` 직행 |
| | | 500 Unexpected 예외 | `/demo/taxonomy?chaos=unexpected` | HTTP 500, `error.tsx` 바운더리 포착, digest 발생 |
| **Step 2** | 원칙 2 | Page 수준 에러 격리 | `/demo/boundaries?chaos=unexpected&scope=page` | 사이드바(Layout) 유지, Page 영역만 Fallback |
| | | Segment Layout 에러 붕괴 | `/demo/boundaries?chaos=unexpected&scope=layout` | 사이드바 언마운트, `app/error.tsx`로 버블링 |
| | | Root Layout 전역 붕괴 | `/demo/boundaries?chaos=unexpected&scope=root_layout` | GNB/CSS 파괴, `app/global-error.tsx` 최후 방어 |
| **Step 3** | 원칙 3 | Feed 단독 장애 (격리 ON) | `/demo/blast-radius?chaos=unexpected&scope=feed&mode=granular` | Blast Radius 25% (타 위젯 3개 정상 이용 가능) |
| | | Feed 장애 (격리 OFF) | `/demo/blast-radius?chaos=unexpected&scope=feed&mode=none` | Blast Radius 100% (대시보드 전체 붕괴 안티패턴) |
| | | Suspense 순서 역전 | `/demo/blast-radius?chaos=unexpected&scope=feed&order=inverted` | `Suspense > EB` 배치 시 비동기 에러 상위 누출 |
| **Step 4** | 원칙 4 | RSC 렌더링 예외 마스킹 | `/demo/observability?chaos=unexpected` | CWE-209 방어 + 터미널 로그와 Digest 1:1 매칭 |
| | | Server Action 예외 마스킹 | `/demo/observability` (화면 내 Action 버튼) | 액션 뮤테이션 결함 마스킹 + Correlation 추적 |
| | | 404 제어 신호 필터링 | `/demo/observability?chaos=not_found` | APM 알람/스토어 오염 방지 (로그 기록 제외) |

---

## 4. 5분 퀵 시연 코스 (Walkthrough Script)

전체 5분 코스는 인지적 복잡도에 따라 선형적인 4단계로 진행됩니다. 각 단계는 **[액션] ➔ [기대 동작] ➔ [안티패턴 대조] ➔ [핵심 요약]** 순서로 시연합니다.

```
[00:00] ─── Step 1: 원칙 1 ─── [01:00] ─── Step 2: 원칙 2 ─── [02:15] ─── Step 3: 원칙 3 ─── [03:30] ─── Step 4: 원칙 4 ─── [05:00]
         (에러분류/Result)             (바운더리/복구)              (격리/폭발반경)              (마스킹/Digest 1:1)
```

---

### Step 1: [00:00 ~ 01:00] 원칙 1 - 에러 분류 & Result 패턴 시연

> **시연 라우트**: `/demo/taxonomy`  
> **핵심 가치**: "예측 가능한 상태는 `throw`하지 않고, 공식 제어 프리미티브 또는 Result 타입을 반환한다."

#### 1. 액션 & 관전 절차
1. `/demo/taxonomy`로 이동합니다. 좌측에는 **Pre-stream 제어 프리미티브 패널**, 우측에는 **Server Action Result 폼 패널**이 나타납니다.
2. 좌측 패널에서 `[notFound() (404)]`, `[unauthorized() (401)]`, `[forbidden() (403)]` 버튼을 차례로 클릭합니다.
   - **기대 동작**: 페이지가 에러 바운더리로 깨지지 않고, Next.js 공식 컨벤션 파일(`not-found.tsx`, `unauthorized.tsx`, `forbidden.tsx`)이 올바른 HTTP 상태 코드와 함께 깔끔하게 렌더링됩니다.
3. 좌측 패널의 `[Unexpected Error (500)]` 버튼을 클릭합니다.
   - **기대 동작**: 제어 프리미티브와 달리 `error.tsx` 바운더리가 활성화되며 500 에러와 `digest` 해시가 발생합니다.
4. 우측 패널의 **팀원 초대 폼**에서 이메일에 `duplicate@company.com`을 입력하고 `[초대하기]`를 클릭합니다.
   - **기대 동작**: 서버에서 예외를 던지지 않고 `{ success: false, error: 'ALREADY_REGISTERED' }` Result 객체를 반환하므로, 화면 리로드나 깜빡임 없이 폼 하단에 빨간색 인라인 경고가 즉시 표시됩니다. (Soft 200 회피 및 Expected Error 처리)

#### 2. 안티패턴 vs 권장 패턴 체감 (unstable_rethrow)
- **안티패턴 재현**: 우측 폼에서 `[unstable_rethrow 적용]` 체크박스를 **해제**하고, 역할로 `Admin`을 선택한 뒤 `[초대하기]`를 클릭합니다.
  - 결과: 관리자 권한 부족으로 내부에서 `forbidden()`이 호출되었으나, 일반 `try/catch` 블록이 `NEXT_FORBIDDEN` 신호를 일반 에러로 삼켜버려 폼에 엉뚱한 `"알 수 없는 시스템 오류"`가 발생합니다. (제어 신호 유실 버그)
- **권장 패턴 확인**: 체크박스를 **체크**하고 다시 제출합니다.
  - 결과: `unstable_rethrow(err)`가 제어 신호를 프레임워크로 재전파하여 즉시 `forbidden.tsx` (403) 화면으로 정상 이동합니다.

> 💡 **Step 1 핵심 전달 메시지**:  
> "권한 없음/데이터 없음은 500 예외가 아닙니다. 공식 제어 프리미티브를 사용하고, 폼 검증은 Result 패턴으로 처리하며, `try/catch` 사용 시에는 반드시 `unstable_rethrow`로 프레임워크 신호를 보존해야 합니다."

---

### Step 2: [01:00 ~ 02:15] 원칙 2 - 바운더리 계층 구조 & startTransition 복구

> **시연 라우트**: `/demo/boundaries`  
> **핵심 가치**: "Layout은 error.tsx로 보호되지 않으며, 서버 컴포넌트 복구에는 반드시 `startTransition`이 필요하다."

#### 1. 액션 & 관전 절차
1. `/demo/boundaries`로 이동합니다. 좌측에는 **세그먼트 사이드바(Layout)**, 우측에는 **본문 영역(Page)**이 배치되어 있습니다.
2. `[Page 에러 유발]` 버튼을 클릭합니다 (`?chaos=unexpected&scope=page`).
   - **기대 동작**: 우측 본문 영역만 `demo/boundaries/error.tsx` 카드로 교체되며, 좌측 사이드바와 상단 GNB는 전혀 깨지지 않고 온전히 인터랙션 가능한 상태를 유지합니다. (국소 격리 성공)
3. `[Segment Layout 에러 유발]` 버튼을 클릭합니다 (`?chaos=unexpected&scope=layout`).
   - **기대 동작**: `layout.tsx`는 `error.tsx`의 **부모**이므로 자식 바운더리가 잡지 못하고 상위 세그먼트(`app/error.tsx`)로 버블링됩니다. 좌측 사이드바가 완전히 사라지며 상위 에러 화면이 렌더링되는 계층적 한계를 눈으로 확인합니다.
4. 상단 네비게이션을 통해 다시 `/demo/boundaries`로 복귀합니다.

#### 2. 복구 메커니즘 대조 (단순 reset vs startTransition)
1. 다시 `[Page 에러 유발]`을 클릭하여 우측에 `error.tsx` 화면을 띄웁니다.
2. **안티패턴 테스트**: 에러 카드의 `[❌ 단순 reset() 호출]` 버튼을 클릭합니다.
   - 결과: 화면이 순간 깜빡인 후 **즉시 똑같은 에러 화면이 다시 나타납니다.** 클라이언트 바운더리만 리셋되었을 뿐, Router Cache에 남아있는 실패 RSC 페이로드를 다시 렌더링했기 때문입니다. (무한 에러 루프)
3. **권장 복구 테스트**: 에러 카드의 `[✅ startTransition 복구]` 버튼을 클릭합니다.
   - 코드: `startTransition(() => { router.refresh(); reset(); })`
   - 결과: 서버에 새로운 RSC 페이로드를 요청하여 캐시를 무효화하고 정상 데이터를 받아온 뒤 바운더리를 리셋하므로, 화면이 깨끗하게 정상 상태로 복원됩니다.

> 💡 **Step 2 핵심 전달 메시지**:  
> "동일 세그먼트의 `error.tsx`는 `layout.tsx`를 보호하지 못합니다. 레이아웃 에러는 상위 바운더리가 필요하며, 비동기 서버 컴포넌트를 복구할 때는 단순 `reset()`이 아닌 `startTransition(() => { router.refresh(); reset(); })`이 필수 표준입니다."

---

### Step 3: [02:15 ~ 03:30] 원칙 3 - GranularErrorBoundary & Blast Radius 통제

> **시연 라우트**: `/demo/blast-radius`  
> **핵심 가치**: "서브 시스템 장애가 전체 페이지를 죽이지 않도록 격리하고, `EB > Suspense` 순서를 엄수한다."

#### 1. 액션 & 관전 절차
1. `/demo/blast-radius` 대시보드로 이동합니다. 4개의 위젯(Profile, Metrics, Feed, Recommendations)이 2x2 그리드로 렌더링됩니다.
2. 상단 툴바에서 `[격리 모드: Granular ON]` 상태를 확인하고, `[💥 Feed 장애 유발]` 버튼을 클릭합니다 (`?chaos=unexpected&scope=feed`).
   - **기대 동작**: 외부 피드를 가져오는 `FeedWidget` 위치에만 로컬 Fallback 카드("외부 피드를 불러올 수 없습니다")가 표시됩니다.
   - **폭발 반경(Blast Radius) 통제 확인**: 프로필, 핵심 지표(Metrics), 추천 위젯 등 나머지 3개 위젯(75%)과 대시보드 전체 셸은 온전히 정상 작동합니다. (Blast Radius 100% ➔ 25% 축소)

#### 2. 위젯 단위 독립 복구 체감
1. Feed 장애 Fallback 카드 내부의 `[🔄 이 위젯만 다시 시도]` 버튼을 클릭합니다.
   - **기대 동작**: 전체 페이지가 리로드되거나 타 위젯의 클라이언트 상태가 초기화되지 않고, 내부의 `startTransition`을 통해 실패했던 피드 스트림만 단독 재요청되어 정상 피드 목록으로 부드럽게 복구됩니다.

#### 3. 안티패턴 및 조립 순서 비교
1. 상단 툴바에서 `[격리 모드: Granular OFF]`로 토글한 뒤 다시 Feed 장애를 유발합니다.
   - 결과: Feed 위젯 하나의 결함 때문에 대시보드 전체가 언마운트되고 전체 화면 에러 페이지(`demo/blast-radius/error.tsx`)로 튕겨 나가는 치명적 UX 붕괴를 체감합니다.
2. 툴바에서 `[조립 순서: Suspense > EB (역전)]`을 선택하고 테스트합니다.
   - 결과: React 19 비동기 스트리밍 에러가 서스펜스 내부에 갇힌 에러 바운더리를 뛰어넘어 상위 세그먼트로 누출됨을 확인합니다. (`EB > Suspense` 순서의 절대적 중요성 검증)

> 💡 **Step 3 핵심 전달 메시지**:  
> "보조 위젯의 장애로 핵심 비즈니스 화면 전체를 날려서는 안 됩니다. `<GranularErrorBoundary>`로 폭발 반경을 25%로 줄이고, 비동기 스트리밍 에러를 온전히 가두기 위해 반드시 `EB > Suspense` 순서로 조립해야 합니다."

---

### Step 4: [03:30 ~ 05:00] 원칙 4 - 프로덕션 에러 마스킹 & Digest 1:1 관측성

> **시연 라우트**: `/demo/observability`  
> **핵심 가치**: "프로덕션에서 내부 정보는 철저히 은닉(CWE-209 방어)하되, Digest 해시로 서버 원본 로그와 1:1 역추적한다."

#### 1. 액션 & 관전 절차 (프로덕션 모드 필수)
1. `/demo/observability` 화면을 브라우저 좌측에 띄우고, 우측에는 Next.js 프로덕션 서버를 구동 중인 **터미널 콘솔**을 나란히 배치합니다.
2. 상단 툴바에서 `[💥 RSC 렌더 에러 유발]` 버튼을 클릭합니다 (`?chaos=unexpected`).

#### 2. 관전 포인트 1: CWE-209 보안 마스킹 검증 (브라우저)
- 브라우저의 `error.tsx` 화면(Pane 1)을 확인합니다.
- **표시 내용**:
  - 에러 메시지: `"An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive information."`
  - 식별자 배지: `Digest: 3849102941` (예시 10자리 해시)
- **보안 검증**: 브라우저 개발자 도구(F12) 콘솔 및 네트워크 탭을 확인해도 DB 접속 주소, SQL 쿼리, 내부 파일 경로가 **단 1글자도 유출되지 않음**을 확인합니다.

#### 3. 관전 포인트 2: 터미널 stdout 실시간 로그 확인 (서버)
- 우측 터미널 창(Pane 2)을 확인합니다.
- `instrumentation.ts`의 `onRequestError` 훅이 가로챈 완벽한 JSON 구조화 로그가 출력되어 있습니다:
  ```json
  [instrumentation.ts] onRequestError captured:
  {
    "level": "error",
    "timestamp": "2026-10-22T13:45:10.123Z",
    "digest": "3849102941",
    "message": "Database connection pool timeout (08001) at PostgresClient.connect",
    "stack": "Error: Database connection pool timeout...\n    at PostgresClient.connect (lib/db.ts:42:15)\n    at ObservabilityRSC (app/demo/observability/page.tsx:18:24)",
    "routeType": "render",
    "path": "/demo/observability"
  }
  ```

#### 4. 관전 포인트 3: 1:1 Digest Correlation 대조기 (UI Pane 3)
- 화면 하단의 **[1:1 Digest Correlation Inspector]** 영역을 확인합니다.
- 클라이언트가 보고한 `Digest: 3849102941`을 키로 In-Memory 스토어(`/api/logs?digest=3849102941`)를 자동 조회하여 매칭 결과를 보여줍니다.
- **검증 결과**:
  - `매칭 상태`: ✅ **100% MATCHED**
  - `복원된 원본 에러`: `Database connection pool timeout (08001)`
  - `발생 위치`: `app/demo/observability/page.tsx:18:24`
- 보안을 완벽히 지키면서도 운영팀은 `digest` 하나만으로 1초 만에 서버 원본 원인을 정확히 특정할 수 있음을 증명합니다.

#### 5. 관전 포인트 4: 제어 신호 알람 필터링
- 툴바에서 `[🔍 notFound() 신호 트리거]` 버튼을 클릭합니다 (`?chaos=not_found`).
- 브라우저는 정상적으로 404 화면을 띄우며, 터미널 로그에는 아무런 에러 로그도 기록되지 않습니다. (`digest === 'NEXT_NOT_FOUND'` 조기 반환 필터링으로 APM 노이즈 방지 확인)

> 💡 **Step 4 핵심 전달 메시지**:  
> "보안과 디버깅 편의성은 트레이드오프가 아닙니다. 프로덕션 마스킹으로 CWE-209 취약점을 원천 차단하고, `instrumentation.ts`의 `onRequestError`와 Digest 해시를 통해 보안과 1:1 관측성을 완벽하게 양립할 수 있습니다."

---

## 5. 5분 완주 검증 체크리스트 (Hands-on Checklist)

팀 내 시연 진행자 또는 기능 검증 엔지니어는 시연 완료 후 아래 10개 점검 항목을 확인합니다.

- [ ] **[원칙 1]** `notFound()`, `unauthorized()`, `forbidden()` 호출 시 에러 바운더리가 터지지 않고 전용 화면 및 올바른 HTTP 상태 코드가 반환되는가?
- [ ] **[원칙 1]** Server Action 폼 검증 실패 시 예외를 던지지 않고 Result 타입(`{ success: false, error }`)을 반환하여 인라인 피드백이 렌더링되는가?
- [ ] **[원칙 1]** `unstable_rethrow`가 누락되었을 때 `NEXT_FORBIDDEN` 신호가 삼켜지는 현상과, 적용 시 정상 전파됨을 확인하였는가?
- [ ] **[원칙 2]** `page.tsx` 에러 발생 시 세그먼트 사이드바(Layout)가 파괴되지 않고 본문만 격리되는가?
- [ ] **[원칙 2]** 세그먼트 `layout.tsx` 에러 발생 시 동일 세그먼트 `error.tsx`가 아닌 상위 `app/error.tsx`로 전파됨을 확인하였는가?
- [ ] **[원칙 2]** `error.tsx`에서 단순 `reset()` 호출 시 무한 에러 루프가 발생하고, `startTransition` 복구 적용 시 정상 복원되는가?
- [ ] **[원칙 3]** 대시보드에서 보조 위젯(Feed) 장애 발생 시 전체 페이지가 깨지지 않고 Blast Radius가 25%로 통제되는가?
- [ ] **[원칙 3]** `Suspense > EB` 순서 역전 시 비동기 스트리밍 에러가 상위 세그먼트로 누출되는 현상을 확인하였는가?
- [ ] **[원칙 3]** 위젯 내부의 `[다시 시도]` 클릭 시 타 위젯 상태 손실 없이 해당 위젯만 독립 복구되는가?
- [ ] **[원칙 4]** 프로덕션 빌드에서 클라이언트에 내부 스택트레이스가 마스킹(CWE-209)되고, `Digest` 해시를 통해 서버 stdout 로그와 1:1 매칭되는가?

---

## 6. 데모 앱 메인 인덱스 (`/demo` 또는 `/`) UI 연계 계획

추후 구현될 데모 앱의 메인 진입 페이지는 팀원들이 본 가이드 문서를 보며 즉시 각 원칙으로 이동할 수 있는 **인터랙티브 런치패드(Interactive Launchpad)**로 구성합니다.

```text
+---------------------------------------------------------------------------------------------------+
|  Next.js 16 Server Component Error Handling PoC Demo App                                          |
|  "ADR-0001 4대 원칙을 5분 만에 코드로 검증하는 인터랙티브 쇼케이스"                               |
+---------------------------------------------------------------------------------------------------+
|  [📖 5분 E2E 핸즈온 가이드 보기]    [🛠️ GitHub 저장소]    [📋 ADR-0001 아키텍처 문서]              |
+---------------------------------------------------------------------------------------------------+
|  +-----------------------------------+  +-----------------------------------+                     |
|  | [원칙 1: Taxonomy & Result]       |  | [원칙 2: Boundaries & Recovery]   |                     |
|  | - Pre-stream 제어 프리미티브      |  | - Layout vs Page 격리 계층        |                     |
|  | - Server Action Result 패턴       |  | - startTransition 캐시 무효화     |                     |
|  | - unstable_rethrow 신호 보존      |  | - global-error.tsx 최후 방어      |                     |
|  | [👉 원칙 1 시연 바로가기]         |  | [👉 원칙 2 시연 바로가기]         |                     |
|  +-----------------------------------+  +-----------------------------------+                     |
|  +-----------------------------------+  +-----------------------------------+                     |
|  | [원칙 3: Blast Radius 통제]       |  | [원칙 4: Observability & Digest]  |                     |
|  | - <GranularErrorBoundary> 위젯    |  | - CWE-209 프로덕션 마스킹         |                     |
|  | - EB > Suspense 조립 순서 엄수    |  | - instrumentation.ts 중앙 수집    |                     |
|  | - 로컬 Fallback 및 독립 복구      |  | - 1:1 Digest Correlation 대조기   |                     |
|  | [👉 원칙 3 시연 바로가기]         |  | [👉 원칙 4 시연 바로가기]         |                     |
|  +-----------------------------------+  +-----------------------------------+                     |
+---------------------------------------------------------------------------------------------------+
```

---

## 7. 구현 로드맵 및 핸드오프 계획

본 설계 명세를 바탕으로 실제 데모 앱 코드를 단계적으로 구현하기 위한 권장 PR 단위 로드맵입니다:

1. **PR 1: 기반 인프라 및 유틸리티 구현** ([#12](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/12) 명세 준수)
   - `next.config.ts` (`authInterrupts: true`) 설정
   - `lib/chaos.ts`, `lib/result.ts`, `lib/log-store.ts` 구현
   - `instrumentation.ts` (`onRequestError`) 기본 골격 구성
2. **PR 2: 원칙 1 라우트 구현** ([#8](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/8) 명세 준수)
   - `app/demo/taxonomy/` 라우트, `actions.ts`, `not-found.tsx`, `unauthorized.tsx`, `forbidden.tsx` 구현
3. **PR 3: 원칙 2 라우트 구현** ([#9](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/9) 명세 준수)
   - `app/demo/boundaries/` 라우트, `layout.tsx`, `error.tsx`, `page.tsx` 및 `app/global-error.tsx` 구현
4. **PR 4: 원칙 3 라우트 구현** ([#10](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/10) 명세 준수)
   - `GranularErrorBoundary.tsx` 컴포넌트 및 `app/demo/blast-radius/` 2x2 대시보드 위젯 구현
5. **PR 5: 원칙 4 라우트 및 메인 런처 구현** ([#11](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/11), [#13](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/13) 명세 준수)
   - `app/demo/observability/` 라우트, `DigestInspector.tsx`, `/api/logs` 라우트 및 홈(`app/page.tsx`) 런처 완성
