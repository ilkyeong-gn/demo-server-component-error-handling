'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useState } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BlastRadiusError({ error, reset }: ErrorProps) {
  const router = useRouter();
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // 안티패턴: 단순 reset()
  const handleSimpleReset = () => {
    setRetryStatus('단순 reset() 호출됨: 서버 재요청 없이 캐시된 실패 청크를 재평가합니다.');
    reset();
  };

  // 표준 권장 복구: startTransition + refresh + reset
  const handleStandardRecovery = () => {
    setRetryStatus('startTransition 시작: URL 카오스를 정리하고 최신 RSC 스트림을 재요청합니다...');
    setIsPending(true);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('chaos');
      url.searchParams.delete('scope');
      url.searchParams.set('mode', 'granular');
      url.searchParams.set('order', 'standard');
      window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
    }

    startTransition(() => {
      router.refresh();
      reset();
      setIsPending(false);
      setRetryStatus('복구 완료! 최신 대시보드 렌더링에 성공했습니다.');
    });
  };

  return (
    <div className="m-auto max-w-2xl w-full p-6 sm:p-8 bg-red-950/20 border border-red-500/40 rounded-2xl text-center shadow-2xl space-y-5">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-red-500/10 text-red-400 rounded-full text-3xl border border-red-500/20">
        💥
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold">
          <span>Blast Radius: 100% (대시보드 전체 붕괴 😱)</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-red-100">
          app/demo/blast-radius/error.tsx 활성화
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
          단 하나의 서브 위젯(<code>FeedWidget</code>)의 오류로 인해 대시보드 전체 세그먼트가
          언마운트되었습니다. 정상 동작하던 Profile, Metrics, Recommendations 위젯까지 모두 소실되었습니다.
        </p>
      </div>

      {error.digest && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/50 border border-red-500/30 rounded-lg font-mono text-xs text-red-400">
          <span className="text-slate-400">Digest:</span>
          <span className="text-amber-300 font-bold">{error.digest}</span>
        </div>
      )}

      {/* 장애 원인 분석 배너 */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-left text-xs space-y-2">
        <div className="font-bold text-slate-200 flex items-center gap-1.5">
          <span>🔍</span> 대시보드 100% 붕괴 원인 분석
        </div>
        <ul className="text-slate-400 space-y-1 list-disc list-inside text-[11px] leading-relaxed">
          <li>
            <strong className="text-rose-300">GranularErrorBoundary 미적용 (Mode OFF)</strong>:
            위젯 단위의 격리 바운더리가 없어 예외가 상위 세그먼트로 전파됨.
          </li>
          <li>
            <strong className="text-amber-300">조립 순서 역전 (Suspense &gt; EB)</strong>:
            React 19 스트리밍 에러가 서스펜스 안쪽의 에러 바운더리를 뛰어넘어 상위 세그먼트로 누출됨.
          </li>
        </ul>
      </div>

      {retryStatus && (
        <div className="text-xs font-mono text-amber-300 bg-amber-950/40 p-3 rounded-lg border border-amber-500/30 text-left">
          {retryStatus}
        </div>
      )}

      {/* 복구 액션 버튼군 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link
          href="/demo/blast-radius?mode=granular&order=standard&chaos=none"
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-sky-500/20"
        >
          ✅ Granular Mode 표준으로 복구 (EB &gt; Suspense)
        </Link>
        <button
          type="button"
          onClick={handleStandardRecovery}
          disabled={isPending}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
        >
          {isPending ? '서버 재요청 중...' : '🔄 startTransition으로 재시도'}
        </button>
        <button
          type="button"
          onClick={handleSimpleReset}
          className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 text-xs rounded-xl transition cursor-pointer"
        >
          ❌ 단순 reset() [안티패턴]
        </button>
      </div>
    </div>
  );
}
