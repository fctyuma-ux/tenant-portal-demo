import { describe, it, expect, vi } from 'vitest';
import { SupabaseMessageRepository } from '@/domain/repositories/supabase/message-repository';

describe('SupabaseMessageRepository', () => {
  describe('findByConversationId', () => {
    it('returns messages ordered by created_at', async () => {
      const messages = [
        { id: 'm1', role: 'user', content: 'hello', created_at: '2024-01-01' },
        { id: 'm2', role: 'assistant', content: 'hi', created_at: '2024-01-02' },
      ];
      const mockOrder = vi.fn().mockResolvedValue({ data: messages });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const from = vi.fn().mockReturnValue({ select: mockSelect });
      const repo = new SupabaseMessageRepository({ from } as never);

      const result = await repo.findByConversationId('conv-1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('m1');
    });

    it('returns empty array when no messages', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const from = vi.fn().mockReturnValue({ select: mockSelect });
      const repo = new SupabaseMessageRepository({ from } as never);

      const result = await repo.findByConversationId('conv-empty');
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates and returns message', async () => {
      const msg = { id: 'new-msg', conversation_id: 'c1', role: 'user', content: 'hi', feedback: null, created_at: 'now' };
      const mockSingle = vi.fn().mockResolvedValue({ data: msg, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const from = vi.fn().mockReturnValue({ insert: mockInsert });
      const repo = new SupabaseMessageRepository({ from } as never);

      const result = await repo.create({
        conversation_id: 'c1',
        role: 'user',
        content: 'hi',
      });
      expect(result.id).toBe('new-msg');
    });
  });

  describe('findByIdWithConversation', () => {
    it('returns message with conversation user_id', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'm1',
          conversation_id: 'c1',
          role: 'assistant',
          conversations: { user_id: 'u1' },
        },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const from = vi.fn().mockReturnValue({ select: mockSelect });
      const repo = new SupabaseMessageRepository({ from } as never);

      const result = await repo.findByIdWithConversation('m1');
      expect(result).not.toBeNull();
      expect(result!.conversation.user_id).toBe('u1');
    });

    it('returns null when message not found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const from = vi.fn().mockReturnValue({ select: mockSelect });
      const repo = new SupabaseMessageRepository({ from } as never);

      const result = await repo.findByIdWithConversation('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('countByRoleInConversations', () => {
    it('returns 0 for empty conversation ids', async () => {
      const from = vi.fn();
      const repo = new SupabaseMessageRepository({ from } as never);

      const count = await repo.countByRoleInConversations('user', []);
      expect(count).toBe(0);
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe('countByFeedbackInConversations', () => {
    it('returns 0 for empty conversation ids', async () => {
      const from = vi.fn();
      const repo = new SupabaseMessageRepository({ from } as never);

      const count = await repo.countByFeedbackInConversations('positive', []);
      expect(count).toBe(0);
    });
  });
});
