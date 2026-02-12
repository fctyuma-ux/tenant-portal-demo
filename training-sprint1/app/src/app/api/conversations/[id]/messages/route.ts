import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAnswer } from '@/domain/services/chat-answer';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/conversations/:id/messages - 会話履歴取得
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id: conversationId } = await params;

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

  // 自分の会話であるか確認
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (!conversation) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '会話が見つかりません' } },
      { status: 404 }
    );
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, feedback, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    conversation_id: conversationId,
    messages: messages ?? [],
  });
}

/**
 * POST /api/conversations/:id/messages - AI質問送信・回答取得
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id: conversationId } = await params;

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

  // ユーザー情報（property_id）を取得
  const { data: userData } = await supabase
    .from('users')
    .select('property_id')
    .eq('id', user.id)
    .single();

  if (!userData) {
    return NextResponse.json(
      { error: { code: 'USER_NOT_FOUND', message: 'ユーザー情報が見つかりません' } },
      { status: 404 }
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

  // 1. ユーザーメッセージを保存
  const { data: userMessage, error: userMsgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content,
    })
    .select('id, role, content, created_at')
    .single();

  if (userMsgError) {
    return NextResponse.json(
      { error: { code: 'SAVE_FAILED', message: userMsgError.message } },
      { status: 500 }
    );
  }

  // 2. AI 回答生成（Service Role Key で実行）
  let answer;
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = createAdminClient();
    answer = await generateAnswer(adminClient, content, userData.property_id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI回答の生成に失敗しました';
    console.error('generateAnswer error:', message);
    return NextResponse.json(
      { error: { code: 'AI_ERROR', message } },
      { status: 500 }
    );
  }

  // 3. AI回答メッセージを保存
  const { data: assistantMessage, error: assistantMsgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: answer.content,
    })
    .select('id, role, content, feedback, created_at')
    .single();

  if (assistantMsgError) {
    return NextResponse.json(
      { error: { code: 'SAVE_FAILED', message: assistantMsgError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    user_message: userMessage,
    assistant_message: {
      ...assistantMessage,
      sources: answer.sources,
    },
  });
}
