import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAnswer } from '@/domain/services/chat-answer';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '認証されていません' } },
      { status: 401 }
    );
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role, property_id')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'admin') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '権限がありません' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const content = body.content?.trim();

  if (!content) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '質問テキストが必要です' } },
      { status: 400 }
    );
  }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  const answer = await generateAnswer(adminClient, content, userData.property_id, {
    includeUnpublished: true,
  });

  return NextResponse.json({
    content: answer.content,
    sources: answer.sources,
  });
}
