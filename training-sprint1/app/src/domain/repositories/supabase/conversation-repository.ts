import { SupabaseClient } from '@supabase/supabase-js';
import type { IConversationRepository } from '../interfaces/conversation-repository';

export class SupabaseConversationRepository implements IConversationRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(userId: string): Promise<{ id: string; created_at: string }> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({ user_id: userId })
      .select('id, created_at')
      .single();
    if (error || !data) throw new Error(`会話作成に失敗: ${error?.message}`);
    return data;
  }

  async findByIdAndUserId(
    conversationId: string,
    userId: string
  ): Promise<{ id: string } | null> {
    const { data } = await this.supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();
    return data ?? null;
  }

  async countByUserIds(userIds: string[]): Promise<number> {
    if (userIds.length === 0) return 0;
    const { count } = await this.supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .in('user_id', userIds);
    return count ?? 0;
  }

  async findRecentByUserIds(
    userIds: string[],
    limit: number
  ): Promise<{ id: string; created_at: string; users: { name: string } | null }[]> {
    if (userIds.length === 0) return [];
    const { data } = await this.supabase
      .from('conversations')
      .select('id, created_at, users(name)')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []).map((c: { id: string; created_at: string; users: { name: string } | { name: string }[] | null }) => ({
      id: c.id,
      created_at: c.created_at,
      users: Array.isArray(c.users) ? c.users[0] ?? null : c.users,
    }));
  }
}
