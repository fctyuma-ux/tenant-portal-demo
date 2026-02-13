import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServices, type Services } from '@/domain/services/factory';

/**
 * Server Component 用の認証チェック + サービス生成。
 * 未認証の場合は /login にリダイレクトする。
 */
export async function getPageAuth(): Promise<{
  userId: string;
  services: Services;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return { userId: user.id, services: createServices(supabase) };
}
