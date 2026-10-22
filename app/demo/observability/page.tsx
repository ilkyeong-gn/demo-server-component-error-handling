import { evaluateChaos } from '@/lib/chaos';
import { logStore } from '@/lib/log-store';
import { ObservabilityToolbar } from './components/ObservabilityToolbar';
import { ObservabilityDashboard } from './components/ObservabilityDashboard';

interface ObservabilityPageProps {
  searchParams?:
    | Promise<{ [key: string]: string | string[] | undefined }>
    | Record<string, string | string[] | undefined>;
}

export default async function ObservabilityPage({ searchParams }: ObservabilityPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};

  // 1. 카오스 주입 평가 (unexpected ➔ 500 에러 바운더리, not_found ➔ 404 전용 화면)
  await evaluateChaos(resolvedParams);

  // 2. 서버 In-Memory 스토어에서 현재 적재된 로그 스냅샷 획득
  const currentLogs = logStore.getAll();

  return (
    <div className="space-y-6">
      <ObservabilityToolbar />
      <ObservabilityDashboard initialLogs={currentLogs} />
    </div>
  );
}
