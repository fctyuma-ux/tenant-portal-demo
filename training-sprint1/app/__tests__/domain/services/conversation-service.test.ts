import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationService } from '@/domain/services/conversation-service';
import { createMockConversationRepo } from '../../helpers/mock-factories';

describe('ConversationService', () => {
  let repo: ReturnType<typeof createMockConversationRepo>;
  let service: ConversationService;

  beforeEach(() => {
    repo = createMockConversationRepo();
    service = new ConversationService(repo);
  });

  describe('create', () => {
    it('creates conversation via repository', async () => {
      vi.mocked(repo.create).mockResolvedValue({ id: 'conv-1', created_at: '2024-01-01' });
      const result = await service.create('user-1');
      expect(result.id).toBe('conv-1');
      expect(repo.create).toHaveBeenCalledWith('user-1');
    });
  });

  describe('verifyOwnership', () => {
    it('returns true when user owns conversation', async () => {
      vi.mocked(repo.findByIdAndUserId).mockResolvedValue({ id: 'conv-1' });
      const result = await service.verifyOwnership('conv-1', 'user-1');
      expect(result).toBe(true);
    });

    it('returns false when user does not own conversation', async () => {
      vi.mocked(repo.findByIdAndUserId).mockResolvedValue(null);
      const result = await service.verifyOwnership('conv-1', 'attacker');
      expect(result).toBe(false);
    });
  });
});
