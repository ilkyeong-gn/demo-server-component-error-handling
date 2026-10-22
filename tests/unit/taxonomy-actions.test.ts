import { describe, it, expect, beforeEach } from 'vitest';
import { inviteMemberAction } from '@/app/demo/taxonomy/actions';

describe('inviteMemberAction (Server Action)', () => {
  beforeEach(() => {
    process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = 'true';
  });

  it('should return ok result when valid email and member role provided', async () => {
    const formData = new FormData();
    formData.set('email', 'member@company.com');
    formData.set('role', 'member');
    formData.set('useRethrow', 'true');

    const result = await inviteMemberAction(null, formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('member@company.com');
      expect(result.data.role).toBe('member');
      expect(result.data.id).toMatch(/^usr_/);
    }
  });

  it('should return validation error when email is empty or invalid', async () => {
    const formData = new FormData();
    formData.set('email', 'invalid-email');
    formData.set('role', 'member');

    const result = await inviteMemberAction(null, formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('VALIDATION_ERROR');
    }
  });

  it('should return expected business error when duplicate email is given', async () => {
    const formData = new FormData();
    formData.set('email', 'duplicate@company.com');
    formData.set('role', 'member');

    const result = await inviteMemberAction(null, formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('ALREADY_EXISTS');
    }
  });

  it('anti-pattern: should catch forbidden signal and return unexpected failure when useRethrow is false', async () => {
    const formData = new FormData();
    formData.set('email', 'admin-candidate@company.com');
    formData.set('role', 'admin');
    formData.set('useRethrow', 'false');

    const result = await inviteMemberAction(null, formData);

    // Anti-pattern: The Next.js control flow exception is swallowed into a generic fail Result
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('UNEXPECTED_FAILURE');
      expect(result.error).toContain('NEXT_HTTP_ERROR_FALLBACK;403');
    }
  });

  it('recommended pattern: should re-throw forbidden signal when useRethrow is true', async () => {
    const formData = new FormData();
    formData.set('email', 'admin-candidate@company.com');
    formData.set('role', 'admin');
    formData.set('useRethrow', 'true');

    // With unstable_rethrow, Next.js internal signal is propagated out so the runtime can render forbidden.tsx
    await expect(inviteMemberAction(null, formData)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;403');
  });
});
