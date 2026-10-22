import { evaluateChaos } from '@/lib/chaos';

interface FeedWidgetProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export async function FeedWidget({ searchParams }: FeedWidgetProps) {
  const params = searchParams ? await searchParams : {};

  // 카오스 주입 평가: scope: 'feed'일 때 인위적 예외 발생
  await evaluateChaos(params, 'feed');

  // 모의 외부 피드 및 웹훅 데이터
  const feedItems = [
    {
      id: '1',
      icon: '🚀',
      title: 'Next.js 16.4.2 프로덕션 빌드 롤아웃 성공',
      source: 'GitHub Actions',
      time: '1분 전',
      status: '배포 완료',
    },
    {
      id: '2',
      icon: '💳',
      title: '결제 웹훅 수신: payment_intent.succeeded',
      source: 'Stripe Webhook',
      time: '4분 전',
      status: '처리 완료',
    },
    {
      id: '3',
      icon: '🗄️',
      title: 'In-Memory 로깅 버퍼 플러시 (128건)',
      source: 'LogStore Service',
      time: '10분 전',
      status: '동기화 완료',
    },
    {
      id: '4',
      icon: '🔒',
      title: 'TLS 인증서 자동 갱신 성공 (*.internal)',
      source: 'CertManager',
      time: '25분 전',
      status: '유효',
    },
  ];

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 h-full min-h-[220px] flex flex-col justify-between hover:border-slate-700/80 transition-all">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📡</span>
            <h3 className="text-sm font-bold text-slate-100">외부 피드 및 웹훅 스트림</h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            스트림 활성
          </span>
        </div>

        <div className="space-y-2">
          {feedItems.map((item) => (
            <div
              key={item.id}
              className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">{item.icon}</span>
                <span className="truncate text-slate-200">{item.title}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400 font-mono">
                <span>{item.source}</span>
                <span>•</span>
                <span className="text-slate-500">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>위젯 3: Feed (Async RSC)</span>
        <span className="text-amber-400/90 font-mono">💥 장애 주입 대상 위젯</span>
      </div>
    </div>
  );
}
