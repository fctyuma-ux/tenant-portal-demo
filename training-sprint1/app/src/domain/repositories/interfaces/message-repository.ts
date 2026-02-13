import type { Message, MessageRole, Feedback } from '@/lib/types/database';

export interface IMessageRepository {
  findByConversationId(conversationId: string): Promise<Message[]>;
  create(data: {
    conversation_id: string;
    role: MessageRole;
    content: string;
  }): Promise<Message>;
  updateFeedback(messageId: string, feedback: Feedback): Promise<{ id: string; feedback: Feedback }>;
  findByIdWithConversation(
    messageId: string
  ): Promise<{ id: string; conversation_id: string; role: MessageRole; conversation: { user_id: string } } | null>;
  countByRoleInConversations(role: MessageRole, conversationIds: string[]): Promise<number>;
  countByFeedbackInConversations(feedback: Feedback, conversationIds: string[]): Promise<number>;
}
