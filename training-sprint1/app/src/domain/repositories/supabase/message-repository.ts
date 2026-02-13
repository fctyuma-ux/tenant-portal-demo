import { SupabaseClient } from '@supabase/supabase-js';
import type { Message, MessageRole, Feedback } from '@/lib/types/database';
import type { IMessageRepository } from '../interfaces/message-repository';

export class SupabaseMessageRepository implements IMessageRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByConversationId(conversationId: string): Promise<Message[]> {
    const { data } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    return data ?? [];
  }

  async create(data: {
    conversation_id: string;
    role: MessageRole;
    content: string;
  }): Promise<Message> {
    const { data: result, error } = await this.supabase
      .from('messages')
      .insert(data)
      .select('*')
      .single();
    if (error || !result) throw new Error(`メッセージ作成に失敗: ${error?.message}`);
    return result;
  }

  async updateFeedback(
    messageId: string,
    feedback: Feedback
  ): Promise<{ id: string; feedback: Feedback }> {
    const { data, error } = await this.supabase
      .from('messages')
      .update({ feedback })
      .eq('id', messageId)
      .select('id, feedback')
      .single();
    if (error || !data) throw new Error(`フィードバック更新に失敗: ${error?.message}`);
    return data;
  }

  async findByIdWithConversation(
    messageId: string
  ): Promise<{
    id: string;
    conversation_id: string;
    role: MessageRole;
    conversation: { user_id: string };
  } | null> {
    const { data } = await this.supabase
      .from('messages')
      .select('id, conversation_id, role, conversations(user_id)')
      .eq('id', messageId)
      .single();
    if (!data) return null;

    const conversations = data.conversations as { user_id: string } | { user_id: string }[] | null;
    const conversation = Array.isArray(conversations)
      ? conversations[0]
      : conversations;
    if (!conversation) return null;

    return {
      id: data.id,
      conversation_id: data.conversation_id,
      role: data.role as MessageRole,
      conversation,
    };
  }

  async countByRoleInConversations(
    role: MessageRole,
    conversationIds: string[]
  ): Promise<number> {
    if (conversationIds.length === 0) return 0;
    const { count } = await this.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('role', role)
      .in('conversation_id', conversationIds);
    return count ?? 0;
  }

  async countByFeedbackInConversations(
    feedback: Feedback,
    conversationIds: string[]
  ): Promise<number> {
    if (conversationIds.length === 0) return 0;
    const { count } = await this.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('feedback', feedback)
      .in('conversation_id', conversationIds);
    return count ?? 0;
  }
}
