'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function TaxonomyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 클라이언트 측 에러 로깅 (콘솔 확인용)
    console.error('[Taxonomy Segment Error Boundary]', error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-slate-900 border border-rose-500/40 rounded-xl p-8 shadow-xl space-y-6">
        {/* Status Badge & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💥</span>
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                HTTP 500 Internal Server Error
              </span>
              <h1 className="text-xl font-bold text-white mt-1">
                예기치 못한 시스템 예외가 발생했습니다
              </h1>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            app/demo/taxonomy/error.tsx
          </span>
        </div>

        {/* Error Details */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              포착된 시스템 예외
            </span>
            {error.digest && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/40">
                Digest: {error.digest}
              </span>
            )}
          </div>
          <div className="p-3 bg-black/40 rounded font-mono text-xs text-rose-300 break-all border border-rose-900/30">
            {error.message || 'An unexpected error occurred.'}
          </div>
          <p className="text-xs text-slate-400">
            예상하지 못한 버그, DB 풀 고갈, 타입 에러 등은 프리미티브가 아닌{' '}
            <code className="text-rose-300 font-mono">throw new Error()</code>로 발생하며,{' '}
            Next.js는 이를 가로채 세그먼트 레벨의 <code className="text-rose-300 font-mono">error.tsx</code> 바운더리를 작동시킵니다.
          </p>
        </div>

        {/* Architectural Insight */}
        <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-500/20 text-xs text-rose-200/90 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-rose-300">
            <span>💡</span> 프리미티브와의 핵심 차이점 (원칙 1)
          </div>
          <p>
            • <code>notFound()</code>, <code>unauthorized()</code>, <code>forbidden()</code>은 이 에러 바운더리를 <strong>트리거하지 않습니다.</strong>
            <br />
            • 오직 처리되지 않은 실제 <code>throw</code> 예외만이 이 화면을 활성화하며, 프로덕션 환경에서는 세부 메시지가 마스킹되어 CWE-209 정보 노출 취약점을 방어합니다.
          </p>
        </div>

        {/* Recovery Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition"
          >
            🔄 reset() 재시도
          </button>
          <Link
            href="/demo/taxonomy"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition"
          >
            정상 상태로 리셋 (?chaos=none)
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 text-sm transition"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
