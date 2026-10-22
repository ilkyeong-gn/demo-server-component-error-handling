'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function BlastRadiusToolbar() {
  const searchParams = useSearchParams();

  const mode = searchParams.get('mode') || 'granular';
  const order = searchParams.get('order') || 'standard';
  const chaos = searchParams.get('chaos') || 'none';
  const scope = searchParams.get('scope') || '';

  const isFeedFaulty = chaos === 'unexpected' && scope === 'feed';
  const isGranularOn = mode !== 'off';
  const isOrderStandard = order !== 'reversed';

  // 폭발 반경 계산
  let blastPercent = 0;
  let blastLabel = '0% (정상 상태)';
  let blastColorClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  let barFillPercent = '0%';
  let barColorClass = 'bg-emerald-400';

  if (isFeedFaulty) {
    if (!isGranularOn) {
      blastPercent = 100;
      blastLabel = '100% (대시보드 전체 붕괴 😱)';
      blastColorClass = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      barFillPercent = '100%';
      barColorClass = 'bg-rose-500';
    } else if (!isOrderStandard) {
      blastPercent = 100;
      blastLabel = '100% (순서 역전으로 상위 누출 😱)';
      blastColorClass = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      barFillPercent = '100%';
      barColorClass = 'bg-rose-500';
    } else {
      blastPercent = 25;
      blastLabel = '25% (Feed 위젯 1개 국소 격리 🛡️)';
      blastColorClass = 'text-sky-400 border-sky-500/30 bg-sky-500/10';
      barFillPercent = '25%';
      barColorClass = 'bg-sky-400';
    }
  }

  // URL 생성 헬퍼
  const buildQuery = (newParams: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) p.set(k, v);
      else p.delete(k);
    });
    return `/demo/blast-radius?${p.toString()}`;
  };

  return (
    <div className="space-y-4 p-5 rounded-xl border border-slate-700/80 bg-slate-800/40">
      {/* 4대 핵심 시연 시나리오 퀵 셀렉터 */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
            <span>⚡</span> 4대 검증 시나리오 퀵 런처
          </span>
          <span className="text-[11px] text-slate-400">1-클릭으로 설정 및 카오스 동시 변경</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* 시나리오 1 */}
          <Link
            href="/demo/blast-radius?mode=granular&order=standard&chaos=unexpected&scope=feed"
            className={`p-3 rounded-lg border transition flex flex-col justify-between ${
              isFeedFaulty && isGranularOn && isOrderStandard
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5">
              <span>🛡️</span> 1. Granular 격리 성공
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              EB &gt; Suspense (Blast: 25%)
            </div>
          </Link>

          {/* 시나리오 2 */}
          <Link
            href="/demo/blast-radius?mode=off&order=standard&chaos=unexpected&scope=feed"
            className={`p-3 rounded-lg border transition flex flex-col justify-between ${
              isFeedFaulty && !isGranularOn
                ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5 text-rose-400">
              <span>💥</span> 2. Granular 미적용 붕괴
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              EB 미적용 (Blast: 100%)
            </div>
          </Link>

          {/* 시나리오 3 */}
          <Link
            href="/demo/blast-radius?mode=granular&order=reversed&chaos=unexpected&scope=feed"
            className={`p-3 rounded-lg border transition flex flex-col justify-between ${
              isFeedFaulty && isGranularOn && !isOrderStandard
                ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
              <span>⚠️</span> 3. 순서 역전 상위 누출
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Suspense &gt; EB (Blast: 100%)
            </div>
          </Link>

          {/* 시나리오 4 */}
          <Link
            href="/demo/blast-radius?mode=granular&order=standard&chaos=none"
            className={`p-3 rounded-lg border transition flex flex-col justify-between ${
              !isFeedFaulty
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5 text-emerald-400">
              <span>🟢</span> 4. 정상 상태로 초기화
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              All 4 Widgets OK (Blast: 0%)
            </div>
          </Link>
        </div>
      </div>

      {/* 폭발 반경 실시간 시각 게이지 */}
      <div className="p-3.5 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wide">
            실시간 폭발 반경(Blast Radius) 게이지
          </span>
          <span className={`px-2.5 py-0.5 rounded-full border font-mono font-bold ${blastColorClass}`}>
            {blastLabel}
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-300 ${barColorClass}`}
            style={{ width: barFillPercent }}
          ></div>
        </div>
      </div>

      {/* 세부 토글 및 카오스 트리거 제어바 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
        {/* 격리 모드 토글 */}
        <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="mb-2">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">1. 격리 모드 (Granular)</span>
            <span className="font-semibold text-slate-200">
              {isGranularOn ? '✅ Granular Mode ON' : '❌ Granular Mode OFF (위험)'}
            </span>
          </div>
          <div className="flex gap-1.5">
            <Link
              href={buildQuery({ mode: 'granular' })}
              className={`flex-1 py-1 px-2 rounded text-center font-bold text-[11px] transition ${
                isGranularOn ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ON (표준)
            </Link>
            <Link
              href={buildQuery({ mode: 'off' })}
              className={`flex-1 py-1 px-2 rounded text-center font-bold text-[11px] transition ${
                !isGranularOn ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              OFF (미적용)
            </Link>
          </div>
        </div>

        {/* 조립 순서 토글 */}
        <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="mb-2">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">2. 컴포넌트 조립 순서</span>
            <span className="font-semibold text-slate-200">
              {isOrderStandard ? '✅ EB > Suspense (표준)' : '❌ Suspense > EB (순서 역전)'}
            </span>
          </div>
          <div className="flex gap-1.5">
            <Link
              href={buildQuery({ order: 'standard' })}
              className={`flex-1 py-1 px-2 rounded text-center font-bold text-[11px] transition ${
                isOrderStandard ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              EB &gt; Suspense
            </Link>
            <Link
              href={buildQuery({ order: 'reversed' })}
              className={`flex-1 py-1 px-2 rounded text-center font-bold text-[11px] transition ${
                !isOrderStandard ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Suspense &gt; EB
            </Link>
          </div>
        </div>

        {/* Feed 카오스 트리거 */}
        <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="mb-2">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">3. Feed 카오스 주입</span>
            <span className="font-semibold text-slate-200">
              {isFeedFaulty ? '💥 Feed 장애 유발 중' : '🟢 정상 운영 중'}
            </span>
          </div>
          <div className="flex gap-1.5">
            <Link
              href={buildQuery({ chaos: 'none', scope: '' })}
              className={`flex-1 py-1 px-2 rounded text-center font-bold text-[11px] transition ${
                !isFeedFaulty ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              정상 복귀
            </Link>
            <Link
              href={buildQuery({ chaos: 'unexpected', scope: 'feed' })}
              className={`flex-1 py-1 px-2 rounded text-center font-bold text-[11px] transition ${
                isFeedFaulty ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              💥 Feed 에러
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
