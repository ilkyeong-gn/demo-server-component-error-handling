'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

/**
 * [순서 역전 안티패턴 시뮬레이터: Suspense > EB]
 * Next.js 16 및 React 19 비동기 스트리밍 환경에서 ErrorBoundary가 Suspense 내부에 갇혀 있을 때,
 * 스트리밍 중 발생한 에러를 내부 바운더리가 가두지 못하고 상위 세그먼트 error.tsx로 누출시키는
 * 현상을 충실히 재현합니다.
 */
export class ReversedOrderBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Suspense 내부에 갇혀 에러를 상위 세그먼트 error.tsx로 누출(Rethrow)시킴
    throw error;
  }

  override componentDidCatch(error: Error) {
    console.warn(`[ReversedOrderBoundary:${this.props.name || 'Anonymous'}] Bypassed! Error leaked outside Suspense:`, error);
  }

  override render() {
    return this.props.children;
  }
}
