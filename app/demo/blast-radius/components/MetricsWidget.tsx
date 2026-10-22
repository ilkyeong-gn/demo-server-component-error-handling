import { MetricsCounter } from './MetricsCounter';

export async function MetricsWidget() {
  // 모의 시스템 지표 데이터 (항상 정상 응답)
  const metrics = {
    dau: '14,280',
    p99: '32ms',
    throughput: '2,450 req/s',
    uptime: '99.98%',
  };

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 h-full min-h-[220px] flex flex-col justify-between hover:border-slate-700/80 transition-all">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <h3 className="text-sm font-bold text-slate-100">시스템 핵심 KPI 지표</h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            가동률 {metrics.uptime}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">DAU</span>
            <span className="text-xs font-bold text-slate-100">{metrics.dau}</span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">P99 응답지연</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">{metrics.p99}</span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">처리량</span>
            <span className="text-xs font-bold text-sky-400 font-mono">{metrics.throughput}</span>
          </div>
        </div>

        {/* 클라이언트 상태 보존 증명용 카운터 */}
        <MetricsCounter />
      </div>

      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>위젯 2: Metrics (Async RSC)</span>
        <span className="text-slate-500">피드 장애 시에도 상태 보존</span>
      </div>
    </div>
  );
}
