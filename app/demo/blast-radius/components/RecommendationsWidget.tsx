export async function RecommendationsWidget() {
  const recommendations = [
    {
      id: '1',
      title: 'Partial Prerendering (PPR) 활성화 준비',
      desc: '동적 스트리밍 세그먼트와 정적 셸 분리 최적화',
      status: 'Ready',
    },
    {
      id: '2',
      title: 'GranularErrorBoundary 국소 격리',
      desc: '서드파티 장애 시 25% 폭발 반경 방어 적용됨',
      status: 'Active',
    },
    {
      id: '3',
      title: 'instrumentation.ts 1:1 관측성 연계',
      desc: 'onRequestError 훅을 통한 Digest 자동 역추적',
      status: 'Active',
    },
  ];

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 h-full min-h-[220px] flex flex-col justify-between hover:border-slate-700/80 transition-all">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <h3 className="text-sm font-bold text-slate-100">권장 최적화 가이드</h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
            3건 제안
          </span>
        </div>

        <div className="space-y-2">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">{rec.title}</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  {rec.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{rec.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>위젯 4: Recommendations (Async RSC)</span>
        <span className="text-emerald-400/90 font-mono">✅ 항상 정상 렌더링</span>
      </div>
    </div>
  );
}
