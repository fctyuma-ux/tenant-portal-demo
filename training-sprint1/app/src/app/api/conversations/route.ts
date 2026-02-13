import { NextResponse } from 'next/server';
import { getAuthContext, errorResponse } from '@/lib/api-helpers';

export async function POST() {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  try {
    const conversation = await auth.services.conversation.create(auth.user.id);
    return NextResponse.json(conversation);
  } catch {
    return errorResponse('CREATE_FAILED', '会話の作成に失敗しました', 500);
  }
}
