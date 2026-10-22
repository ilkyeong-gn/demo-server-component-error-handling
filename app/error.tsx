'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useState } from 'react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [retryStatus, setRetryStatus] = useState<string | null>(null);

  const handleSimpleReset = () => {
    setRetryStatus('단순 reset() 실행: 캐시된 에러 페이로드가 재평가될 수 있습니다.');
    reset();
  };

  const handleTransitionRecovery = () => {
    setRetryStatus('startTransition 복구 실행 중...');
    if (typeof window !== 'undefined' && window.location.search.includes('chaos')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="max-w-xl mx-auto my-12 p-6 bg-slate-900 border border-rose-500/40 rounded-xl shadow-xl">
      <div className="flex items-center gap-3 text-rose-400 mb-4">
        <span className="text-2xl">⚠️</span>
        <div>
          <h2 className="text-lg font-bold">루트 세그먼트 오류 발생 (app/error.tsx)</h2>
          <p className="text-xs text-slate-400">
            하위 레이아웃 또는 세그먼트에서 버블링된 예외를 감지했습니다.
          </p>
        </div>
      </div>

      {error.digest && (
        <div className="mb-4 p-3 bg-black/40 border border-slate-800 rounded font-mono text-xs text-slate-300">
          <span className="text-slate-500">Error Digest:</span>{' '}
          <span className="text-amber-400 font-bold">{error.digest}</span>
        </div>
      )}

      {retryStatus && (
        <div className="mb-4 p-2.5 bg-slate-800/80 rounded text-xs text-sky-300">
          {retryStatus}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSimpleReset}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
        >
          ❌ 단순 reset() [안티패턴]
        </button>
        <button
          onClick={handleTransitionRecovery}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
        >
          ✅ startTransition 복구 [표준]
        </button>
      </div>
    </div>
  );
}
