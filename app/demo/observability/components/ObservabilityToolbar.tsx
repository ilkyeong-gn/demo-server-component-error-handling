'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ObservabilityToolbarProps {
  onClearLogs?: () => void;
  className?: string;
}

export function ObservabilityToolbar({ onClearLogs, className = '' }: ObservabilityToolbarProps) {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      if (res.ok) {
        if (onClearLogs) onClearLogs();
        router.refresh();
      }
    } catch (e) {
      console.error('Failed to clear logs:', e);
    } finally {
      setIsClearing(false);
    }
  };

  const isProd = process.env.NODE_ENV === 'production';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-white transition">
          Home
        </Link>
        <span>&gt;</span>
        <span className="text-slate-300">Demo</span>
        <span>&gt;</span>
        <span className="text-sky-400 font-medium">원칙 4: Observability &amp; Digest 대조</span>
      </div>

      {/* Header */}
      <header className="border-b border-slate-800 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-2xl">📡</span>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                원칙 4: instrumentation.ts 관측성 &amp; Digest 1:1 대조
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              CWE-209 보안 마스킹과 <code>onRequestError</code> 기반 중앙 수집, In-Memory 로그 1:1 역추적 검증
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              data-testid="env-mode-badge"
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium ${
                isProd
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
              }`}
            >
              {isProd ? '✅ Prod Mode (마스킹 ON)' : '⚠️ Dev Mode (오버레이 ON)'}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-sky-950/60 border border-sky-500/30 text-xs text-sky-300 font-medium">
              ADR-0001 원칙 4
            </span>
          </div>
        </div>

        {/* Mental Model Callout */}
        <div className="mt-4 p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <span className="text-sky-400 text-base leading-none">💡</span>
          <div>
            <strong className="text-white">멘탈 모델 요약: </strong>
            <span className="text-slate-300">
              &quot;보안(CWE-209 방어)과 디버깅 편의성은 배타적이지 않습니다. 프로덕션에서 서버 내부 정보는
              철저히 마스킹하되, 프레임워크가 부여한 <code>Digest</code> 해시를 통해{' '}
              <code>instrumentation.ts</code>의 <code>onRequestError</code>가 기록한 원본 로그와 1:1로 즉시
              대조하여 원인을 규명합니다.&quot;
            </span>
          </div>
        </div>
      </header>

      {/* Chaos Control Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] mr-1">
            시나리오 주입:
          </span>

          <Link
            href="/demo/observability?chaos=unexpected"
            data-testid="btn-rsc-chaos"
            className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 font-medium transition flex items-center gap-1.5"
          >
            <span>💥</span> RSC 렌더 에러
          </Link>

          <Link
            href="/demo/observability?chaos=not_found"
            data-testid="btn-not-found-chaos"
            className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-300 font-medium transition flex items-center gap-1.5"
          >
            <span>🔍</span> notFound() 신호
          </Link>

          <Link
            href="/demo/observability"
            data-testid="btn-reset-chaos"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5"
          >
            <span>🔄</span> 라우트 초기화
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="btn-clear-logs"
            onClick={handleClearLogs}
            disabled={isClearing}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
          >
            <span>🧹</span> {isClearing ? '초기화 중...' : '서버 로그 비우기'}
          </button>
        </div>
      </div>
    </div>
  );
}
