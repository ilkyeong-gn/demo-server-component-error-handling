import { notFound, unauthorized, forbidden } from 'next/navigation';

export type ChaosTrigger =
  | 'none'
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'unexpected'
  | 'layout_crash';

export interface ChaosEvaluationOptions {
  /** 장애가 발생해야 할 타겟 스코프 (예: 'feed', 'layout', 'root_layout', 'page') */
  scope?: string;
  /** 기본 지연 시간 (ms) */
  defaultDelay?: number;
}

/**
 * 쿼리 파라미터를 파싱하여 지정된 카오스 시나리오를 실행합니다.
 */
export async function evaluateChaos(
  searchParams?: Record<string, string | string[] | undefined> | URLSearchParams | Promise<any>,
  options: ChaosEvaluationOptions | string = {}
): Promise<void> {
  const optionsObj: ChaosEvaluationOptions =
    typeof options === 'string' ? { scope: options } : options || {};

  const params = await resolveSearchParams(searchParams);
  const chaos = (params.get('chaos') || 'none') as ChaosTrigger;
  const targetScope = params.get('scope') || undefined;
  const delayMs = Number(params.get('delay')) || optionsObj.defaultDelay || 0;

  // 1. 인위적 네트워크/DB 지연 시뮬레이션 (스트리밍 및 Suspense 검증용)
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // 2. 스코프 필터링 검증
  // URL에 scope가 지정되어 있는데 현재 컴포넌트의 scope와 다르면 무시
  if (targetScope && optionsObj.scope && targetScope !== optionsObj.scope) {
    return;
  }
  // URL에 scope가 지정되어 있는데 컴포넌트에 scope가 지정되지 않은 경우(일반 컴포넌트) 무시
  if (targetScope && !optionsObj.scope) {
    return;
  }

  // 3. 시나리오별 제어 프리미티브 및 예외 실행
  switch (chaos) {
    case 'not_found':
      notFound();
      break;
    case 'unauthorized':
      unauthorized();
      break;
    case 'forbidden':
      forbidden();
      break;
    case 'unexpected':
      if (optionsObj.scope === 'root_layout') {
        throw new Error(
          `[Simulated Root Layout Crash] Fatal failure in root layout at ${new Date().toISOString()}`
        );
      }
      if (optionsObj.scope === 'layout') {
        throw new Error(
          `[Simulated Layout Crash] Unhandled exception in segment layout at ${new Date().toISOString()}`
        );
      }
      throw new Error(
        `[Simulated System Failure] DB connection pool exhausted at ${new Date().toISOString()}`
      );
    case 'layout_crash':
      if (optionsObj.scope === 'layout' || optionsObj.scope === 'root_layout') {
        throw new Error(
          `[Simulated Layout Crash] Unhandled exception in layout at ${new Date().toISOString()}`
        );
      }
      break;
    case 'none':
    default:
      break;
  }
}

async function resolveSearchParams(
  searchParams?: Record<string, string | string[] | undefined> | URLSearchParams | Promise<any>
): Promise<URLSearchParams> {
  if (searchParams) {
    const resolved = await searchParams;
    if (resolved instanceof URLSearchParams) {
      return resolved;
    }
    if (resolved && typeof resolved === 'object' && Object.keys(resolved).length > 0) {
      const usp = new URLSearchParams();
      for (const [key, value] of Object.entries(resolved)) {
        if (Array.isArray(value)) {
          value.forEach((v) => usp.append(key, String(v)));
        } else if (value !== undefined) {
          usp.set(key, String(value));
        }
      }
      return usp;
    }
  }

  // searchParams가 없거나 비어있는 경우(예: layout.tsx), Next.js headers에서 추출 시도
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const search = h.get('x-search-params') || '';
    return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  } catch {
    return new URLSearchParams();
  }
}
