import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, errorResponse } from '@/lib/api-helpers';
import { MessageFeedbackSchema } from '@/schemas/message';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: messageId } = await params;
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = MessageFeedbackSchema.safeParse({ messageId, feedback: body.feedback });
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
  }

  try {
    const result = await auth.services.message.updateFeedback(
      parsed.data.messageId,
      parsed.data.feedback,
      auth.user.id
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'フィードバックの更新に失敗しました';
    const status = message.includes('権限') || message.includes('見つかりません') ? 403 : 500;
    return errorResponse('UPDATE_FAILED', message, status);
  }
}
