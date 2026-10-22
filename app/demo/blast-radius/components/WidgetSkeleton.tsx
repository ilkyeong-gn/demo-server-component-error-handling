export function WidgetSkeleton({ name }: { name?: string }) {
  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse h-full min-h-[220px] flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-slate-800 rounded w-1/3"></div>
          <div className="h-3 bg-slate-800 rounded w-12"></div>
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-3 bg-slate-800/80 rounded w-full"></div>
          <div className="h-3 bg-slate-800/80 rounded w-5/6"></div>
          <div className="h-3 bg-slate-800/80 rounded w-4/6"></div>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
        <div className="h-3 bg-slate-800 rounded w-20"></div>
        <div className="text-[11px] font-mono text-slate-500">
          ⏳ {name ? `${name} 로딩 중...` : '스트리밍 중...'}
        </div>
      </div>
    </div>
  );
}
