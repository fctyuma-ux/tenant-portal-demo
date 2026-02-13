import { NextResponse } from 'next/server';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServices, type Services } from '@/domain/services/factory';

/**
 * API Route 用エラーレスポンスを生成する
 */
export function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * 認証済みユーザーを取得する。未認証の場合は 401 レスポンスを返す。
 * 成功時は { user, supabase, services } を返す。
 */
export async function getAuthContext(): Promise<
  | { ok: true; user: User; supabase: SupabaseClient; services: Services }
  | { ok: false; response: NextResponse }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        response: errorResponse('UNAUTHORIZED', '認証されていません', 401),
      };
    }

    return { ok: true, user, supabase, services: createServices(supabase) };
  } catch (err) {
    console.error('getAuthContext error:', err);
    return {
      ok: false,
      response: errorResponse('INTERNAL_ERROR', 'サーバー内部エラーが発生しました', 500),
    };
  }
}

/**
 * 管理者権限付きサービスを生成する（RPC・ベクトル検索等に使用）
 */
export function createAdminServices(): Services {
  return createServices(createAdminClient());
}
