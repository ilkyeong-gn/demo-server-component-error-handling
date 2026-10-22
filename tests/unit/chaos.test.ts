import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateChaos } from '@/lib/chaos';

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    const err = new Error('NEXT_NOT_FOUND');
    (err as any).digest = 'NEXT_NOT_FOUND';
    throw err;
  }),
  unauthorized: vi.fn(() => {
    const err = new Error('NEXT_UNAUTHORIZED');
    (err as any).digest = 'NEXT_UNAUTHORIZED';
    throw err;
  }),
  forbidden: vi.fn(() => {
    const err = new Error('NEXT_FORBIDDEN');
    (err as any).digest = 'NEXT_FORBIDDEN';
    throw err;
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  unauthorized: mocks.unauthorized,
  forbidden: mocks.forbidden,
}));

describe('evaluateChaos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do nothing when chaos=none or empty', async () => {
    await expect(evaluateChaos({ chaos: 'none' })).resolves.toBeUndefined();
    await expect(evaluateChaos({})).resolves.toBeUndefined();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('should call notFound() when chaos=not_found', async () => {
    await expect(evaluateChaos({ chaos: 'not_found' })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it('should call unauthorized() when chaos=unauthorized', async () => {
    await expect(evaluateChaos({ chaos: 'unauthorized' })).rejects.toThrow('NEXT_UNAUTHORIZED');
    expect(mocks.unauthorized).toHaveBeenCalledTimes(1);
  });

  it('should call forbidden() when chaos=forbidden', async () => {
    await expect(evaluateChaos({ chaos: 'forbidden' })).rejects.toThrow('NEXT_FORBIDDEN');
    expect(mocks.forbidden).toHaveBeenCalledTimes(1);
  });

  it('should throw unexpected error when chaos=unexpected', async () => {
    await expect(evaluateChaos({ chaos: 'unexpected' })).rejects.toThrow(
      /\[Simulated System Failure\] DB connection pool exhausted/
    );
  });

  it('should respect scope filtering: skip when scope does not match', async () => {
    // URL specifies scope=feed, but component scope is 'page'
    await expect(
      evaluateChaos({ chaos: 'unexpected', scope: 'feed' }, { scope: 'page' })
    ).resolves.toBeUndefined();

    // URL specifies scope=feed, and component scope is 'feed'
    await expect(
      evaluateChaos({ chaos: 'unexpected', scope: 'feed' }, { scope: 'feed' })
    ).rejects.toThrow(/\[Simulated System Failure\]/);
  });

  it('should not throw in root_layout or layout when scope is omitted', async () => {
    // When chaos=unexpected but no scope is given, layouts should not crash
    await expect(
      evaluateChaos({ chaos: 'unexpected' }, 'root_layout')
    ).resolves.toBeUndefined();
    await expect(
      evaluateChaos({ chaos: 'unexpected' }, 'layout')
    ).resolves.toBeUndefined();
  });

  it('should throw simulated layout crash when scope is layout', async () => {
    await expect(
      evaluateChaos({ chaos: 'unexpected', scope: 'layout' }, 'layout')
    ).rejects.toThrow(/\[Simulated Layout Crash\]/);
  });

  it('should throw simulated root layout crash when scope is root_layout', async () => {
    await expect(
      evaluateChaos({ chaos: 'unexpected', scope: 'root_layout' }, 'root_layout')
    ).rejects.toThrow(/\[Simulated Root Layout Crash\]/);
  });

  it('should handle Promise searchParams', async () => {
    const paramsPromise = Promise.resolve({ chaos: 'forbidden' });
    await expect(evaluateChaos(paramsPromise)).rejects.toThrow('NEXT_FORBIDDEN');
    expect(mocks.forbidden).toHaveBeenCalledTimes(1);
  });
});
