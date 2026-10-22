import { describe, it, expect, vi } from 'vitest';
import { FeedWidget } from '@/app/demo/blast-radius/components/FeedWidget';
import { ProfileWidget } from '@/app/demo/blast-radius/components/ProfileWidget';
import { MetricsWidget } from '@/app/demo/blast-radius/components/MetricsWidget';
import { RecommendationsWidget } from '@/app/demo/blast-radius/components/RecommendationsWidget';
import { InnerErrorBoundary } from '@/app/demo/blast-radius/components/GranularErrorBoundary';
import BlastRadiusPage from '@/app/demo/blast-radius/page';

describe('Principle 3: Blast Radius & GranularErrorBoundary Unit Tests', () => {
  describe('InnerErrorBoundary Component Logic', () => {
    it('getDerivedStateFromError should return hasError: true and the error object', () => {
      const error = new Error('Test feed failure');
      const state = InnerErrorBoundary.getDerivedStateFromError(error);
      expect(state.hasError).toBe(true);
      expect(state.error).toBe(error);
    });

    it('should render children when hasError is false', () => {
      const boundary = new InnerErrorBoundary({
        children: 'Normal Widget Content',
        onInternalReset: vi.fn(),
      });
      boundary.state = { hasError: false, error: null };
      const output = boundary.render();
      expect(output).toBe('Normal Widget Content');
    });

    it('should render custom fallback function when provided', () => {
      const error = new Error('Custom error');
      const boundary = new InnerErrorBoundary({
        children: 'Normal Widget Content',
        fallback: ({ error, name }) => `Custom Fallback for ${name}: ${error.message}`,
        name: 'TestWidget',
        onInternalReset: vi.fn(),
      });
      boundary.state = { hasError: true, error };
      const output = boundary.render();
      expect(output).toBe('Custom Fallback for TestWidget: Custom error');
    });

    it('reset should call onInternalReset and clear state', () => {
      const onInternalReset = vi.fn();
      const boundary = new InnerErrorBoundary({
        children: 'Content',
        onInternalReset,
      });
      boundary.state = { hasError: true, error: new Error('err') };
      boundary.setState = vi.fn((newState) => {
        boundary.state = newState;
      });

      boundary.reset();
      expect(onInternalReset).toHaveBeenCalledOnce();
      expect(boundary.setState).toHaveBeenCalledWith({ hasError: false, error: null });
    });
  });
  describe('FeedWidget (Async RSC)', () => {
    it('should render feed items successfully when chaos is none or omitted', async () => {
      const result = await FeedWidget({
        searchParams: Promise.resolve({ chaos: 'none' }),
      });
      expect(result).toBeDefined();
    });

    it('should not throw when chaos is unexpected but scope is not feed', async () => {
      // When scope is page or layout, FeedWidget must NOT crash
      const result = await FeedWidget({
        searchParams: Promise.resolve({ chaos: 'unexpected', scope: 'page' }),
      });
      expect(result).toBeDefined();
    });

    it('should throw simulated system failure when chaos is unexpected and scope is feed', async () => {
      await expect(
        FeedWidget({
          searchParams: Promise.resolve({ chaos: 'unexpected', scope: 'feed' }),
        })
      ).rejects.toThrow(/\[Simulated System Failure\] DB connection pool exhausted/);
    });
  });

  describe('Non-faulty Companion Widgets (Isolation Verification)', () => {
    it('ProfileWidget should render successfully even when scope is feed', async () => {
      const result = await ProfileWidget();
      expect(result).toBeDefined();
    });

    it('MetricsWidget should render successfully even when scope is feed', async () => {
      const result = await MetricsWidget();
      expect(result).toBeDefined();
    });

    it('RecommendationsWidget should render successfully even when scope is feed', async () => {
      const result = await RecommendationsWidget();
      expect(result).toBeDefined();
    });
  });

  describe('BlastRadiusPage (Dashboard Shell)', () => {
    it('should render dashboard shell successfully in default mode', async () => {
      const result = await BlastRadiusPage({
        searchParams: Promise.resolve({}),
      });
      expect(result).toBeDefined();
    });

    it('should render dashboard shell successfully in granular mode with chaos=none', async () => {
      const result = await BlastRadiusPage({
        searchParams: Promise.resolve({ mode: 'granular', order: 'standard', chaos: 'none' }),
      });
      expect(result).toBeDefined();
    });

    it('should render dashboard shell with mode=off without throwing at the shell level', async () => {
      // The shell itself does not throw; FeedWidget throws when evaluated inside Suspense
      const result = await BlastRadiusPage({
        searchParams: Promise.resolve({ mode: 'off', order: 'standard' }),
      });
      expect(result).toBeDefined();
    });

    it('should render dashboard shell with order=reversed without throwing at the shell level', async () => {
      const result = await BlastRadiusPage({
        searchParams: Promise.resolve({ mode: 'granular', order: 'reversed' }),
      });
      expect(result).toBeDefined();
    });
  });
});
