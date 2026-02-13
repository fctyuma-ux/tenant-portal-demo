import type { IConversationRepository } from '@/domain/repositories/interfaces';

export class ConversationService {
  constructor(private conversationRepo: IConversationRepository) {}

  async create(userId: string) {
    return this.conversationRepo.create(userId);
  }

  async verifyOwnership(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await this.conversationRepo.findByIdAndUserId(conversationId, userId);
    return conversation !== null;
  }
}
