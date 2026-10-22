# 원칙 4 상세 설계 명세: instrumentation.ts 기반 Digest 관측성 및 1:1 대조 UI

> **상위 이슈**: [#7 [Map] Next.js 16 서버 컴포넌트 에러 처리 최소 기능 데모 앱 기획](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/7)  
> **해당 티켓**: [#11 [원칙 4] instrumentation.ts 기반 Digest 관측성 및 1:1 대조 UI 설계](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/11)  
> **표준 문서**: [ADR-0001](../adr/0001-server-component-error-handling-policy.md) · [멘탈 모델](../mental-model.md) · [공통 기반 명세](./demo-app-foundation.md) · [연구 보고서](../research/digest-and-observability.md)  
> **대화형 프로토타입**: [`prototypes/observability-interaction-prototype.html`](https://github.com/ilkyeong-gn/demo-server-component-error-handling/blob/prototype/observability-interaction/prototypes/observability-interaction-prototype.html) (브랜치: `prototype/observability-interaction`)

---

## 1. 개요 및 설계 목적

본 문서는 **원칙 4 (`instrumentation.ts` 기반 중앙 집중식 관측성 및 Digest 연계)**를 검증하고 시연하기 위한 `/demo/observability` 라우트의 컴포넌트 아키텍처, 서버 런타임 훅 연계, 그리고 클라이언트-서버 1:1 대조 인터페이스의 상세 명세를 정의합니다.

### 핵심 전달 가치

1. **보안 마스킹(CWE-209 방어)과 관측성 단절 해소**:
   - Next.js 16 프로덕션 빌드에서 서버 내부 에러는 민감 정보 유출 방지를 위해 범용 안내문(`"An error occurred in the Server Components render..."`)으로 마스킹되며 난수 해시인 `error.digest`만 클라이언트에 전송됩니다.
   - 본 데모는 클라이언트 바운더리가 수신한 `error.digest`와 서버 터미널 및 In-Memory 스토어에 기록된 원본 스택트레이스를 실시간으로 1:1 대조(Correlation)함으로써, 보안을 침해하지 않고 즉시 원인을 규명할 수 있음을 입증합니다.
2. **단일화된 서버 에러 인터셉터 (`instrumentation.ts`)**:
   - Server Component 렌더링, Server Action 실행, Route Handler 등 서버 측에서 발생하는 모든 예외를 Next.js 16 공식 표준인 `onRequestError(err, request, context)` 훅 하나로 단일 수집합니다.
3. **제어 신호(Control Flow Signals) 알람 필터링**:
   - `notFound()`, `redirect()` 등 정상적인 프레임워크 제어 흐름 예외(`digest === 'NEXT_NOT_FOUND'` 등)가 APM 에러 지표나 Sentry 알람으로 오인 전송되지 않도록 필터링하는 실무 표준을 시연합니다.
4. **Zero-Config 로컬 시연 환경**:
   - 외부 SaaS(Sentry, Datadog) 가입 없이도 로컬 환경에서 동일한 엔터프라이즈 관측성을 체감할 수 있도록 In-Memory 원형 버퍼 로그 스토어(`lib/log-store.ts`) 및 `/api/logs` 조회 엔드포인트를 구축합니다.

---

## 2. 화면 구조 및 UI 정보 구조 (IA)

`/demo/observability` 화면은 브라우저 클라이언트 화면, 서버 터미널 실시간 로그 스트림, 그리고 1:1 매칭 분석기가 한 화면에 배치된 3-영역(Pane) 스플릿 대시보드로 구성됩니다.

```text
+---------------------------------------------------------------------------------------------------+
|  Root Shell (app/layout.tsx) - GNB: Logo | Breadcrumbs | System Health: OK                        |
+---------------------------------------------------------------------------------------------------+
|  Observability Shell (app/demo/observability/page.tsx)                                            |
|  [헤더 & 카오스 제어 툴바]                                                                        |
|  - 모드 토글: [✅ Prod Mode (마스킹 ON)] vs [❌ Dev Mode (비마스킹)]                               |
|  - 카오스 주입: [💥 RSC 렌더 에러] | [⚡ Server Action 에러] | [🔍 notFound() 신호] | [🔄 초기화]  |
|                                                                                                   |
|  +-----------------------------------------------+-----------------------------------------------+
|  | [Pane 1: 클라이언트 브라우저 뷰]             | [Pane 2: 서버 콘솔 stdout 스트림]            |
|  | (app/demo/observability/error.tsx)            | (instrumentation.ts -> terminal output)       |
|  |                                               |                                               |
|  | ⚠️ 오류 발생 안내 (Masked)                    | [21:44:02] [instrumentation.ts]               |
|  | "An error occurred in Server Components..."   | {                                             |
|  |                                               |   "level": "error",                           |
|  | 🔑 클라이언트 식별자:                         |   "digest": "3849102941",                     |
|  | [ Digest: 3849102941 ] [📋 복사]              |   "message": "DB connection timeout",         |
|  |                                               |   "routeType": "render",                      |
|  | [🔍 1:1 원본 서버 로그 역추적 대조]            |   "path": "/demo/observability"               |
|  |                                               | }                                             |
|  +-----------------------------------------------+-----------------------------------------------+
|  | [Pane 3: 1:1 Digest Correlation Inspector (대조 분석기)]                                      |
|  | - 매칭 상태: ✅ 100% MATCHED (Client: 3849102941 <---> Server: 3849102941)                      |
|  | - CWE-209 보안 상태: 🛡️ 클라이언트 내부 정보 노출 0건 (안전)                                   |
|  | - 복원된 원본 에러: Error: DB connection timeout at queryPostgresPool (lib/db.ts:48:11)        |
|  | - APM 스팬 속성: error.digest, next.route.type: render, next.route.path: /demo/observability    |
|  +-----------------------------------------------------------------------------------------------+
+---------------------------------------------------------------------------------------------------+
```

### 상태별 화면 전이 및 대조 매트릭스

| 실행 시나리오 | 클라이언트 표시 (`error.tsx`) | `onRequestError` 캡처 메타데이터 | 1:1 대조 결과 | CWE-209 검증 |
|:---|:---|:---|:---|:---|
| **RSC 렌더링 예외** (`chaos=unexpected`) | 범용 마스킹 문구 + `Digest: <hash>` | `routeType: 'render'`, 원본 스택트레이스, `err.digest` | **100% 일치 (매칭 성공)** | ✅ 통과 (클라이언트에 DB/경로 일절 유출 없음) |
| **Server Action 예외** (`action=fail`) | 범용 마스킹 문구 + `Digest: <hash>` | `routeType: 'action'`, 액션 컨텍스트, `err.digest` | **100% 일치 (매칭 성공)** | ✅ 통과 (서버 뮤테이션 결함 은닉 및 추적성 확보) |
| **제어 신호** (`chaos=not_found`) | 공식 404 UI (`not-found.tsx`) | `digest: 'NEXT_NOT_FOUND'` | **정상 필터링 (무시)** | ✅ 통과 (APM/모니터링 알람 오염 방지) |
| **개발 모드 비교** (`NODE_ENV=dev`) | 원본 에러 및 스택트레이스 노출 | `err.digest` 동일 생성 및 콘솔 출력 | **일치하나 보안 경고** | ⚠️ 경고 (로컬 디버깅용으로만 제한되어야 함) |

---

## 3. 중앙 집중식 에러 훅 명세 (`instrumentation.ts`)

Next.js 16의 공식 표준인 `onRequestError` 훅을 애플리케이션 루트에 선언하여 모든 서버 렌더링, 액션, 라우트 핸들러 예외를 가로챕니다.

### 3.1 파일 위치 및 구현

```typescript
// instrumentation.ts
import type { Instrumentation } from 'next';
import { logStore } from '@/lib/log-store';

export const register: Instrumentation.register = async () => {
  // 로컬 초기화 메시지
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[instrumentation.ts] Next.js 16 Server Instrumentation Initialized.');
  }
};

export const onRequestError: Instrumentation.onRequestError = async (
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string>;
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'proxy';
    renderSource?: 'react-server-components' | 'react-server-components-payload' | 'server-side-rendering';
    revalidateReason?: 'on-demand' | 'stale' | undefined;
    renderType?: 'dynamic' | 'dynamic-resume';
  }
) => {
  const errorObj = err instanceof Error ? err : new Error(String(err));
  const digest = typeof err === 'object' && err !== null && 'digest' in err
    ? String((err as any).digest)
    : undefined;

  // 1. Next.js 공식 제어 흐름 신호 필터링 (불필요한 에러 수집 및 알람 방지)
  if (digest?.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND') {
    // 제어 신호는 모니터링 에러 대상이 아니므로 조기 반환
    return;
  }

  const effectiveDigest = digest || 'unknown-digest';

  // 2. 구조화된 JSON 표준 로그 출력 (Datadog / CloudWatch / 터미널 연계)
  const logPayload = {
    level: 'error',
    digest: effectiveDigest,
    message: errorObj.message,
    stack: errorObj.stack,
    request: {
      path: request.path,
      method: request.method,
    },
    context: {
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
    },
    timestamp: new Date().toISOString(),
  };

  console.error(JSON.stringify(logPayload));

  // 3. In-Memory 로그 스토어에 등록 (로컬 Zero-Config 1:1 대조 조회용)
  logStore.add({
    digest: effectiveDigest,
    errorMessage: errorObj.message,
    stackTrace: errorObj.stack || '',
    routeType: context.routeType,
    requestPath: request.path,
  });
};
```

---

## 4. In-Memory 관측성 스토어 및 실시간 대조 API

외부 DB나 APM 없이 브라우저 클라이언트가 서버에 보관된 원본 로그를 조회할 수 있도록 메모리 버퍼와 REST 엔드포인트를 제공합니다.

### 4.1 로그 스토어 모델 (`lib/log-store.ts`)

```typescript
// lib/log-store.ts
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

// Global Singleton (서버 Node.js 프로세스 수명 주기 동안 유지)
const globalForLogs = globalThis as unknown as { logStore: InMemoryLogStore };
export const logStore = globalForLogs.logStore || new InMemoryLogStore();
if (process.env.NODE_ENV !== 'production') globalForLogs.logStore = logStore;
```

### 4.2 실시간 조회 Route Handler (`app/api/logs/route.ts`)

```typescript
// app/api/logs/route.ts
import { NextResponse } from 'next/server';
import { logStore } from '@/lib/log-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const digest = searchParams.get('digest');

  if (digest) {
    const log = logStore.getByDigest(digest);
    if (!log) {
      return NextResponse.json(
        { found: false, error: '해당 다이제스트와 일치하는 서버 로그를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ found: true, log });
  }

  return NextResponse.json({
    found: true,
    total: logStore.getAll().length,
    logs: logStore.getAll(),
  });
}

export async function DELETE() {
  logStore.clear();
  return NextResponse.json({ success: true, message: '서버 로그 스토어가 초기화되었습니다.' });
}
```

---

## 5. 클라이언트 에러 바운더리 및 1:1 역추적 UI (`app/demo/observability/error.tsx`)

클라이언트는 프로덕션 에러 객체로부터 `error.digest`를 수신하며, 이를 통해 서버 원본 로그와 1:1 대조를 수행합니다.

### 5.1 컴포넌트 구현 명세

```tsx
// app/demo/observability/error.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function ObservabilityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverLog, setServerLog] = useState<any | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // 1:1 서버 원본 로그 조회
  const handleTraceLookup = async () => {
    if (!error.digest) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/logs?digest=${encodeURIComponent(error.digest)}`);
      const data = await res.json();
      if (data.found) {
        setServerLog(data.log);
      } else {
        alert('서버 로그 스토어에 해당 다이제스트가 존재하지 않습니다.');
      }
    } catch (e) {
      console.error('로그 조회 실패:', e);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCopyDigest = () => {
    if (error.digest) {
      navigator.clipboard.writeText(error.digest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRetry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
          <span>⚠️</span> 서버 렌더링 오류 발생 (Application Error)
        </h2>
        <span className="text-xs px-2.5 py-1 rounded bg-red-500/20 text-red-300 font-semibold">
          마스킹 활성화
        </span>
      </div>

      <p className="text-sm text-slate-300">
        {error.message || 'An error occurred in the Server Components render.'}
      </p>

      {/* Digest 배지 영역 */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Error Digest:</span>
          <span className="text-sky-400 font-bold">{error.digest || 'no-digest'}</span>
        </div>
        <button
          onClick={handleCopyDigest}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
        >
          {copied ? '✅ 복사됨' : '📋 복사'}
        </button>
      </div>

      {/* 제어 버튼 */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleTraceLookup}
          disabled={lookupLoading || !error.digest}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg text-xs"
        >
          {lookupLoading ? '조회 중...' : '🔍 서버 원본 로그 1:1 대조 (Trace Log)'}
        </button>
        <button
          onClick={handleRetry}
          disabled={isPending}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs"
        >
          {isPending ? '새로고침 중...' : '🔄 다시 시도 (Retry)'}
        </button>
      </div>

      {/* 1:1 매칭 결과 뷰어 */}
      {serverLog && (
        <div className="mt-4 p-4 bg-slate-950 border border-sky-500/40 rounded-lg text-xs font-mono space-y-2">
          <div className="flex items-center justify-between text-emerald-400 font-bold pb-2 border-b border-slate-800">
            <span>✅ 1:1 Correlation 일치 확인됨</span>
            <span>{serverLog.timestamp}</span>
          </div>
          <div><span className="text-slate-400">Digest:</span> <span className="text-sky-300">{serverLog.digest}</span></div>
          <div><span className="text-slate-400">Route Type:</span> <span className="text-amber-300">{serverLog.routeType}</span></div>
          <div><span className="text-slate-400">Request Path:</span> <span className="text-slate-200">{serverLog.requestPath}</span></div>
          <div><span className="text-slate-400">Root Cause:</span> <span className="text-red-400 font-bold">{serverLog.errorMessage}</span></div>
          <div className="pt-2 text-slate-500 overflow-x-auto">
            <pre>{serverLog.stackTrace}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 6. Sentry & OpenTelemetry 엔터프라이즈 확장 블루프린트

실제 프로덕션 배포 시 `onRequestError` 훅을 Sentry 및 OpenTelemetry와 연계하는 엔터프라이즈 코드 가이드입니다.

```typescript
// instrumentation.ts (Production Enterprise Blueprint)
import type { Instrumentation } from 'next';
import * as Sentry from '@sentry/nextjs';
import { trace, SpanStatusCode } from '@opentelemetry/api';

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const digest = (err as any)?.digest;

  // 제어 신호 배제
  if (digest?.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND') return;

  // 1. Sentry v8.28+ 공식 캡처
  Sentry.captureRequestError(err, request, context);

  // 2. OpenTelemetry 활성 Span 속성 주입
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes({
      'error.digest': digest || 'unknown',
      'next.route.type': context.routeType,
      'next.route.path': context.routePath,
      'http.url': request.path,
    });
    if (err instanceof Error) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    }
  }
};
```

---

## 7. 검증 및 수용 기준 (Acceptance Criteria)

- [x] **단일화된 인터셉트**: Server Component 및 Server Action의 예외가 `instrumentation.ts`의 `onRequestError`를 통해 단일 진입점으로 처리되는가?
- [x] **CWE-209 보안성 검증**: 프로덕션 모드에서 클라이언트에 DB 경로, 원본 에러 메시지, 스택트레이스가 일절 노출되지 않는가?
- [x] **1:1 Correlation 일치성**: 클라이언트 `error.digest`와 서버 `err.digest`가 동일한 해시 문자열로 매핑되며, `/api/logs` 엔드포인트를 통해 원본 로그가 정확히 복원되는가?
- [x] **제어 신호 누출 방지**: `notFound()` 신호(`NEXT_NOT_FOUND`) 발생 시 에러 로그 스토어 및 모니터링 알람으로 오염되지 않고 적절히 필터링되는가?
- [x] **Zero-Config 독립성**: 외부 유료 APM SaaS 의존 없이 로컬 In-Memory 스토어로 전 과정이 온전히 구동되는가?
- [x] **대화형 프로토타입**: `prototype/observability-interaction` 브랜치에 가이드 시나리오를 포함한 단일 HTML 프로토타입이 정상 동작하는가?
