import { createClient } from '@/lib/supabase/server';
import { createServices, type Services } from '@/domain/services/factory';

type ActionError = { error: string };

type AuthResult =
  | { ok: true; userId: string; services: Services }
  | { ok: false; error: ActionError };

type AuthWithPropertyResult =
  | { ok: true; userId: string; propertyId: string; services: Services }
  | { ok: false; error: ActionError };

/**
 * Server Action 用の認証チェック。サービスも同時に生成する。
 */
export async function actionAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: { error: '認証されていません' } };
  }

  return { ok: true, userId: user.id, services: createServices(supabase) };
}

/**
 * Server Action 用の認証 + propertyId 取得。
 */
export async function actionAuthWithProperty(): Promise<AuthWithPropertyResult> {
  const auth = await actionAuth();
  if (!auth.ok) return auth;

  const propertyId = await auth.services.auth.getUserPropertyId(auth.userId);
  if (!propertyId) {
    return { ok: false, error: { error: 'ユーザー情報が見つかりません' } };
  }

  return { ok: true, userId: auth.userId, propertyId, services: auth.services };
}
