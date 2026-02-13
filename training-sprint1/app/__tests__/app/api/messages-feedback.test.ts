import { describe, it, expect, vi } from 'vitest';
import { MessageService } from '@/domain/services/message-service';
import { MessageFeedbackSchema } from '@/schemas/message';
import { createMockMessageRepo } from '../../helpers/mock-factories';

describe('Messages Feedback API Integration', () => {
  describe('PATCH /api/messages/:id/feedback - full flow', () => {
    it('validates input, checks ownership, updates feedback', async () => {
      const repo = createMockMessageRepo();
      const service = new MessageService(repo);

      const parsed = MessageFeedbackSchema.safeParse({
        messageId: '550e8400-e29b-41d4-a716-446655440000',
        feedback: 'positive',
      });
      expect(parsed.success).toBe(true);

      vi.mocked(repo.findByIdWithConversation).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        conversation_id: 'conv-1',
        role: 'assistant',
        conversation: { user_id: 'user-1' },
      });
      vi.mocked(repo.updateFeedback).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        feedback: 'positive',
      });

      const result = await service.updateFeedback(
        '550e8400-e29b-41d4-a716-446655440000',
        'positive',
        'user-1'
      );
      expect(result.feedback).toBe('positive');
    });

    it('rejects invalid feedback value at schema level', () => {
      const parsed = MessageFeedbackSchema.safeParse({
        messageId: '550e8400-e29b-41d4-a716-446655440000',
        feedback: 'neutral',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects feedback from unauthorized user (security)', async () => {
      const repo = createMockMessageRepo();
      const service = new MessageService(repo);

      vi.mocked(repo.findByIdWithConversation).mockResolvedValue({
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'assistant',
        conversation: { user_id: 'user-1' },
      });

      await expect(
        service.updateFeedback('msg-1', 'negative', 'user-2')
      ).rejects.toThrow('権限');
    });

    it('rejects feedback on user messages (only assistant messages)', async () => {
      const repo = createMockMessageRepo();
      const service = new MessageService(repo);

      vi.mocked(repo.findByIdWithConversation).mockResolvedValue({
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user',
        conversation: { user_id: 'user-1' },
      });

      await expect(
        service.updateFeedback('msg-1', 'positive', 'user-1')
      ).rejects.toThrow('アシスタントメッセージのみ');
    });
  });
});
