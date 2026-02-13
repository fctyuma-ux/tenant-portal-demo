import { SupabaseClient } from '@supabase/supabase-js';
import type { FAQ } from '@/lib/types/database';
import type { IFaqRepository } from '../interfaces/faq-repository';

export class SupabaseFaqRepository implements IFaqRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByPropertyId(propertyId: string): Promise<FAQ[]> {
    const { data } = await this.supabase
      .from('faqs')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async searchByKeyword(
    question: string,
    propertyId: string,
    limit = 3
  ): Promise<{ category: string; question: string; answer: string }[]> {
    const { data } = await this.supabase
      .from('faqs')
      .select('category, question, answer')
      .eq('property_id', propertyId)
      .or(`question.ilike.%${question}%,answer.ilike.%${question}%`)
      .limit(limit);
    return data ?? [];
  }

  async create(data: {
    property_id: string;
    category: string;
    question: string;
    answer: string;
  }): Promise<void> {
    const { error } = await this.supabase.from('faqs').insert(data);
    if (error) throw new Error(`FAQ作成に失敗: ${error.message}`);
  }

  async update(
    faqId: string,
    data: { category: string; question: string; answer: string }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('faqs')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', faqId);
    if (error) throw new Error(`FAQ更新に失敗: ${error.message}`);
  }

  async delete(faqId: string): Promise<void> {
    const { error } = await this.supabase.from('faqs').delete().eq('id', faqId);
    if (error) throw new Error(`FAQ削除に失敗: ${error.message}`);
  }
}
