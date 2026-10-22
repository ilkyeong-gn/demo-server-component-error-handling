# 원칙 2 상세 설계 명세: 바운더리 계층 구조 및 startTransition 복구

> **상위 이슈**: [#7 [Map] Next.js 16 서버 컴포넌트 에러 처리 최소 기능 데모 앱 기획](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/7)  
> **해당 티켓**: [#9 [원칙 2] 바운더리 계층 구조 및 startTransition 복구 시연 시나리오 설계](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/9)  
> **표준 문서**: [ADR-0001](../adr/0001-server-component-error-handling-policy.md) · [멘탈 모델](../mental-model.md) · [공통 기반 명세](./demo-app-foundation.md)  
> **대화형 프로토타입**: [`prototypes/boundaries-interaction-prototype.html`](https://github.com/ilkyeong-gn/demo-server-component-error-handling/blob/prototype/boundaries-interaction/prototypes/boundaries-interaction-prototype.html) (브랜치: `prototype/boundaries-interaction`)

---

## 1. 개요 및 설계 목적

본 문서는 **원칙 2 (바운더리 계층 구조 및 `startTransition` 복구 표준)**을 개발자가 브라우저에서 직접 장애를 트리거하고 복구해보며 체득할 수 있도록 `/demo/boundaries` 라우트의 구체적인 UI 레이아웃, 시연 시나리오, 컴포넌트 아키텍처 및 구현 코드를 정의합니다.

### 핵심 전달 가치
1. **바운더리 계층과 Layout 격리 한계**:
   - React 트리 상에서 `layout.tsx`는 `error.tsx`의 **부모(Outer)**에 위치하므로, 동일 세그먼트의 `error.tsx`는 자기 세그먼트의 `layout.tsx` 에러를 포섭할 수 없고 상위 세그먼트(`app/error.tsx`)로 버블링됨을 명확히 시각화.
2. **`app/global-error.tsx`의 필수성**:
   - 루트 레이아웃(`app/layout.tsx`)이 붕괴했을 때 애플리케이션의 최외곽 `<html>`과 `<body>` 태그 자체가 깨지므로, 오직 자체 `<html><body>`를 반환하는 `global-error.tsx`만이 최후의 방어선으로 동작함을 검증.
3. **서버 컴포넌트(RSC) 복구의 함정과 `startTransition` 표준**:
   - 비동기 RSC 렌더링 실패 후 `error.tsx`에서 단순 `reset()`만 호출할 경우, 클라이언트 캐시(Router Cache)에 남아있는 실패 RSC 페이로드를 그대로 재평가하여 **즉시 동일 에러가 재발생(무한 루프 / 복구 실패)**하는 치명적 안티패턴을 재현.
   - `startTransition(() => { router.refresh(); reset(); })` 패턴을 통해 서버에 최신 RSC 페이로드를 다시 요청하고 캐시를 갱신한 뒤 안전하게 정상 상태로 복구하는 표준 생명주기를 확립.

---

## 2. 화면 구조 및 UI 정보 구조 (IA)

`/demo/boundaries` 라우트는 사용자가 계층별 에러 붕괴와 복구 과정을 한눈에 파악할 수 있도록 **레이아웃 셸(Layout Shell) + 상태 제어 패널(Interactive Sandbox)** 구조로 구성합니다.

```text
+---------------------------------------------------------------------------------------------------+
|  Root Shell (app/layout.tsx) - GNB: Logo | Nav Links | 카오스 제어 툴바 | Root Health: OK          |
+---------------------------------------------------------------------------------------------------+
|  Segment Shell (app/demo/boundaries/layout.tsx)                                                   |
|  +-----------------------------+-----------------------------------------------------------------+
|  | Boundaries Sidebar (Layout) | Segment Content Area (app/demo/boundaries/page.tsx or error.tsx)|
|  | - 📁 계층 구조 개요 (Active)| [헤더] 원칙 2: 바운더리 계층 및 startTransition 복구 시연      |
|  | - 🔄 복구 메커니즘          |                                                                 |
|  | - 📊 장애 통계             | [카오스 제어 버튼군]                                            |
|  |                             | - 💥 Page 에러 (?chaos=unexpected&scope=page)                   |
|  | [레이아웃 마운트 인디케이터]| - 💥 Segment Layout 에러 (?chaos=unexpected&scope=layout)       |
|  |                             | - 💥 Root Layout 에러 (?chaos=unexpected&scope=root_layout)     |
|  |                             |                                                                 |
|  |                             | [비동기 데이터 뷰 (RSC)]                                        |
|  |                             | - 서버 데이터 카드 (렌더링 성공 시)                             |
|  |                             |                                                                 |
|  |                             | [에러 발생 시: error.tsx 카드 노출]                             |
|  |                             | - Digest 해시 및 에러 안내                                     |
|  |                             | - [❌ 단순 reset()] [✅ startTransition(() => ...)]             |
|  +-----------------------------+-----------------------------------------------------------------+
+---------------------------------------------------------------------------------------------------+
```

### 상태별 화면 전이 규칙

| 발생 지점 | 트리거 쿼리 | 활성화 바운더리 | UI 변화 및 영향 범위 (Blast Radius) |
|:---|:---|:---|:---|
| **Page** | `?chaos=unexpected&scope=page` | `demo/boundaries/error.tsx` | **국소 격리**: GNB 및 세그먼트 사이드바(Layout) 온전히 유지됨. Page 영역만 에러 Fallback 카드로 대체. |
| **Segment Layout** | `?chaos=unexpected&scope=layout` | `app/error.tsx` (Root EB) | **세그먼트 붕괴**: 사이드바 및 세그먼트 셸 전체가 언마운트됨. 단, 전역 GNB(`app/layout.tsx`)는 유지되어 홈/타 메뉴 이동 가능. |
| **Root Layout** | `?chaos=unexpected&scope=root_layout` | `app/global-error.tsx` | **전역 붕괴**: GNB, CSS 스타일, 전체 문서 태그가 사라지고 `global-error.tsx`의 비상 `<html><body>` 화면 렌더링. |

---

## 3. 시연 시나리오 상세

### 시나리오 1: Page 수준 에러 격리와 Layout 보존
- **목적**: `page.tsx`의 렌더링 실패는 동일 세그먼트의 `layout.tsx`를 파괴하지 않음을 확인.
- **수행 절차**:
  1. `/demo/boundaries?chaos=unexpected&scope=page` 접근 (또는 화면의 "Page 에러 유발" 버튼 클릭).
  2. 세그먼트 내부의 `BoundariesLayout`(좌측 사이드바)과 최상위 `RootLayout`(상단 GNB)이 그대로 렌더링을 유지함을 확인.
  3. 우측 본문 영역만 `demo/boundaries/error.tsx` 컴포넌트로 교체되며 에러 Digest 해시가 표시됨을 확인.

### 시나리오 2: 세그먼트 Layout 에러와 상위 바운더리 버블링
- **목적**: `layout.tsx`는 동일 폴더의 `error.tsx`보다 상위에 존재하므로, `error.tsx`가 이를 잡지 못하고 부모 세그먼트(`app/error.tsx`)로 버블링됨을 확인.
- **수행 절차**:
  1. `/demo/boundaries?chaos=unexpected&scope=layout` 접근.
  2. 동일 폴더의 `demo/boundaries/error.tsx`가 트리거되지 않고, 좌측 사이드바 자체가 사라지며 `app/error.tsx`가 활성화됨을 확인.
  3. 상단 GNB(`app/layout.tsx`)는 여전히 유지되어 사용자가 다른 데모 메뉴로 탈출할 수 있음을 확인.

### 시나리오 3: 루트 Layout 붕괴와 `global-error.tsx`
- **목적**: 최상위 `app/layout.tsx`가 붕괴했을 때 `app/error.tsx`도 동작할 수 없으며 오직 `app/global-error.tsx`만이 작동함을 확인.
- **수행 절차**:
  1. `/demo/boundaries?chaos=unexpected&scope=root_layout` 접근.
  2. 상단 GNB를 포함한 모든 레이아웃 셸이 제거되고, `global-error.tsx`가 자체 렌더링한 전용 비상 복구 화면이 노출됨을 확인.
  3. 전체 브라우저 새로고침 버튼을 통해 정상 복구됨을 확인.

### 시나리오 4: `reset()` 함정 vs `startTransition` 복구 성공
- **목적**: 비동기 서버 컴포넌트 에러 상황에서 단순 `reset()`의 실패 원인과 `startTransition + refresh`의 복구 원리를 체감.
- **수행 절차**:
  1. 카오스로 Page 에러를 유발하여 `error.tsx` 화면 진입.
  2. 카오스 원인 해제 (URL에서 `chaos` 제거 또는 정상화 모의 토글).
  3. **[❌ 단순 reset() 클릭]**:
     - 클라이언트의 `error.tsx` 상태만 리셋되고 서버 재요청이 발생하지 않음.
     - Router Cache에 남아있는 기존의 실패 RSC 페이로드를 다시 렌더링하여 **즉시 동일 에러가 다시 발생함**을 확인.
  4. **[✅ startTransition(() => { router.refresh(); reset(); }) 클릭]**:
     - `router.refresh()`가 서버에 새로운 RSC 페이로드를 요청하여 캐시를 갱신.
     - `startTransition`이 비동기 전환 완료까지 보류(Pending) 상태를 유지한 뒤 바운더리를 리셋.
     - 정상 서버 데이터를 받아 화면이 깨끗하게 복구됨을 확인.

---

## 4. 파일별 컴포넌트 코드 명세

### 4.1 세그먼트 레이아웃 (`app/demo/boundaries/layout.tsx`)

```tsx
import type { ReactNode } from 'react';
import { evaluateChaos } from '@/lib/chaos';

interface BoundariesLayoutProps {
  children: ReactNode;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BoundariesLayout({
  children,
  searchParams,
}: BoundariesLayoutProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  
  // scope: layout일 때 레이아웃 렌더링 붕괴 시뮬레이션
  await evaluateChaos(resolvedParams, 'layout');

  return (
    <div className="flex min-h-[500px] border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
      {/* Segment Sidebar */}
      <aside className="w-56 bg-slate-800/80 border-r border-slate-700 p-4 flex flex-col gap-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Boundaries Layout
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          <span className="px-3 py-2 rounded bg-sky-500/10 text-sky-400 font-semibold">
            📁 계층 구조 시연
          </span>
          <span className="px-3 py-2 rounded text-slate-400">
            🔄 복구 메커니즘
          </span>
          <span className="px-3 py-2 rounded text-slate-400">
            📊 장애 통계
          </span>
        </nav>
        <div className="mt-auto p-2 bg-slate-900/60 rounded border border-slate-700/60 text-xs text-slate-400">
          🟢 Segment Layout 유지 중
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 p-6 flex flex-col">
        {children}
      </section>
    </div>
  );
}
```

### 4.2 세그먼트 에러 바운더리 (`app/demo/boundaries/error.tsx`)

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useState } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BoundariesError({ error, reset }: ErrorProps) {
  const router = useRouter();
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // 안티패턴: 단순 reset()
  const handleSimpleReset = () => {
    setRetryStatus('단순 reset() 호출됨: 캐시된 RSC 페이로드를 재평가합니다...');
    reset();
  };

  // 표준 권장 패턴: startTransition + refresh + reset
  const handleRecommendedRecovery = () => {
    setRetryStatus('startTransition 시작: router.refresh()로 최신 RSC를 요청합니다...');
    setIsPending(true);

    startTransition(() => {
      // 1. 서버에 최신 RSC 페이로드 재요청 (캐시 갱신)
      router.refresh();
      // 2. 에러 바운더리 상태 초기화
      reset();
      setIsPending(false);
      setRetryStatus('복구 완료!');
    });
  };

  return (
    <div className="m-auto max-w-lg p-6 bg-red-950/20 border border-red-500/40 rounded-xl text-center">
      <div className="inline-flex p-3 bg-red-500/10 text-red-400 rounded-full mb-3">
        ⚠️
      </div>
      <h2 className="text-lg font-bold text-red-200 mb-1">
        demo/boundaries/error.tsx 활성화
      </h2>
      <p className="text-sm text-slate-300 mb-4">
        Page 컴포넌트 렌더링 중 오류가 발생했습니다.<br />
        좌측 세그먼트 Layout(사이드바)과 상단 GNB는 온전히 보존되었습니다.
      </p>

      {error.digest && (
        <div className="inline-block px-3 py-1 bg-black/40 border border-red-500/30 rounded font-mono text-xs text-red-400 mb-5">
          Digest: {error.digest}
        </div>
      )}

      {retryStatus && (
        <div className="mb-4 text-xs font-mono text-amber-400 bg-amber-950/30 p-2 rounded border border-amber-500/20">
          {retryStatus}
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <button
          onClick={handleSimpleReset}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded text-xs font-semibold"
        >
          ❌ 단순 reset() [안티패턴]
        </button>
        <button
          onClick={handleRecommendedRecovery}
          disabled={isPending}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded text-xs font-bold transition-all disabled:opacity-50"
        >
          {isPending ? '요청 중...' : '✅ startTransition 복구 [표준]'}
        </button>
      </div>
    </div>
  );
}
```

### 4.3 세그먼트 페이지 (`app/demo/boundaries/page.tsx`)

```tsx
import Link from 'next/link';
import { evaluateChaos } from '@/lib/chaos';

interface BoundariesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BoundariesPage({ searchParams }: BoundariesPageProps) {
  const resolvedParams = await searchParams;

  // scope: page일 때 페이지 렌더링 붕괴 시뮬레이션
  await evaluateChaos(resolvedParams, 'page');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>원칙 2: 바운더리 계층 구조 & startTransition 복구</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          컴포넌트의 위치(Page vs Layout vs Root)에 따른 장애 격리 범위와 올바른 복구 절차를 검증합니다.
        </p>
      </div>

      {/* 카오스 제어 링크 버튼군 */}
      <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-lg space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          장애 주입 트리거 (URL 쿼리 변경)
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/demo/boundaries?chaos=none"
            className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-xs font-semibold hover:bg-emerald-500/20"
          >
            🟢 정상 상태 (?chaos=none)
          </Link>
          <Link
            href="/demo/boundaries?chaos=unexpected&scope=page"
            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded text-xs font-semibold hover:bg-rose-500/20"
          >
            💥 Page 에러 (?scope=page)
          </Link>
          <Link
            href="/demo/boundaries?chaos=unexpected&scope=layout"
            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded text-xs font-semibold hover:bg-rose-500/20"
          >
            💥 Segment Layout 에러 (?scope=layout)
          </Link>
          <Link
            href="/demo/boundaries?chaos=unexpected&scope=root_layout"
            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded text-xs font-semibold hover:bg-rose-500/20"
          >
            💥 Root Layout 에러 (?scope=root_layout)
          </Link>
        </div>
      </div>

      {/* 정상 렌더링 콘텐츠 카드 */}
      <div className="p-5 bg-slate-800/20 border border-slate-700/80 rounded-lg space-y-3">
        <h3 className="font-semibold text-sky-400 text-sm">
          비동기 서버 컴포넌트 정상 렌더링 상태
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          서버 데이터 로드가 정상 완료되었습니다. Page 내부에서 에러가 발생하면 이 카드 영역만 <code>error.tsx</code>로 교체되며 상단 헤더와 좌측 사이드바는 유지됩니다.
        </p>
      </div>
    </div>
  );
}
```

### 4.4 루트 글로벌 에러 바운더리 (`app/global-error.tsx`)

```tsx
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border-2 border-red-500 rounded-xl p-8 text-center shadow-2xl">
          <h1 className="text-xl font-bold text-red-400 mb-2">
            🚨 치명적 시스템 오류 (global-error)
          </h1>
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">
            최상위 루트 레이아웃(<code>app/layout.tsx</code>) 렌더링이 실패하여 전체 문서 구조가 언마운트되었습니다.
          </p>

          {error.digest && (
            <div className="inline-block px-3 py-1 bg-black/60 border border-red-500/40 rounded font-mono text-xs text-red-400 mb-6">
              Digest: {error.digest}
            </div>
          )}

          <button
            onClick={() => window.location.href = '/demo/boundaries'}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-colors"
          >
            애플리케이션 새로고침 복구
          </button>
        </div>
      </body>
    </html>
  );
}
```

---

## 5. 검증 체크리스트 및 성공 기준

- [ ] **Page 격리 검증**: `?scope=page` 주입 시 좌측 사이드바와 상단 GNB가 깨지지 않고 Page 영역만 `error.tsx`로 교체되는가?
- [ ] **Layout 버블링 검증**: `?scope=layout` 주입 시 동일 폴더의 `error.tsx`가 아닌 상위 `app/error.tsx`가 활성화되는가?
- [ ] **Root Layout 붕괴 검증**: `?scope=root_layout` 주입 시 `global-error.tsx`가 자체 `<html><body>`로 렌더링되는가?
- [ ] **단순 reset() 실패 검증**: 카오스 해제 후 `reset()`만 누르면 캐시된 에러 RSC 페이로드로 인해 동일 에러가 즉시 재발생하는가?
- [ ] **startTransition 복구 검증**: `startTransition(() => { router.refresh(); reset(); })` 실행 시 최신 RSC 페이로드를 가져와 깨끗하게 정상 화면으로 복원되는가?
