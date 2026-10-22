import { describe, it, expect } from 'vitest';
import { ok, fail, type Result } from '@/lib/result';

describe('Result utility', () => {
  it('should return ok result with data and success: true', () => {
    const res: Result<{ id: string }> = ok({ id: '123' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual({ id: '123' });
    }
  });

  it('should return fail result with error and success: false', () => {
    const res: Result<{ id: string }, string> = fail('USER_NOT_FOUND');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('USER_NOT_FOUND');
    }
  });
});
