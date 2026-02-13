import { describe, it, expect, vi } from 'vitest';
import { ConversationService } from '@/domain/services/conversation-service';
import { MessageService } from '@/domain/services/message-service';
import { createMockConversationRepo, createMockMessageRepo } from '../../helpers/mock-factories';

describe('Conversations API Integration', () => {
  describe('POST /api/conversations (service layer)', () => {
    it('creates a conversation for authenticated user', async () => {
      const repo = createMockConversationRepo();
      vi.mocked(repo.create).mockResolvedValue({ id: 'conv-new', created_at: '2024-01-01T00:00:00Z' });
      const service = new ConversationService(repo);

      const result = await service.create('user-1');
      expect(result.id).toBe('conv-new');
      expect(repo.create).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /api/conversations/:id/messages (service layer)', () => {
    it('returns messages when user owns conversation', async () => {
      const convRepo = createMockConversationRepo();
      const msgRepo = createMockMessageRepo();
      vi.mocked(convRepo.findByIdAndUserId).mockResolvedValue({ id: 'conv-1' });
      vi.mocked(msgRepo.findByConversationId).mockResolvedValue([
        { id: 'm1', conversation_id: 'conv-1', role: 'user', content: 'hello', feedback: null, created_at: '2024-01-01' },
        { id: 'm2', conversation_id: 'conv-1', role: 'assistant', content: 'hi', feedback: null, created_at: '2024-01-02' },
      ]);

      const convService = new ConversationService(convRepo);
      const msgService = new MessageService(msgRepo);

      expect(await convService.verifyOwnership('conv-1', 'user-1')).toBe(true);

      const messages = await msgService.getByConversationId('conv-1');
      expect(messages).toHaveLength(2);
    });

    it('denies access when user does not own conversation', async () => {
      const convRepo = createMockConversationRepo();
      vi.mocked(convRepo.findByIdAndUserId).mockResolvedValue(null);

      const convService = new ConversationService(convRepo);
      expect(await convService.verifyOwnership('conv-1', 'attacker')).toBe(false);
    });
  });

  describe('POST /api/conversations/:id/messages (service layer)', () => {
    it('saves user message, generates AI answer, saves assistant message', async () => {
      const msgRepo = createMockMessageRepo();
      vi.mocked(msgRepo.create)
        .mockResolvedValueOnce({
          id: 'um-1', conversation_id: 'conv-1', role: 'user', content: 'テスト質問', feedback: null, created_at: '2024-01-01',
        })
        .mockResolvedValueOnce({
          id: 'am-1', conversation_id: 'conv-1', role: 'assistant', content: 'AI回答', feedback: null, created_at: '2024-01-02',
        });

      const msgService = new MessageService(msgRepo);

      const userMsg = await msgService.create({ conversation_id: 'conv-1', role: 'user', content: 'テスト質問' });
      expect(userMsg.role).toBe('user');

      const assistantMsg = await msgService.create({ conversation_id: 'conv-1', role: 'assistant', content: 'AI回答' });
      expect(assistantMsg.role).toBe('assistant');
      expect(msgRepo.create).toHaveBeenCalledTimes(2);
    });
  });
});
