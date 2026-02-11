'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createFaq(data: { category: string; question: string; answer: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '認証されていません' };

  const { data: userData } = await supabase
    .from('users')
    .select('property_id')
    .eq('id', user.id)
    .single();
  if (!userData) return { error: 'ユーザー情報が見つかりません' };

  const { error } = await supabase.from('faqs').insert({
    property_id: userData.property_id,
    category: data.category,
    question: data.question,
    answer: data.answer,
  });

  if (error) return { error: `登録に失敗しました: ${error.message}` };

  revalidatePath('/admin/faqs');
  return { success: true };
}

export async function updateFaq(
  faqId: string,
  data: { category: string; question: string; answer: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '認証されていません' };

  const { error } = await supabase
    .from('faqs')
    .update({
      category: data.category,
      question: data.question,
      answer: data.answer,
      updated_at: new Date().toISOString(),
    })
    .eq('id', faqId);

  if (error) return { error: `更新に失敗しました: ${error.message}` };

  revalidatePath('/admin/faqs');
  return { success: true };
}

export async function deleteFaq(faqId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '認証されていません' };

  const { error } = await supabase.from('faqs').delete().eq('id', faqId);

  if (error) return { error: `削除に失敗しました: ${error.message}` };

  revalidatePath('/admin/faqs');
  return { success: true };
}
