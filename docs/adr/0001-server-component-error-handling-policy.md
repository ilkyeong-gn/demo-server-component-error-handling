# ADR-0001: Next.js 16 서버 컴포넌트 에러 처리 및 관측성 표준 정책

## 상태 (Status)
Accepted (2026-10-22)

## 문맥 (Context)
Next.js 16 (React 19 기반) 환경에서 React Server Components (RSC)는 스트리밍 SSR, 부분 사전 렌더링(Partial Prerendering, PPR), 그리고 프로덕션 빌드의 에러 마스킹(Error Digest) 등 기존 클라이언트 단일 렌더링과 본질적으로 다른 장애 전파 및 보안 모델을 가집니다. 

잘못된 에러 처리는 다음과 같은 심각한 프로덕션 이슈를 야기합니다:
1. **제어 흐름 신호 삼킴(Swallowing)**: `notFound()`, `redirect()` 등 Next.js 내장 제어 예외를 일반 `try/catch`로 삼켜 라우팅이 중단되지 않고 런타임 오류로 번지는 문제.
2. **Soft 200 및 캐시 오염(Cache Poisoning)**: 에러 상황에서 Result 패턴 객체를 무분별하게 렌더링하여 `HTTP 200 OK`로 응답되어 SEO 크롤러 색인 훼손 및 CDN 캐시에 장애 화면이 영구 저장되는 문제.
3. **폭발 반경(Blast Radius) 통제 실패**: 복합 대시보드에서 보조 위젯 하나의 지연 렌더링 실패로 인해 상위 세그먼트 `error.tsx`가 활성화되며 전체 페이지가 언마운트되는 문제.
4. **복구 재시도(Retry) 실패**: 비동기 서버 컴포넌트 오류 발생 시 `error.tsx`에서 단순 `reset()`만 호출하여 캐시된 실패 RSC 페이로드를 다시 렌더링함으로써 복구되지 못하는 문제.
5. **추적성 상실**: 프로덕션 빌드에서 보안을 위해 마스킹된 `digest` 해시와 실제 서버 크래시 로그 간 상관관계(Correlation)가 단절되어 장애 원인 규명이 지연되는 문제.

---

## 결정 사항 (Decision)

팀은 Next.js 16 환경의 서버 컴포넌트 오류 처리 정책으로 다음 4가지 핵심 원칙을 채택합니다.

### 1. 에러 2단계 분류 및 제어 프리미티브 우선 정책
- **Expected Error (예상 가능한 운영 상태)**:
  - 데이터 미발견, 인증/인가 결손 등 비즈니스 도메인의 정상 운영 라이프사이클 내에서 발생할 수 있는 상태는 `throw`하지 않고, 공식 제어 프리미티브(`notFound()`, `unauthorized()`, `forbidden()`)를 직접 호출한다.
  - 이들 프리미티브는 HTTP 응답 헤더가 전송되기 전인 **Pre-stream(초기 Shell 렌더) 시점에 호출**하여 적절한 HTTP 상태 코드(404, 401, 403)와 함께 요청을 즉시 인터럽트해야 한다.
- **`try/catch` 안티패턴 방지**:
  - 데이터 페칭 및 렌더링 로직에서 광범위한 `try/catch` 사용을 지양한다.
  - 불가피하게 `try/catch`를 사용할 경우, `catch` 블록 선두에서 반드시 Next.js 공식 유틸리티인 **`unstable_rethrow(err)`를 호출**하여 프레임워크 제어 신호(`NEXT_NOT_FOUND`, `NEXT_REDIRECT` 등)가 삼켜지지 않도록 보장해야 한다.
- **Unexpected Exception (비정상 시스템 예외)**:
  - 런타임 버그(`TypeError`), DB 풀 고갈, 인프라 장애 등 예기치 못한 시스템 결함만 `throw`하여 상위 Error Boundary로 전파한다.

### 2. 바운더리 계층 구조 및 `startTransition` 복구 표준
- **루트 에러 바운더리 (`app/global-error.tsx`) 필수 배치**:
  - 세그먼트의 `error.tsx`는 동일 폴더의 `layout.tsx` 렌더링 오류를 포섭하지 못한다. 최상위 `app/layout.tsx` 크래시를 방어하기 위해 자체 `<html>` 및 `<body>` 태그를 반환하는 `global-error.tsx` 작성을 의무화한다.
- **서버 컴포넌트 복구 패턴 표준화**:
  - 모든 `error.tsx`의 재시도 버튼 로직은 단순 `reset()` 호출을 금지하고, 서버 컴포넌트 트리를 재요청하는 **`startTransition(() => { router.refresh(); reset(); })`** 패턴을 사용해야 한다.

### 3. 세분화된 장애 격리 (Granular Error Boundary)
- **Blast Radius 폭발 방지**:
  - 복합 페이지에서 페이지의 핵심 본문과 독립적인 보조 위젯(서드파티 피드, 추천 목록, 통계 카드 등)에는 세그먼트 전체 붕괴를 막기 위해 **`<GranularErrorBoundary>`(Client Component) + `<Suspense>` 페어링 패턴**을 적용한다.
  - 보조 위젯의 장애는 해당 위젯 위치에 국소 Fallback UI(안내 메시지 및 개별 재시도 버튼)로 격리되며, 상위 네비게이션 및 정상 컴포넌트의 인터랙션은 온전히 보존된다.

### 4. `instrumentation.ts` 기반 중앙 집중식 관측성 및 Digest 연계
- **서버 에러 인터셉트 단일화**:
  - 모든 서버 측 예외 모니터링은 Next.js 16 공식 표준인 **`instrumentation.ts`의 `onRequestError` 훅**으로 단일화한다.
- **Digest 1:1 Correlation 보장**:
  - `onRequestError(err, request, context)`에서 추출된 `err.digest` 해시를 APM(Sentry `captureRequestError`, OpenTelemetry 활성 Span 속성) 및 구조화된 JSON stdout 로그에 필수로 기록한다.
  - 클라이언트 `error.tsx`에서 수신한 `error.digest`와 서버 원본 스택트레이스를 1:1로 즉시 교차 조회할 수 있는 역추적 환경을 구축한다.

---

## 결과 및 영향 (Consequences)

### 긍정적 효과
- **보안 및 규정 준수**: 프로덕션 환경에서 서버 내부 정보(CWE-209)가 클라이언트에 일절 노출되지 않으면서도, `digest` 해시를 통한 신속한 장애 추적 가능.
- **장애 영향도 최소화**: 세분화된 에러 바운더리로 인해 특정 비동기 컴포넌트의 일시적 장애가 서비스 전체 셧다운으로 이어지지 않음.
- **안정적 복구 경험**: `startTransition + refresh` 결합을 통해 재시도 클릭 시 최신 서버 데이터를 올바르게 다시 가져옴.
- **SEO 및 캐시 무결성**: Soft 200 및 CDN 캐시 오염 방지.

### 주의 사항 및 트레이드오프
- 컴포넌트 단위 바운더리 배치 시 Suspense와의 결합 구조를 준수해야 하므로 컴포넌트 조립 계층(Page Shell)의 코드 템플릿 표준화가 필요함.
- `forbidden()`, `unauthorized()`를 프로덕션에 적용하기 위해서는 `next.config.js`에 `experimental: { authInterrupts: true }` 플래그 설정이 요구됨.
