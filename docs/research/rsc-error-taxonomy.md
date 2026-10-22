# Next.js 16 서버 컴포넌트(RSC) 에러 분류 체계 및 내장 프리미티브 조사 보고서

## 1. 개요 및 배경

React Server Components(RSC)와 Next.js App Router 아키텍처의 도입으로 웹 애플리케이션의 에러 핸들링 모델은 근본적인 전환을 맞이했습니다. 전통적인 클라이언트 사이드 SPA(Single Page Application)나 고전적인 Pages Router SSR(Server-Side Rendering) 환경에서는 에러 처리가 주로 클라이언트 런타임의 `try/catch`나 최상단 `_error.js` 페이지를 통해 단순하게 다루어졌습니다.

그러나 Next.js 15 및 16(React 19 기반) 환경의 RSC 아키텍처에서는 다음과 같은 구조적 특성이 에러 처리에 지대한 영향을 미칩니다:

1. **서버-클라이언트 런타임 격리 및 보안**: 서버 컴포넌트에서 발생한 에러의 내부 정보(데이터베이스 스택 트레이스, 쿼리문, 내부 인프라 주소 등)가 클라이언트로 노출되지 않도록 직렬화 및 마스킹(Masking)되어야 합니다.
2. **스트리밍(Streaming) 및 서스펜스(Suspense) 생명주기**: 응답 본문이 청크(Chunk) 단위로 브라우저에 점진적으로 전송되는 동안 발생한 에러는 이미 전송된 HTTP 헤더를 변경할 수 없으므로, HTTP 상태 코드와 클라이언트 렌더링 간의 불일치를 유발합니다.
3. **제어 흐름(Control Flow)과 예외의 결합**: Next.js의 핵심 네비게이션 및 세맨틱 HTTP 상태 전이(`redirect()`, `notFound()`, `forbidden()`, `unauthorized()`)가 JavaScript 예외(`throw`) 메커니즘을 기반으로 구현되어 있습니다.

본 연구 보고서는 Next.js 16 및 React 19 공식 문헌과 소스코드를 바탕으로, 서버 컴포넌트 렌더링 중 발생하는 오류의 공식 분류 체계(Expected Errors vs Unexpected Exceptions), 내장 제어 프리미티브의 내부 동작 원리 및 한계, 그리고 Result 타입 반환 패턴의 동작 원리와 트레이드오프를 체계적으로 분석합니다.

---

## 2. Next.js 공식 에러 분류 체계: Expected Errors vs Unexpected Exceptions

Next.js 공식 문서([Next.js Error Handling Guide](https://nextjs.org/docs/app/building-your-application/routing/error-handling))는 애플리케이션 내의 오류를 크게 **예상된 에러(Expected Errors)**와 **예상치 못한 예외(Uncaught/Unexpected Exceptions)**의 두 가지 범주로 명확히 구분합니다.

```
+----------------------------------------------------------------------------------+
|                            Next.js Error Taxonomy                                |
+----------------------------------------+-----------------------------------------+
|      Expected Errors (예상된 에러)      |   Unexpected Exceptions (예상치 못한 예외) |
+----------------------------------------+-----------------------------------------+
| 성격: 정상 운영 중 예측 가능한 상태 변이     | 성격: 런타임 버그, 인프라 장애, 미처리 결함|
| 처리: 값(Return Value / Result)으로 모델링 | 처리: throw 후 Error Boundary로 격리    |
| UI  : 인라인 필드 에러, 부분 폴백 UI        | UI  : 세그먼트 폴백 (error.tsx)          |
| 복구: 입력값 수정, 유저의 정상 조작         | 복구: reset() 트리거를 통한 리렌더링     |
| 전파: 컴포넌트 내부 및 Props로 제어         | 전파: 상위 세그먼트 바운더리로 버블링     |
+----------------------------------------+-----------------------------------------+
```

### 2.1 예상된 에러 (Expected Errors)

* **정의**: 애플리케이션의 정상적인 운영 주기 내에서 비즈니스 로직상 충분히 발생할 수 있다고 예측되는 상황입니다. 
  - 예: 로그인 비밀번호 불일치, 이미 존재하는 이메일 주소, 폼 입력 유효성 검사 실패, 외부 API의 일시적 400 계열 클라이언트 오류.
* **공식 권장 처리 원칙**:
  - `try/catch`로 예외를 던지거나(`throw`) 전역 에러 경계를 터뜨리지 않습니다.
  - **에러를 정상적인 반환 값(Return value) 또는 상태(State)로 모델링**합니다.
  - Server Actions(뮤테이션)에서는 `Result` 타입이나 에러 메시지 객체를 반환하고, React 19의 `useActionState` 훅을 통해 클라이언트 폼 상태를 유지하면서 인라인 에러를 노출합니다.
  - Server Components(조회)에서는 하위 위젯이나 비핵심 데이터의 결손 시 인라인 폴백 UI(예: "날씨 정보를 불러오지 못했습니다")를 렌더링하여 형제 컴포넌트의 렌더링을 방해하지 않습니다.

### 2.2 예상치 못한 예외 (Unexpected Exceptions)

* **정의**: 코드 레벨의 버그, 시스템 결함, 데이터베이스 커넥션 고갈, 미처리된 널 포인터(`TypeError`), 네트워크 완전 단절 등 정상적인 흐름에서 발생해서는 안 되는 치명적 결함입니다.
* **공식 권장 처리 원칙**:
  - 예외를 즉시 던지고(`throw`), 가장 가까운 **React Error Boundary(`error.tsx` / `global-error.tsx`)**가 이를 포착하도록 허용합니다.
  - 에러가 발생한 라우트 세그먼트만 격리하고, 상위 레이아웃(헤더, 사이드바 등)의 상태는 유지하여 사용자 인터랙션이 중단되지 않도록 보호합니다.
  - 클라이언트 컴포넌트인 `error.tsx`의 `reset()` 콜백을 통해 사용자가 해당 세그먼트만 안전하게 재시도할 수 있도록 지원합니다.

### 2.3 React 19 및 Next.js 16의 에러 직렬화 및 보안 모델 (Sanitization & Digest)

서버 컴포넌트는 Node.js/Edge 서버 런타임에서 실행되므로 민감 정보(DB 연결 문자열, 내부 인프라 IP, 파일 시스템 경로, 개인정보)에 접근합니다. 만약 서버 컴포넌트가 던진 예외 객체가 그대로 브라우저로 전송된다면 심각한 보안 취약점(CWE-209: Information Exposure Through an Error Message)이 발생합니다.

이를 방지하기 위해 React 19와 Next.js 16은 다음과 같은 **에러 마스킹 및 `digest` 체계**를 강제합니다:

1. **프로덕션 메시지 난독화 (Masking)**:
   - 프로덕션 빌드에서 서버 컴포넌트가 예외를 던지면 원본 에러 메시지와 스택 트레이스는 클라이언트로 전송되는 RSC Payload(Flight Data)에서 완전히 삭제됩니다.
   - 브라우저에 전달되는 Error 객체의 `message`는 정적인 기본 문자열로 대체됩니다:
     `"An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details."`
2. **고유 해시 `digest` 주입**:
   - Next.js 서버 런타임은 예외의 스택 트레이스 또는 내용을 기반으로 결정론적(deterministic) 해시인 `digest` 문자열(예: `"digest: '1439281940'"`)을 생성합니다.
   - 이 `digest`는 서버 터미널 로그 및 서버 모니터링 APM(Sentry, Datadog 등)에 원본 에러와 함께 기록됩니다.
   - 클라이언트의 `error.tsx`에 전달되는 `error` 객체는 `Error & { digest?: string }` 형태를 띠며, 사용자가 에러 제보 시 `digest` 코드를 제출하면 엔지니어는 서버 로그에서 실제 에러 원인을 즉시 역추적할 수 있습니다.
3. **React 19 루트 에러 핸들러 연계**:
   - React 19의 `hydrateRoot` / `createRoot` 옵션에 도입된 `onCaughtError`, `onUncaughtError`, `onRecoverableError` 훅을 통해 프레임워크 수준에서 에러 모니터링 파이프라인을 일원화합니다.

---

## 3. Next.js 내장 제어 프리미티브 동작 원리 및 한계

Next.js App Router는 라우트 전환 및 세맨틱 HTTP 상태를 제어하기 위해 4가지 핵심 런타임 프리미티브를 제공합니다: `notFound()`, `redirect()`, `forbidden()`, `unauthorized()`.

이 함수들의 공통적인 본질은 **"반환(return)되는 것이 아니라, 특수한 내부 예외(Control-flow Exception)를 던져서(throw) 렌더링 파이프라인을 중단시키는 제어 흐름 인터럽트"**라는 점입니다.

### 3.1 내장 프리미티브 명세 비교

| 프리미티브 | HTTP 상태 코드 | 트리거되는 컨벤션 파일 | 내부 Digest 식별자 | 도입/안정화 상태 |
| :--- | :--- | :--- | :--- | :--- |
| `notFound()` | **404 Not Found** | `not-found.tsx` | `NEXT_HTTP_ERROR_FALLBACK;404` (또는 `NEXT_NOT_FOUND`) | 안정(Stable) |
| `redirect(url)` | **307 Temporary** / **303 See Other** | 브라우저 리다이렉트 수행 | `NEXT_REDIRECT;replace;...` | 안정(Stable) |
| `permanentRedirect(url)` | **308 Permanent** | 브라우저 영구 리다이렉트 | `NEXT_REDIRECT;...` | 안정(Stable) |
| `unauthorized()` | **401 Unauthorized** | `unauthorized.tsx` | `NEXT_HTTP_ERROR_FALLBACK;401` | 실험(`authInterrupts`) |
| `forbidden()` | **403 Forbidden** | `forbidden.tsx` | `NEXT_HTTP_ERROR_FALLBACK;403` | 실험(`authInterrupts`) |

*출처: [Next.js notFound Docs](https://nextjs.org/docs/app/api-reference/functions/not-found), [Next.js redirect Docs](https://nextjs.org/docs/app/api-reference/functions/redirect), [Next.js forbidden Docs](https://nextjs.org/docs/app/api-reference/functions/forbidden), [Next.js unauthorized Docs](https://nextjs.org/docs/app/api-reference/functions/unauthorized)*

### 3.2 상세 동작 원리

#### 1) `notFound()`
- 데이터 조회 실패 등으로 리소스가 존재하지 않을 때 호출합니다.
- TypeScript 시그니처 상 반환 타입이 `never`입니다 (`function notFound(): never`). 따라서 별도로 `return notFound()` 할 필요 없이 호출 즉시 실행이 영구 중단됩니다.
- 가장 인접한 세그먼트의 `not-found.tsx` 컴포넌트를 렌더링하며, 응답 헤더가 전송되기 전이라면 HTTP 상태 코드 `404`를 온전히 설정합니다.

#### 2) `redirect()` 및 `permanentRedirect()`
- 권한 없는 접근, 인증 완료 후 이동, URL 정규화 시 호출됩니다.
- RSC 렌더링 중 호출되면 HTTP 307/308 헤더를 생성하거나, 클라이언트 트랜지션 시 RSC Flight 프로토콜 상의 리다이렉트 지시문으로 변환되어 브라우저 주소를 이동시킵니다.

#### 3) `forbidden()` 및 `unauthorized()` (`authInterrupts`)
- Next.js 15+에서 도입된 인증/인가 전용 세맨틱 프리미티브로, `next.config.js`에 `experimental: { authInterrupts: true }` 설정이 요구됩니다.
- `unauthorized()`: 미인증 사용자(세션 없음, 로그인 필요) 접근 시 401 응답과 함께 `app/unauthorized.tsx`를 렌더링합니다.
- `forbidden()`: 인증은 되었으나 특정 리소스에 대한 인가(Role/Permission) 권한이 부족할 때 403 응답과 함께 `app/forbidden.tsx`를 렌더링합니다.
- **보안 및 SEO 보호 메커니즘**: Next.js는 `unauthorized()`나 `forbidden()`이 트리거될 때 응답 HTML의 `<head>`에 자동으로 `<meta name="robots" content="noindex" />` 태그를 주입합니다. 이를 통해 검색 엔진 크롤러가 비공개/권한 제한 페이지의 대체 UI를 색인(Indexing)하는 것을 원천 차단합니다.

### 3.3 내장 제어 프리미티브의 치명적 한계 및 `unstable_rethrow`

#### 1) 일반 `try/catch` 문에 의한 "삼킴(Swallowing)" 현상
개발자가 데이터베이스 조회나 네트워크 요청을 감싸기 위해 통상적인 `try/catch` 블록을 작성하고 그 내부에서 이들 함수를 호출하면, Next.js 내부 제어 예외가 catch 블록에 걸려 정상적인 제어 흐름이 완전히 마비됩니다.

```typescript
// ❌ 안티패턴: Next.js 제어 신호가 catch 블록에 삼켜짐
try {
  const item = await db.item.findUnique({ where: { id } });
  if (!item) {
    notFound(); // 내부적으로 throw NEXT_HTTP_ERROR_FALLBACK;404 실행
  }
} catch (error) {
  // notFound()가 던진 에러를 애플리케이션 장애로 오인하여 삼켜버림!
  console.error("DB 오류 발생:", error);
  // 결과: 404 페이지로 이동하지 않고 아래 코드가 비정상 실행되거나 잘못된 Fallback 표시
}
```

#### 2) 해결책: `unstable_rethrow` 및 `isNextRouterError`
Next.js는 이러한 내부 제어용 에러를 식별하고 상위 런타임으로 통과(re-throw)시키기 위해 `unstable_rethrow` API를 제공합니다([Next.js unstable_rethrow Docs](https://nextjs.org/docs/app/api-reference/functions/unstable_rethrow)).

```typescript
// ✅ 권장 패턴: try/catch 블록 내에서 unstable_rethrow 호출
import { notFound, unstable_rethrow } from 'next/navigation';

try {
  const item = await db.item.findUnique({ where: { id } });
  if (!item) {
    notFound();
  }
  return item;
} catch (error) {
  // Next.js의 내부 제어 에러(redirect, notFound, authInterrupts 등)는 즉시 다시 던짐
  unstable_rethrow(error);

  // 순수 비즈니스/인프라 런타임 에러만 catch하여 처리
  logger.error("진짜 DB 장애:", error);
  throw error; // 또는 적절한 Fallback 반환
}
```

> **최선의 실무 권장안**: `try/catch` 블록 내부에서는 순수한 I/O 작업만 수행하고, 결과 데이터 검증 및 `notFound()`, `redirect()`, `forbidden()` 호출은 **반드시 `try/catch` 블록 외부**에서 수행하는 것이 가장 안전합니다.

#### 3) 루트 레이아웃(`app/layout.tsx`)에서의 호출 불가 제약
- `notFound()`, `forbidden()`, `unauthorized()`는 루트 레이아웃 내부에서 호출할 수 없습니다. 이들 컴포넌트는 자신이 포함될 상위 레이아웃 컨텍스트를 필요로 하므로, 루트 레이아웃에서 발생한 제어는 처리할 수 없습니다.

---

## 4. Result 타입 반환 패턴의 동작 원리와 한계 (RSC 관점)

함수형 프로그래밍의 `Either` 모나드에서 유래한 **Result 타입 패턴**(성공과 실패를 판별 유니온 객체로 반환)은 Server Actions 및 컴포넌트 데이터 페칭에서 널리 활용되고 있습니다.

```typescript
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };
```

### 4.1 Result 패턴의 장점 (RSC 적용 관점)

1. **컴포넌트 단위 부분 실패(Partial Failure) 격리**:
   - 여러 개의 비동기 위젯으로 구성된 대시보드 페이지에서 특정 외부 날씨 API가 일시 다운되었을 때, `throw`를 사용하면 가장 가까운 `error.tsx`가 트리거되어 대시보드 전체(또는 세그먼트 전체)가 에러 화면으로 바뀝니다.
   - 반면 Result 타입을 사용하여 실패 시 `{ success: false, error: '날씨 조회 불가' }`를 반환하고 컴포넌트 내부에서 경고 배너를 렌더링하면, 핵심 주식 시세나 계좌 정보 위젯은 정상적으로 사용자에게 서비스됩니다.
2. **Server Actions 및 폼 상태 보존**:
   - `useActionState`와 결합하여 사용자가 입력한 방대한 양의 폼 데이터를 그대로 유지한 채 특정 필드의 유효성 검증 오류 메시지만 안전하게 클라이언트에 전달할 수 있습니다.

### 4.2 RSC에서 Result 패턴 적용 시의 치명적 한계 및 트레이드오프

서버 컴포넌트 렌더링 관점에서 Result 패턴을 무분별하게 적용할 경우 심각한 아키텍처적 부작용이 발생합니다.

#### 1) HTTP 상태 코드 왜곡 (The "Soft 404" & "Soft 500" 문제)
- **메커니즘**: 서버 컴포넌트가 Result 패턴을 사용하여 에러를 반환하고, 내부에서 에러 안내 UI(`<div>요청하신 게시글이 존재하지 않습니다</div>`)를 렌더링하면, Next.js 서버는 이 응답을 정상적인 렌더링으로 인식하여 클라이언트와 검색 엔진에 **`HTTP 200 OK`**를 응답합니다.
- **SEO 및 크롤러 피해**: Googlebot 등 검색 엔진 크롤러는 `200 OK` 응답을 받았으므로 해당 에러 페이지를 유효한 콘텐츠로 간주하여 색인(Indexing)합니다. 이는 검색 품질 저하 및 "Soft 404" 경고를 초래합니다.
- **모니터링(APM) 사각지대**: 시스템 장애나 API 연동 실패가 지속되고 있음에도 HTTP 200 성공으로 기록되므로, 5xx 에러율 알림(PagerDuty, Datadog)이 트리거되지 않아 장애 감지가 지연됩니다.

#### 2) CDN 및 Full Route Cache 오염 (Cache Poisoning 위험)
- Next.js의 Full Route Cache나 에지 CDN(Cloudflare, Vercel Edge Network)은 기본적으로 `200 OK` 응답을 캐싱하도록 설계되어 있습니다.
- 일시적인 DB 타임아웃이나 다운스트림 네트워크 장애로 인해 Result 에러 UI가 `200 OK`로 렌더링된 채 캐시 레이어에 저장되면, 장애가 복구된 이후에도 모든 사용자에게 오염된 에러 캐시 페이지가 지속적으로 서빙되는 치명적 사고로 이어집니다.

#### 3) 제어 흐름의 장황함 및 보일러플레이트 누적
- 예외(`throw`) 기반 구조는 에러 발생 시 중간 계층의 개입 없이 상위 바운더리로 즉시 탈출(Bailout)할 수 있습니다.
- 반면 Result 타입을 취하면 컴포넌트 트리의 모든 계층에서 매번 `if (!result.success) return <ErrorFallback />` 형태의 조건 분기를 반복 작성해야 하며, 선언적인 React Suspense 및 Error Boundary의 혜택을 온전히 누리지 못합니다.

#### 4) 직렬화 경계(Serialization Boundary) 제약
- 서버 컴포넌트에서 클라이언트 컴포넌트로 전달되는 Result 객체는 반드시 JSON 직렬화가 가능해야 합니다. 자바스크립트의 표준 `Error` 객체, 커스텀 에러 프로토타입 메서드, 스택 트레이스 등은 RSC 경계를 통과할 수 없으므로 순수 Plain Object로 직렬화하는 오버헤드가 수반됩니다.

---

## 5. 스트리밍 SSR(Streaming & Suspense)과 에러 상태 코드의 상관관계

Next.js App Router의 가장 강력한 기능 중 하나는 `loading.tsx`와 `<Suspense>`를 활용한 스트리밍 SSR(Streaming Server-Side Rendering)입니다. 그러나 스트리밍 아키텍처는 HTTP 프로토콜의 근본적인 제약과 결합하여 독특한 에러 딜레마를 형성합니다.

```
+-----------------------------------------------------------------------------------+
|                        Streaming SSR Error Lifecycle                              |
+-----------------------------------------------------------------------------------+
| 1. [Pre-Stream Phase] (초기 Shell 및 메타데이터 렌더링 단계)                          |
|    - HTTP 응답 헤더가 아직 클라이언트로 전송되지 않음                                  |
|    - 에러 발생 시 -> HTTP 500 또는 404 상태 코드 전송 가능                          |
+-----------------------------------------------------------------------------------+
                                         │
                        [HTTP 헤더 및 Shell 바이트 플러시 (200 OK 확정)]
                                         ▼
+-----------------------------------------------------------------------------------+
| 2. [Mid-Stream Phase] (지연된 <Suspense> 자식 RSC 렌더링 단계)                     |
|    - 이미 브라우저에 200 OK 상태 코드와 HTML 뼈대가 전송 완료됨                       |
|    - 이후 Suspense 내부에서 에러 발생 (throw new Error())                           |
|    - HTTP 상태 코드를 사후에 500으로 번복할 수 없음 (HTTP 스펙상 헤더는 수정 불가)   |
|    - 처리: RSC 스트림에 에러 청크 직렬화 전송 -> 클라이언트 Error Boundary가 폴백 렌더링|
+-----------------------------------------------------------------------------------+
```

### 5.1 사전 스트리밍(Pre-Stream) 에러 vs 중간 스트리밍(Mid-Stream) 에러

1. **사전 스트리밍(Pre-Stream) 에러**:
   - 메타데이터 생성(`generateMetadata`), 루트 레이아웃 실행, 또는 Suspense 바운더리 외부의 최상위 페이지 렌더링 중에 발생한 예외입니다.
   - 아직 브라우저로 단 1바이트도 전송되지 않았으므로, Next.js는 응답 헤더를 `HTTP 500 Internal Server Error` 또는 `404 Not Found`로 정상 설정할 수 있습니다.
2. **중간 스트리밍(Mid-Stream) 에러**:
   - `<Suspense fallback={<Loading />}>`로 감싸진 비동기 서버 컴포넌트가 지연 렌더링(Streaming chunk)되는 도중 발생한 예외입니다.
   - 브라우저는 이미 `200 OK` 헤더와 초기 HTML Shell을 수신한 상태입니다. HTTP 명세상 이미 전송된 상태 코드는 사후 변경할 수 없습니다([RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)).
   - 따라서 브라우저 네트워크 탭에는 **200 OK**로 찍히지만, DOM 트리는 React 클라이언트 런타임에 의해 해당 Suspense 영역이 `error.tsx` 폴백 컴포넌트로 치환됩니다.

### 5.2 아키텍처 설계 지침
- **SEO 및 인증/인가의 최상단 배치**: 리소스의 존재 유무(`notFound()`), 사용자 인증(`unauthorized()`), 권한(`forbidden()`) 등 HTTP 상태 코드가 핵심적인 결정 요인은 **스트리밍(Suspense) 바운더리 안쪽에 숨기지 말고 페이지 상단(또는 레이아웃)에서 즉시 판정**하여 헤더 플러시 전에 호출되도록 설계해야 합니다.
- **비핵심 컴포넌트의 스트리밍 격리**: 추천 상품, 관련 댓글, 부가 통계 등 핵심 본문이 아닌 데이터는 Suspense로 격리하여, 설령 오류가 발생하여 200 OK 상태에서 인라인 폴백이 렌더링되더라도 사용자 전체 경험 및 SEO에 미치는 영향을 최소화합니다.

---

## 6. 결론 및 종합 가이드라인 (Decision Matrix)

Next.js 16 및 React 19 환경에서 서버 컴포넌트 에러를 다룰 때 적용해야 할 최종 의사결정 매트릭스는 다음과 같습니다.

### 6.1 에러 핸들링 의사결정 매트릭스

| 시나리오 / 상황 | 에러 분류 | 권장 메커니즘 | HTTP 상태 코드 | UI 처리 방식 |
| :--- | :--- | :--- | :--- | :--- |
| **핵심 페이지 엔티티 없음** (예: `/posts/999`) | Expected Error | `notFound()` 호출 | **404** (Pre-stream) | `not-found.tsx` 전용 페이지 |
| **비로그인 사용자 접근** (인증 만료) | Expected Error | `unauthorized()` 호출 | **401** (Pre-stream) | `unauthorized.tsx` + noindex |
| **권한 부족 사용자 접근** (일반 유저가 어드민 접근) | Expected Error | `forbidden()` 호출 | **403** (Pre-stream) | `forbidden.tsx` + noindex |
| **페이지 이전 또는 비인가 리다이렉트** | Control Flow | `redirect()` 호출 | **307 / 303** | 대상 URL로 즉시 이동 |
| **서버 액션 폼 검증 실패 / 비즈니스 규칙 위반** | Expected Error | **Result 타입 객체 반환** | 200 (Action 응답) | 클라이언트 `useActionState` 인라인 폼 에러 |
| **대시보드 내 비핵심 보조 위젯 조회 실패** | Expected Error | **Result 타입 / Try-Catch Fallback** | 200 OK | 해당 위젯 카드 내 인라인 에러 배너 |
| **DB 연결 풀 고갈 / 구문 오류 / 시스템 장애** | Unexpected Exception | **`throw error`** | **500** (Pre-stream) / 200 (Mid-stream) | `error.tsx` 바운더리 + `reset()` 재시도 UI |
| **루트 레이아웃 / 최상단 렌더링 결함** | Unexpected Exception | **`throw error`** | **500** | `global-error.tsx` (고유 html/body 포함) |

### 6.2 실무 개발 3대 원칙
1. **제어 프리미티브는 `try/catch` 밖에서 호출하라**: `notFound()`, `redirect()`, `forbidden()`, `unauthorized()`는 자바스크립트 예외이므로 `try/catch`로 무심코 감싸면 정상 동작이 중단됩니다. 불가피하게 감싸야 한다면 반드시 `unstable_rethrow(err)`를 선두에 배치하십시오.
2. **페이지의 정체성을 결정하는 에러는 제어 프리미티브로, 부가 요소는 Result 패턴으로 격리하라**: 페이지 전체가 성립할 수 없는 경우(404, 401, 403)에는 절대 Result 패턴으로 200 OK를 반환하지 마십시오. 반면 페이지 일부 위젯의 실패는 Result 패턴으로 격리하여 장애 전파를 방지하십시오.
3. **프로덕션 에러 모니터링은 `digest`를 중심으로 설계하라**: 클라이언트의 `error.tsx`는 보안상 원본 메시지를 알 수 없습니다. 센트리(Sentry)나 로그 수집기 연동 시 반드시 `error.digest`를 수집하고 서버 측 로그와 매핑하십시오.

---

## 7. 공식 1차 출처 (Primary Sources)

1. **Next.js 공식 문서 (App Router Error Handling)**
   - [Error Handling Guide](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
   - [`error.js` File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/error)
   - [`not-found.js` File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/not-found)
   - [`unauthorized.js` File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/unauthorized)
   - [`forbidden.js` File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/forbidden)
2. **Next.js 공식 네비게이션 함수 명세**
   - [`notFound()` Function](https://nextjs.org/docs/app/api-reference/functions/not-found)
   - [`redirect()` Function](https://nextjs.org/docs/app/api-reference/functions/redirect)
   - [`unauthorized()` Function](https://nextjs.org/docs/app/api-reference/functions/unauthorized)
   - [`forbidden()` Function](https://nextjs.org/docs/app/api-reference/functions/forbidden)
   - [`unstable_rethrow()` Function](https://nextjs.org/docs/app/api-reference/functions/unstable_rethrow)
   - [`authInterrupts` Configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/authInterrupts)
3. **React 19 공식 명세 및 에러 핸들링**
   - [React DOM Client - `hydrateRoot` Error Hooks](https://react.dev/reference/react-dom/client/hydrateRoot#catching-uncaught-errors-on-the-client)
   - [React 19 Server Components Error Serialization & Digest](https://react.dev/blog/2024/12/05/react-19#better-error-reporting)
4. **Vercel Next.js 소스코드 및 GitHub Discussions**
   - [GitHub Discussion #64076: RFC: unstable_rethrow API](https://github.com/vercel/next.js/discussions/64076)
   - [Next.js Navigation Components Implementation](https://github.com/vercel/next.js/blob/canary/packages/next/src/client/components/navigation.ts)
   - [Next.js Router Error Classifier (`is-next-router-error.ts`)](https://github.com/vercel/next.js/blob/canary/packages/next/src/client/components/is-next-router-error.ts)
5. **IETF HTTP Semantics Spec**
   - [RFC 9110: HTTP Semantics - Status Codes & Streaming Framing](https://www.rfc-editor.org/rfc/rfc9110.html)
