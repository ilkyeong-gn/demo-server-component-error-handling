# Next.js 16 프로덕션 에러 다이제스트(Digest) 마스킹 메커니즘과 서버 관측성 연계 방안

## 1. 개요 (Executive Summary)

React Server Component(RSC) 패러다임과 Next.js App Router 환경에서, 서버 컴포넌트 렌더링 또는 Server Action 실행 중 발생한 예외는 프로덕션 빌드에서 사용자에게 직접 노출되지 않습니다. 데이터베이스 쿼리, 내부 파일 경로, 환경 변수, 비즈니스 로직 세부정보 등의 민감한 정보가 클라이언트로 유출되는 정보 노출 취약점(CWE-209: Information Exposure Through an Error Message)을 방지하기 위해, Next.js 런타임은 에러 메시지를 범용 안내 문구로 마스킹하고 고유한 **다이제스트(Digest)** 해시를 부여합니다.

이로 인해 프로덕션 환경에서는 클라이언트 에러 모니터링만으로는 원래의 서버 스택트레이스를 파악할 수 없는 **관측성 단절(Observability Gap)**이 발생합니다.

본 연구 보고서는 다음 핵심 내용을 규명합니다:
1. **Next.js 16 에러 다이제스트의 생성 알고리즘과 마스킹 메커니즘** (React Server Components Flight 프로토콜 직렬화 및 `string-hash`/djb2 기반 해시 생성).
2. **Next.js 15+ 및 16의 공식 서버 에러 관측성 표준인 `onRequestError` 훅** (`instrumentation.ts`)의 시그니처와 실행 라이프사이클.
3. **Sentry, OpenTelemetry, 구조화된 로깅(JSON Logging)** 시스템과 클라이언트 에러 바운더리(`error.tsx`) 간의 다이제스트 기반 상관관계(Correlation) 추적 아키텍처 및 구현 청사진.

---

## 2. Next.js 프로덕션 에러 다이제스트(Digest) 마스킹 메커니즘

### 2.1. 개발(Development) 환경과 프로덕션(Production) 환경의 동작 차이

Next.js의 에러 핸들링은 실행 환경(`NODE_ENV`)에 따라 근본적으로 다르게 동작합니다.

| 비교 항목 | 개발 환경 (`NODE_ENV=development`) | 프로덕션 환경 (`NODE_ENV=production`) |
| :--- | :--- | :--- |
| **에러 메시지** | 원본 에러 메시지 그대로 전달 | `"An error occurred in the Server Components render..."` 또는 일반 안내 메시지로 마스킹 |
| **스택트레이스** | 전체 원본 스택트레이스 및 React 컴포넌트 스택 전달 | 클라이언트로 일체 전송되지 않음 (보안 마스킹) |
| **클라이언트 표시** | Next.js Dev Overlay (에러 오버레이 팝업) | `app/error.tsx` 또는 `app/global-error.tsx` 바운더리 UI |
| **`error.digest`** | 개발 환경에서도 생성될 수 있으나 디버깅 오버레이에 원본 정보 우선 노출 | 클라이언트에 유일하게 보존되는 식별자 문자열 |
| **서버 콘솔 출력** | 원본 에러 및 스택트레이스 출력 | 원본 에러 스택트레이스와 함께 `Digest: <hash>` 페어링 로깅 |

### 2.2. 다이제스트(Digest) 생성 원리 및 내부 알고리즘

Next.js 내부 소스코드(App Router의 `create-error-handler` 및 서버 렌더링 파이프라인)에서 에러 다이제스트는 다음과 같은 규칙으로 생성됩니다:

1. **기존 다이제스트 보존**:
   던져진 에러 객체(`err`)에 이미 `.digest` 프로퍼티가 존재하는 경우(예: 프레임워크 내부 제어 흐름 신호 또는 커스텀 다이제스트), 이를 재계산하지 않고 그대로 사용합니다.
   * `notFound()`: 내부적으로 `digest: 'NEXT_NOT_FOUND'`를 갖는 에러 투척
   * `redirect()`: 내부적으로 `digest: 'NEXT_REDIRECT;...'`를 갖는 에러 투척
2. **해시 알고리즘 (djb2 / `string-hash`)**:
   다이제스트가 정의되지 않은 일반 예외(Runtime Exception)에 대해 Next.js는 `string-hash` 라이브러리를 사용하여 에러의 메시지와 스택트레이스를 결합한 문자열을 비암호화 고속 해시 정수로 변환합니다:
   ```typescript
   // Next.js 내부 처리 개념 코드
   const stringHash = require('string-hash')

   const digest = stringHash(
     err.message + (errorInfo?.stack || err.stack || '')
   ).toString()

   err.digest = digest
   ```
3. **Flight 프로토콜 직렬화 및 마스킹**:
   React Server Components(RSC)가 클라이언트로 렌더링 스트림(Flight Payload)을 스트리밍할 때, 서버 컴포넌트에서 throw된 에러는 다음과 같은 형태로 직렬화되어 전송됩니다:
   * 에러 메시지는 범용 메시지로 치환됩니다:
     > `"An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A hash of the error is caused: <digest>"`
   * 에러 객체에 `digest` 속성만 첨부됩니다: `{ message: "...", digest: "1782794309" }`.

### 2.3. 클라이언트 수신 구조 (`error.tsx`)

클라이언트의 `error.tsx` 또는 `global-error.tsx`는 Client Component(`'use client'`)로 선언되며, React Error Boundary의 `getDerivedStateFromError` / `componentDidCatch`와 결합하여 에러 객체를 받습니다:

```typescript
// app/error.tsx
'use client'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // 프로덕션에서:
  // error.message -> 마스킹된 일반 메시지
  // error.digest  -> "1782794309" (서버와 매핑 가능한 고유 해시)
  return (
    <div className="error-container">
      <h2>서비스 이용에 불편을 드려 죄송합니다.</h2>
      {error.digest && <p className="error-code">오류 코드: {error.digest}</p>}
      <button onClick={() => reset()}>다시 시도</button>
    </div>
  )
}
```

---

## 3. 서버 사이드 에러 캡처 표준: `instrumentation.ts`의 `onRequestError`

Next.js 15에서 공식 도입되어 Next.js 16에서 엔터프라이즈 모니터링의 핵심 표준으로 정립된 기능이 바로 `instrumentation.ts`의 **`onRequestError`** 훅입니다.

### 3.1. 도입 배경

과거 Next.js(13~14)에서는 서버 컴포넌트 렌더링 중 발생한 에러를 외부 APM(Application Performance Monitoring)이나 로깅 시스템으로 가로채려면 React의 `renderToPipeableStream` 내부 옵션이나 복잡한 원숭이 패치(Monkey Patching)를 거쳐야 했습니다. 

`onRequestError`는 서버의 모든 요청 처리 경로에서 발생하는 처리되지 않은 에러를 단일 진입점에서 안정적으로 캡처할 수 있도록 설계된 공식 API입니다.

### 3.2. 지원되는 실행 컨텍스트

`onRequestError`는 서버의 4가지 모든 실행 컨텍스트를 커버합니다:
1. **Server Components 렌더링** (`context.routeType === 'render'`)
2. **Server Actions 실행** (`context.routeType === 'action'`)
3. **Route Handlers 실행** (`context.routeType === 'route'`)
4. **Middleware 및 Proxy** (`context.routeType === 'proxy'`)

### 3.3. 시그니처 및 파라미터 상세

`instrumentation.ts` 파일(프로젝트 루트 또는 `src/` 디렉터리에 위치)에서 아래 시그니처로 export합니다:

```typescript
// instrumentation.ts
import { type Instrumentation } from 'next'

export const onRequestError: Instrumentation.onRequestError = async (
  err: unknown,
  request: {
    path: string
    method: string
    headers: Record<string, string | string[]>
  },
  context: {
    routerKind: 'Pages Router' | 'App Router'
    routePath: string
    routeType: 'render' | 'route' | 'action' | 'proxy'
    renderSource?:
      | 'react-server-components'
      | 'react-server-components-payload'
      | 'server-rendering'
    revalidateReason?: 'on-demand' | 'stale' | undefined
    renderType?: 'dynamic' | 'dynamic-resume' // PPR(Partial Prerendering) 지원
  }
) => {
  // 에러 로깅 및 모니터링 전송 로직
}
```

#### 주요 파라미터 설명
* **`err`**: 
  서버에서 발생한 원본 에러 인스턴스입니다. RSC 렌더링 중 발생한 경우 React 내부 래핑이 적용될 수 있으나, `err.digest`에 Next.js가 계산한 해시 또는 원본 digest가 포함되어 있습니다.
* **`request`**:
  * `path`: 에러를 유발한 요청의 URL 경로 및 쿼리 파라미터 (예: `/dashboard/orders?id=123`).
  * `method`: HTTP 메서드 (`GET`, `POST` 등).
  * `headers`: 클라이언트 요청 헤더 객체. (주의: 로깅 시 토큰, 쿠키 등 민감정보 마스킹 필수).
* **`context`**:
  * `routerKind`: `'App Router'` 또는 `'Pages Router'`.
  * `routePath`: 컴파일된 라우트 파일 경로 (예: `/app/dashboard/orders/page`).
  * `routeType`: 발생 지점 구분 (`render`, `action`, `route`, `proxy`).
  * `renderSource`: 렌더링 파이프라인 단계 (`react-server-components`, `react-server-components-payload`, `server-rendering`).
  * `renderType`: `'dynamic-resume'`의 경우 Next.js의 PPR(Partial Prerendering) 정적 셸 이후 동적 스트리밍 재개 단계에서 발생했음을 의미.

### 3.4. 비동기 처리(Async Operations) 원칙

`onRequestError` 내부에서 네트워크 요청(예: Sentry API, Datadog 엔드포인트 전송)을 수행할 때는 **반드시 `await`를 사용**해야 합니다. 서버리스 환경(AWS Lambda, Vercel Serverless 등)에서는 `await`하지 않은 비동기 프로미스가 완료되기 전에 인스턴스 라이프사이클이 종료되어 에러 보고가 유실될 수 있습니다.

---

## 4. 관측성 시스템 연계 방안 (Observability Integration Architecture)

클라이언트의 `error.digest`와 서버 사이드의 실제 에러 및 스택트레이스를 연결하는 3대 연계 전략을 제시합니다.

```
+---------------------------------------------------------------------------------------+
|                                    Client Browser                                     |
|                                                                                       |
|   Server Component Error Occurs                                                       |
|   -> Flight Stream masks error -> Client receives { digest: "1782794309" }            |
|   -> app/error.tsx renders: "오류 코드: 1782794309"                                   |
|   -> Sentry.captureException(error, { tags: { digest: "1782794309" } })               |
+------------------------------------------+--------------------------------------------+
                                           |
                                           | Correlation Key: digest ("1782794309")
                                           v
+---------------------------------------------------------------------------------------+
|                                  Next.js 16 Server                                    |
|                                                                                       |
|   instrumentation.ts: onRequestError(err, request, context)                           |
|   [1] Sentry.captureRequestError:                                                     |
|       - Unmasked Stack Trace + Request Context + Tag: { digest: "1782794309" }        |
|   [2] OpenTelemetry:                                                                  |
|       - span.recordException(err) + span.setAttribute("error.digest", "1782794309")  |
|   [3] Structured Logger:                                                              |
|       - logger.error({ digest: "1782794309", stack: err.stack, path: request.path }) |
+---------------------------------------------------------------------------------------+
```

---

### 4.1. Sentry 연계 아키텍처

Sentry의 공식 Next.js SDK(`@sentry/nextjs` v8.28.0+)는 Next.js의 `onRequestError`와 완벽히 통합되어 있습니다.

#### 1) 서버 설정 (`instrumentation.ts`)
```typescript
// instrumentation.ts
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Next.js 15+ / 16 공식 Sentry 에러 인터셉터
export const onRequestError = Sentry.captureRequestError
```

`Sentry.captureRequestError`는 내부적으로:
1. 에러 객체의 원본 스택트레이스와 에러 메시지를 수집합니다.
2. `request` 메타데이터(URL, 메서드, 헤더)를 Sentry 컨텍스트에 기록합니다.
3. Next.js 라우트 컨텍스트(`routeType`, `routePath`)를 태그로 기록합니다.
4. **`digest`를 Sentry 이벤트 태그(`digest: <hash>`)로 자동 추출하여 바인딩합니다.**

#### 2) 클라이언트 에러 바운더리 연계 (`app/error.tsx`)
```typescript
// app/error.tsx
'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 클라이언트 사이드에서 Sentry로 에러를 전송할 때 digest 태그를 명시적으로 주입
    Sentry.captureException(error, {
      captureContext: {
        tags: {
          digest: error.digest,
          boundary: 'route-error-boundary',
        },
      },
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <h2 className="text-xl font-bold mb-2">문제가 발생했습니다</h2>
      <p className="text-gray-600 mb-4">요청을 처리하는 동안 오류가 발생했습니다.</p>
      {error.digest && (
        <p className="text-xs font-mono text-gray-500 mb-4 bg-gray-100 p-2 rounded">
          오류 참조 코드: {error.digest}
        </p>
      )}
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        다시 시도
      </button>
    </div>
  )
}
```

#### 3) 상관관계 추적 (Correlation in Sentry)
* 사용자가 문의 시 제공한 오류 참조 코드(예: `1782794309`)가 있을 때:
  Sentry 이슈 검색창에 `digest:1782794309`를 입력하면, 클라이언트 에러 이벤트와 서버 사이드에서 캡처된 원본 에러(풀 스택트레이스, DB 쿼리 오류, 서버 인프라 상태)가 동일한 태그로 검색되어 단 몇 초 만에 원인을 규명할 수 있습니다.

---

### 4.2. OpenTelemetry (OTel) 분산 추적 연계

Next.js의 내장 OpenTelemetry 기능(`@vercel/otel` 또는 OpenTelemetry JS SDK)을 사용하는 환경에서는 분산 트레이스의 Span에 다이제스트를 기록하여 APM 백엔드(Datadog, Dynatrace, Honeycomb, New Relic, Jaeger 등)와 연계합니다.

#### 1) OTel 등록 (`instrumentation.ts`)
```typescript
// instrumentation.ts
import { registerOTel } from '@vercel/otel'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { type Instrumentation } from 'next'

export function register() {
  registerOTel({ serviceName: 'next16-app' })
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const span = trace.getActiveSpan()
  const digest =
    typeof err === 'object' && err !== null && 'digest' in err
      ? String(err.digest)
      : undefined

  if (span) {
    // 1. OTel Span 속성에 digest 및 Next.js 라우트 컨텍스트 주입
    span.setAttributes({
      'error.digest': digest || 'unknown',
      'next.router.kind': context.routerKind,
      'next.route.path': context.routePath,
      'next.route.type': context.routeType,
      'http.target': request.path,
      'http.method': request.method,
    })

    // 2. Span에 에러 기록
    if (err instanceof Error) {
      span.recordException(err)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err.message,
      })
    } else {
      span.recordException(new Error(String(err)))
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: String(err),
      })
    }
  }
}
```

#### 2) 분산 추적 백엔드에서의 쿼리
* OTel 속성 필터링: `error.digest = "1782794309"`
* 추적 흐름: 클라이언트 요청 $\rightarrow$ Next.js 서버 컴포넌트 렌더링 Span $\rightarrow$ DB 호출 Span $\rightarrow$ 에러 발생 및 `error.digest` 태깅.
* 분산 트레이스를 통해 에러 다이제스트가 발생한 정확한 HTTP 트랜잭션과 하위 마이크로서비스 호출 지점을 즉시 시각화할 수 있습니다.

---

### 4.3. 구조화된 서버 로깅 (Structured JSON Logging)

별도의 SaaS APM을 사용하지 않거나 중앙 로그 파이프라인(ELK, CloudWatch, Loki, Datadog Logs)을 구축한 경우, 구조화된 JSON 로그가 핵심 역할을 합니다.

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
})
```

```typescript
// instrumentation.ts (로깅 핸들러 통합)
import { logger } from '@/lib/logger'
import { type Instrumentation } from 'next'

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const digest =
    typeof err === 'object' && err !== null && 'digest' in err
      ? String(err.digest)
      : undefined

  logger.error({
    event: 'nextjs_request_error',
    digest,
    error: {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      name: err instanceof Error ? err.name : typeof err,
    },
    request: {
      path: request.path,
      method: request.method,
      // 보안상 안전한 헤더만 선별 기록
      userAgent: request.headers['user-agent'],
      referer: request.headers['referer'],
    },
    context: {
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      renderType: context.renderType,
    },
  })
}
```

* **로그 검색 쿼리**:
  * CloudWatch Insights: `fields @timestamp, error.message, error.stack | filter digest = "1782794309"`
  * Datadog Logs: `@digest:1782794309`
  * Loki: `{app="next16"} | json | digest="1782794309"`

---

## 5. 실무 아키텍처 원칙 및 구현 권장사항 (Best Practices)

### 5.1. Expected Errors vs Unexpected Errors 구분

Next.js 16 공식 문서 및 React 19 아키텍처에서는 에러를 두 가지 범주로 엄격히 분리할 것을 권고합니다:

```
                          [에러 발생]
                               |
               ---------------------------------
               |                               |
       [예상된 에러 (Expected)]       [예상치 못한 에러 (Unexpected)]
      - 입력값 유효성 검증 실패            - DB 연결 단절 / 네트워크 타임아웃
      - 비즈니스 조건 미충족 (잔액 부족)    - Null Reference / Type Error
      - 인증/인가 실패 (로그인 필요)        - 외부 의존성(3rd-party) 500 응답
               |                               |
        (throw 하지 않음!)               (throw 발생!)
               |                               |
    Server Action 결과 객체 반환         Next.js onRequestError 캡처
    { success: false, error: ... }             |
               |                        에러 Digest 해시 마스킹
     클라이언트 컴포넌트에서                   |
     인라인 에러 메시지로 표시          error.tsx (Error Boundary) 폴백 UI
```

1. **예상된 에러 (Expected Errors)**:
   * **원칙**: Server Action 또는 서버 데이터 패칭 함수에서 **`throw new Error()`를 호출하지 마십시오.**
   * **이유**: `throw`하는 순간 프로덕션 런타임은 이를 치명적 장애로 간주하여 에러 메시지를 다이제스트로 마스킹합니다. 결과적으로 폼의 `"비밀번호는 8자 이상이어야 합니다"` 같은 안내 문구가 `"An error occurred in the Server Components render. Digest: 38291..."`로 치환되어 사용자 경험이 파괴됩니다.
   * **해결책**: 반환 타입 객체(`{ success: false, error: { code: 'INVALID_INPUT', message: '...' } }`)를 클라이언트로 반환하십시오.
2. **예상치 못한 에러 (Unexpected Errors / Panics)**:
   * **원칙**: 인프라 장애, null 포인터 예외, 쿼리 구문 오류 등은 그대로 `throw`합니다.
   * **결과**: `onRequestError`가 풀 스택트레이스를 수집하여 Sentry/OTel로 전송하고, 클라이언트에는 Digest만 노출되어 보안을 유지합니다.

### 5.2. 프레임워크 제어 흐름 신호(Control Flow Signals) 처리

Next.js App Router의 `redirect()`와 `notFound()`는 함수 내부에서 특수한 에러를 `throw`하여 렌더링 파이프라인을 중단하는 메커니즘을 사용합니다.
* `notFound()`: `digest: 'NEXT_NOT_FOUND'`
* `redirect()`: `digest: 'NEXT_REDIRECT;...'`

`onRequestError` 구현 시 이러한 정상적인 제어 흐름 예외가 알람(Sentry 에러 경보 등)을 유발하지 않도록 필터링하는 것이 안전합니다:

```typescript
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const digest = typeof err === 'object' && err !== null && 'digest' in err ? String(err.digest) : undefined

  // Next.js 제어 흐름 신호는 실제 에러가 아니므로 무시
  if (digest?.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND') {
    return
  }

  // 실제 모니터링 리포팅 진행
  // ...
}
```

---

## 6. 프로덕션 구현 청사진 (Production Blueprint Code)

아래 코드는 Sentry, OpenTelemetry, 구조화된 로거를 모두 아우르는 엔터프라이즈급 `instrumentation.ts` 표준 템플릿입니다.

```typescript
// instrumentation.ts
import { type Instrumentation } from 'next'
import * as Sentry from '@sentry/nextjs'
import { trace, SpanStatusCode } from '@opentelemetry/api'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const digest =
    typeof err === 'object' && err !== null && 'digest' in err
      ? String(err.digest)
      : undefined

  // 1. Next.js 내부 제어 흐름 예외 무시
  if (digest?.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND') {
    return
  }

  // 2. OpenTelemetry 활성 Span에 에러 및 digest 기록
  try {
    const span = trace.getActiveSpan()
    if (span) {
      span.setAttributes({
        'error.digest': digest || 'unknown',
        'next.router.kind': context.routerKind,
        'next.route.path': context.routePath,
        'next.route.type': context.routeType,
        'http.url': request.path,
        'http.method': request.method,
      })
      if (err instanceof Error) {
        span.recordException(err)
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
      }
    }
  } catch (otelErr) {
    console.error('Failed to report error to OpenTelemetry span:', otelErr)
  }

  // 3. Sentry 보고 (Sentry captureRequestError 연계 또는 커스텀 captureException)
  try {
    Sentry.captureRequestError(err, request, context)
  } catch (sentryErr) {
    console.error('Failed to report error to Sentry:', sentryErr)
  }

  // 4. 구조화된 콘솔 로깅 (컨테이너/서버리스 표준 출력)
  const isProd = process.env.NODE_ENV === 'production'
  const logPayload = {
    severity: 'ERROR',
    timestamp: new Date().toISOString(),
    digest,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    request: {
      path: request.path,
      method: request.method,
    },
    context: {
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    },
  }

  if (isProd) {
    // 프로덕션: JSON 한 줄 로그 출력 (Datadog/CloudWatch/Loki 수집용)
    console.error(JSON.stringify(logPayload))
  } else {
    // 로컬 개발: 가독성을 위한 포맷 출력
    console.error(`[Error Digest: ${digest}]`, err)
  }
}
```

---

## 7. 공식 1차 출처 및 참고 문헌 (Primary Sources & References)

1. **Next.js 공식 문서 - Routing: Error Handling**
   * URL: `https://nextjs.org/docs/app/building-your-application/routing/error-handling`
   * 핵심 내용: 프로덕션 환경의 Server Component 에러 메시지 마스킹 보안 정책, `error.digest` 프로퍼티 정의, `error.js` 및 `global-error.js` 바운더리 동작.
2. **Next.js 공식 문서 - File Conventions: `instrumentation.js` (`onRequestError`)**
   * URL: `https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation`
   * 핵심 내용: `onRequestError` 훅 시그니처(`err`, `request`, `context`), App/Pages Router 및 Server Component/Action/Route Handler 지원, `context` 파라미터 스펙(`routerKind`, `routePath`, `routeType`, `renderSource`, `renderType`), 비동기 `await` 원칙.
3. **Next.js 공식 문서 - Optimizing: OpenTelemetry**
   * URL: `https://nextjs.org/docs/app/building-your-application/optimizing/open-telemetry`
   * 핵심 내용: `registerOTel` 함수, `@opentelemetry/api`를 통한 활성 스팬(`trace.getActiveSpan()`) 조회 및 커스텀 스팬/익셉션 레코딩.
4. **Sentry 공식 가이드 - Next.js SDK Error Monitoring**
   * URL: `https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#capture-request-errors`
   * 핵심 내용: `@sentry/nextjs` (v8.28.0+)의 `Sentry.captureRequestError`를 `instrumentation.ts`의 `onRequestError`로 export하는 표준 패턴, `error.tsx`에서 `digest` 태그 연계 및 이슈 검색 방안.
5. **OpenTelemetry Semantic Conventions**
   * URL: `https://opentelemetry.io/docs/specs/semconv/exceptions/`
   * 핵심 내용: Exception 기록 표준 규격(`exception.message`, `exception.stacktrace`, `exception.type`) 및 HTTP/Next.js 커스텀 속성 매핑 가이드라인.
