import Link from 'next/link';

export default function TaxonomyNotFound() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-8 shadow-xl space-y-6">
        {/* Status Badge & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🟡</span>
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                HTTP 404 Not Found
              </span>
              <h1 className="text-xl font-bold text-white mt-1">
                리소스를 찾을 수 없습니다
              </h1>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            app/demo/taxonomy/not-found.tsx
          </span>
        </div>

        {/* Primitive explanation */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            호출된 프리미티브
          </div>
          <code className="text-amber-300 font-mono text-sm block">
            notFound() &mdash; from &apos;next/navigation&apos;
          </code>
          <p className="text-xs text-slate-400">
            데이터 부재는 시스템 결함(500)이 아닙니다. Next.js 공식 제어 프리미티브인{' '}
            <code className="text-amber-200">notFound()</code>를 호출하여 에러 바운더리를 터뜨리지 않고 전용 404 화면을 렌더링했습니다.
          </p>
        </div>

        {/* Architectural Insight */}
        <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200/90 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-amber-300">
            <span>💡</span> 핵심 아키텍처 원칙 (ADR-0001 원칙 1)
          </div>
          <p>
            • <code>error.tsx</code> 에러 바운더리가 활성화되지 않았습니다.
            <br />
            • HTTP 응답 코드는 정상 404로 내려가며, 검색 엔진 및 클라이언트 캐시 오염(Soft 200)을 방지합니다.
          </p>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/demo/taxonomy"
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition"
          >
            ← 데모 샌드박스로 복귀
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
