import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
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

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id })
    .select('id, created_at')
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: 'CREATE_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
