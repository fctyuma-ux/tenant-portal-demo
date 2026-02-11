'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください' };
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  // ロールを取得してリダイレクト先を判定
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '認証に失敗しました' };
  }

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();

  if (userData?.role === 'admin') {
    redirect('/admin');
  } else {
    redirect('/chat');
  }
}
