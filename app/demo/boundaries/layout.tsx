import type { ReactNode } from 'react';
import { evaluateChaos } from '@/lib/chaos';

interface BoundariesLayoutProps {
  children: ReactNode;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | Record<string, string | string[] | undefined>;
}

export default async function BoundariesLayout({
  children,
  searchParams,
}: BoundariesLayoutProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;

  // scope: layout일 때 레이아웃 렌더링 붕괴 시뮬레이션
  await evaluateChaos(resolvedParams, 'layout');

  return (
    <div className="flex flex-col md:flex-row min-h-[580px] border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 shadow-xl">
      {/* Segment Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900/90 border-b md:border-b-0 md:border-r border-slate-800 p-5 flex flex-col gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Segment Shell
          </div>
          <div className="text-sm font-semibold text-slate-200 mt-0.5">
            app/demo/boundaries/layout.tsx
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 text-xs sm:text-sm">
          <span className="px-3 py-2 rounded-lg bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20">
            📁 계층 구조 시연
          </span>
          <span className="px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition">
            🔄 복구 메커니즘
          </span>
          <span className="px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition">
            📊 장애 격리 분석
          </span>
        </nav>

        <div className="mt-auto p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-2 font-mono text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Segment Layout 유지 중
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <code>page.tsx</code>에서 예외가 발생해도 이 사이드바는 언마운트되지 않고 안전하게 유지됩니다.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 p-6 md:p-8 flex flex-col min-w-0">
        {children}
      </section>
    </div>
  );
}
