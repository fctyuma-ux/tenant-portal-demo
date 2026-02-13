import type { IMessageRepository } from '@/domain/repositories/interfaces';
import type { Message, MessageRole, Feedback } from '@/lib/types/database';

export class MessageService {
  constructor(private messageRepo: IMessageRepository) {}

  async getByConversationId(conversationId: string): Promise<Message[]> {
    return this.messageRepo.findByConversationId(conversationId);
  }

  async create(data: {
    conversation_id: string;
    role: MessageRole;
    content: string;
  }): Promise<Message> {
    return this.messageRepo.create(data);
  }

  async updateFeedback(
    messageId: string,
    feedback: Feedback,
    requestingUserId: string
  ): Promise<{ id: string; feedback: Feedback }> {
    // セキュリティ: メッセージの所有権チェック
    const message = await this.messageRepo.findByIdWithConversation(messageId);

    if (!message) {
      throw new Error('メッセージが見つかりません');
    }

    if (message.conversation.user_id !== requestingUserId) {
      throw new Error('このメッセージにフィードバックする権限がありません');
    }

    if (message.role !== 'assistant') {
      throw new Error('アシスタントメッセージのみフィードバック可能です');
    }

    return this.messageRepo.updateFeedback(messageId, feedback);
  }
}
