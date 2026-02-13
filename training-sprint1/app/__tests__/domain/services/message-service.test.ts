import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageService } from '@/domain/services/message-service';
import { createMockMessageRepo } from '../../helpers/mock-factories';

describe('MessageService', () => {
  let messageRepo: ReturnType<typeof createMockMessageRepo>;
  let service: MessageService;

  beforeEach(() => {
    messageRepo = createMockMessageRepo();
    service = new MessageService(messageRepo);
  });

  describe('updateFeedback - セキュリティテスト', () => {
    it('allows feedback from conversation owner', async () => {
      vi.mocked(messageRepo.findByIdWithConversation).mockResolvedValue({
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'assistant',
        conversation: { user_id: 'user-1' },
      });
      vi.mocked(messageRepo.updateFeedback).mockResolvedValue({
        id: 'msg-1',
        feedback: 'positive',
      });

      const result = await service.updateFeedback('msg-1', 'positive', 'user-1');
      expect(result.feedback).toBe('positive');
    });

    it('rejects feedback from non-owner', async () => {
      vi.mocked(messageRepo.findByIdWithConversation).mockResolvedValue({
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'assistant',
        conversation: { user_id: 'user-1' },
      });

      await expect(
        service.updateFeedback('msg-1', 'positive', 'attacker-user')
      ).rejects.toThrow('このメッセージにフィードバックする権限がありません');
    });

    it('rejects feedback on nonexistent message', async () => {
      vi.mocked(messageRepo.findByIdWithConversation).mockResolvedValue(null);

      await expect(
        service.updateFeedback('nonexistent', 'positive', 'user-1')
      ).rejects.toThrow('メッセージが見つかりません');
    });

    it('rejects feedback on user message (not assistant)', async () => {
      vi.mocked(messageRepo.findByIdWithConversation).mockResolvedValue({
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user',
        conversation: { user_id: 'user-1' },
      });

      await expect(
        service.updateFeedback('msg-1', 'positive', 'user-1')
      ).rejects.toThrow('アシスタントメッセージのみフィードバック可能です');
    });
  });

  describe('getByConversationId', () => {
    it('returns messages from repository', async () => {
      const messages = [
        { id: 'm1', conversation_id: 'c1', role: 'user' as const, content: 'hi', feedback: null, created_at: '2024-01-01' },
      ];
      vi.mocked(messageRepo.findByConversationId).mockResolvedValue(messages);

      const result = await service.getByConversationId('c1');
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('creates message via repository', async () => {
      const msg = {
        id: 'm1',
        conversation_id: 'c1',
        role: 'user' as const,
        content: 'hello',
        feedback: null,
        created_at: '2024-01-01',
      };
      vi.mocked(messageRepo.create).mockResolvedValue(msg);

      const result = await service.create({
        conversation_id: 'c1',
        role: 'user',
        content: 'hello',
      });
      expect(result.id).toBe('m1');
    });
  });
});
