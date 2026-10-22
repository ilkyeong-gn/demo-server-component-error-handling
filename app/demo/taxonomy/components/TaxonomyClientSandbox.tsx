'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { inviteMemberAction, type InviteMemberResult } from '../actions';

export function TaxonomyClientSandbox() {
  const searchParams = useSearchParams();
  const currentChaos = searchParams.get('chaos') || 'none';

  // Server Action 폼 상태
  const [state, formAction, isPending] = useActionState<InviteMemberResult | null, FormData>(
    inviteMemberAction,
    null
  );

  // 폼 입력 로컬 상태 (프리셋 지원)
  const [email, setEmail] = useState('developer@company.com');
  const [role, setRole] = useState('member');
  const [useRethrow, setUseRethrow] = useState(true);

  // 하단 아키텍처 가이드 탭 상태
  const [activeTab, setActiveTab] = useState<'primitives' | 'result' | 'rethrow'>('primitives');

  const applyPreset = (presetEmail: string, presetRole: string, presetRethrow: boolean) => {
    setEmail(presetEmail);
    setRole(presetRole);
    setUseRethrow(presetRethrow);
  };

  const isSignalSwallowed =
    state?.success === false &&
    (state.error.includes('NEXT_HTTP_ERROR_FALLBACK') ||
      state.error.includes('NEXT_FORBIDDEN') ||
      (state.error.includes('UNEXPECTED_FAILURE') && role === 'admin' && !useRethrow));

  return (
    <div className="space-y-8">
      {/* 2-Column Split Screen Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Pre-stream Primitives */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🕹️</span>
                <h2 className="text-lg font-semibold text-white">
                  Pre-stream 제어 프리미티브 시연
                </h2>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                RSC URL Trigger
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              데이터 없음, 인증 필요, 권한 결손은 서버 오류(500)가 아닙니다.
              Next.js 공식 제어 프리미티브는 에러 바운더리를 터뜨리지 않고 정규 HTTP 상태 코드와 컨벤션 뷰로 직행합니다.
            </p>

            {/* Buttons Group */}
            <div className="space-y-2.5">
              <Link
                href="/demo/taxonomy"
                className={`flex items-center justify-between p-3 rounded-lg border text-sm font-medium transition ${
                  currentChaos === 'none'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🟢</span>
                  <div>
                    <div className="font-semibold text-xs sm:text-sm">정상 렌더링 (Default)</div>
                    <div className="text-xs text-slate-500 font-mono">?chaos=none</div>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  200 OK
                </span>
              </Link>

              <Link
                href="/demo/taxonomy?chaos=not_found"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-300 hover:border-amber-500/50 hover:bg-amber-950/20 text-sm font-medium transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🟡</span>
                  <div>
                    <div className="font-semibold text-xs sm:text-sm">notFound() 호출 (데이터 부재)</div>
                    <div className="text-xs text-slate-500 font-mono">?chaos=not_found</div>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  404 Not Found
                </span>
              </Link>

              <Link
                href="/demo/taxonomy?chaos=unauthorized"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-300 hover:border-purple-500/50 hover:bg-purple-950/20 text-sm font-medium transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🟣</span>
                  <div>
                    <div className="font-semibold text-xs sm:text-sm">unauthorized() 호출 (비로그인)</div>
                    <div className="text-xs text-slate-500 font-mono">?chaos=unauthorized</div>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  401 Unauthorized
                </span>
              </Link>

              <Link
                href="/demo/taxonomy?chaos=forbidden"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-300 hover:border-red-500/50 hover:bg-red-950/20 text-sm font-medium transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🔴</span>
                  <div>
                    <div className="font-semibold text-xs sm:text-sm">forbidden() 호출 (권한 결손)</div>
                    <div className="text-xs text-slate-500 font-mono">?chaos=forbidden</div>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  403 Forbidden
                </span>
              </Link>

              <Link
                href="/demo/taxonomy?chaos=unexpected"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-300 hover:border-rose-500/50 hover:bg-rose-950/20 text-sm font-medium transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">💥</span>
                  <div>
                    <div className="font-semibold text-xs sm:text-sm">throw new Error() (시스템 결함)</div>
                    <div className="text-xs text-slate-500 font-mono">?chaos=unexpected</div>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  500 Error
                </span>
              </Link>
            </div>
          </div>

          {/* Current Status Monitor */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">현재 활성화된 HTTP 응답:</span>
              <span className="font-mono text-emerald-400 font-semibold">200 OK (정상 화면)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">렌더링 세그먼트:</span>
              <span className="font-mono text-slate-300">app/demo/taxonomy/page.tsx</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">에러 바운더리 개입:</span>
              <span className="text-slate-400">우회 (Bypassed)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Server Action Result Pattern */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h2 className="text-lg font-semibold text-white">
                  Server Action Result 패턴 & Rethrow
                </h2>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                useActionState
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              폼 입력 검증 실패 시 예외를 던지지 않고 <code className="text-sky-300 font-mono">Result</code> 타입을 반환하여
              사용자 입력 컨텍스트를 보존하고 인라인 피드백을 제공합니다.
            </p>

            {/* Quick Presets */}
            <div className="mb-4">
              <span className="text-xs text-slate-500 block mb-1.5 font-medium">시연 프리셋 채우기:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('developer@company.com', 'member', true)}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  🟢 정상 초대
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('duplicate@company.com', 'member', true)}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  🟡 중복 이메일 (Result.fail)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('admin@company.com', 'admin', false)}
                  className="px-2.5 py-1 text-xs rounded bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 transition"
                >
                  ⚠️ 안티패턴 (신호 삼킴)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('admin@company.com', 'admin', true)}
                  className="px-2.5 py-1 text-xs rounded bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/40 transition"
                >
                  🟣 권장 패턴 (403 이동)
                </button>
              </div>
            </div>

            {/* Action Form */}
            <form action={formAction} className="space-y-3.5">
              <div>
                <label
                  htmlFor="member-email"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  팀원 이메일
                </label>
                <input
                  id="member-email"
                  name="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div>
                <label
                  htmlFor="member-role"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  부여 역할
                </label>
                <select
                  id="member-role"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
                >
                  <option value="member">일반 멤버 (Member - 권한 허용)</option>
                  <option value="admin">관리자 (Admin - forbidden() 유발)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="useRethrow"
                    value="true"
                    checked={useRethrow}
                    onChange={(e) => setUseRethrow(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      <code>unstable_rethrow(err)</code> 적용 (권장 패턴)
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      체크 해제 시 catch 블록에서 Next.js 제어 신호를 일반 에러로 삼키는 안티패턴을 재현합니다.
                    </div>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                    서버 액션 처리 중...
                  </>
                ) : (
                  '초대 실행 (Server Action)'
                )}
              </button>
            </form>
          </div>

          {/* Real-time Result Feedback Area */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-medium block">
              액션 실행 결과 (Result Feedback):
            </span>

            {state === null && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-500 text-center">
                폼을 제출하면 Result 객체 반환 결과가 여기에 표시됩니다.
              </div>
            )}

            {state?.success === true && (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span>✅</span> 초대가 완료되었습니다 (Result.ok)
                </div>
                <div className="text-slate-300 font-mono">
                  ID: {state.data.id} | Email: {state.data.email} | Role: {state.data.role}
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  HTTP 200 유지, 페이지 리로드 없이 클라이언트 상태만 온전하게 갱신되었습니다.
                </p>
              </div>
            )}

            {state?.success === false && isSignalSwallowed && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/50 rounded-lg text-xs space-y-1.5">
                <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <span>⚠️</span> [안티패턴 경고] Next.js 제어 신호 삼킴 발생!
                </div>
                <div className="text-slate-300 font-mono break-all bg-black/40 p-2 rounded border border-amber-900/30">
                  {state.error}
                </div>
                <p className="text-amber-200/90 text-xs">
                  관리자 권한 결손으로 <code>forbidden()</code>이 호출되었으나,{' '}
                  <code>unstable_rethrow</code>가 없어서 Next.js 403 화면으로 이동하지 못하고 영문 모를 일반 시스템 에러로 전락했습니다.
                </p>
              </div>
            )}

            {state?.success === false && !isSignalSwallowed && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-rose-400 flex items-center gap-1.5">
                  <span>❌</span> 비즈니스 검증 실패 (Result.fail)
                </div>
                <div className="text-rose-200 font-mono">
                  {state.error}
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  Expected Error이므로 throw하지 않고 Result 실패 타입을 반환하여 폼 입력값 손실 없이 즉시 인라인 피드백을 표시했습니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Architecture Guide & Code Inspection Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span>📖</span> 원칙 1 심층 아키텍처 가이드 & 코드 대조
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              팀 표준 가이드: 안티패턴 vs 권장 패턴 상세 코드 비교
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('primitives')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'primitives'
                  ? 'bg-slate-800 text-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. 제어 프리미티브
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('result')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'result'
                  ? 'bg-slate-800 text-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Result 패턴
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rethrow')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'rethrow'
                  ? 'bg-slate-800 text-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3. unstable_rethrow
            </button>
          </div>
        </div>

        {/* Tab 1: Primitives */}
        {activeTab === 'primitives' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-slate-950 border border-rose-900/30 space-y-2">
              <div className="font-semibold text-rose-400 flex items-center gap-1">
                <span>❌</span> 안티패턴: 모든 예외 상황에 throw Error 남용
              </div>
              <pre className="p-3 bg-black/50 rounded font-mono text-slate-300 overflow-x-auto">
{`// ❌ 데이터 없음/권한 없음에도 500 예외 발생
export default async function UserProfile({ id }) {
  const user = await db.user.findById(id);
  if (!user) {
    throw new Error('User not found'); // 500 에러 바운더리 크래시
  }
  return <Profile user={user} />;
}`}
              </pre>
              <p className="text-slate-400">
                • 검색 엔진 및 캐시가 500 서버 장애로 오인하여 불필요한 알람 발생
                <br />• 사용자는 정상적인 404 안내가 아닌 시스템 크래시 화면을 마주하게 됨
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-emerald-900/30 space-y-2">
              <div className="font-semibold text-emerald-400 flex items-center gap-1">
                <span>✅</span> 권장 패턴: 공식 제어 프리미티브 선언적 호출
              </div>
              <pre className="p-3 bg-black/50 rounded font-mono text-slate-300 overflow-x-auto">
{`// ✅ Next.js 16 공식 제어 프리미티브 사용
import { notFound, unauthorized } from 'next/navigation';

export default async function UserProfile({ id }) {
  const user = await db.user.findById(id);
  if (!user) notFound(); // not-found.tsx 404 직행
  return <Profile user={user} />;
}`}
              </pre>
              <p className="text-slate-400">
                • 에러 바운더리를 터뜨리지 않고 정규 HTTP 404/401/403 응답 전송
                <br />• <code>experimental.authInterrupts</code> 지원으로 401/403 표준 핸들링
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Result Pattern */}
        {activeTab === 'result' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-slate-950 border border-rose-900/30 space-y-2">
              <div className="font-semibold text-rose-400 flex items-center gap-1">
                <span>❌</span> 안티패턴: 폼 입력 검증 실패 시 throw
              </div>
              <pre className="p-3 bg-black/50 rounded font-mono text-slate-300 overflow-x-auto">
{`// ❌ 비즈니스 검증 실패를 예외로 처리
export async function submitForm(data) {
  if (isDuplicate(data.email)) {
    throw new Error('이미 사용 중인 이메일');
  }
}`}
              </pre>
              <p className="text-slate-400">
                • 페이지 전체 또는 세그먼트 에러 바운더리가 폭발하여 사용자가 입력하던 폼 내용 전체 증발
                <br />• 단순 유효성 검증 실패가 서버 시스템 에러로 둔갑
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-emerald-900/30 space-y-2">
              <div className="font-semibold text-emerald-400 flex items-center gap-1">
                <span>✅</span> 권장 패턴: Result&lt;T, E&gt; 타입 반환
              </div>
              <pre className="p-3 bg-black/50 rounded font-mono text-slate-300 overflow-x-auto">
{`// ✅ Result 패턴과 useActionState 결합
import { ok, fail, type Result } from '@/lib/result';

export async function submitForm(data): Promise<Result<User, string>> {
  if (isDuplicate(data.email)) {
    return fail('이미 등록된 이메일입니다.');
  }
  return ok(await createUser(data));
}`}
              </pre>
              <p className="text-slate-400">
                • 폼 입력 상태가 온전히 보존되며 에러 메시지만 인라인으로 렌더링
                <br />• TypeScript의 판별 유니온(Discriminated Union)으로 타입 안정성 확보
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: unstable_rethrow */}
        {activeTab === 'rethrow' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-slate-950 border border-rose-900/30 space-y-2">
              <div className="font-semibold text-rose-400 flex items-center gap-1">
                <span>❌</span> 안티패턴: try/catch에서 Next.js 제어 신호 삼킴
              </div>
              <pre className="p-3 bg-black/50 rounded font-mono text-slate-300 overflow-x-auto">
{`// ❌ 제어 흐름 신호를 일반 에러로 착각하여 삼킴
try {
  if (!isAdmin) forbidden();
} catch (err) {
  // NEXT_HTTP_ERROR_FALLBACK 신호가 삼켜져
  // 403 화면으로 전환되지 않는 심각한 버그!
  return fail('시스템 오류');
}`}
              </pre>
              <p className="text-slate-400">
                • Next.js의 <code>redirect()</code>, <code>notFound()</code>, <code>forbidden()</code>은 내부적으로 특수 예외를 throw하여 라우팅 제어
                <br />• 이를 삼켜버리면 사용자가 권한 에러 페이지 대신 영문 모를 오류 메시지를 보게 됨
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-emerald-900/30 space-y-2">
              <div className="font-semibold text-emerald-400 flex items-center gap-1">
                <span>✅</span> 권장 패턴: catch 최상단에서 unstable_rethrow 호출
              </div>
              <pre className="p-3 bg-black/50 rounded font-mono text-slate-300 overflow-x-auto">
{`// ✅ Next.js 내부 제어 신호는 즉시 다시 throw
import { unstable_rethrow } from 'next/navigation';

try {
  if (!isAdmin) forbidden();
} catch (err) {
  unstable_rethrow(err); // 프레임워크 신호는 통과
  return fail(err.message); // 일반 비즈니스 예외만 처리
}`}
              </pre>
              <p className="text-slate-400">
                • Next.js 제어 신호는 프레임워크 런타임으로 안전하게 전파
                <br />• 비즈니스 예외만 격리하여 Result 패턴으로 안전하게 전환 가능
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
