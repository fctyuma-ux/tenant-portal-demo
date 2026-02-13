'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LoginInputSchema } from '@/schemas/auth';
import { createServices } from '@/domain/services/factory';

export async function login(formData: FormData) {
  const parsed = LoginInputSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (authError) {
    return { error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '認証に失敗しました' };
  }

  const services = createServices(supabase);
  const role = await services.auth.getUserRole(user.id);

  if (role === 'admin') {
    redirect('/admin');
  } else {
    redirect('/chat');
  }
}
