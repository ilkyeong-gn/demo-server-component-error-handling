'use server';

import { unstable_rethrow, forbidden } from 'next/navigation';
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
  const email = (formData.get('email') as string)?.trim() || '';
  const role = (formData.get('role') as string)?.trim() || 'member';
  const useRethrow =
    formData.get('useRethrow') === 'true' || formData.get('useRethrow') === 'on';

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
    return fail(
      `UNEXPECTED_FAILURE: ${err instanceof Error ? err.message : '알 수 없는 시스템 오류'}`
    );
  }
}
