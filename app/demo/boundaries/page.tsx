import Link from 'next/link';
import { evaluateChaos } from '@/lib/chaos';

interface BoundariesPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | Record<string, string | string[] | undefined>;
}

export default async function BoundariesPage({ searchParams }: BoundariesPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};

  // scope: page일 때 페이지 렌더링 붕괴 시뮬레이션
  await evaluateChaos(resolvedParams, 'page');

  const renderedAt = new Date().toLocaleTimeString('ko-KR', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold uppercase tracking-wide">
            Principle 2
          </span>
          <span className="text-xs text-slate-400">
            Next.js 16 / React 19 Error Boundary Hierarchy
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2">
          원칙 2: 바운더리 계층 구조 & startTransition 복구
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          컴포넌트의 위치(Page vs Layout vs Root)에 따른 장애 격리 범위(Blast Radius)와 <code>startTransition</code> 기반의 올바른 RSC 복구 절차를 검증합니다.
        </p>
      </div>

      {/* 카오스 제어 링크 버튼군 */}
      <div className="p-4 sm:p-5 bg-slate-800/40 border border-slate-700/80 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
            <span>⚡ 장애 주입 및 격리 시뮬레이터</span>
            <span className="text-[10px] text-slate-500 font-normal">URL 쿼리 변경 트리거</span>
          </div>
          <span className="text-xs text-emerald-400 font-mono">
            RSC Render: {renderedAt}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <Link
            href="/demo/boundaries?chaos=none"
            className="flex flex-col p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition group"
          >
            <span className="text-xs font-bold flex items-center gap-1.5">
              <span>🟢</span> 정상 상태
            </span>
            <span className="text-[11px] text-slate-400 group-hover:text-slate-300 mt-1 font-mono">
              ?chaos=none
            </span>
          </Link>

          <Link
            href="/demo/boundaries?chaos=unexpected&scope=page"
            className="flex flex-col p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition group"
          >
            <span className="text-xs font-bold flex items-center gap-1.5">
              <span>💥</span> Page 에러
            </span>
            <span className="text-[11px] text-slate-400 group-hover:text-slate-300 mt-1 font-mono">
              ?scope=page (국소 격리)
            </span>
          </Link>

          <Link
            href="/demo/boundaries?chaos=unexpected&scope=layout"
            className="flex flex-col p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition group"
          >
            <span className="text-xs font-bold flex items-center gap-1.5">
              <span>💥</span> Segment Layout 에러
            </span>
            <span className="text-[11px] text-slate-400 group-hover:text-slate-300 mt-1 font-mono">
              ?scope=layout (상위 버블링)
            </span>
          </Link>

          <Link
            href="/demo/boundaries?chaos=unexpected&scope=root_layout"
            className="flex flex-col p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition group"
          >
            <span className="text-xs font-bold flex items-center gap-1.5">
              <span>💥</span> Root Layout 에러
            </span>
            <span className="text-[11px] text-slate-400 group-hover:text-slate-300 mt-1 font-mono">
              ?scope=root_layout (global-error)
            </span>
          </Link>
        </div>
      </div>

      {/* 비동기 서버 컴포넌트 데이터 카드 */}
      <div className="p-5 bg-slate-800/30 border border-slate-700/80 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sky-400 text-sm flex items-center gap-2">
            <span>🛡️</span> 비동기 서버 컴포넌트(RSC) 정상 렌더링 상태
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            Status: 200 OK
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          서버 데이터 로드가 정상 완료되었습니다. Page 내부에서 에러가 발생하면 이 본문 영역만 <code>demo/boundaries/error.tsx</code>로 교체되며, 좌측 사이드바와 상단 GNB는 온전히 보존됩니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[11px]">렌더링 모드</span>
            <span className="font-mono text-slate-200 font-semibold">Server Component (RSC)</span>
          </div>
          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[11px]">서버 갱신 시각</span>
            <span className="font-mono text-emerald-400 font-semibold">{renderedAt}</span>
          </div>
          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[11px]">보호 바운더리</span>
            <span className="font-mono text-sky-400 font-semibold">demo/boundaries/error.tsx</span>
          </div>
        </div>
      </div>

      {/* 바운더리 계층 구조 시각화 카드 */}
      <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-4">
        <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
          <span>📐</span> Next.js App Router 바운더리 계층 구조 및 버블링 규칙
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-sky-400">1. Page 수준 장애 (?scope=page)</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <code>demo/boundaries/error.tsx</code>가 포착. 좌측 세그먼트 Layout(사이드바)과 Root GNB는 100% 정상 작동 유지.
            </p>
          </div>
          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-amber-400">2. Segment Layout 장애 (?scope=layout)</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              동일 폴더의 <code>error.tsx</code>는 Layout의 자식이므로 포착 불가. 상위 <code>app/error.tsx</code>로 버블링. (사이드바 붕괴, GNB 보존)
            </p>
          </div>
          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-rose-400">3. Root Layout 장애 (?scope=root_layout)</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <code>app/layout.tsx</code> 붕괴 시 HTML/BODY가 소실되므로 오직 자체 태그를 가진 <code>app/global-error.tsx</code>만 동작.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
