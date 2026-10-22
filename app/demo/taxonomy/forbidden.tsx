import Link from 'next/link';

export default function TaxonomyForbidden() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-slate-900 border border-red-500/30 rounded-xl p-8 shadow-xl space-y-6">
        {/* Status Badge & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔴</span>
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                HTTP 403 Forbidden
              </span>
              <h1 className="text-xl font-bold text-white mt-1">
                접근 권한이 없습니다
              </h1>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            app/demo/taxonomy/forbidden.tsx
          </span>
        </div>

        {/* Primitive explanation */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            호출된 프리미티브
          </div>
          <code className="text-red-300 font-mono text-sm block">
            forbidden() &mdash; from &apos;next/navigation&apos;
          </code>
          <p className="text-xs text-slate-400">
            권한 결손(관리자 전용 영역 접근 등)은 시스템 장애(500)가 아닌 정상적인 비즈니스 인가 거절입니다.{' '}
            <code className="text-red-200">forbidden()</code> 프리미티브를 호출하여 적절한 403 상태 코드와 안내 화면으로 전환되었습니다.
          </p>
        </div>

        {/* Architectural Insight */}
        <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/20 text-xs text-red-200/90 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-red-300">
            <span>💡</span> Server Action과 unstable_rethrow의 관계
          </div>
          <p>
            • Server Action 내부의 <code>try/catch</code> 블록에서 <code>unstable_rethrow(err)</code>를 호출했기 때문에,{' '}
            Next.js 제어 신호(<code>NEXT_HTTP_ERROR_FALLBACK;403</code>)가 삼켜지지 않고 프레임워크로 전달되어 본 화면이 렌더링될 수 있었습니다.
          </p>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/demo/taxonomy"
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition"
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
