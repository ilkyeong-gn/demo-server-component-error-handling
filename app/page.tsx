import Link from 'next/link';

export default function HomePage() {
  const principles = [
    {
      num: '01',
      title: '원칙 1: 에러 2단계 분류 및 제어 프리미티브',
      description:
        '예측 가능한 실패는 공식 제어 프리미티브(notFound, unauthorized, forbidden) 또는 Result 패턴으로 안전하게 처리하며 예외 throw를 지양합니다.',
      href: '/demo/taxonomy',
      badge: 'Taxonomy & Result',
      color: 'border-blue-500/30 hover:border-blue-500/60 bg-blue-950/10',
    },
    {
      num: '02',
      title: '원칙 2: 바운더리 계층 구조 & startTransition 복구',
      description:
        'Page vs Segment Layout vs Root Layout 바운더리의 격리 범위를 확인하고, 비동기 RSC 실패 시 startTransition 기반 표준 복구 절차를 검증합니다.',
      href: '/demo/boundaries',
      badge: 'Boundaries & Recovery',
      color: 'border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-950/10',
    },
    {
      num: '03',
      title: '원칙 3: 세분화된 장애 격리 & Blast Radius 통제',
      description:
        'GranularErrorBoundary를 통해 서드파티 보조 위젯 장애 시 대시보드 전체 붕괴(Blast Radius 100%)를 방지하고 25%로 국소 격리합니다.',
      href: '/demo/blast-radius',
      badge: 'Blast Radius Control',
      color: 'border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10',
    },
    {
      num: '04',
      title: '원칙 4: instrumentation.ts 관측성 & Digest 1:1 대조',
      description:
        'CWE-209 방어로 마스킹된 클라이언트 Digest를 서버 터미널 및 In-Memory 스토어 로그와 실시간 1:1 대조하여 즉시 원인을 규명합니다.',
      href: '/demo/observability',
      badge: 'Observability & Digest',
      color: 'border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/10',
    },
  ];

  const quickPresets = [
    {
      step: 'Step 1',
      principle: '원칙 1',
      label: '404 Not Found 프리미티브',
      href: '/demo/taxonomy?chaos=not_found',
      badge: 'HTTP 404',
    },
    {
      step: 'Step 1',
      principle: '원칙 1',
      label: '401 Unauthorized 프리미티브',
      href: '/demo/taxonomy?chaos=unauthorized',
      badge: 'HTTP 401',
    },
    {
      step: 'Step 1',
      principle: '원칙 1',
      label: '403 Forbidden 프리미티브',
      href: '/demo/taxonomy?chaos=forbidden',
      badge: 'HTTP 403',
    },
    {
      step: 'Step 2',
      principle: '원칙 2',
      label: 'Page 수준 에러 격리 (사이드바 유지)',
      href: '/demo/boundaries?chaos=unexpected&scope=page',
      badge: 'Local EB',
    },
    {
      step: 'Step 2',
      principle: '원칙 2',
      label: 'Segment Layout 에러 (상위 버블링)',
      href: '/demo/boundaries?chaos=unexpected&scope=layout',
      badge: 'Bubble Up',
    },
    {
      step: 'Step 3',
      principle: '원칙 3',
      label: 'Feed 위젯 단독 장애 (Blast Radius 25%)',
      href: '/demo/blast-radius?chaos=unexpected&scope=feed&mode=granular',
      badge: 'Radius 25%',
    },
    {
      step: 'Step 3',
      principle: '원칙 3',
      label: 'Suspense > EB 순서 역전 장애 누출',
      href: '/demo/blast-radius?chaos=unexpected&scope=feed&order=inverted',
      badge: 'Leakage',
    },
    {
      step: 'Step 4',
      principle: '원칙 4',
      label: 'RSC 렌더 예외 마스킹 & Digest 대조',
      href: '/demo/observability?chaos=unexpected',
      badge: 'CWE-209',
    },
  ];

  return (
    <div className="space-y-10 py-4">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-sky-400"></span>
          ADR-0001 공식 에러 처리 아키텍처 검증 환경
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Next.js 16 서버 컴포넌트 <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400">
            에러 처리 및 관측성 데모 앱
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Zero-Config 로컬 환경에서 개발 모드(<code>dev</code>)와 프로덕션 모드(<code>production</code>)를
          교차 검증하며 4대 핵심 원칙의 정상 동작, 장애 유발, 안티패턴 및 표준 복구를 체득합니다.
        </p>
      </div>

      {/* 4대 원칙 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {principles.map((item) => (
          <Link
            key={item.num}
            href={item.href}
            className={`group p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${item.color}`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">
                  STEP {item.num}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 font-medium">
                  {item.badge}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-sky-300 transition">
                {item.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="pt-6 flex items-center text-xs font-semibold text-sky-400 group-hover:translate-x-1 transition-transform">
              시연 라우트로 이동 ➔
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Launchpad 치트시트 */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h2 className="text-sm font-bold text-white">
              원클릭 카오스 URL 치트시트 (Quick Deep Links)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">5-Minute Walkthrough</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickPresets.map((preset, idx) => (
            <Link
              key={idx}
              href={preset.href}
              className="p-3 rounded-lg bg-black/40 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-900/50 transition group flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono">{preset.step}</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px]">
                  {preset.badge}
                </span>
              </div>
              <div className="text-xs font-medium text-slate-200 group-hover:text-white transition">
                {preset.label}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Two-Track 안내 배너 */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="font-bold text-slate-200">💡 투-트랙(Two-Track) 검증 팁:</span> 원칙 4의
          CWE-209 보안 마스킹과 1:1 Digest 대조는{' '}
          <code className="px-1.5 py-0.5 bg-black/40 rounded border border-slate-700 text-slate-300">
            npm run build &amp;&amp; npm run start
          </code>{' '}
          환경에서 온전히 체감할 수 있습니다.
        </div>
        <a
          href="/api/logs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:underline shrink-0 font-medium"
        >
          서버 In-Memory 로그 API 열기 ➔
        </a>
      </div>
    </div>
  );
}
