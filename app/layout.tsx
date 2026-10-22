import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { evaluateChaos } from '@/lib/chaos';

export const metadata: Metadata = {
  title: 'Next.js 16 RSC Error Handling Demo',
  description: 'ADR-0001 4대 원칙 검증을 위한 Zero-Config Next.js 16 PoC 데모',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // scope: root_layout 일 때 루트 레이아웃 크래시 시뮬레이션
  await evaluateChaos(undefined, 'root_layout');

  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Global Navigation Bar */}
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-xl">🛡️</span>
                <span className="font-bold text-sm sm:text-base tracking-tight text-white group-hover:text-sky-400 transition">
                  RSC Error Handling
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                  v16
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-1 text-xs sm:text-sm">
                <Link
                  href="/demo/taxonomy"
                  className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  원칙 1: 분류 & Result
                </Link>
                <Link
                  href="/demo/boundaries"
                  className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  원칙 2: 바운더리 계층
                </Link>
                <Link
                  href="/demo/blast-radius"
                  className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  원칙 3: 폭발 반경
                </Link>
                <Link
                  href="/demo/observability"
                  className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  원칙 4: 관측성 1:1 대조
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Root Healthy
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
          Next.js 16 RSC Error Handling Policy (ADR-0001) Zero-Config Verification PoC
        </footer>
      </body>
    </html>
  );
}
