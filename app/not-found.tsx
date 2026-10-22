import Link from 'next/link';

export default function GlobalNotFound() {
  return (
    <div className="max-w-md mx-auto my-16 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center shadow-xl">
      <div className="text-4xl mb-4">🔍</div>
      <h1 className="text-2xl font-bold text-slate-100 mb-2">404 - 페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-slate-400 mb-6">
        요청하신 페이지 또는 리소스가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/"
        className="inline-block px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold transition"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
