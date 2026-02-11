import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: messageId } = await params;

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

  const body = await request.json();
  const feedback = body.feedback;

  if (feedback !== 'positive' && feedback !== 'negative') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'feedback は positive または negative' } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('messages')
    .update({ feedback })
    .eq('id', messageId)
    .select('id, feedback')
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
