import type { Instrumentation } from 'next';
import { logStore } from '@/lib/log-store';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[instrumentation.ts] Next.js 16 Server Instrumentation Initialized.');
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const errorObj = err instanceof Error ? err : new Error(String(err));
  const digest =
    typeof err === 'object' && err !== null && 'digest' in err
      ? String((err as any).digest)
      : undefined;

  // 1. Next.js 공식 제어 흐름 신호 필터링 (불필요한 에러 수집 및 알람 방지)
  if (digest?.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND') {
    return;
  }

  const effectiveDigest = digest || 'unknown-digest';

  // 2. 구조화된 JSON 표준 로그 출력 (터미널 / Datadog / CloudWatch 연계)
  const logPayload = {
    level: 'error',
    digest: effectiveDigest,
    message: errorObj.message,
    stack: errorObj.stack,
    request: {
      path: request.path,
      method: request.method,
    },
    context: {
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
    },
    timestamp: new Date().toISOString(),
  };

  console.error(JSON.stringify(logPayload));

  // 3. In-Memory 로그 스토어에 등록 (로컬 Zero-Config 1:1 대조 조회용)
  logStore.add({
    digest: effectiveDigest,
    errorMessage: errorObj.message,
    stackTrace: errorObj.stack || '',
    routeType: context.routeType,
    requestPath: request.path,
  });
};
