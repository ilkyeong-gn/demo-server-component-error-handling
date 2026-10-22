import Link from 'next/link';

export default function TaxonomyUnauthorized() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-8 shadow-xl space-y-6">
        {/* Status Badge & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🟣</span>
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                HTTP 401 Unauthorized
              </span>
              <h1 className="text-xl font-bold text-white mt-1">
                인증이 필요합니다
              </h1>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            app/demo/taxonomy/unauthorized.tsx
          </span>
        </div>

        {/* Primitive explanation */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            호출된 프리미티브
          </div>
          <code className="text-purple-300 font-mono text-sm block">
            unauthorized() &mdash; from &apos;next/navigation&apos;
          </code>
          <p className="text-xs text-slate-400">
            인증되지 않은 사용자의 접근은 시스템 에러(500)가 아닙니다. Next.js 16의{' '}
            <code className="text-purple-200">experimental.authInterrupts</code> 기능을 통해 활성화된{' '}
            <code className="text-purple-200">unauthorized()</code>를 호출하여 정규 401 화면으로 인터럽트되었습니다.
          </p>
        </div>

        {/* Architectural Insight */}
        <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200/90 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-purple-300">
            <span>💡</span> 핵심 아키텍처 원칙 (ADR-0001 원칙 1)
          </div>
          <p>
            • <code>next.config.ts</code>의 <code>experimental.authInterrupts: true</code> 설정이 필수입니다.
            <br />
            • 예외 바운더리(<code>error.tsx</code>)를 우회하여 불필요한 시스템 에러 로그 및 APM 오염을 방지합니다.
          </p>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/demo/taxonomy"
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition"
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
