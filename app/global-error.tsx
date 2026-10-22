'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border-2 border-red-500 rounded-xl p-8 text-center shadow-2xl">
          <h1 className="text-xl font-bold text-red-400 mb-2">
            🚨 치명적 시스템 오류 (global-error)
          </h1>
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">
            최상위 루트 레이아웃(<code>app/layout.tsx</code>) 렌더링이 실패하여 전체 문서 구조가 언마운트되었습니다.
          </p>

          {error.digest && (
            <div className="inline-block px-3 py-1 bg-black/60 border border-red-500/40 rounded font-mono text-xs text-red-400 mb-6">
              Digest: {error.digest}
            </div>
          )}

          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-colors cursor-pointer"
          >
            애플리케이션 새로고침 복구
          </button>
        </div>
      </body>
    </html>
  );
}
