import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logStore } from '@/lib/log-store';
import { onRequestError } from '@/instrumentation';
import { triggerActionError } from '@/app/demo/observability/actions';
import { GET, DELETE } from '@/app/api/logs/route';

describe('Principle 4: Observability and Instrumentation Unit Tests', () => {
  beforeEach(() => {
    logStore.clear();
    vi.restoreAllMocks();
  });

  describe('triggerActionError', () => {
    it('throws a simulated Server Action failure with timestamp', async () => {
      await expect(triggerActionError('Payment gateway timeout')).rejects.toThrow(
        /\[Simulated Server Action Failure\] Payment gateway timeout/
      );
    });

    it('uses default message when none provided', async () => {
      await expect(triggerActionError()).rejects.toThrow(
        /Failed to commit order payment transaction in Server Action/
      );
    });
  });

  describe('instrumentation.ts onRequestError hook', () => {
    it('captures unexpected server errors and records them into logStore', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockError = new Error('Database connection failed');
      (mockError as any).digest = 'test-digest-1234';

      await onRequestError(
        mockError,
        {
          path: '/demo/observability',
          method: 'GET',
          headers: {},
        },
        {
          routerKind: 'App Router',
          routePath: '/demo/observability',
          routeType: 'render',
          revalidateReason: undefined,
          renderSource: 'react-server-components',
        } as any
      );

      // Verify logStore recorded the entry
      const log = logStore.getByDigest('test-digest-1234');
      expect(log).toBeDefined();
      expect(log?.errorMessage).toBe('Database connection failed');
      expect(log?.routeType).toBe('render');
      expect(log?.requestPath).toBe('/demo/observability');

      // Verify structured JSON console.error
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedJson = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(loggedJson.level).toBe('error');
      expect(loggedJson.digest).toBe('test-digest-1234');
      expect(loggedJson.context.routeType).toBe('render');
    });

    it('filters out NEXT_NOT_FOUND control signals from logStore and console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const notFoundError = new Error('NEXT_NOT_FOUND');
      (notFoundError as any).digest = 'NEXT_NOT_FOUND';

      await onRequestError(
        notFoundError,
        {
          path: '/demo/observability?chaos=not_found',
          method: 'GET',
          headers: {},
        },
        {
          routerKind: 'App Router',
          routePath: '/demo/observability',
          routeType: 'render',
          revalidateReason: undefined,
          renderSource: 'react-server-components',
        } as any
      );

      // Must be filtered out
      expect(logStore.getAll()).toHaveLength(0);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('filters out NEXT_REDIRECT control signals from logStore', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const redirectError = new Error('NEXT_REDIRECT;replace;/login;307;');
      (redirectError as any).digest = 'NEXT_REDIRECT;replace;/login;307;';

      await onRequestError(
        redirectError,
        {
          path: '/dashboard',
          method: 'GET',
          headers: {},
        },
        {
          routerKind: 'App Router',
          routePath: '/dashboard',
          routeType: 'render',
          revalidateReason: undefined,
          renderSource: 'react-server-components',
        } as any
      );

      expect(logStore.getAll()).toHaveLength(0);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('/api/logs Route Handler', () => {
    it('returns empty list when logStore is empty', async () => {
      const request = new Request('http://localhost:3000/api/logs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.found).toBe(true);
      expect(data.total).toBe(0);
      expect(data.logs).toEqual([]);
    });

    it('queries single log entry by digest query param', async () => {
      logStore.add({
        digest: 'query-digest-777',
        errorMessage: 'Specific error to find',
        stackTrace: 'Error: Specific error\n at file.ts:10',
        routeType: 'action',
        requestPath: '/demo/observability',
      });

      const request = new Request('http://localhost:3000/api/logs?digest=query-digest-777');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.found).toBe(true);
      expect(data.log.digest).toBe('query-digest-777');
      expect(data.log.errorMessage).toBe('Specific error to find');
    });

    it('returns 404 when digest is not found', async () => {
      const request = new Request('http://localhost:3000/api/logs?digest=non-existent-digest');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.found).toBe(false);
    });

    it('clears all logs on DELETE request', async () => {
      logStore.add({
        digest: 'to-be-deleted',
        errorMessage: 'Delete me',
        stackTrace: '',
        routeType: 'render',
        requestPath: '/',
      });
      expect(logStore.getAll()).toHaveLength(1);

      const deleteResponse = await DELETE();
      expect(deleteResponse.status).toBe(200);
      expect(logStore.getAll()).toHaveLength(0);
    });
  });
});
