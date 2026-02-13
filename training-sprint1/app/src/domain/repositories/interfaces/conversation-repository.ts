export interface IConversationRepository {
  create(userId: string): Promise<{ id: string; created_at: string }>;
  findByIdAndUserId(
    conversationId: string,
    userId: string
  ): Promise<{ id: string } | null>;
  countByUserIds(userIds: string[]): Promise<number>;
  findRecentByUserIds(
    userIds: string[],
    limit: number
  ): Promise<{ id: string; created_at: string; users: { name: string } | null }[]>;
}
