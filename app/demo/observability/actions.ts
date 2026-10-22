'use server';

/**
 * 원칙 4 검증용 Server Action 에러 시뮬레이터
 * Server Action 내에서 발생하는 예외도 Next.js 16 공식 표준인
 * instrumentation.ts의 onRequestError(err, request, { routeType: 'action' })로 집약 처리됩니다.
 * 프로덕션 빌드에서는 클라이언트에 digest 해시와 함께 마스킹되어 반환됩니다.
 */
export async function triggerActionError(message?: string): Promise<never> {
  const errorMsg =
    message || 'Failed to commit order payment transaction in Server Action (ERR_DB_LOCK)';

  throw new Error(`[Simulated Server Action Failure] ${errorMsg} at ${new Date().toISOString()}`);
}
