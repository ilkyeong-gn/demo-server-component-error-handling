export async function ProfileWidget() {
  // 모의 사용자 세션 데이터 (항상 정상 응답)
  const profile = {
    name: 'Alex Dev',
    role: 'Platform Admin',
    tier: 'Tier-1 Enterprise',
    session: 'sess_8f29d10c',
    lastSync: '방금 전',
  };

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 h-full min-h-[220px] flex flex-col justify-between hover:border-slate-700/80 transition-all">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center font-bold text-slate-950 text-sm">
                AD
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900"></span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                {profile.name}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">{profile.role}</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            ✅ 정상 렌더링
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">권한 티어</span>
            <span className="font-semibold text-sky-400">{profile.tier}</span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">세션 식별자</span>
            <span className="font-mono text-slate-300 text-[11px]">{profile.session}</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>위젯 1: Profile (Async RSC)</span>
        <span className="text-slate-500">동기화: {profile.lastSync}</span>
      </div>
    </div>
  );
}
