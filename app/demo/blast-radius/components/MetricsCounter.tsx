'use client';

import { useState } from 'react';

export function MetricsCounter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
      <div>
        <span className="text-[10px] text-slate-400 block">클라이언트 상태 격리 테스트</span>
        <span className="text-xs font-mono font-bold text-sky-400">
          클릭 카운트: {count}회
        </span>
      </div>
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition cursor-pointer"
      >
        +1 증가
      </button>
    </div>
  );
}
