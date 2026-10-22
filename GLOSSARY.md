# Server Component Error Handling

React Server Components (RSC) 및 Next.js 16 환경에서 서버 렌더링 중 발생하는 오류를 안전하게 격리, 복구, 관측하기 위한 도메인 모델.

## Language

### 오류 분류 (Taxonomy)

**Expected Error**:
데이터 미발견(404), 권한 결손(401/403) 등 비즈니스 도메인의 정상 운영 라이프사이클 내에서 예측 가능한 상태.
_Avoid_: Exception, fatal error, crash

**Unexpected Exception**:
런타임 버그(`TypeError`), DB 연결 풀 고갈, 네트워크 타임아웃 등 비정상적인 시스템/인프라 결함.
_Avoid_: Expected error, operational error, soft error

**Error Digest**:
프로덕션 빌드에서 서버 내부 민감 정보(DB 쿼리, 스택트레이스)의 클라이언트 노출을 차단하기 위해 부여되는 해시 식별자.
_Avoid_: Error code, error token, error id

---

### 바운더리 및 격리 (Boundaries & Isolation)

**Segment Error Boundary**:
라우트 세그먼트 단위로 `error.tsx`에 선언되며, 하위 `page.tsx` 렌더링 실패를 격리하고 `startTransition` 기반 서버 재요청 복구를 제공하는 클라이언트 컴포넌트 경계.
_Avoid_: Layout boundary, global error boundary

**Root Error Boundary**:
`app/global-error.tsx`에 선언되며, 최상위 `app/layout.tsx` 붕괴를 포섭하기 위해 자체 `<html>` 및 `<body>` 태그를 반환하는 최상위 에러 경계.
_Avoid_: Root error.tsx, main boundary

**Granular Error Boundary**:
복합 대시보드 환경에서 특정 보조 위젯의 스트리밍 렌더링 실패가 페이지 전체로 전파되는 것(Blast Radius)을 막기 위해 `<Suspense>` 외곽에 배치하는 컴포넌트 수준 클라이언트 에러 경계.
_Avoid_: Local catch, widget try-catch

---

### 관측성 (Observability)

**Request Error Hook**:
Next.js 서버 런타임에서 발생하는 모든 처리되지 않은 예외를 단일 진입점에서 포착하는 `instrumentation.ts`의 `onRequestError` 함수.
_Avoid_: Global try-catch, custom error middleware
