'use server';

import { revalidatePath } from 'next/cache';
import { FaqCreateSchema } from '@/schemas/faq';
import { actionAuth, actionAuthWithProperty } from '@/lib/action-helpers';

export async function createFaq(data: { category: string; question: string; answer: string }) {
  const parsed = FaqCreateSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await actionAuthWithProperty();
  if (!auth.ok) return auth.error;

  try {
    await auth.services.faq.create({ property_id: auth.propertyId, ...parsed.data });
    revalidatePath('/admin/faqs');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : '登録に失敗しました' };
  }
}

export async function updateFaq(
  faqId: string,
  data: { category: string; question: string; answer: string }
) {
  const parsed = FaqCreateSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await actionAuth();
  if (!auth.ok) return auth.error;

  try {
    await auth.services.faq.update(faqId, parsed.data);
    revalidatePath('/admin/faqs');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : '更新に失敗しました' };
  }
}

export async function deleteFaq(faqId: string) {
  const auth = await actionAuth();
  if (!auth.ok) return auth.error;

  try {
    await auth.services.faq.delete(faqId);
    revalidatePath('/admin/faqs');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : '削除に失敗しました' };
  }
}
