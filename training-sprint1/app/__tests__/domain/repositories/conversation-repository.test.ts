import { describe, it, expect, vi } from 'vitest';
import { SupabaseConversationRepository } from '@/domain/repositories/supabase/conversation-repository';

describe('SupabaseConversationRepository', () => {
  describe('create', () => {
    it('creates and returns conversation', async () => {
      const conv = { id: 'conv-1', created_at: '2024-01-01' };
      const mockSingle = vi.fn().mockResolvedValue({ data: conv, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const from = vi.fn().mockReturnValue({ insert: mockInsert });
      const repo = new SupabaseConversationRepository({ from } as never);

      const result = await repo.create('user-1');
      expect(result.id).toBe('conv-1');
    });

    it('throws on error', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const from = vi.fn().mockReturnValue({ insert: mockInsert });
      const repo = new SupabaseConversationRepository({ from } as never);

      await expect(repo.create('user-1')).rejects.toThrow('会話作成に失敗');
    });
  });

  describe('findByIdAndUserId', () => {
    it('returns conversation when found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'conv-1' }, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      const from = vi.fn().mockReturnValue({ select: mockSelect });
      const repo = new SupabaseConversationRepository({ from } as never);

      const result = await repo.findByIdAndUserId('conv-1', 'user-1');
      expect(result).toEqual({ id: 'conv-1' });
    });

    it('returns null when not found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      const from = vi.fn().mockReturnValue({ select: mockSelect });
      const repo = new SupabaseConversationRepository({ from } as never);

      const result = await repo.findByIdAndUserId('bad', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('countByUserIds', () => {
    it('returns 0 for empty user ids', async () => {
      const from = vi.fn();
      const repo = new SupabaseConversationRepository({ from } as never);

      const count = await repo.countByUserIds([]);
      expect(count).toBe(0);
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe('findRecentByUserIds', () => {
    it('returns empty array for empty user ids', async () => {
      const from = vi.fn();
      const repo = new SupabaseConversationRepository({ from } as never);

      const result = await repo.findRecentByUserIds([], 5);
      expect(result).toEqual([]);
    });
  });
});
