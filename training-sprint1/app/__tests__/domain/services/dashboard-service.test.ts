import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '@/domain/services/dashboard-service';
import {
  createMockUserRepo,
  createMockConversationRepo,
  createMockMessageRepo,
  createMockDocumentRepo,
  createMockFaqRepo,
} from '../../helpers/mock-factories';

describe('DashboardService', () => {
  let userRepo: ReturnType<typeof createMockUserRepo>;
  let conversationRepo: ReturnType<typeof createMockConversationRepo>;
  let messageRepo: ReturnType<typeof createMockMessageRepo>;
  let documentRepo: ReturnType<typeof createMockDocumentRepo>;
  let faqRepo: ReturnType<typeof createMockFaqRepo>;
  let service: DashboardService;

  beforeEach(() => {
    userRepo = createMockUserRepo();
    conversationRepo = createMockConversationRepo();
    messageRepo = createMockMessageRepo();
    documentRepo = createMockDocumentRepo();
    faqRepo = createMockFaqRepo();
    service = new DashboardService(userRepo, conversationRepo, messageRepo, documentRepo, faqRepo);
  });

  it('calculates dashboard stats correctly', async () => {
    vi.mocked(userRepo.findByPropertyId).mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    vi.mocked(conversationRepo.findRecentByUserIds).mockResolvedValue([
      { id: 'c1', created_at: '2024-01-01', users: { name: '田中' } },
    ]);
    vi.mocked(conversationRepo.countByUserIds).mockResolvedValue(10);
    vi.mocked(messageRepo.countByRoleInConversations).mockResolvedValue(25);
    vi.mocked(messageRepo.countByFeedbackInConversations)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2);
    vi.mocked(documentRepo.findByPropertyId).mockResolvedValue([
      { id: 'd1' } as never,
      { id: 'd2' } as never,
    ]);
    vi.mocked(faqRepo.findByPropertyId).mockResolvedValue([{ id: 'f1' } as never]);
    vi.mocked(messageRepo.findByConversationId).mockResolvedValue([]);

    const stats = await service.getStats('prop-1');

    expect(stats.conversationCount).toBe(10);
    expect(stats.userMessageCount).toBe(25);
    expect(stats.positiveFeedback).toBe(8);
    expect(stats.negativeFeedback).toBe(2);
    expect(stats.satisfactionRate).toBe(80);
    expect(stats.documentCount).toBe(2);
    expect(stats.faqCount).toBe(1);
    expect(stats.recentConversations[0].userName).toBe('田中');
  });

  it('returns null satisfaction rate when no feedback', async () => {
    vi.mocked(userRepo.findByPropertyId).mockResolvedValue([]);
    vi.mocked(conversationRepo.findRecentByUserIds).mockResolvedValue([]);
    vi.mocked(conversationRepo.countByUserIds).mockResolvedValue(0);
    vi.mocked(messageRepo.countByRoleInConversations).mockResolvedValue(0);
    vi.mocked(messageRepo.countByFeedbackInConversations).mockResolvedValue(0);
    vi.mocked(documentRepo.findByPropertyId).mockResolvedValue([]);
    vi.mocked(faqRepo.findByPropertyId).mockResolvedValue([]);
    vi.mocked(messageRepo.findByConversationId).mockResolvedValue([]);

    const stats = await service.getStats('prop-1');
    expect(stats.satisfactionRate).toBeNull();
  });
});
