'use client';

import React, { useTransition } from 'react';

export function DefaultWidgetFallback({
  error,
  reset,
  name,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  name?: string;
}) {
  const [isRetrying, startTransition] = useTransition();

  const handleRetry = () => {
    // URL에 카오스 파라미터가 잔존하면 재시도 시 다시 실패하므로, 히스토리에서 카오스 파라미터를 자동 정리
    if (typeof window !== 'undefined' && window.location.search.includes('chaos')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('chaos');
      url.searchParams.delete('scope');
      window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
    }

    startTransition(() => {
      reset();
    });
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border border-dashed border-red-500/40 bg-red-500/5 rounded-xl text-center h-full min-h-[220px] transition-all">
      <div className="text-3xl mb-2">⚠️</div>
      <h3 className="text-sm font-semibold text-red-300 mb-1">
        {name ? `${name} 위젯을 불러올 수 없습니다` : '위젯 렌더링 실패'}
      </h3>
      <p className="text-xs text-slate-300 max-w-xs mb-3 leading-relaxed">
        외부 업스트림 서비스 장애가 감지되었습니다. 대시보드의 다른 지표는 온전히 정상 동작합니다.
      </p>

      {error.digest && (
        <div className="font-mono text-[10px] bg-black/50 border border-red-500/30 text-red-400 px-2.5 py-1 rounded mb-3 flex items-center gap-1.5">
          <span className="text-slate-400">Digest:</span>
          <span className="text-amber-300 font-bold">{error.digest}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
          Blast Radius: 25% (해당 위젯 국소 격리 🛡️)
        </span>
      </div>

      <button
        type="button"
        onClick={handleRetry}
        disabled={isRetrying}
        className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md shadow-sky-500/20"
      >
        <span>{isRetrying ? '⏳ 복구 시도 중...' : '🔄 이 위젯만 다시 시도'}</span>
      </button>
    </div>
  );
}
