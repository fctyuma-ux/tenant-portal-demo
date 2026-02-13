import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, createAdminServices, errorResponse } from '@/lib/api-helpers';
import { MessageSendSchema } from '@/schemas/message';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/conversations/:id/messages - 会話履歴取得
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id: conversationId } = await params;
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const isOwner = await auth.services.conversation.verifyOwnership(conversationId, auth.user.id);
  if (!isOwner) {
    return errorResponse('NOT_FOUND', '会話が見つかりません', 404);
  }

  const messages = await auth.services.message.getByConversationId(conversationId);
  return NextResponse.json({ conversation_id: conversationId, messages });
}

/**
 * POST /api/conversations/:id/messages - AI質問送信・回答取得
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id: conversationId } = await params;
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const propertyId = await auth.services.auth.getUserPropertyId(auth.user.id);
  if (!propertyId) {
    return errorResponse('USER_NOT_FOUND', 'ユーザー情報が見つかりません', 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'リクエストボディが不正です', 400);
  }

  const parsed = MessageSendSchema.safeParse({ conversationId, content: (body as Record<string, unknown>).content });
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
  }

  // 1. ユーザーメッセージを保存
  let userMessage;
  try {
    userMessage = await auth.services.message.create({
      conversation_id: conversationId,
      role: 'user',
      content: parsed.data.content,
    });
  } catch {
    return errorResponse('SAVE_FAILED', 'メッセージの保存に失敗しました', 500);
  }

  // 2. AI 回答生成（Service Role Key で実行）
  let answer;
  try {
    const adminServices = createAdminServices();
    answer = await adminServices.chatAnswer.generateAnswer(parsed.data.content, propertyId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI回答の生成に失敗しました';
    console.error('generateAnswer error:', message);
    return errorResponse('AI_ERROR', message, 500);
  }

  // 3. AI回答メッセージを保存
  let assistantMessage;
  try {
    assistantMessage = await auth.services.message.create({
      conversation_id: conversationId,
      role: 'assistant',
      content: answer.content,
    });
  } catch {
    return errorResponse('SAVE_FAILED', 'AI回答の保存に失敗しました', 500);
  }

  return NextResponse.json({
    user_message: userMessage,
    assistant_message: { ...assistantMessage, sources: answer.sources },
  });
}
