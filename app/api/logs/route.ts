import { NextResponse } from 'next/server';
import { logStore } from '@/lib/log-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const digest = searchParams.get('digest');

  if (digest) {
    const log = logStore.getByDigest(digest);
    if (!log) {
      return NextResponse.json(
        { found: false, error: '해당 다이제스트와 일치하는 서버 로그를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ found: true, log });
  }

  return NextResponse.json({
    found: true,
    total: logStore.getAll().length,
    logs: logStore.getAll(),
  });
}

export async function DELETE() {
  logStore.clear();
  return NextResponse.json({ success: true, message: '서버 로그 스토어가 초기화되었습니다.' });
}
