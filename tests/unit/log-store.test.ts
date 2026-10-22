import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryLogStore } from '@/lib/log-store';

describe('InMemoryLogStore', () => {
  let store: InMemoryLogStore;

  beforeEach(() => {
    store = new InMemoryLogStore();
  });

  it('should add log entry with id and timestamp', () => {
    const entry = store.add({
      digest: 'test-digest-1',
      errorMessage: 'Database connection failed',
      stackTrace: 'Error: Database connection failed\n  at test.ts:10',
      routeType: 'render',
      requestPath: '/demo/observability',
    });

    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    expect(entry.digest).toBe('test-digest-1');
    expect(store.getAll().length).toBe(1);
  });

  it('should get log by digest', () => {
    store.add({
      digest: 'digest-abc',
      errorMessage: 'Error A',
      stackTrace: '',
      routeType: 'render',
      requestPath: '/demo/boundaries',
    });
    store.add({
      digest: 'digest-xyz',
      errorMessage: 'Error B',
      stackTrace: '',
      routeType: 'action',
      requestPath: '/demo/taxonomy',
    });

    const found = store.getByDigest('digest-xyz');
    expect(found).toBeDefined();
    expect(found?.errorMessage).toBe('Error B');

    const notFound = store.getByDigest('non-existent');
    expect(notFound).toBeUndefined();
  });

  it('should maintain max entries limit (circular buffer)', () => {
    for (let i = 0; i < 60; i++) {
      store.add({
        digest: `digest-${i}`,
        errorMessage: `Error ${i}`,
        stackTrace: '',
        routeType: 'render',
        requestPath: `/test/${i}`,
      });
    }

    const all = store.getAll();
    expect(all.length).toBe(50);
    // Most recent entry should be at index 0
    expect(all[0].digest).toBe('digest-59');
    // Oldest preserved entry should be index 49
    expect(all[49].digest).toBe('digest-10');
  });

  it('should clear all entries', () => {
    store.add({
      digest: 'digest-1',
      errorMessage: 'Error',
      stackTrace: '',
      routeType: 'render',
      requestPath: '/test',
    });
    expect(store.getAll().length).toBe(1);

    store.clear();
    expect(store.getAll().length).toBe(0);
  });
});
