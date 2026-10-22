import { test, expect } from '@playwright/test';

test.describe('Next.js 16 Server Component Error Handling 10-Item Hands-On E2E Test Suite', () => {
  // =========================================================================
  // 원칙 1: Taxonomy & Result Pattern
  // =========================================================================

  test('Checklist 1: Pre-stream 제어 프리미티브(404, 401, 403) 호출 시 에러 바운더리가 터지지 않고 전용 화면 및 정규 HTTP 상태가 반환된다', async ({
    page,
  }) => {
    // 1. 404 Not Found 프리미티브
    const res404 = await page.goto('/demo/taxonomy?chaos=not_found');
    expect(res404?.status()).toBe(404);
    await expect(page.locator('text=HTTP 404 Not Found')).toBeVisible();
    await expect(page.locator('text=리소스를 찾을 수 없습니다')).toBeVisible();

    // 2. 401 Unauthorized 프리미티브 (Next.js 16 authInterrupts)
    const res401 = await page.goto('/demo/taxonomy?chaos=unauthorized');
    expect(res401?.status()).toBe(401);
    await expect(page.locator('text=HTTP 401 Unauthorized')).toBeVisible();
    await expect(page.locator('text=인증이 필요합니다')).toBeVisible();

    // 3. 403 Forbidden 프리미티브
    const res403 = await page.goto('/demo/taxonomy?chaos=forbidden');
    expect(res403?.status()).toBe(403);
    await expect(page.locator('text=HTTP 403 Forbidden')).toBeVisible();
    await expect(page.locator('text=접근 권한이 없습니다')).toBeVisible();

    // 4. 500 Unexpected Exception -> error.tsx 활성화
    const res500 = await page.goto('/demo/taxonomy?chaos=unexpected');
    expect(res500?.status()).toBe(500);
    await expect(page.locator('text=HTTP 500 Internal Server Error')).toBeVisible();
    await expect(page.locator('text=예기치 못한 시스템 예외가 발생했습니다')).toBeVisible();
  });

  test('Checklist 2: Server Action 폼 검증 실패 시 예외를 throw하지 않고 Result 타입 객체를 반환하여 인라인 피드백이 렌더링된다', async ({
    page,
  }) => {
    await page.goto('/demo/taxonomy');

    // 중복 이메일 입력 (ALREADY_EXISTS 시나리오)
    const emailInput = page.locator('#member-email');
    await emailInput.fill('duplicate@company.com');

    // 폼 제출
    await page.click('button[type="submit"]');

    // 인라인 에러 피드백 확인 (에러 바운더리 미작동)
    const errorAlert = page.locator('text=ALREADY_EXISTS: 해당 이메일은 이미 등록된 팀원입니다.');
    await expect(errorAlert).toBeVisible();

    // 페이지가 리로드되거나 깨지지 않음 확인
    await expect(page.locator('text=Pre-stream 제어 프리미티브 시연')).toBeVisible();
  });

  test('Checklist 3: unstable_rethrow 누락 시 제어 신호가 삼켜지는 안티패턴과 적용 시 정상 전파됨을 검증한다', async ({
    page,
  }) => {
    await page.goto('/demo/taxonomy');

    // 1. 안티패턴: useRethrow 해제 상태에서 Admin 권한 초대 (forbidden 신호 삼킴)
    await page.selectOption('#member-role', 'admin');
    const rethrowCheckbox = page.locator('input[name="useRethrow"]');
    await rethrowCheckbox.uncheck();
    await page.click('button[type="submit"]');

    // 제어 신호가 삼켜져 엉뚱한 시스템 에러 메시지 노출 확인
    await expect(
      page.locator('text=UNEXPECTED_FAILURE: NEXT_HTTP_ERROR_FALLBACK;403')
    ).toBeVisible();

    // 2. 권장 패턴: role=admin 재선택 후 useRethrow 체크 상태에서 초대
    await page.selectOption('#member-role', 'admin');
    await rethrowCheckbox.check();
    await page.click('button[type="submit"]');

    // 정상적으로 forbidden.tsx (403) 화면으로 리다이렉션 전파됨을 확인
    await expect(page.locator('text=HTTP 403 Forbidden')).toBeVisible();
    await expect(page.locator('text=접근 권한이 없습니다')).toBeVisible();
  });

  // =========================================================================
  // 원칙 2: Boundaries & Recovery
  // =========================================================================

  test('Checklist 4: page.tsx 에러 발생 시 세그먼트 사이드바(Layout)가 파괴되지 않고 본문 영역만 격리된다', async ({
    page,
  }) => {
    await page.goto('/demo/boundaries?chaos=unexpected&scope=page');

    // 사이드바(Layout)가 온전히 유지됨 확인
    await expect(page.locator('text=Segment Shell')).toBeVisible();
    await expect(page.locator('text=Segment Layout 유지 중')).toBeVisible();

    // 본문 영역만 boundaries/error.tsx로 대체됨 확인
    await expect(page.locator('text=demo/boundaries/error.tsx 활성화')).toBeVisible();
  });

  test('Checklist 5: 세그먼트 layout.tsx 에러 발생 시 동일 세그먼트 error.tsx가 아닌 상위 app/error.tsx로 전파된다', async ({
    page,
  }) => {
    await page.goto('/demo/boundaries?chaos=unexpected&scope=layout');

    // 세그먼트 사이드바가 파괴되어 렌더링되지 않음 확인
    await expect(page.locator('text=Segment Shell')).not.toBeVisible();

    // 상위 app/error.tsx (Root 에러 바운더리) 포착 확인
    await expect(page.locator('text=루트 세그먼트 오류 발생 (app/error.tsx)')).toBeVisible();
  });

  test('Checklist 6: error.tsx에서 단순 reset() 호출 시 에러 루프가 발생하고 startTransition 복구 적용 시 정상 복원된다', async ({
    page,
  }) => {
    await page.goto('/demo/boundaries?chaos=unexpected&scope=page');
    await expect(page.locator('text=demo/boundaries/error.tsx 활성화')).toBeVisible();

    // 1. 단순 reset() 호출 (안티패턴)
    await page.click('text=❌ 단순 reset()');
    // 여전히 에러 상태 유지 확인
    await expect(page.locator('text=demo/boundaries/error.tsx 활성화')).toBeVisible();

    // 2. startTransition 복구 [표준]
    await page.click('text=✅ startTransition 복구');
    // 최신 서버 컴포넌트 렌더링에 성공하여 에러 바운더리가 닫히고 본문 내용 복원 확인
    await expect(page.locator('text=demo/boundaries/error.tsx 활성화')).not.toBeVisible();
    await expect(page.locator('text=원칙 2: 바운더리 계층 구조')).toBeVisible();
    await expect(page.locator('text=Segment Layout 유지 중')).toBeVisible();
  });

  // =========================================================================
  // 원칙 3: Blast Radius 통제
  // =========================================================================

  test('Checklist 7: 대시보드에서 보조 위젯(Feed) 장애 발생 시 전체 페이지가 깨지지 않고 Blast Radius가 25%로 통제된다', async ({
    page,
  }) => {
    await page.goto('/demo/blast-radius?chaos=unexpected&scope=feed&mode=granular');

    // Feed 위젯만 로컬 폴백 카드 표시 확인
    await expect(page.locator('text=FeedWidget 위젯을 불러올 수 없습니다')).toBeVisible();
    await expect(page.locator('text=Blast Radius: 25% (해당 위젯 국소 격리 🛡️)')).toBeVisible();

    // 나머지 3개 위젯(75%)은 온전히 정상 렌더링 확인 (Profile, Metrics, Recommendations)
    await expect(page.locator('text=Alex Dev')).toBeVisible();
    await expect(page.locator('text=시스템 핵심 KPI 지표')).toBeVisible();
    await expect(page.locator('text=권장 최적화 가이드')).toBeVisible();
  });

  test('Checklist 8: Suspense > EB 순서 역전 시 비동기 스트리밍 에러가 상위 세그먼트로 누출되어 대시보드 전체가 붕괴된다', async ({
    page,
  }) => {
    await page.goto('/demo/blast-radius?chaos=unexpected&scope=feed&order=reversed');

    // 전체 대시보드 셸이 언마운트되고 세그먼트 error.tsx로 누출 확인
    await expect(page.locator('text=Blast Radius: 100% (대시보드 전체 붕괴 😱)')).toBeVisible();
    await expect(page.locator('text=app/demo/blast-radius/error.tsx 활성화')).toBeVisible();
  });

  test('Checklist 9: 위젯 내부의 [이 위젯만 다시 시도] 클릭 시 타 위젯 상태 손실 없이 해당 위젯만 독립 복구된다', async ({
    page,
  }) => {
    await page.goto('/demo/blast-radius?chaos=unexpected&scope=feed&mode=granular');
    await expect(page.locator('text=FeedWidget 위젯을 불러올 수 없습니다')).toBeVisible();

    // Metrics 위젯의 카운터를 +1 증가시켜 클라이언트 상태 생성
    const counterBtn = page.locator('button:has-text("+1 증가")');
    await counterBtn.click();
    await expect(page.locator('text=클릭 카운트: 1회')).toBeVisible();

    // Feed 위젯의 '이 위젯만 다시 시도' 클릭
    await page.click('text=🔄 이 위젯만 다시 시도');

    // 피드 위젯이 정상 복구되었는지 확인
    await expect(page.locator('text=FeedWidget 위젯을 불러올 수 없습니다')).not.toBeVisible();
    await expect(page.locator('text=외부 피드 및 웹훅 스트림')).toBeVisible();

    // 다른 위젯의 클라이언트 상태(카운트 1회)가 유실되지 않고 보존됨 확인!
    await expect(page.locator('text=클릭 카운트: 1회')).toBeVisible();
  });

  // =========================================================================
  // 원칙 4: Observability & CWE-209 Digest 대조
  // =========================================================================

  test('Checklist 10: 프로덕션 빌드에서 클라이언트에 내부 스택트레이스가 마스킹(CWE-209)되고 Digest 해시로 1:1 매칭된다', async ({
    page,
    request,
  }) => {
    // 0. 사전 준비: 서버 로그 스토어 초기화
    await request.delete('/api/logs');

    // 1. RSC 렌더링 에러 유발
    await page.goto('/demo/observability?chaos=unexpected');

    // 2. 에러 바운더리 포착 확인
    await expect(page.getByTestId('observability-error-boundary')).toBeVisible();

    // 3. CWE-209 보안 마스킹 검증: 서버 원본 에러나 DB/스택 경로가 노출되지 않음
    const clientMsg = await page.getByTestId('client-error-message').textContent();
    expect(clientMsg).not.toContain('DB connection pool exhausted');
    expect(clientMsg).not.toContain('lib/chaos.ts');

    // 4. 클라이언트 Digest 값 추출
    const digestCode = page.getByTestId('client-digest-value');
    await expect(digestCode).toBeVisible();
    const digestText = (await digestCode.textContent())?.trim() || '';
    expect(digestText.length).toBeGreaterThan(0);
    expect(digestText).not.toBe('no-digest');

    // 5. 1:1 Digest Correlation Inspector 대조 조회
    await page.getByTestId('btn-lookup-digest').click();

    // 6. 100% MATCHED 상태 및 복원된 서버 원본 에러(Root Cause) 확인
    await expect(page.getByTestId('correlation-status-badge')).toBeVisible();
    await expect(page.getByTestId('matched-log-details')).toBeVisible();
    const rootCause = await page.getByTestId('matched-root-cause').textContent();
    expect(rootCause).toContain('DB connection pool exhausted');

    // 7. 제어 흐름 신호(404) 필터링 검증: notFound 호출 시 로그 스토어에 에러 미기록
    await page.goto('/demo/observability?chaos=not_found');
    await expect(page.locator('text=404')).toBeVisible();

    const logsRes = await request.get('/api/logs');
    const logsData = await logsRes.json();
    const notFoundLogs = logsData.logs.filter((l: any) => l.digest === 'NEXT_NOT_FOUND');
    expect(notFoundLogs).toHaveLength(0);

    // 8. Server Action 예외 포착 및 대조 검증
    await page.goto('/demo/observability');
    await page.getByTestId('btn-trigger-action-error').click();
    await expect(page.getByTestId('action-error-card')).toBeVisible();

    const actionDigestEl = page.getByTestId('action-error-digest');
    if (await actionDigestEl.isVisible()) {
      const actionDigest = (await actionDigestEl.textContent())?.trim();
      expect(actionDigest?.length).toBeGreaterThan(0);

      // 대조 조회 시 Server Action 로그 매칭
      await page.getByTestId('digest-input').fill(actionDigest!);
      await page.getByTestId('btn-lookup-digest').click();
      await expect(page.getByTestId('correlation-status-badge')).toBeVisible();
    }
  });
});
