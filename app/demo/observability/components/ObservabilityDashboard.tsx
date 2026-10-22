'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ServerErrorLogEntry } from '@/lib/log-store';
import { triggerActionError } from '../actions';
import { DigestInspector } from './DigestInspector';

interface ObservabilityDashboardProps {
  initialLogs?: ServerErrorLogEntry[];
}

export function ObservabilityDashboard({ initialLogs = [] }: ObservabilityDashboardProps) {
  const [logs, setLogs] = useState<ServerErrorLogEntry[]>(initialLogs);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedDigest, setSelectedDigest] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<{
    message: string;
    digest?: string;
  } | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (res.ok && data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleTriggerAction = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await triggerActionError();
    } catch (err: any) {
      // Server Action 예외 포착
      const digest = err?.digest || (err && typeof err === 'object' && 'digest' in err ? String(err.digest) : undefined);
      const message = err instanceof Error ? err.message : String(err);

      setActionError({
        message,
        digest,
      });

      if (digest) {
        setSelectedDigest(digest);
      }

      // 서버 로그 갱신
      setTimeout(() => {
        fetchLogs();
      }, 300);
    } finally {
      setActionLoading(false);
    }
  };

  const isProd = process.env.NODE_ENV === 'production';

  return (
    <div className="space-y-6">
      {/* 3-Pane Split Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pane 1: Client Browser View & Action Trigger */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌐</span>
              <h2 className="text-sm font-bold text-white">
                [Pane 1: 클라이언트 브라우저 뷰]
              </h2>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-500/30 font-mono">
              Client Runtime
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-300">
              클라이언트 환경에서 서버 컴포넌트 렌더링 및 Server Action 실행 시 오류가 어떻게 처리되는지 검증합니다.
            </p>

            {/* Server Action Test Box */}
            <div className="p-4 rounded-lg bg-black/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  ⚡ Server Action 에러 시뮬레이션
                </span>
                <span className="text-[10px] text-amber-400 font-mono">routeType: action</span>
              </div>
              <p className="text-[11px] text-slate-400">
                서버 액션 내에서 던져진 예외도 <code>instrumentation.ts</code>에서 감지되며,
                프로덕션에서는 클라이언트에 digest와 함께 안전하게 마스킹됩니다.
              </p>

              <button
                type="button"
                data-testid="btn-trigger-action-error"
                onClick={handleTriggerAction}
                disabled={actionLoading}
                className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2"
              >
                <span>⚡</span>
                {actionLoading ? 'Server Action 실행 중...' : 'Server Action 결함 발생시키기 (throw)'}
              </button>

              {/* Action Error Result Card */}
              {actionError && (
                <div
                  data-testid="action-error-card"
                  className="mt-3 p-3.5 bg-red-950/30 border border-red-500/40 rounded-lg text-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-red-400 font-semibold">
                    <span>⚠️ 클라이언트에서 포착된 Server Action 예외</span>
                    <span className="text-[10px] font-mono text-red-300">
                      {actionError.digest ? 'Digest 발급됨' : 'No Digest'}
                    </span>
                  </div>

                  <div className="font-mono text-[11px] text-slate-300 bg-black/60 p-2 rounded break-all border border-slate-800">
                    <span className="text-slate-500">Message: </span>
                    <span>{actionError.message}</span>
                  </div>

                  {actionError.digest && (
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="font-mono">
                        <span className="text-slate-400">Digest: </span>
                        <code
                          data-testid="action-error-digest"
                          className="text-sky-300 font-bold"
                        >
                          {actionError.digest}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDigest(actionError.digest!)}
                        className="text-[11px] text-sky-400 hover:underline font-medium"
                      >
                        대조 분석기로 확인 ➔
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Client Protection Callout */}
            <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span>🛡️</span>
                <span>CWE-209 방어 (민감 정보 유출 방지 표준)</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                운영 환경에서는 DB 접속 정보, 쿼리문, 내부 소스 파일 경로가 클라이언트에 절대 유출되지 않아야 합니다.
                Next.js 16은 서버 에러를 범용 안내문으로 마스킹하고 난수 해시인 <code>error.digest</code>만 클라이언트에 전송합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Pane 2: Server stdout & In-Memory Log Store */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">🖥️</span>
              <h2 className="text-sm font-bold text-white">
                [Pane 2: 서버 콘솔 stdout &amp; In-Memory 스토어]
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">
                총 {logs.length}개 로그
              </span>
              <button
                type="button"
                data-testid="btn-refresh-logs"
                onClick={fetchLogs}
                disabled={isLoadingLogs}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition"
              >
                {isLoadingLogs ? '...' : '🔄 새로고침'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              <code>instrumentation.ts</code>의 <code>onRequestError</code> 훅이 실시간으로 인터셉트하여
              터미널(stdout JSON) 및 In-Memory 버퍼에 적재한 로그 목록입니다.
            </p>

            {/* Log Stream Container */}
            <div
              data-testid="server-log-list"
              className="space-y-2 max-h-[360px] overflow-y-auto pr-1"
            >
              {logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-black/30 rounded-lg border border-slate-800/80">
                  수집된 서버 에러 로그가 없습니다.
                  <br />
                  상단 버튼을 통해 RSC 또는 Server Action 에러를 발생시켜 보세요.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    data-testid={`log-item-${log.digest}`}
                    className={`p-3 rounded-lg border text-xs font-mono transition cursor-pointer ${
                      selectedDigest === log.digest
                        ? 'bg-sky-950/40 border-sky-500/60'
                        : 'bg-black/50 border-slate-800 hover:border-slate-700'
                    }`}
                    onClick={() => setSelectedDigest(log.digest)}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 font-bold">ERROR</span>
                        <span className="text-amber-400 font-semibold">{log.routeType}</span>
                        <span className="text-slate-500">{log.requestPath}</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2">
                      <div className="truncate text-slate-300 font-sans text-xs">
                        {log.errorMessage}
                      </div>
                      <span className="shrink-0 text-sky-400 font-bold text-[11px] bg-sky-950/80 px-2 py-0.5 rounded border border-sky-500/30">
                        {log.digest}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pane 3: 1:1 Digest Correlation Inspector */}
      <DigestInspector
        initialDigest={selectedDigest}
        onSelectDigest={(d) => setSelectedDigest(d)}
      />
    </div>
  );
}
