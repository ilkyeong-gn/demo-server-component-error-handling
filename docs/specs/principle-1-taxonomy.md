# 원칙 1 상세 설계 명세: Expected Error 및 Result 패턴 시연

> **상위 이슈**: [#7 [Map] Next.js 16 서버 컴포넌트 에러 처리 최소 기능 데모 앱 기획](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/7)  
> **해당 티켓**: [#8 [원칙 1] Expected Error 및 Result 패턴 시연 시나리오 설계](https://github.com/ilkyeong-gn/demo-server-component-error-handling/issues/8)  
> **표준 문서**: [ADR-0001](../adr/0001-server-component-error-handling-policy.md) · [멘탈 모델](../mental-model.md) · [공통 기반 명세](./demo-app-foundation.md)  
> **대화형 프로토타입**: [`prototypes/taxonomy-interaction-prototype.html`](../../prototypes/taxonomy-interaction-prototype.html)

---

## 1. 개요 및 목적

본 명세는 **원칙 1 (에러 2단계 분류 및 제어 프리미티브 우선 정책)**을 팀원들이 직접 브라우저에서 조작하고 코드를 비교하며 체득할 수 있도록 `/demo/taxonomy` 라우트의 구체적인 UI 레이아웃, 시연 시나리오, 컴포넌트 및 Server Action 코드를 정의합니다.

### 핵심 전달 가치
1. **Pre-stream 제어 프리미티브**: `notFound()`, `unauthorized()`, `forbidden()`이 일반 예외(`throw new Error()`)와 달리 에러 바운더리를 터뜨리지 않고 올바른 HTTP 상태 코드(404, 401, 403)와 전용 컨벤션 화면으로 직행함을 확인.
2. **Result 패턴과 Soft 200 회피**: Server Action 폼 검증과 같은 Expected Error 상황에서 예외를 던지지 않고 `{ success: false, error }`를 반환하여 인라인 피드백을 제공하는 방법 검증.
3. **`unstable_rethrow`의 필수성**: `try/catch` 블록 내에서 Next.js의 제어 흐름 신호(`NEXT_NOT_FOUND`, `NEXT_FORBIDDEN` 등)가 일반 에러로 삼켜지는 안티패턴과, 이를 방어하는 `unstable_rethrow(err)`의 동작 원리를 눈으로 확인.

---

## 2. 화면 구조 및 UI 정보 구조 (IA)

`/demo/taxonomy` 화면은 팀원이 "공식 프리미티브"와 "Server Action Result 패턴"을 한 화면에서 유기적으로 비교할 수 있도록 **2컬럼 스플릿 샌드박스 (Split-Screen Sandbox)** 형태로 구성합니다.

```
+---------------------------------------------------------------------------------------------------+
|  GNB / Breadcrumb: Home > Demo > Principle 1: Taxonomy & Result Pattern                          |
+---------------------------------------------------------------------------------------------------+
|  [헤더 & 멘탈 모델 요약] "예측 가능한 상태는 throw하지 않고 제어 프리미티브 또는 Result 타입을 반환한다"   |
+-------------------------------------------------+-------------------------------------------------+
|  좌측 패널: Pre-stream 제어 프리미티브 시연        |  우측 패널: Server Action Result 패턴 & Rethrow |
+-------------------------------------------------+-------------------------------------------------+
|  [카오스 쿼리 링크 버튼군]                        |  [팀원 초대 폼 (Server Action)]                 |
|  - 🟢 정상 상태 (?chaos=none)                   |  - 이메일 입력 (duplicate@... 입력 시 중복 재현) |
|  - 🟡 notFound() (?chaos=not_found) -> 404     |  - 역할 선택 (Member vs Admin)                  |
|  - 🟣 unauthorized() (?chaos=unauthorized)->401 |  - [x] unstable_rethrow 적용 체크박스           |
|  - 🔴 forbidden() (?chaos=forbidden) -> 403     |  - [초대하기] 버튼 (useActionState 기반)        |
|  - 💥 Unexpected (?chaos=unexpected) -> 500     |                                                 |
|                                                 |  [실시간 인라인 결과 표시 영역]                 |
|  [현재 활성화된 HTTP 응답 헤더 및 컨벤션 뷰 안내] |  - 성공 시: 초록색 완료 배너                     |
|  - HTTP Status: 200 / 404 / 401 / 403 / 500     |  - 비즈니스 실패 시: 빨간색 인라인 경고 메시지    |
|  - 렌더링 파일: not-found.tsx, forbidden.tsx 등   |  - 신호 삼킴 안티패턴 시: 경고 알림              |
+-------------------------------------------------+-------------------------------------------------+
|  하단: 코드 비교 및 아키텍처 가이드 (Tab: 안티패턴 vs 권장 패턴 vs Best Practice)                  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. 시연 시나리오 상세

### 시나리오 1: Pre-stream 제어 프리미티브 vs Unexpected 500 예외
- **검증 대상**: `evaluateChaos(searchParams)`에 따른 브라우저 HTTP 헤더 및 렌더링 뷰 분기
- **동작**:
  1. `?chaos=not_found`: `app/demo/taxonomy/not-found.tsx` 렌더링, HTTP 상태 코드 404, Error Boundary 작동 안 함.
  2. `?chaos=unauthorized`: `app/demo/taxonomy/unauthorized.tsx` 렌더링, HTTP 상태 코드 401. (`experimental.authInterrupts` 작동 확인)
  3. `?chaos=forbidden`: `app/demo/taxonomy/forbidden.tsx` 렌더링, HTTP 상태 코드 403.
  4. `?chaos=unexpected`: `throw new Error(...)` 실행 -> `app/demo/taxonomy/error.tsx` 바운더리 포착, HTTP 상태 코드 500, digest 해시 발생.

### 시나리오 2: Server Action 폼 검증과 Result 패턴
- **검증 대상**: `lib/result.ts`의 `ok()`, `fail()` 및 클라이언트 `useActionState` 연동
- **동작**:
  1. **정상 입력** (`user@company.com`, Member):
     - Server Action이 `ok({ id: '...', email: '...' })` 반환.
     - 클라이언트는 페이지 전환/새로고침 없이 폼 하단에 초록색 완료 카드 노출.
  2. **비즈니스 규칙 위반** (`admin@company.com` 또는 `duplicate@...` 입력):
     - 서버에서 throw하지 않고 `fail('ALREADY_REGISTERED: 이미 등록된 팀원입니다.')` 반환.
     - HTTP 200 상태가 유지되며, Error Boundary를 건드리지 않고 폼 하단에 빨간색 텍스트로 인라인 에러 렌더링.

### 시나리오 3: `try/catch` 안티패턴과 `unstable_rethrow`
- **검증 대상**: Server Action 내에서 권한 체크 실패 시 `forbidden()` 호출 시 catch 블록의 처리
- **동작**:
  1. **`unstable_rethrow` OFF (안티패턴)**:
     - 역할로 `Admin`을 선택하여 제출.
     - Action 내부에서 관리자 권한 확인 실패로 `forbidden()` 호출.
     - 일반 `catch (err)` 블록이 `NEXT_FORBIDDEN` 신호를 일반 에러로 취급하여 삼켜버리고 `fail("알 수 없는 오류")` 반환.
     - **결과**: 사용자가 403 Forbidden 화면으로 안내받지 못하고 폼에 영문 모를 에러가 표시되는 버그 체감.
  2. **`unstable_rethrow` ON (권장 패턴)**:
     - 동일하게 `Admin` 선택 후 제출.
     - Action 내부 catch 블록 최상단에서 `unstable_rethrow(err)` 실행.
     - Next.js 제어 신호임을 감지하고 즉시 다시 rethrow하여 프레임워크가 가로챔.
     - **결과**: 즉시 `forbidden.tsx` (403 Forbidden) 화면으로 정상 전환됨.

---

## 4. 파일별 코드 명세

### 4.1 Server Action (`app/demo/taxonomy/actions.ts`)

```typescript
'use server';

import { unstable_rethrow } from 'next/navigation';
import { forbidden } from 'next/navigation';
import { ok, fail, type Result } from '@/lib/result';

export interface InviteMemberData {
  id: string;
  email: string;
  role: string;
}

export type InviteMemberResult = Result<InviteMemberData, string>;

export async function inviteMemberAction(
  prevState: InviteMemberResult | null,
  formData: FormData
): Promise<InviteMemberResult> {
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;
  const useRethrow = formData.get('useRethrow') === 'true';

  try {
    // 1. 관리자 권한 요구 시나리오 (프리미티브 호출)
    if (role === 'admin') {
      // 일반 세션에서는 관리자 역할을 초대할 수 없음 (403 유발)
      forbidden();
    }

    // 2. 이메일 유효성 및 중복 검증 (Expected Business Error -> Result.fail)
    if (!email || !email.includes('@')) {
      return fail('VALIDATION_ERROR: 올바른 이메일 주소를 입력해 주세요.');
    }
    if (email.startsWith('duplicate') || email === 'admin@company.com') {
      return fail('ALREADY_EXISTS: 해당 이메일은 이미 등록된 팀원입니다.');
    }

    // 3. 정상 처리 (ok 반환)
    return ok({
      id: `usr_${Math.random().toString(36).substring(2, 8)}`,
      email,
      role,
    });
  } catch (err: unknown) {
    if (useRethrow) {
      // ⭐ 권장: Next.js 제어 신호(NEXT_FORBIDDEN 등)는 다시 던져 프레임워크가 처리하게 함
      unstable_rethrow(err);
    }
    // ❌ 안티패턴: unstable_rethrow가 없으면 forbidden()이 삼켜져 아래 코드가 실행됨
    return fail(`UNEXPECTED_FAILURE: ${err instanceof Error ? err.message : '알 수 없는 시스템 오류'}`);
  }
}
```

### 4.2 페이지 세그먼트 (`app/demo/taxonomy/page.tsx`)

```typescript
import { evaluateChaos } from '@/lib/chaos';
import { TaxonomyClientSandbox } from './components/TaxonomyClientSandbox';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TaxonomyPage({ searchParams }: PageProps) {
  // Pre-stream 카오스 평가 (not_found, unauthorized, forbidden, unexpected)
  await evaluateChaos(searchParams, { scope: 'page' });

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">
          원칙 1: Expected Error vs Unexpected Exception
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          공식 제어 프리미티브(404, 401, 403), Server Action Result 패턴 및 unstable_rethrow 시연 샌드박스
        </p>
      </header>

      <TaxonomyClientSandbox />
    </div>
  );
}
```

### 4.3 컨벤션 파일들 (`not-found.tsx`, `unauthorized.tsx`, `forbidden.tsx`)

각 파일은 상단에 **HTTP 상태 코드 뱃지**와 **호출된 프리미티브 이름**, 그리고 **안내 메시지**를 일관되게 표시하여 팀원이 URL 변경 시 즉각적인 시각적 피드백을 받을 수 있도록 합니다.

---

## 5. 피드백 및 결정 항목 (User Alignment)

본 설계를 최종 확정하기 위해 다음 항목에 대한 사용자의 의견을 확인합니다:
1. **Server Action 도메인**: "팀원 초대 폼 (이메일 중복/관리자 권한)" 시나리오가 원칙 1의 개념(Result 반환 vs forbidden() 프리미티브 vs unstable_rethrow)을 팀원에게 전달하기에 충분히 명확한가?
2. **화면 배치**: 좌측(Pre-stream URL 링크 트리거) + 우측(Server Action 비즈니스 폼)의 2컬럼 스플릿 샌드박스 구조가 적합한가?
3. **학습용 코드 하이라이트 패널**: 화면 하단에 실행된 시나리오에 해당하는 코드 스니펫(안티패턴 vs 권장 패턴)을 실시간으로 함께 보여주는 기능 포함 여부.
