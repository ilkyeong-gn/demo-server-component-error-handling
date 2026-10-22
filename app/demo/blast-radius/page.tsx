import { Suspense } from 'react';
import Link from 'next/link';
import { GranularErrorBoundary } from './components/GranularErrorBoundary';
import { ReversedOrderBoundary } from './components/ReversedOrderBoundary';
import { WidgetSkeleton } from './components/WidgetSkeleton';
import { ProfileWidget } from './components/ProfileWidget';
import { MetricsWidget } from './components/MetricsWidget';
import { FeedWidget } from './components/FeedWidget';
import { RecommendationsWidget } from './components/RecommendationsWidget';
import { BlastRadiusToolbar } from './components/BlastRadiusToolbar';

interface BlastRadiusPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | Record<string, string | string[] | undefined>;
}

export default async function BlastRadiusPage({ searchParams }: BlastRadiusPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const mode = String(resolvedParams.mode || 'granular');
  const order = String(resolvedParams.order || 'standard');

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-white transition">
          Home
        </Link>
        <span>&gt;</span>
        <span className="text-slate-300">Demo</span>
        <span>&gt;</span>
        <span className="text-sky-400 font-medium">원칙 3: Blast Radius 통제</span>
      </div>

      {/* Header & Mental Model */}
      <header className="border-b border-slate-800 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-2xl">🛡️</span>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                원칙 3: 세분화된 장애 격리 &amp; Blast Radius 통제
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              <code>&lt;GranularErrorBoundary&gt;</code> 기반 서드파티 장애 국소화(25%) 및{' '}
              <code className="text-sky-300">EB &gt; Suspense</code> 조립 순서의 절대적 중요성 검증
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-sky-950/60 border border-sky-500/30 text-xs text-sky-300 font-medium">
              ADR-0001 원칙 3 실증
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-400 font-mono">
              Dashboard Shell: OK
            </span>
          </div>
        </div>

        {/* Mental Model Callout */}
        <div className="mt-4 p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <span className="text-sky-400 text-base leading-none">💡</span>
          <div>
            <strong className="text-white">멘탈 모델 요약: </strong>
            <span className="text-slate-300">
              &quot;보조 위젯 하나의 결함이 대시보드 전체(100%)를 마비시켜서는 안 됩니다.{' '}
              <code>&lt;GranularErrorBoundary&gt;</code>로 폭발 반경을 25%로 가두고, React 19 비동기 스트리밍 에러를
              온전히 포착하기 위해 반드시 <strong><code>EB &gt; Suspense</code></strong> 순서로 조립해야 합니다.&quot;
            </span>
          </div>
        </div>
      </header>

      {/* 대시보드 컨트롤 툴바 */}
      <Suspense fallback={<div className="p-4 bg-slate-800/40 rounded-xl text-xs text-slate-400">컨트롤러 로딩 중...</div>}>
        <BlastRadiusToolbar />
      </Suspense>

      {/* 2x2 통합 대시보드 위젯 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 위젯 1: ProfileWidget (항상 정상) */}
        <Suspense fallback={<WidgetSkeleton name="ProfileWidget" />}>
          <ProfileWidget />
        </Suspense>

        {/* 위젯 2: MetricsWidget (항상 정상, 클라이언트 카운터 상태 보존 증명) */}
        <Suspense fallback={<WidgetSkeleton name="MetricsWidget" />}>
          <MetricsWidget />
        </Suspense>

        {/* 위젯 3: FeedWidget (장애 주입 대상 위젯) - 모드 및 조립 순서에 따른 조건부 래핑 */}
        {mode === 'off' ? (
          // 안티패턴 1: GranularErrorBoundary 누락 (Feed 장애 시 Segment error.tsx로 100% 붕괴)
          <Suspense fallback={<WidgetSkeleton name="FeedWidget" />}>
            <FeedWidget searchParams={searchParams} />
          </Suspense>
        ) : order === 'reversed' ? (
          // 안티패턴 2: 조립 순서 역전 (Suspense > EB: 스트리밍 에러가 EB를 뛰어넘어 100% 붕괴)
          <Suspense fallback={<WidgetSkeleton name="FeedWidget" />}>
            <ReversedOrderBoundary name="FeedWidget">
              <FeedWidget searchParams={searchParams} />
            </ReversedOrderBoundary>
          </Suspense>
        ) : (
          // 표준 권장 패턴: EB > Suspense (Feed 장애 시 25% 국소 격리 및 개별 복구)
          <GranularErrorBoundary name="FeedWidget">
            <Suspense fallback={<WidgetSkeleton name="FeedWidget" />}>
              <FeedWidget searchParams={searchParams} />
            </Suspense>
          </GranularErrorBoundary>
        )}

        {/* 위젯 4: RecommendationsWidget (항상 정상) */}
        <Suspense fallback={<WidgetSkeleton name="RecommendationsWidget" />}>
          <RecommendationsWidget />
        </Suspense>
      </div>

      {/* 아키텍처 다이어그램 및 조립 순서의 법칙 설명 카드 */}
      <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-4">
        <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
          <span>📐</span> Next.js 16 / React 19 컴포넌트 조립 순서의 법칙
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg space-y-2">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span>✅</span> 표준 순서: ErrorBoundary &gt; Suspense
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              서버 컴포넌트 스트리밍 중 에러가 방출되면 Suspense 바깥에 위치한 GranularErrorBoundary가 이를 포착합니다.
              따라서 해당 위젯 영역만 로컬 Fallback으로 교체되고 다른 3개 위젯은 100% 정상 작동을 유지합니다.
            </p>
            <div className="font-mono text-[10px] text-emerald-300 bg-black/40 p-2 rounded border border-emerald-500/20">
              &lt;GranularErrorBoundary&gt; ➔ &lt;Suspense&gt; ➔ &lt;RSC /&gt;
            </div>
          </div>

          <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-lg space-y-2">
            <div className="font-bold text-rose-400 flex items-center gap-1.5">
              <span>❌</span> 안티패턴 순서: Suspense &gt; ErrorBoundary
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              비동기 스트리밍이 거부(reject)될 때 에러는 Suspense 밖으로 튕겨 나갑니다.
              ErrorBoundary가 Suspense 내부에 갇혀 있으면 에러를 잡지 못하고 상위 세그먼트로 누출되어 대시보드 전체를 파괴합니다.
            </p>
            <div className="font-mono text-[10px] text-rose-300 bg-black/40 p-2 rounded border border-rose-500/20">
              &lt;Suspense&gt; ➔ &lt;GranularErrorBoundary&gt; ➔ &lt;RSC /&gt; (Bypassed!)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
