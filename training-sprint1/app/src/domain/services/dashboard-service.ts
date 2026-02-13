import type {
  IUserRepository,
  IConversationRepository,
  IMessageRepository,
  IDocumentRepository,
  IFaqRepository,
} from '@/domain/repositories/interfaces';
import type { DashboardStats } from '@/domain/models';

export class DashboardService {
  constructor(
    private userRepo: IUserRepository,
    private conversationRepo: IConversationRepository,
    private messageRepo: IMessageRepository,
    private documentRepo: IDocumentRepository,
    private faqRepo: IFaqRepository
  ) {}

  async getStats(propertyId: string): Promise<DashboardStats> {
    // 物件に属するユーザーIDを取得
    const propertyUsers = await this.userRepo.findByPropertyId(propertyId);
    const userIds = propertyUsers.map((u) => u.id);

    // 会話IDを取得
    const recentConversationsRaw = await this.conversationRepo.findRecentByUserIds(userIds, 5);
    const conversationIds = recentConversationsRaw.map((c) => c.id);

    // 統計データを並列取得
    const [
      conversationCount,
      userMessageCount,
      positiveFeedback,
      negativeFeedback,
      documents,
      faqs,
      recentMessages,
    ] = await Promise.all([
      this.conversationRepo.countByUserIds(userIds),
      this.messageRepo.countByRoleInConversations('user', conversationIds),
      this.messageRepo.countByFeedbackInConversations('positive', conversationIds),
      this.messageRepo.countByFeedbackInConversations('negative', conversationIds),
      this.documentRepo.findByPropertyId(propertyId),
      this.faqRepo.findByPropertyId(propertyId),
      this.messageRepo.findByConversationId(conversationIds[0] ?? ''),
    ]);

    const totalFeedback = positiveFeedback + negativeFeedback;
    const satisfactionRate =
      totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : null;

    return {
      conversationCount,
      userMessageCount,
      positiveFeedback,
      negativeFeedback,
      documentCount: documents.length,
      faqCount: faqs.length,
      satisfactionRate,
      recentMessages: recentMessages.slice(0, 10).map((m) => ({
        content: m.content,
        created_at: m.created_at,
      })),
      recentConversations: recentConversationsRaw.map((c) => ({
        id: c.id,
        created_at: c.created_at,
        userName: c.users?.name ?? '不明',
      })),
    };
  }
}
