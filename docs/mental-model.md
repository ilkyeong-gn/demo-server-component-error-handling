# Next.js 16 서버 컴포넌트 에러 처리 멘탈 모델

> 이 문서는 [ADR-0001](./adr/0001-server-component-error-handling-policy.md)에서 채택된 4대 원칙을 **도표 중심으로 재구성한 초보자용 지도**입니다.
> 대상 독자: Next.js Pages Router 경험이 있으나 App Router(RSC/Streaming SSR) 에러 처리는 처음인 개발자.

---

## 0. 전체 그림 — "에러의 일생"

서버 컴포넌트에서 발생한 에러가 **어디서 태어나, 어떻게 분류되고, 누가 잡으며, 최종적으로 누가 관찰하는지**를 한 장으로 보여줍니다. 이 흐름도가 4대 원칙의 뼈대입니다.

```mermaid
flowchart TD
    START(["🔥 서버 컴포넌트에서 에러 발생"])

    START --> CLASSIFY{"원칙 ①\n에러 분류"}

    CLASSIFY -->|"Expected Error\n(예측 가능한 상태)"| PRIMITIVE["제어 프리미티브 호출\nnotFound() · redirect()\nunauthorized() · forbidden()"]
    CLASSIFY -->|"Unexpected Exception\n(시스템 결함)"| THROW["throw → 상위로 전파"]

    PRIMITIVE --> HTTP["올바른 HTTP 상태 코드\n404 · 401 · 403 · 307"]
    HTTP --> CONV_FILE["컨벤션 파일 렌더링\nnot-found.tsx\nunauthorized.tsx\nforbidden.tsx"]

    THROW --> BOUNDARY{"원칙 ②③\n어느 바운더리가 잡는가?"}

    BOUNDARY -->|"컴포넌트 수준\n(보조 위젯)"| GRANULAR["원칙 ③\nGranularErrorBoundary\n+ Suspense 페어링"]
    BOUNDARY -->|"세그먼트 수준\n(페이지 본문)"| SEGMENT["원칙 ②\nerror.tsx\nstartTransition 복구"]
    BOUNDARY -->|"루트 레이아웃 붕괴"| GLOBAL["원칙 ②\nglobal-error.tsx\n자체 html/body 포함"]

    GRANULAR --> OBSERVE
    SEGMENT --> OBSERVE
    GLOBAL --> OBSERVE
    CONV_FILE --> DONE(["✅ 사용자에게 적절한 UI 표시"])

    OBSERVE["원칙 ④\ninstrumentation.ts\nonRequestError 훅"]
    OBSERVE --> DIGEST["Digest 해시 생성\nSentry · OTel · JSON 로그\n서버↔클라이언트 1:1 상관관계"]
    DIGEST --> DONE
```

> [!TIP]
> 위 도표를 위에서 아래로 따라가면 모든 에러 시나리오가 4대 원칙 중 하나로 분기됩니다.
> 각 원칙의 상세는 아래 섹션에서 개별 도표로 확대합니다.

---

## 원칙 ① — 에러 2단계 분류 + 제어 프리미티브 우선

### 핵심 한 줄

> **"예측할 수 있는 상태는 throw하지 말고, 프레임워크가 제공하는 제어 프리미티브로 HTTP 응답을 즉시 확정하라."**

### 분류 의사결정 트리

```mermaid
flowchart TD
    ERR(["에러 상황 감지"])

    ERR --> Q1{"이 상황은 비즈니스 도메인에서\n예측 가능한가?"}

    Q1 -->|"Yes — Expected Error"| Q2{"어떤 종류인가?"}
    Q1 -->|"No — Unexpected Exception\n(TypeError, DB 풀 고갈 등)"| THROW["그대로 throw\n→ Error Boundary로 전파"]

    Q2 -->|"데이터 없음 (404)"| NF["notFound()"]
    Q2 -->|"비로그인 (401)"| UA["unauthorized()"]
    Q2 -->|"권한 부족 (403)"| FB["forbidden()"]
    Q2 -->|"URL 이전/리다이렉트"| RD["redirect()"]
    Q2 -->|"폼 검증 실패\n비즈니스 규칙 위반"| RESULT["Result 타입 반환\n{ success: false, error }"]

    NF --> STATUS["HTTP 상태 코드 정확 설정\n+ 컨벤션 파일 렌더링"]
    UA --> STATUS
    FB --> STATUS
    RD --> STATUS
    RESULT --> INLINE["클라이언트에서\n인라인 에러 UI 표시"]
```

### `try/catch` 안티패턴과 해결책

```mermaid
flowchart LR
    subgraph ANTI["❌ 안티패턴"]
        direction TB
        A1["try {\n  notFound()\n} catch (e) {\n  // 삼켜짐!\n}"]
    end

    subgraph SAFE["✅ 권장 패턴"]
        direction TB
        B1["try {\n  // I/O 작업만\n} catch (e) {\n  unstable_rethrow(e)\n  // 진짜 에러만 처리\n}"]
    end

    subgraph BEST["⭐ 최선 패턴"]
        direction TB
        C1["// try/catch 바깥에서\nif (!item) notFound()"]
    end

    ANTI -.->|"제어 신호\n삼킴 위험"| SAFE
    SAFE -.->|"더 안전"| BEST
```

> [!IMPORTANT]
> `notFound()`, `redirect()` 등은 내부적으로 `throw`하는 **제어 흐름 신호**입니다.
> 일반 `try/catch`로 감싸면 라우팅이 중단됩니다. 불가피하게 감싸야 한다면 `catch` 선두에 `unstable_rethrow(e)`를 배치하세요.

---

## 원칙 ② — 바운더리 계층 구조 + `startTransition` 복구

### 핵심 한 줄

> **"에러 바운더리는 자기보다 바깥(부모)의 에러를 잡지 못한다. 계층을 정확히 알아야 어디서 터지고 누가 잡는지 예측할 수 있다."**

### 세그먼트 내부의 컴포넌트 중첩 구조

```mermaid
flowchart TD
    subgraph SEG["하나의 라우트 세그먼트"]
        direction TB
        LAYOUT["① Layout\n(layout.tsx)"]
        TEMPLATE["② Template\n(template.tsx)"]
        ERROR_B["③ ErrorBoundary\n(error.tsx) 🛡️"]
        SUSPENSE["④ Suspense\n(loading.tsx) ⏳"]
        NOTFOUND["⑤ NotFoundBoundary\n(not-found.tsx)"]
        AUTH["⑥ Forbidden / Unauthorized\nBoundary"]
        PAGE["⑦ Page\n(page.tsx) 📄"]

        LAYOUT --> TEMPLATE
        TEMPLATE --> ERROR_B
        ERROR_B --> SUSPENSE
        SUSPENSE --> NOTFOUND
        NOTFOUND --> AUTH
        AUTH --> PAGE
    end

    style LAYOUT fill:#fef3c7,stroke:#f59e0b,color:#000
    style ERROR_B fill:#fee2e2,stroke:#ef4444,color:#000
    style SUSPENSE fill:#dbeafe,stroke:#3b82f6,color:#000
    style PAGE fill:#d1fae5,stroke:#10b981,color:#000
```

> [!NOTE]
> `Layout`은 `ErrorBoundary`보다 **바깥**에 있습니다.
> 따라서 **같은 폴더의 `error.tsx`는 같은 폴더의 `layout.tsx` 에러를 잡지 못합니다** — 부모 세그먼트의 `error.tsx`로 버블링됩니다.

### 에러 버블링 경로

```mermaid
flowchart BT
    PAGE_ERR["dashboard/page.tsx 에러 💥"] --> DASH_ERR["dashboard/error.tsx 포착 ✅"]
    DASH_LAYOUT_ERR["dashboard/layout.tsx 에러 💥"] -.->|"같은 폴더 error.tsx는\n잡지 못함 ❌"| DASH_ERR
    DASH_LAYOUT_ERR --> APP_ERR["app/error.tsx 포착 ✅"]
    APP_LAYOUT_ERR["app/layout.tsx 에러 💥"] -.->|"어떤 error.tsx도\n잡지 못함 ❌"| APP_ERR
    APP_LAYOUT_ERR --> GLOBAL_ERR["app/global-error.tsx 포착 ✅\n(자체 html/body 필수)"]

    style GLOBAL_ERR fill:#fecaca,stroke:#dc2626,color:#000
```

### `reset()` 단독 호출의 함정과 올바른 복구

```mermaid
sequenceDiagram
    participant User as 👤 사용자
    participant EB as error.tsx<br/>(Error Boundary)
    participant Router as Next.js Router
    participant Server as 서버 RSC

    Note over User,Server: ❌ 잘못된 복구 — reset()만 호출
    User->>EB: "다시 시도" 클릭
    EB->>EB: reset()
    EB->>EB: 캐시된 실패 RSC 페이로드 재평가
    EB-->>User: 💥 동일 에러 재발생!

    Note over User,Server: ✅ 올바른 복구 — startTransition + refresh + reset
    User->>EB: "다시 시도" 클릭
    EB->>Router: startTransition(() => {<br/>  router.refresh()<br/>  reset()<br/>})
    Router->>Server: 서버에 RSC 재요청
    Server-->>Router: 새로운 RSC 페이로드
    Router-->>EB: 바운더리 상태 초기화
    EB-->>User: ✅ 정상 UI 복원!
```

---

## 원칙 ③ — 세분화된 장애 격리 (Blast Radius 통제)

### 핵심 한 줄

> **"보조 위젯 하나가 죽었다고 페이지 전체가 죽어서는 안 된다. `GranularErrorBoundary + Suspense` 페어링으로 폭발 반경을 최소화하라."**

### Before vs After — Blast Radius 비교

```mermaid
flowchart LR
    subgraph BEFORE["❌ Before — 세분화 없음"]
        direction TB
        P1["Dashboard Page"]
        P1 --> W1_B["Stats Widget ✅"]
        P1 --> W2_B["Feed Widget 💥 실패!"]
        P1 -.->|"전체 언마운트"| ERR_B["error.tsx가\n페이지 통째로 대체 😱"]
    end

    subgraph AFTER["✅ After — 세분화 적용"]
        direction TB
        P2["Dashboard Page"]
        P2 --> GEB1["GranularEB + Suspense"]
        GEB1 --> W1_A["Stats Widget ✅\n정상 동작 유지"]
        P2 --> GEB2["GranularEB + Suspense"]
        GEB2 --> W2_A["Feed Widget 💥"]
        W2_A -.->|"이 위젯만 대체"| FALLBACK["로컬 에러 UI\n+ 개별 재시도 버튼"]
    end
```

### 배치 규칙: ErrorBoundary가 Suspense를 감싼다

```mermaid
flowchart TD
    subgraph CORRECT["✅ 올바른 순서"]
        direction TB
        EB["GranularErrorBoundary\n(Client Component) 🛡️"]
        SUS["Suspense\nfallback={Skeleton} ⏳"]
        RSC["AsyncServerWidget\n(Server Component) 🖥️"]

        EB --> SUS
        SUS --> RSC
    end

    subgraph WRONG["❌ 잘못된 순서"]
        direction TB
        SUS2["Suspense ⏳"]
        EB2["ErrorBoundary 🛡️"]
        RSC2["AsyncServerWidget 🖥️"]

        SUS2 --> EB2
        EB2 --> RSC2
    end

    CORRECT ~~~ WRONG
```

> [!WARNING]
> **ErrorBoundary가 반드시 Suspense 바깥**에 있어야 합니다.
> 순서가 뒤바뀌면 스트리밍 도중 발생한 에러가 바운더리를 우회하여 상위 세그먼트 `error.tsx`로 버블링됩니다.

---

## 원칙 ④ — `instrumentation.ts` 기반 Digest 연계 관측성

### 핵심 한 줄

> **"프로덕션에서는 에러 메시지가 마스킹된다. 유일한 연결 고리인 `digest` 해시를 서버와 클라이언트 양쪽에서 기록하여 1:1 역추적 환경을 구축하라."**

### 프로덕션 에러 마스킹 — 왜 Digest가 필요한가

```mermaid
flowchart LR
    subgraph SERVER["🖥️ 서버 (Node.js)"]
        direction TB
        ERR_ORIG["원본 에러\nTypeError: Cannot read\nproperty 'id' of null\n+ 전체 스택트레이스"]
        HASH["string-hash(message + stack)\n→ digest: '1782794309'"]
        ERR_ORIG --> HASH
    end

    subgraph FLIGHT["✈️ RSC Flight Stream"]
        direction TB
        MASKED["메시지 마스킹\n'An error occurred in\nthe Server Components\nrender...'"]
        DIG_ONLY["전달되는 것:\n{ digest: '1782794309' }"]
        MASKED --> DIG_ONLY
    end

    subgraph CLIENT["🌐 클라이언트 (브라우저)"]
        direction TB
        ERR_TSX["error.tsx\nerror.message → 마스킹됨\nerror.digest → '1782794309'"]
    end

    SERVER -->|"보안 마스킹"| FLIGHT
    FLIGHT --> CLIENT
```

### Digest 상관관계 — 서버↔클라이언트 역추적 아키텍처

```mermaid
sequenceDiagram
    participant Browser as 🌐 브라우저<br/>(error.tsx)
    participant NextServer as 🖥️ Next.js 서버<br/>(instrumentation.ts)
    participant Sentry as 📊 Sentry / APM
    participant Logs as 📋 JSON 로그<br/>(CloudWatch/Datadog)

    Note over Browser,Logs: 에러 발생 → Digest 생성 → 양측 기록

    NextServer->>NextServer: onRequestError(err, req, ctx)
    NextServer->>NextServer: digest = err.digest ('1782794309')

    par 서버 측 기록
        NextServer->>Sentry: captureRequestError(err)<br/>tag: digest='1782794309'<br/>+ 원본 스택트레이스
        NextServer->>Logs: logger.error({<br/>  digest: '1782794309',<br/>  stack: err.stack,<br/>  path: '/dashboard'<br/>})
    end

    NextServer-->>Browser: Flight Stream<br/>{ digest: '1782794309' }

    Browser->>Sentry: captureException(error)<br/>tag: digest='1782794309'

    Note over Sentry: 🔍 digest:'1782794309' 검색<br/>→ 서버 원본 스택 + 클라이언트 컨텍스트<br/>= 즉시 원인 규명
```

### `instrumentation.ts`가 커버하는 4가지 실행 컨텍스트

```mermaid
flowchart TD
    HOOK["instrumentation.ts\nonRequestError(err, request, context)"]

    HOOK --> R1["Server Components 렌더링\ncontext.routeType = 'render'"]
    HOOK --> R2["Server Actions 실행\ncontext.routeType = 'action'"]
    HOOK --> R3["Route Handlers 실행\ncontext.routeType = 'route'"]
    HOOK --> R4["Middleware / Proxy\ncontext.routeType = 'proxy'"]

    R1 --> OUT["Sentry · OTel Span · JSON 로그\n모두 digest 태그 포함"]
    R2 --> OUT
    R3 --> OUT
    R4 --> OUT
```

> [!CAUTION]
> `onRequestError` 내부의 네트워크 호출(Sentry 전송 등)은 **반드시 `await`** 하세요.
> 서버리스 환경(Lambda, Vercel)에서 `await` 없이 fire-and-forget 하면 인스턴스 종료 시 에러 보고가 유실됩니다.

---

## 종합 치트시트 — 시나리오별 빠른 판단표

| 시나리오 | 에러 분류 | 처리 메커니즘 | HTTP 코드 | UI |
|:---|:---|:---|:---|:---|
| 핵심 엔티티 없음 `/posts/999` | Expected | `notFound()` | **404** | `not-found.tsx` |
| 비로그인 접근 | Expected | `unauthorized()` | **401** | `unauthorized.tsx` |
| 권한 부족 | Expected | `forbidden()` | **403** | `forbidden.tsx` |
| URL 이전/리다이렉트 | Control Flow | `redirect()` | **307/303** | 브라우저 이동 |
| 폼 검증 실패 (Server Action) | Expected | Result 타입 반환 | 200 | 인라인 폼 에러 |
| 보조 위젯 API 실패 | Expected | GranularEB + Suspense | 200 | 로컬 에러 배너 |
| DB 연결 풀 고갈 | Unexpected | `throw` → Error Boundary | **500** / 200 | `error.tsx` + 재시도 |
| 루트 레이아웃 크래시 | Unexpected | `throw` → global-error | **500** | `global-error.tsx` |

---

## 더 읽기

| 문서 | 내용 |
|:---|:---|
| [ADR-0001](./adr/0001-server-component-error-handling-policy.md) | 4대 원칙의 공식 결정문 |
| [에러 분류 체계 리서치](./research/rsc-error-taxonomy.md) | Expected vs Unexpected, 제어 프리미티브, Result 패턴 심층 분석 |
| [바운더리 계층 구조 리서치](./research/error-boundary-hierarchy.md) | 세그먼트 중첩 트리, `reset()` 한계, GranularErrorBoundary 구현 |
| [Digest/관측성 리서치](./research/digest-and-observability.md) | 마스킹 알고리즘, `onRequestError`, Sentry/OTel/로깅 연계 청사진 |
| [GLOSSARY.md](../GLOSSARY.md) | 도메인 용어 사전 |
