'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DigestInspector } from './components/DigestInspector';

export default function ObservabilityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [showInspector, setShowInspector] = useState(true);

  const handleCopyDigest = () => {
    if (error.digest) {
      navigator.clipboard?.writeText(error.digest);
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

  const isProd = process.env.NODE_ENV === 'production';

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
        <span className="text-red-400 font-medium">원칙 4: 서버 에러 포착</span>
      </div>

      {/* Main Error Card */}
      <div
        data-testid="observability-error-boundary"
        className="p-6 bg-red-950/20 border border-red-500/40 rounded-2xl space-y-5 shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-red-500/20">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚠️</span>
            <div>
              <h2 className="text-lg font-bold text-red-300">
                서버 렌더링 오류 발생 (Application Error)
              </h2>
              <p className="text-xs text-slate-400">
                Next.js 16 Server Component 에러 바운더리 포착 (app/demo/observability/error.tsx)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              data-testid="masking-badge"
              className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                isProd
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950 text-amber-300 border-amber-500/40'
              }`}
            >
              {isProd ? '🛡️ CWE-209 마스킹 활성화' : '⚠️ Dev Mode (오버레이 노출)'}
            </span>
          </div>
        </div>

        {/* Masked Error Message Box */}
        <div className="p-4 rounded-xl bg-black/60 border border-slate-800 space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            클라이언트 노출 에러 메시지 (Client-Side Display):
          </span>
          <p
            data-testid="client-error-message"
            className="text-sm font-mono text-slate-200 leading-relaxed break-all"
          >
            {error.message ||
              'An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive information.'}
          </p>
        </div>

        {/* Digest Badge Row */}
        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 font-mono text-xs">
            <span className="text-slate-400 font-semibold">🔑 Error Digest:</span>
            <code
              data-testid="client-digest-value"
              className="px-2.5 py-1 rounded bg-black/60 border border-sky-500/40 text-sky-300 font-bold tracking-wider"
            >
              {error.digest || 'no-digest'}
            </code>
          </div>

          <div className="flex items-center gap-2">
            {error.digest && (
              <button
                type="button"
                data-testid="btn-copy-digest"
                onClick={handleCopyDigest}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
              >
                {copied ? '✅ 복사됨' : '📋 Digest 복사'}
              </button>
            )}

            <button
              type="button"
              data-testid="btn-toggle-inspector"
              onClick={() => setShowInspector(!showInspector)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition"
            >
              {showInspector ? '대조기 접기' : '🔍 서버 원본 로그 1:1 대조'}
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="btn-retry-start-transition"
              onClick={handleRetry}
              disabled={isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5"
            >
              <span>🔄</span> {isPending ? '새로고침 중...' : '다시 시도 (startTransition 표준 복구)'}
            </button>

            <Link
              href="/demo/observability"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
            >
              카오스 초기화 후 복귀
            </Link>
          </div>

          <div className="text-[11px] text-slate-400">
            표준 복구: <code>startTransition(() =&gt; &#123; router.refresh(); reset(); &#125;)</code>
          </div>
        </div>
      </div>

      {/* Embedded 1:1 Correlation Inspector */}
      {showInspector && (
        <DigestInspector initialDigest={error.digest || ''} />
      )}
    </div>
  );
}
