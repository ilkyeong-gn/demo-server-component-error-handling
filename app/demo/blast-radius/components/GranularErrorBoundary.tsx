'use client';

import React, { Component, ReactNode, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DefaultWidgetFallback } from './DefaultWidgetFallback';

export interface GranularFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  name?: string;
}

export interface GranularErrorBoundaryProps {
  children: ReactNode;
  name?: string; // 관측성 및 로깅용 식별자
  fallback?: ReactNode | ((props: GranularFallbackProps) => ReactNode);
  onReset?: () => void;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: (Error & { digest?: string }) | null;
}

export class InnerErrorBoundary extends Component<
  GranularErrorBoundaryProps & { onInternalReset: () => void },
  State
> {
  constructor(props: GranularErrorBoundaryProps & { onInternalReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    // 콘솔 및 로컬 모의 관측성 태깅
    console.error(`[GranularErrorBoundary:${this.props.name || 'Anonymous'}]`, error);
  }

  reset = () => {
    this.props.onInternalReset();
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          reset: this.reset,
          name: this.props.name,
        });
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // 기본 내장 Fallback UI
      return (
        <DefaultWidgetFallback
          error={this.state.error}
          reset={this.reset}
          name={this.props.name}
        />
      );
    }

    return this.props.children;
  }
}

export function GranularErrorBoundary(props: GranularErrorBoundaryProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleInternalReset = () => {
    props.onReset?.();
    startTransition(() => {
      router.refresh(); // 최신 서버 컴포넌트 페이로드 재요청
    });
  };

  return <InnerErrorBoundary {...props} onInternalReset={handleInternalReset} />;
}
