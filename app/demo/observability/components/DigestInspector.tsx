'use client';

import React, { useState, useEffect } from 'react';
import type { ServerErrorLogEntry } from '@/lib/log-store';

interface DigestInspectorProps {
  initialDigest?: string;
  onSelectDigest?: (digest: string) => void;
  className?: string;
}

export function DigestInspector({
  initialDigest = '',
  onSelectDigest,
  className = '',
}: DigestInspectorProps) {
  const [inputDigest, setInputDigest] = useState(initialDigest);
  const [isLoading, setIsLoading] = useState(false);
  const [matchedLog, setMatchedLog] = useState<ServerErrorLogEntry | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialDigest) {
      setInputDigest(initialDigest);
      handleLookup(initialDigest);
    }
  }, [initialDigest]);

  const handleLookup = async (digestToLookup?: string) => {
    const target = (digestToLookup || inputDigest || '').trim();
    if (!target) {
      setLookupError('조회할 Digest 해시를 입력해 주세요.');
      setMatchedLog(null);
      return;
    }

    setIsLoading(true);
    setLookupError(null);

    try {
      const res = await fetch(`/api/logs?digest=${encodeURIComponent(target)}`);
      const data = await res.json();

      if (res.ok && data.found && data.log) {
        setMatchedLog(data.log);
        setLookupError(null);
        if (onSelectDigest) onSelectDigest(target);
      } else {
        setMatchedLog(null);
        setLookupError(
          data.error || `서버 로그 스토어에 다이제스트 '${target}'가 존재하지 않습니다.`
        );
      }
    } catch (err) {
      setMatchedLog(null);
      setLookupError('서버 로그 조회 중 네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDigest = (textToCopy: string) => {
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isProd = process.env.NODE_ENV === 'production';

  return (
    <div
      data-testid="digest-inspector"
      className={`p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔍</span>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              1:1 Digest Correlation Inspector (대조 분석기)
            </h3>
            <p className="text-xs text-slate-400">
              클라이언트 수신 Digest 해시와 서버 원본 로그(stdout / In-Memory Store) 실시간 1:1 역추적
            </p>
          </div>
        </div>

        {matchedLog && (
          <span
            data-testid="correlation-status-badge"
            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
          >
            ✅ 100% MATCHED ({matchedLog.digest})
          </span>
        )}
      </div>

      {/* Input / Control Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            data-testid="digest-input"
            value={inputDigest}
            onChange={(e) => setInputDigest(e.target.value)}
            placeholder="예: 3849102941 또는 클라이언트 에러 Digest 입력"
            className="w-full px-3.5 py-2 bg-black/60 border border-slate-700 rounded-lg text-xs font-mono text-sky-300 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLookup();
              }
            }}
          />
        </div>

        <button
          type="button"
          data-testid="btn-lookup-digest"
          onClick={() => handleLookup()}
          disabled={isLoading}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-semibold rounded-lg text-xs transition shrink-0"
        >
          {isLoading ? '대조 조회 중...' : '🔍 1:1 대조 조회'}
        </button>

        {matchedLog && (
          <button
            type="button"
            onClick={() => handleCopyDigest(matchedLog.digest)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition shrink-0"
          >
            {copied ? '✅ 복사됨' : '📋 Digest 복사'}
          </button>
        )}
      </div>

      {/* Error / Empty State */}
      {lookupError && (
        <div
          data-testid="lookup-error-message"
          className="p-3 bg-red-950/30 border border-red-500/30 rounded-lg text-xs text-red-300"
        >
          ⚠️ {lookupError}
        </div>
      )}

      {/* Matched Details */}
      {matchedLog && (
        <div data-testid="matched-log-details" className="space-y-4 pt-1">
          {/* Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Client Perspective */}
            <div className="p-3.5 rounded-lg bg-black/40 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 font-semibold text-slate-300">
                <span>🌐 클라이언트 브라우저 수신 상태</span>
                <span className="text-emerald-400 font-mono text-[11px]">CWE-209 방어</span>
              </div>
              <div>
                <span className="text-slate-400">수신 Digest: </span>
                <code className="text-sky-300 font-bold font-mono">{matchedLog.digest}</code>
              </div>
              <div>
                <span className="text-slate-400">표시 메시지: </span>
                <span className="text-slate-300 italic">
                  {isProd
                    ? 'An error occurred in the Server Components render. (마스킹 적용)'
                    : matchedLog.errorMessage}
                </span>
              </div>
              <div>
                <span className="text-slate-400">보안 등급: </span>
                <span className="text-emerald-400 font-semibold">
                  🛡️ 클라이언트 내부 정보 노출 0건 (안전)
                </span>
              </div>
            </div>

            {/* Server Perspective */}
            <div className="p-3.5 rounded-lg bg-black/40 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 font-semibold text-slate-300">
                <span>🖥️ 서버 instrumentation.ts 캡처 원본</span>
                <span className="text-sky-400 font-mono text-[11px]">
                  {matchedLog.routeType.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-slate-400">서버 Digest: </span>
                <code className="text-sky-300 font-bold font-mono">{matchedLog.digest}</code>
              </div>
              <div>
                <span className="text-slate-400">발생 경로: </span>
                <span className="text-slate-200 font-mono">{matchedLog.requestPath}</span>
              </div>
              <div>
                <span className="text-slate-400">복원 시각: </span>
                <span className="text-slate-400 font-mono">{matchedLog.timestamp}</span>
              </div>
            </div>
          </div>

          {/* Root Cause Card */}
          <div className="p-3.5 rounded-lg bg-red-950/20 border border-red-500/30 text-xs space-y-2">
            <div className="flex items-center justify-between text-red-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <span>💥</span> 복원된 원본 에러 (Root Cause)
              </span>
              <span className="font-mono text-[11px] text-red-400">Internal Server Error</span>
            </div>
            <p
              data-testid="matched-root-cause"
              className="text-white font-mono font-medium break-all bg-black/50 p-2.5 rounded border border-red-500/20"
            >
              {matchedLog.errorMessage}
            </p>
            {matchedLog.stackTrace && (
              <details className="text-[11px] text-slate-400 cursor-pointer">
                <summary className="hover:text-slate-200 transition py-1">
                  스택트레이스 보기 (Server-Side Only Stack)
                </summary>
                <pre className="mt-2 p-2.5 bg-black/80 rounded border border-slate-800 overflow-x-auto text-[11px] font-mono text-slate-400 whitespace-pre">
                  {matchedLog.stackTrace}
                </pre>
              </details>
            )}
          </div>

          {/* APM & OpenTelemetry Span Attributes Preview */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1.5">
            <div className="text-slate-400 font-semibold flex items-center justify-between">
              <span>📡 OpenTelemetry / Sentry 스팬 메타데이터 연계 미리보기</span>
              <span className="text-emerald-400 text-[10px]">Instrumentation Standard</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1">
              <div>
                <span className="text-slate-500">error.digest: </span>
                <span className="text-sky-300">{matchedLog.digest}</span>
              </div>
              <div>
                <span className="text-slate-500">next.route.type: </span>
                <span className="text-amber-300">{matchedLog.routeType}</span>
              </div>
              <div>
                <span className="text-slate-500">next.route.path: </span>
                <span className="text-slate-300">{matchedLog.requestPath}</span>
              </div>
              <div>
                <span className="text-slate-500">sentry.capture: </span>
                <span className="text-emerald-300">onRequestError (v8.28+)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
