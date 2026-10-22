import { Suspense } from 'react';
import Link from 'next/link';
import { evaluateChaos } from '@/lib/chaos';
import { TaxonomyClientSandbox } from './components/TaxonomyClientSandbox';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TaxonomyPage({ searchParams }: PageProps) {
  // Pre-stream 카오스 평가 (not_found, unauthorized, forbidden, unexpected)
  await evaluateChaos(searchParams, { scope: 'page' });

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
        <span className="text-sky-400 font-medium">원칙 1: Taxonomy &amp; Result Pattern</span>
      </div>

      {/* Header & Mental Model Summary */}
      <header className="border-b border-slate-800 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-2xl">🏷️</span>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                원칙 1: Expected Error vs Unexpected Exception
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              공식 제어 프리미티브(404, 401, 403), Server Action Result 패턴 및{' '}
              <code className="text-sky-300">unstable_rethrow</code> 인터랙티브 샌드박스
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-sky-950/60 border border-sky-500/30 text-xs text-sky-300 font-medium">
            ADR-0001 원칙 1 실증 검증
          </div>
        </div>

        {/* Mental Model Callout */}
        <div className="mt-4 p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <span className="text-sky-400 text-base leading-none">💡</span>
          <div>
            <strong className="text-white">멘탈 모델 요약: </strong>
            <span className="text-slate-300">
              &quot;예측 가능한 상태(Expected Error)는 <code>throw</code>하지 않고 제어 프리미티브 또는{' '}
              <code>Result&lt;T, E&gt;</code>를 반환한다. 오직 버그 및 시스템 장애(Unexpected Exception)만이{' '}
              <code>throw</code>되어 <code>error.tsx</code> 바운더리로 격리된다.&quot;
            </span>
          </div>
        </div>
      </header>

      {/* Interactive Sandbox */}
      <Suspense
        fallback={
          <div className="p-8 text-center text-slate-500 text-sm">
            샌드박스를 불러오는 중입니다...
          </div>
        }
      >
        <TaxonomyClientSandbox />
      </Suspense>
    </div>
  );
}
