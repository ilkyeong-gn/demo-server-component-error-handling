# 데모 앱 공통 기반 명세: 디렉터리 레이아웃 및 카오스 제어기 유틸리티

> **상위 이슈**: [#7 [Map] Next.js 16 서버 컴포넌트 에러 처리 최소 기능 데모 앱 기획](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/7)  
> **관련 티켓**: [#12 [공통 기반] 데모 앱 프로젝트 구조 및 카오스 제어기 유틸리티 명세](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/12)  
> **표준 문서**: [ADR-0001](../adr/0001-server-component-error-handling-policy.md) · [멘탈 모델](../mental-model.md) · [용어 사전](../../GLOSSARY.md)

---

## 1. 개요 및 설계 목적

본 문서는 ADR-0001의 4대 원칙을 검증하기 위한 **Zero-Config Next.js 16 PoC 데모 앱**의 디렉터리 레이아웃, 공통 카오스 제어기(Chaos Controller), In-Memory 관측성 스토어 및 Result 패턴 유틸리티의 명세를 정의합니다.

후속 하위 티켓들([#8 원칙 1](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/8), [#9 원칙 2](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/9), [#10 원칙 3](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/10), [#11 원칙 4](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/11))은 모두 본 명세에 정의된 라우트 구조와 공통 인터페이스에 의존하여 구체적인 시연 시나리오와 프로토타입을 설계합니다.

---

## 2. 프로젝트 기술 스택 및 환경 설정

- **프레임워크**: Next.js 16 (React 19, Turbopack, App Router)
- **언어**: TypeScript 5.x
- **스타일링**: Tailwind CSS
- **제약 조건**: 외부 SaaS(Sentry, Datadog 등) 및 외부 데이터베이스 의존성 일절 배제 (Zero-Config 로컬 완결형)

### 2.1 Next.js 환경 설정 (`next.config.ts`)

`notFound()`, `unauthorized()`, `forbidden()` 제어 프리미티브가 HTTP 상태 코드(404, 401, 403)와 함께 올바르게 인터럽트 동작하도록 `authInterrupts: true` 플래그를 필수로 활성화합니다.

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true, // notFound(), unauthorized(), forbidden() 지원 필수
  },
};

export default nextConfig;
```

---

## 3. 전체 디렉터리 레이아웃

데모 앱의 전체 소스 코드 레이아웃은 각 원칙의 독립적인 검증과 공유를 고려하여 다음과 같이 구성됩니다.

```text
├── app/
│   ├── layout.tsx                      # Root Layout (GNB, 카오스 제어 툴바 포함)
│   ├── page.tsx                        # 데모 홈 / 4대 원칙 인터랙티브 인덱스
│   ├── global-error.tsx                # [원칙 2] Root Error Boundary (자체 html/body 필수)
│   ├── demo/
│   │   ├── taxonomy/                   # [원칙 1] Expected Error vs Unexpected Exception
│   │   │   ├── page.tsx                # 프리미티브 호출 & Result 패턴 검증 화면
│   │   │   ├── actions.ts              # Server Action (Result 타입 반환 및 unstable_rethrow)
│   │   │   ├── not-found.tsx           # 404 전용 화면
│   │   │   ├── unauthorized.tsx        # 401 전용 화면
│   │   │   └── forbidden.tsx           # 403 전용 화면
│   │   ├── boundaries/                 # [원칙 2] 바운더리 계층 구조 & startTransition 복구
│   │   │   ├── layout.tsx              # 세그먼트 Layout (레이아웃 크래시 테스트 트리거)
│   │   │   ├── error.tsx               # 세그먼트 Error Boundary (startTransition 복구)
│   │   │   └── page.tsx                # 세그먼트 Page (페이지 레벨 크래시 트리거)
│   │   ├── blast-radius/               # [원칙 3] GranularErrorBoundary 대시보드
│   │   │   ├── page.tsx                # 대시보드 메인 셸
│   │   │   └── components/
│   │   │       ├── GranularErrorBoundary.tsx  # 컴포넌트 수준 클라이언트 에러 바운더리
│   │   │       ├── MetricsWidget.tsx          # 정상 지표 위젯 (Async RSC)
│   │   │       ├── ProfileWidget.tsx          # 정상 프로필 위젯 (Async RSC)
│   │   │       └── FeedWidget.tsx             # 장애 유발 가능 외부 피드 위젯 (Async RSC)
│   │   └── observability/              # [원칙 4] Digest 1:1 관측성 대조 대시보드
│   │       ├── page.tsx                # 실시간 서버 로그 ↔ 클라이언트 digest 대조 화면
│   │       └── components/
│   │           └── DigestInspector.tsx        # 클라이언트 Error.digest 수신 및 매칭 뷰어
│   └── api/
│       └── logs/
│           └── route.ts                # In-Memory 서버 에러 로그 조회 API (Digest 매칭용)
├── instrumentation.ts                  # [원칙 4] onRequestError 훅 (서버 에러 가로채기 & 로그 스토어 기록)
└── lib/
    ├── chaos.ts                        # 공통 카오스 제어기 유틸리티
    ├── log-store.ts                    # In-Memory 에러 관측성 저장소 (Zero-Config)
    └── result.ts                       # Result<T, E> 유틸리티 타입 및 생성 헬퍼
```

---

## 4. 공통 카오스 제어기 유틸리티 명세 (`lib/chaos.ts`)

모든 데모 페이지 및 서버 컴포넌트가 일관된 쿼리스트링 규약으로 장애 상황을 재현할 수 있도록 `evaluateChaos` 유틸리티를 제공합니다.

### 4.1 쿼리 파라미터 규약

| 파라미터 | 값 | 설명 | 처리 동작 |
|:---|:---|:---|:---|
| `chaos` | `not_found` | 데이터 미발견 상황 시뮬레이션 | `notFound()` 호출 (404) |
| `chaos` | `unauthorized` | 미인증 사용자 접근 시뮬레이션 | `unauthorized()` 호출 (401) |
| `chaos` | `forbidden` | 권한 결손 상황 시뮬레이션 | `forbidden()` 호출 (403) |
| `chaos` | `unexpected` | 시스템 결함(DB 고갈/Type 오류) 시뮬레이션 | `throw new Error(...)` (500) |
| `chaos` | `layout_crash` | 레이아웃 렌더링 붕괴 시뮬레이션 | `scope: 'layout'`일 때 `throw` |
| `scope` | `string` | 특정 컴포넌트/위젯 한정 타겟팅 (예: `feed`, `layout`, `page`) | 스코프 일치 시에만 동작 |
| `delay` | `number` (ms) | 스트리밍 및 Suspense 지연 시간 시뮬레이션 | `await sleep(delay)` |

### 4.2 TypeScript 인터페이스 및 함수 시그니처

```typescript
import { notFound, unauthorized, forbidden } from 'next/navigation';

export type ChaosTrigger =
  | 'none'
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'unexpected'
  | 'layout_crash';

export interface ChaosEvaluationOptions {
  /** 장애가 발생해야 할 타겟 스코프 (예: 'widget:feed', 'layout', 'page') */
  scope?: string;
  /** 기본 지연 시간 (ms) */
  defaultDelay?: number;
}

/**
 * 쿼리 파라미터를 파싱하여 지정된 카오스 시나리오를 실행합니다.
 */
export async function evaluateChaos(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams | Promise<any>,
  options: ChaosEvaluationOptions = {}
): Promise<void> {
  const params = await resolveSearchParams(searchParams);
  const chaos = (params.get('chaos') || 'none') as ChaosTrigger;
  const targetScope = params.get('scope') || undefined;
  const delayMs = Number(params.get('delay')) || options.defaultDelay || 0;

  // 1. 인위적 네트워크/DB 지연 시뮬레이션 (스트리밍 및 Suspense 검증용)
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // 2. 스코프 필터링 검증
  if (options.scope && targetScope && options.scope !== targetScope) {
    return; // 다른 위젯/스코프를 대상으로 한 에러인 경우 패스
  }

  // 3. 시나리오별 제어 프리미티브 및 예외 실행
  switch (chaos) {
    case 'not_found':
      notFound();
      break;
    case 'unauthorized':
      unauthorized();
      break;
    case 'forbidden':
      forbidden();
      break;
    case 'unexpected':
      throw new Error(`[Simulated System Failure] DB connection pool exhausted at ${new Date().toISOString()}`);
    case 'layout_crash':
      if (options.scope === 'layout') {
        throw new Error(`[Simulated Layout Crash] Unhandled exception in layout at ${new Date().toISOString()}`);
      }
      break;
    case 'none':
    default:
      break;
  }
}

async function resolveSearchParams(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams | Promise<any>
): Promise<URLSearchParams> {
  const resolved = await searchParams;
  if (resolved instanceof URLSearchParams) return resolved;
  const usp = new URLSearchParams();
  if (!resolved) return usp;
  for (const [key, value] of Object.entries(resolved)) {
    if (Array.isArray(value)) {
      value.forEach((v) => usp.append(key, v));
    } else if (typeof value === 'string') {
      usp.set(key, value);
    }
  }
  return usp;
}
```

---

## 5. In-Memory 관측성 스토어 명세 (`lib/log-store.ts`)

Zero-Config 환경에서 원칙 4(Digest 1:1 대조)를 시연하기 위해, 서버에서 발생한 에러 로그를 프로세스 메모리에 보존하고 클라이언트에서 조회할 수 있는 메커니즘을 제공합니다.

### 5.1 로그 데이터 모델

```typescript
export interface ServerErrorLogEntry {
  id: string;
  digest: string;
  errorMessage: string;
  stackTrace: string;
  routeType: 'render' | 'route' | 'action' | 'proxy';
  requestPath: string;
  timestamp: string;
}

class InMemoryLogStore {
  private logs: ServerErrorLogEntry[] = [];
  private readonly maxEntries = 50;

  public add(entry: Omit<ServerErrorLogEntry, 'id' | 'timestamp'>): ServerErrorLogEntry {
    const newEntry: ServerErrorLogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(newEntry);
    if (this.logs.length > this.maxEntries) {
      this.logs.pop();
    }
    return newEntry;
  }

  public getByDigest(digest: string): ServerErrorLogEntry | undefined {
    return this.logs.find((log) => log.digest === digest);
  }

  public getAll(): ServerErrorLogEntry[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
  }
}

// Global singleton instance
export const logStore = new InMemoryLogStore();
```

---

## 6. 중앙 집중식 에러 훅 명세 (`instrumentation.ts`)

Next.js 16의 `onRequestError` 훅을 구현하여 서버에서 발생하는 모든 예외를 포착하고, `logStore`에 등록하여 클라이언트 `error.digest`와 즉시 대조할 수 있도록 합니다.

```typescript
import type { Instrumentation } from 'next';
import { logStore } from '@/lib/log-store';

export const register: Instrumentation.register = async () => {
  // 초기화 로직 (필요 시)
};

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const errorObj = err instanceof Error ? err : new Error(String(err));
  const digest = (err as any)?.digest || 'no-digest';

  // 1. 콘솔 구조화 로그 출력
  console.error(
    JSON.stringify({
      level: 'error',
      digest,
      message: errorObj.message,
      path: request.path,
      routeType: context.routeType,
      timestamp: new Date().toISOString(),
    })
  );

  // 2. In-Memory 로그 스토어에 보존 (Zero-Config UI 대조용)
  logStore.add({
    digest,
    errorMessage: errorObj.message,
    stackTrace: errorObj.stack || '',
    routeType: context.routeType,
    requestPath: request.path,
  });
};
```

---

## 7. Result 패턴 타입 및 유틸리티 명세 (`lib/result.ts`)

원칙 1의 Server Action 폼 검증 등 예상 가능한 비즈니스 규칙 위반을 안전하게 반환하기 위한 표준 타입입니다.

```typescript
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

export const ok = <T>(data: T): Result<T, never> => ({
  success: true,
  data,
});

export const fail = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});
```

---

## 8. 하위 시연 티켓에 미치는 영향 및 연결 규약

1. **#8 [원칙 1] taxonomy**:
   - `/demo/taxonomy?chaos=not_found`, `/demo/taxonomy?chaos=unauthorized`, `/demo/taxonomy?chaos=forbidden` 링크를 UI에 배치하여 프리미티브 작동 확인.
   - `actions.ts`에서 폼 제출 시 `lib/result.ts`의 `fail()` 및 `unstable_rethrow` 처리 검증.
2. **#9 [원칙 2] boundaries**:
   - `/demo/boundaries?chaos=unexpected` (페이지 에러) vs `/demo/boundaries?chaos=layout_crash&scope=layout` (레이아웃 에러) 분기.
   - `error.tsx`에 `startTransition(() => { router.refresh(); reset(); })` 복구 액션 구현.
3. **#10 [원칙 3] blast-radius**:
   - `/demo/blast-radius?chaos=unexpected&scope=feed`로 FeedWidget만 실패시키고 Metrics/Profile 위젯은 정상 동작 유지 확인.
4. **#11 [원칙 4] observability**:
   - `/demo/observability`에서 클라이언트 Error Boundary의 `error.digest`와 `/api/logs`의 `digest`를 1:1로 매칭하여 초록색 뱃지와 함께 서버 원본 스택트레이스를 펼쳐 표시.
