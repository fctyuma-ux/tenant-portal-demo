import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzePdf } from '@/domain/services/pdf-analysis';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;

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

  // admin 権限チェック
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();

  if (userData?.role !== 'admin') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '権限がありません' } },
      { status: 403 }
    );
  }

  // Service Role Key を使った管理者クライアントで解析実行
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  const result = await analyzePdf(adminClient, documentId);

  if (!result.success) {
    return NextResponse.json(
      { error: { code: 'ANALYSIS_FAILED', message: result.error } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
