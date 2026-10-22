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
  const [chaosCleared, setChaosCleared] = useState(false);

  // 안티패턴: 단순 reset()
  const handleSimpleReset = () => {
    setRetryStatus('단순 reset() 호출됨: 캐시된 RSC 페이로드를 재평가합니다. (서버 재요청 없음)');
    reset();
  };

  // 카오스 원인 수동 해제 (체감 스텝 2: 서버 장애 해제 시뮬레이션)
  const handleClearChaos = () => {
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
      setChaosCleared(true);
      setRetryStatus(
        '서버 카오스 원인(URL 쿼리)을 제거했습니다. 이제 [단순 reset()]의 캐시 루프 실패와 [startTransition 복구]의 성공 차이를 확인해보세요.'
      );
    }
  };

  // 표준 권장 패턴: startTransition + refresh + reset
  const handleRecommendedRecovery = () => {
    setRetryStatus('startTransition 시작: router.refresh()로 최신 RSC를 요청합니다...');
    setIsPending(true);

    if (typeof window !== 'undefined' && window.location.search.includes('chaos')) {
      window.history.replaceState(null, '', window.location.pathname);
      setChaosCleared(true);
    }

    startTransition(() => {
      // 1. 서버에 최신 RSC 페이로드 재요청 (Router Cache 갱신)
      router.refresh();
      // 2. 에러 바운더리 상태 초기화
      reset();
      setIsPending(false);
      setRetryStatus('복구 완료! 최신 서버 컴포넌트 렌더링에 성공했습니다.');
    });
  };

  return (
    <div className="m-auto max-w-xl w-full p-6 md:p-8 bg-red-950/20 border border-red-500/40 rounded-xl text-center shadow-2xl">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-red-500/10 text-red-400 rounded-full mb-3 text-2xl border border-red-500/20">
        ⚠️
      </div>
      <h2 className="text-lg md:text-xl font-bold text-red-200 mb-1">
        demo/boundaries/error.tsx 활성화
      </h2>
      <p className="text-xs md:text-sm text-slate-300 mb-4 leading-relaxed">
        Page 컴포넌트 렌더링 중 오류가 발생했습니다.<br />
        좌측 세그먼트 Layout(사이드바)과 상단 GNB는 온전히 보존되었습니다.
      </p>

      {error.digest && (
        <div className="inline-block px-3 py-1 bg-black/50 border border-red-500/30 rounded font-mono text-xs text-red-400 mb-4">
          Digest: <span className="text-amber-300 font-bold">{error.digest}</span>
        </div>
      )}

      {retryStatus && (
        <div className="mb-4 text-xs font-mono text-amber-300 bg-amber-950/40 p-3 rounded-lg border border-amber-500/30 text-left leading-relaxed">
          {retryStatus}
        </div>
      )}

      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            onClick={handleClearChaos}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              chaosCleared
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {chaosCleared ? '✅ URL 카오스 해제됨' : '🧹 URL 카오스 원인 해제 (사전 준비)'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            type="button"
            onClick={handleSimpleReset}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition"
          >
            ❌ 단순 reset() [안티패턴]
          </button>
          <button
            type="button"
            onClick={handleRecommendedRecovery}
            disabled={isPending}
            className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-sky-500/20"
          >
            {isPending ? '서버 재요청 중...' : '✅ startTransition 복구 [표준]'}
          </button>
        </div>
      </div>
    </div>
  );
}
