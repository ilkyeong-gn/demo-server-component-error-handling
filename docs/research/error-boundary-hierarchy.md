# Next.js 16 에러 바운더리 계층 구조 및 세분화된 장애 격리 패턴 조사 보고서

## 1. 개요 (Executive Summary)

Next.js 16 (React 19 기반) App Router는 서버 컴포넌트(RSC), 스트리밍 SSR(Streaming SSR), 서스펜스(Suspense)를 결합한 고도화된 렌더링 파이프라인을 제공합니다. 그러나 기존 Pages Router와 달리 중첩된 세그먼트(Nested Segments) 구조와 비동기 스트리밍 환경에서는 에러의 발생 지점과 처리 바운더리의 계층적 위치에 따라 시스템 장애 영향 범위(Blast Radius)가 극적으로 달라집니다.

본 연구 보고서는 다음의 핵심 과제를 집중 조사하여 규명합니다:
1. `error.tsx`, `global-error.tsx`, `not-found.tsx` 등 파일 기반 에러 바운더리의 정확한 계층 트리와 중첩 구조.
2. 동일 세그먼트 내 `layout.tsx`의 에러를 `error.tsx`가 포섭하지 못하는 아키텍처적 원인과 `global-error.tsx`의 필수 역할.
3. 클라이언트 컴포넌트 제약(`'use client'`), 프로덕션 에러 마스킹(`digest`), `reset()`과 `router.refresh()`의 결합 복구 메커니즘.
4. 비동기 RSC 스트리밍 환경에서 단일 컴포넌트 실패가 전체 페이지 언마운트(Page Crash)로 이어지는 현상과 이를 방지하기 위한 컴포넌트 수준 장애 격리(Granular Component-level Fault Isolation) 패턴.

---

## 2. Next.js 16 App Router 에러 바운더리 계층 구조 (Hierarchy Architecture)

### 2.1 파일 기반 세그먼트 중첩 트리

Next.js App Router의 라우트 세그먼트(Route Segment)는 특수 목적 파일들을 정해진 고정된 순서로 상호 중첩(Nest)하여 렌더 트리를 구성합니다.

공식 Next.js 아키텍처 사양에 따른 단일 세그먼트 내부의 실제 컴포넌트 트리 구조는 다음과 같습니다:

```jsx
<Layout>
  <Template>
    <ErrorBoundary fallback={<Error />}>
      <Suspense fallback={<Loading />}>
        <NotFoundBoundary fallback={<NotFound />}>
          <ForbiddenBoundary fallback={<Forbidden />}>
            <UnauthorizedBoundary fallback={<Unauthorized />}>
              <Page /> {/* 또는 하위 세그먼트의 중첩 <Layout> */}
            </UnauthorizedBoundary>
          </ForbiddenBoundary>
        </NotFoundBoundary>
      </Suspense>
    </ErrorBoundary>
  </Template>
</Layout>
```

#### 컴포넌트 계층 순서 (Outer to Inner)
1. **`<Layout>` (`layout.tsx`)**: 세그먼트의 최외곽 셸. 네비게이션, 공통 상태를 유지하며 리렌더링되지 않음.
2. **`<Template>` (`template.tsx`)**: 네비게이션 시마다 새 인스턴스를 생성하는 래퍼.
3. **`<ErrorBoundary>` (`error.tsx`)**: 런타임 예외를 포착하여 대체 UI(Fallback)를 표시하는 React Error Boundary.
4. **`<Suspense>` (`loading.tsx`)**: 하위 비동기 작업 스트리밍 대기 시 즉각적인 로딩 스켈레톤을 제공하는 Suspense Boundary.
5. **`<NotFoundBoundary>` (`not-found.tsx`)**: `notFound()` 호출 시 트리거되는 404 전용 바운더리.
6. **`<ForbiddenBoundary>` / `<UnauthorizedBoundary>` (`forbidden.tsx` / `unauthorized.tsx`)**: Next.js 15.1+ `authInterrupts` 활성화 시 동작하는 403/401 인가/인증 바운더리.
7. **`<Page>` (`page.tsx`)**: 해당 세그먼트 고유의 UI 및 데이터 렌더링 단위.

---

### 2.2 계층 간 포섭 관계 및 Layout 에러 전파 원리

```
[app]
 ├── layout.tsx (Root Layout) ----> 포섭 대상: 없음 (global-error.tsx만 가능)
 ├── error.tsx -------------------> 포섭 대상: app/page.tsx, 하위 세그먼트 전체 (app/layout.tsx 제외!)
 └── dashboard/
      ├── layout.tsx -------------> 포섭 대상: app/error.tsx (부모 바운더리)
      ├── error.tsx --------------> 포섭 대상: dashboard/page.tsx, dashboard 하위 컴포넌트 (dashboard/layout.tsx 제외!)
      └── page.tsx
```

#### 동일 세그먼트 Layout 에러 미포섭 원인
- 컴포넌트 트리를 보면 `<Layout>`이 `<ErrorBoundary fallback={<Error />}>`의 **외부(Parent)**에 위치합니다.
- React Error Boundary의 런타임 불변 법칙에 따라, 부모 컴포넌트에서 발생한 렌더링 예외는 자신의 자식(Child)에 위치한 Error Boundary가 포착할 수 없습니다.
- 따라서 `app/dashboard/layout.tsx`에서 에러가 발생하면, 같은 폴더의 `app/dashboard/error.tsx`는 트리거되지 않으며, 상위 부모 세그먼트인 `app/error.tsx`로 예외가 버블링됩니다.

---

### 2.3 `global-error.tsx`의 동작 특성 및 루트 레이아웃 장애 대응

루트 레이아웃(`app/layout.tsx`)은 애플리케이션의 최상위 컴포넌트이므로, 그 어떤 세그먼트 레벨 `error.tsx`로도 포섭할 수 없습니다(`app/error.tsx` 또한 `app/layout.tsx` 내부에 중첩됨).

이를 해결하기 위해 Next.js는 `app/global-error.tsx`라는 특수 글로벌 에러 바운더리를 제공합니다.

#### 주요 특성 및 제약 조건
1. **루트 레이아웃 완전 대체**: `global-error.tsx`가 트리거되면 `app/layout.tsx` 전체가 비활성화되고 `global-error.tsx`가 문서 전체를 대체합니다.
2. **`<html>` 및 `<body>` 태그 필수 선언**: 루트 레이아웃이 통째로 unmount되므로, 컴포넌트 반환값 내에 반드시 자체 `<html>`과 `<body>` 태그를 포함해야 합니다.
3. **프로덕션 환경 한정 동작**: 개발 환경(`next dev`)에서는 Next.js 고유의 에러 오버레이(Error Overlay)가 우선 표시되며, 실제 `global-error.tsx` Fallback UI는 프로덕션 빌드(`next build` && `next start`)에서만 렌더링됩니다.

---

### 2.4 특수 상태 바운더리와의 관계

| 파일명 | 트리거 조건 | 컴포넌트 유형 | HTTP Status Code | 주요 용도 |
| :--- | :--- | :--- | :--- | :--- |
| **`error.tsx`** | 처리되지 않은 런타임 예외 (Uncaught Exception) | **Client (`'use client'` 필수)** | 500 (SSR 시점 실패 시) | 세그먼트 단위 런타임 장애 복구 |
| **`global-error.tsx`** | 루트 레이아웃(`app/layout.tsx`) 또는 전역 최상단 예외 | **Client (`'use client'` 필수)** | 500 | 전역 치명적 장애 격리 (`<html>`/`<body>` 포함) |
| **`not-found.tsx`** | `notFound()` 호출 또는 라우트 미매칭 | **Server (기본값)** 또는 Client | 404 (스트리밍 전) / 200 (스트리밍 도중) | 404 Not Found 화면 UI |
| **`forbidden.tsx`** (15.1+) | `forbidden()` 호출 | Server 또는 Client | 403 (스트리밍 전) / 200 (스트리밍 도중) | 접근 권한 부족 (403 Forbidden) UI |
| **`unauthorized.tsx`** (15.1+) | `unauthorized()` 호출 | Server 또는 Client | 401 (스트리밍 전) / 200 (스트리밍 도중) | 인증 필요 (401 Unauthorized) UI |

> [!NOTE]
> `notFound()`, `forbidden()`, `unauthorized()`는 내부적으로 특수한 Error Digest 형태(`NEXT_NOT_FOUND`, `NEXT_HTTP_ERROR_FALLBACK;403` 등)의 예외를 `throw`하여 렌더링 흐름을 중단합니다. 일반적인 `try/catch` 블록으로 이를 감싸면 바운더리 전파가 가로채어지므로, 반드시 catch하지 않거나 catch 시 re-throw해야 합니다.

---

## 3. 런타임 동작 특성 및 제약 조건 (Runtime Behaviors & Constraints)

### 3.1 Client Component 필수 제약 (`'use client'`)

`error.tsx`와 `global-error.tsx`는 **반드시 `'use client'` 지시어가 선언된 Client Component**여야 합니다.

#### 이유:
1. **React Error Boundary 아키텍처 제약**: React의 Error Boundary는 클래스 컴포넌트의 `componentDidCatch` 및 `static getDerivedStateFromError` 라이프사이클 메서드 또는 클라이언트 측 훅/이벤트 시스템에 의존합니다.
2. **동적 사용자 상호작용 및 복구**: 에러 화면은 사용자에게 "다시 시도(Try Again)" 버튼을 제공하고 클라이언트 상태를 리셋하는 인터랙티브 동작이 필수적입니다.
3. 만약 `'use client'`를 누락할 경우 빌드 타임 컴파일 에러 또는 런타임 에러가 발생합니다.

---

### 3.2 Error Props 인터페이스: `error`와 `reset`

```typescript
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
})
```

- **`error`**: 포착된 에러 인스턴스.
- **`digest`**: 서버 컴포넌트에서 발생한 에러의 경우 서버 측 로그와 매칭할 수 있는 32비트 고유 해시 식별자.
- **`reset()`**: 에러 바운더리의 내부 상태를 초기화하고 해당 라우트 세그먼트의 컴포넌트 트리를 다시 렌더링하도록 요청하는 함수.

---

### 3.3 프로덕션 에러 마스킹과 `digest` 추적 메커니즘

보안 관점에서 서버 사이드 렌더링 중 발생하는 에러 메시지(예: 데이터베이스 연결 문자열, SQL 쿼리 구문, 민감한 비즈니스 로직 스택 트레이스)가 클라이언트에 노출되면 심각한 보안 취약점(Information Disclosure)이 발생합니다.

Next.js는 프로덕션 환경(`NODE_ENV === 'production'`)에서 다음과 같이 동작합니다:
1. **에러 메시지 마스킹**: 클라이언트로 전달되는 `error.message`는 `"An error occurred in the Server Components render..."`와 같은 범용 텍스트로 치환됩니다.
2. **`digest` 해시 발급**: 서버 런타임에서 원본 에러의 스택과 정보를 기반으로 고유 해시값(예: `1234567890`)을 생성하여 서버 콘솔에 로깅하고, 동일한 해시를 클라이언트 `error.digest` 프로퍼티에 주입합니다.
3. **역추적 메커니즘**: 클라이언트 모니터링 도구(예: Sentry)에 `error.digest`를 수집하고, 서버 로그(Datadog, CloudWatch 등)에서 동일 `digest`를 검색하여 원본 서버 예외 스택을 정확하게 매칭합니다.

---

### 3.4 `reset()`의 한계와 `startTransition` + `router.refresh()` 결합 복구 패턴

많은 개발자가 `error.tsx` 구현 시 흔히 범하는 실수가 단순 `onClick={() => reset()}` 바인딩입니다.

#### 단순 `reset()` 호출 시의 치명적 한계:
- 비동기 서버 컴포넌트(RSC)가 데이터 페칭 실패로 예외를 던진 경우, `reset()`만 단독 호출하면 **클라이언트 측 Error Boundary 상태만 리셋**되고 기존에 메모리에 캐시된 실패 RSC 페이로드를 그대로 다시 평가합니다.
- 서버로 새로운 네트워크 요청(Re-fetch)이 발생하지 않아 동일한 실패가 즉시 재발생하고 에러 화면에서 탈출할 수 없습니다.

#### 공식 권장 복구 패턴:
서버 컴포넌트를 다시 렌더링하고 최신 데이터를 가져오기 위해서는 `next/navigation`의 `router.refresh()`와 React의 `startTransition`을 결합해야 합니다.

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { startTransition, useEffect } from 'react'

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Sentry / Datadog 등 모니터링 시스템에 로깅
    console.error('[Route Segment Error]', {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  const handleRetry = () => {
    startTransition(() => {
      // 1. 라우터 캐시를 무효화하고 서버 컴포넌트를 다시 요청
      router.refresh()
      // 2. 에러 바운더리 상태를 초기화하여 컴포넌트 트리 재마운트
      reset()
    })
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl border border-red-200">
      <h2 className="text-xl font-bold text-red-900 mb-2">세그먼트 렌더링 중 오류가 발생했습니다</h2>
      <p className="text-sm text-red-600 mb-4 font-mono">
        {error.digest ? `오류 코드(Digest): ${error.digest}` : error.message}
      </p>
      <button
        onClick={handleRetry}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
      >
        다시 시도
      </button>
    </div>
  )
}
```

---

### 3.5 React 19 에러 핸들링 API 지원

Next.js 16의 근간인 React 19에서는 렌더링 에러 로깅의 중복을 제거하고 명확한 훅을 제공하기 위해 `createRoot` / `hydrateRoot` 옵션이 표준화되었습니다:
- **`onCaughtError`**: Error Boundary에 의해 정상적으로 포획된 에러를 처리하는 전역 핸들러.
- **`onUncaughtError`**: 어떤 Error Boundary에도 잡히지 않고 애플리케이션 최상단으로 누출된 치명적 에러 핸들러.
- **`onRecoverableError`**: React 런타임이 자동으로 복구한 경미한 렌더링 불일치(Hydration mismatch 등) 핸들러.

---

## 4. 스트리밍(Streaming) 및 Suspense 환경에서의 장애 격리

### 4.1 React Flight 프로토콜 및 비동기 서버 컴포넌트(RSC) 스트리밍 에러 전파

React Server Components 환경에서 서버는 HTML 전체를 한 번에 보내지 않고, 준비된 청크를 React Flight 스트림 포맷으로 점진적 전송합니다.

```
[Server]
  ├── Shell HTML 전송 (Header, Sidebar, Suspense Fallback)
  ├── Async RSC #1 (Hero Section) -> 성공 -> Chunk 스트리밍
  └── Async RSC #2 (Analytics Widget) -> 예외 발생 (DB Timeout)!
        │
        └──> Flight Stream 상에 에러 청크($RX / error marker) 방출
```

1. 서버 렌더러는 `<Suspense>` 내부의 비동기 컴포넌트에서 예외가 발생하면 전체 HTTP 스트림을 중단하지 않습니다.
2. 대신 해당 Suspense 경계에 대해 에러 청크를 스트리밍 프로토콜로 직렬화하여 클라이언트로 전송합니다.
3. 클라이언트 React 런타임은 Flight 스트림 디코딩 도중 에러 청크를 수신하면, 해당 Suspense 영역에 매핑된 **가장 가까운 클라이언트 Error Boundary**를 활성화합니다.

---

### 4.2 페이지 전체 붕괴(Blast Radius Explosion) 현상

파일 기반 `error.tsx`만 사용하는 경우의 아키텍처적 취약점:

```
[app/dashboard/page.tsx]
├── <Suspense fallback={<StatsSkeleton />}>
│     <AsyncStatsWidget />  <--- 정상 동작
└── <Suspense fallback={<FeedSkeleton />}>
      <AsyncFeedWidget />   <--- 💥 DB 쿼리 실패 예외 발생!
```

- 만약 `page.tsx` 내부에 개별 컴포넌트 수준의 Error Boundary가 존재하지 않는다면:
  - `<AsyncFeedWidget>`의 실패 에러는 해당 세그먼트의 `app/dashboard/error.tsx`까지 버블링됩니다.
  - 결과적으로 `app/dashboard/page.tsx` **전체가 언마운트**되고 `error.tsx` 화면으로 통째로 대체됩니다.
  - 정상 동작하던 `<AsyncStatsWidget>`과 페이지의 다른 모든 콘텐츠까지 함께 사라지는 **장애 영향 범위의 과대 폭발(Blast Radius Explosion)**이 발생합니다.

---

### 4.3 세분화된 컴포넌트 수준 바운더리 (Granular Error Boundary) 패턴

페이지 전체 붕괴를 원천 방지하고 컴포넌트 단위 격리를 달성하기 위해 **Client Error Boundary + Suspense Pairing Pattern**을 적용합니다.

```
+-----------------------------------------------------------+
| Dashboard Page (Server Component)                         |
|                                                           |
|  +-----------------------------------------------------+  |
|  | GranularErrorBoundary (Client Component)            |  |
|  |  +-----------------------------------------------+  |  |
|  |  | Suspense (Streaming Boundary)                 |  |  |
|  |  |  +-----------------------------------------+  |  |  |
|  |  |  | AsyncServerWidget (RSC)                 |  |  |  |
|  |  |  +-----------------------------------------+  |  |  |
|  |  +-----------------------------------------------+  |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
```

#### 핵심 규칙:
1. **외곽 Error Boundary, 내부 Suspense 배치**: Error Boundary가 `<Suspense>` 바깥을 감싸야 합니다. 그래야 비동기 RSC 스트리밍 실패 시 Suspense 대기 상태에서 Error Fallback으로 매끄럽게 전이됩니다.
2. **Server Component를 `children`으로 주입**: Client Component인 Error Boundary 내부에 Server Component를 직접 import하지 않고 `children` prop으로 합성(Composition)하여 RSC의 서버 실행 특성을 유지합니다.
3. **독립적 재시도(Retry Scope)**: 특정 위젯이 실패하더라도 해당 위젯 박스 내부의 "다시 시도" 버튼만 클릭하여 부분 재조회가 가능합니다.

---

## 5. 실무 권장 아키텍처 및 구현 코드 예시

### 5.1 Root-Level `global-error.tsx` 표준 템플릿

```tsx
// app/global-error.tsx
'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Critical Global Error]', error)
  }, [error])

  return (
    <html lang="ko">
      <body className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans p-6">
        <main className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center text-2xl font-bold">
            !
          </div>
          <h1 className="text-2xl font-bold mb-2">시스템 전역 오류</h1>
          <p className="text-sm text-slate-400 mb-6">
            애플리케이션 최상단 레이아웃을 로드할 수 없습니다. 관리자에게 문의해 주세요.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-slate-500 mb-6">
              Digest: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 rounded-xl font-semibold transition-all"
          >
            애플리케이션 재시작
          </button>
        </main>
      </body>
    </html>
  )
}
```

---

### 5.2 재사용 가능한 세분화된 클라이언트 바운더리 래퍼 (`GranularErrorBoundary.tsx`)

```tsx
// components/error/GranularErrorBoundary.tsx
'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  fallbackTitle?: string
  fallbackMessage?: string
  fallbackComponent?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class GranularErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Granular Error Caught]', error, errorInfo)
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallbackComponent === 'function') {
        return this.props.fallbackComponent(this.state.error, this.resetErrorBoundary)
      }
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent
      }

      return (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
          <h4 className="font-semibold text-sm">
            {this.props.fallbackTitle || '해당 위젯을 불러오지 못했습니다'}
          </h4>
          <p className="text-xs mt-1 text-amber-700 dark:text-amber-300">
            {this.props.fallbackMessage || '잠시 후 다시 시도해 주세요.'}
          </p>
          <button
            onClick={this.resetErrorBoundary}
            className="mt-3 text-xs px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition-colors"
          >
            새로고침
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

---

### 5.3 다중 비동기 RSC 위젯 대시보드 격리 구현

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react'
import { GranularErrorBoundary } from '@/components/error/GranularErrorBoundary'

// 비동기 서버 컴포넌트 1: 핵심 통계
async function MetricsWidget() {
  const res = await fetch('https://api.example.com/metrics', { cache: 'no-store' })
  if (!res.ok) throw new Error('Metrics API Failed')
  const data = await res.json()
  return <div className="p-4 bg-white rounded-lg shadow">지표: {data.value}</div>
}

// 비동기 서버 컴포넌트 2: 실시간 피드 (불안정한 서드파티 서비스)
async function ExternalFeedWidget() {
  const res = await fetch('https://third-party.example.com/feed', { cache: 'no-store' })
  if (!res.ok) throw new Error('Third-party Feed Service Outage')
  const data = await res.json()
  return <div className="p-4 bg-white rounded-lg shadow">피드 항목 {data.items.length}개</div>
}

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">서비스 대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 위젯 1: 격리된 장애 경계 */}
        <GranularErrorBoundary fallbackTitle="핵심 지표 로드 실패">
          <Suspense fallback={<div className="h-32 bg-slate-100 animate-pulse rounded-lg" />}>
            <MetricsWidget />
          </Suspense>
        </GranularErrorBoundary>

        {/* 위젯 2: 격리된 장애 경계 */}
        <GranularErrorBoundary
          fallbackTitle="외부 피드 연동 불가"
          fallbackMessage="서드파티 서비스 점검 중입니다. 다른 서비스는 정상 이용 가능합니다."
        >
          <Suspense fallback={<div className="h-32 bg-slate-100 animate-pulse rounded-lg" />}>
            <ExternalFeedWidget />
          </Suspense>
        </GranularErrorBoundary>
      </div>
    </div>
  )
}
```

위 구조에서는 `ExternalFeedWidget`에서 예외가 발생하더라도, `GranularErrorBoundary`가 해당 에러를 완벽히 가두어 대체 UI를 출력하며, `MetricsWidget` 및 상단 헤더, 전체 대시보드는 100% 정상 작동을 유지합니다.

---

## 6. 결정 매트릭스 및 모범 사례 (Decision Matrix)

### 6.1 에러 바운더리 레벨별 비교

| 기준 | `global-error.tsx` | Route Segment `error.tsx` | `GranularErrorBoundary` (컴포넌트 단위) |
| :--- | :--- | :--- | :--- |
| **적용 범위 (Scope)** | 루트 레이아웃 포함 애플리케이션 전체 | 특정 세그먼트 및 하위 페이지 (`layout` 제외) | 개별 컴포넌트 / 위젯 단위 |
| **적용 시점** | 최후의 안전망 (Last-resort Fallback) | 세그먼트 뷰 전체 장애 시 | 부분 실패가 허용되는 비필수 비동기 컴포넌트 |
| **HTML 문서 태그** | `<html>`, `<body>` 필수 정의 | 불필요 (일반 JSX 반환) | 불필요 |
| **장애 영향도 (Blast Radius)** | 치명적 (전체 앱 셧다운 대체) | 중간 (해당 라우트 페이지만 차단) | **극소 (해당 위젯 영역만 대체)** |
| **복구 인터랙션** | 전역 리셋 | `startTransition` + `router.refresh()` + `reset()` | 로컬 바운더리 state 초기화 |

---

### 6.2 에러 처리 원칙 가이드라인

1. **예상 가능한 비즈니스 예외(Expected Errors)는 던지지 말 것**:
   - 폼 검증 오류, 잔액 부족, 존재하지 않는 데이터 조회 등은 예외(`throw`) 대신 결과 객체(`{ success: false, error: ... }`) 또는 `notFound()`, `forbidden()`으로 명시적 분기 처리합니다.
2. **비필수 서드파티 연동 RSC는 무조건 세분화 바운더리로 격리**:
   - 광고, 추천 알고리즘, 외부 날씨 API 등 핵심 사용자 여정을 막지 않는 기능은 반드시 `<GranularErrorBoundary>` + `<Suspense>`로 감싸 전체 페이지 다운을 방지합니다.
3. **`error.tsx` 복구 버튼에는 반드시 `router.refresh()` 병행**:
   - 단순 `reset()` 호출은 실패한 서버 컴포넌트 캐시를 비우지 못하므로, `startTransition(() => { router.refresh(); reset(); })`을 표준 패턴으로 고정합니다.
4. **프로덕션 `digest`를 관측성 플랫폼(Sentry / Datadog)과 연동**:
   - 클라이언트의 `error.digest`와 서버 터미널의 에러 로그를 동일 태그로 수집하여 보안을 지키면서도 원인 디버깅을 즉각 수행할 수 있도록 체계를 구축합니다.

---

## 7. 1차 출처 및 참고 문헌 (Primary Sources & References)

1. **Next.js 공식 문서 - Routing: Error Handling**  
   https://nextjs.org/docs/app/building-your-application/routing/error-handling
2. **Next.js 공식 문서 - File Conventions: error.js**  
   https://nextjs.org/docs/app/api-reference/file-conventions/error
3. **Next.js 공식 문서 - File Conventions: not-found.js**  
   https://nextjs.org/docs/app/api-reference/file-conventions/not-found
4. **Next.js 공식 문서 - File Conventions: unauthorized.js**  
   https://nextjs.org/docs/app/api-reference/file-conventions/unauthorized
5. **Next.js 공식 문서 - File Conventions: forbidden.js**  
   https://nextjs.org/docs/app/api-reference/file-conventions/forbidden
6. **Next.js 공식 문서 - Routing: Loading UI and Streaming**  
   https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
7. **Next.js 공식 문서 - Routing: Pages and Layouts (Component Hierarchy)**  
   https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts#component-hierarchy
8. **React 공식 문서 - Error Boundaries & React 19 Root Options (`onCaughtError`, `onUncaughtError`)**  
   https://react.dev/reference/react-dom/client/createRoot
9. **Next.js 16 아키텍처 및 릴리스 노트**  
   https://nextjs.org/blog
