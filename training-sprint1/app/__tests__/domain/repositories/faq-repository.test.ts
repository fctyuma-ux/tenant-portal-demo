import { describe, it, expect, vi } from 'vitest';
import { SupabaseFaqRepository } from '@/domain/repositories/supabase/faq-repository';

describe('SupabaseFaqRepository', () => {
  describe('findByPropertyId', () => {
    it('returns FAQs for property', async () => {
      const faqs = [{ id: 'f1', category: '設備', question: 'Q1', answer: 'A1' }];
      const mockOrder = vi.fn().mockResolvedValue({ data: faqs });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const from = vi.fn().mockReturnValue({ select: mockSelect });
      const repo = new SupabaseFaqRepository({ from } as never);

      const result = await repo.findByPropertyId('prop-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('searchByKeyword', () => {
    it('returns matching FAQs', async () => {
      const faqs = [{ category: '設備', question: 'エアコン', answer: 'リモコンで操作' }];
      const mockLimit = vi.fn().mockResolvedValue({ data: faqs });
      const mockOr = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = vi.fn().mockReturnValue({ or: mockOr });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const from = vi.fn().mockReturnValue({ select: mockSelect });
      const repo = new SupabaseFaqRepository({ from } as never);

      const result = await repo.searchByKeyword('エアコン', 'prop-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('creates FAQ without error', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const from = vi.fn().mockReturnValue({ insert: mockInsert });
      const repo = new SupabaseFaqRepository({ from } as never);

      await expect(
        repo.create({
          property_id: 'prop-1',
          category: '設備',
          question: 'Q',
          answer: 'A',
        })
      ).resolves.not.toThrow();
    });

    it('throws on error', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
      const from = vi.fn().mockReturnValue({ insert: mockInsert });
      const repo = new SupabaseFaqRepository({ from } as never);

      await expect(
        repo.create({
          property_id: 'p',
          category: 'c',
          question: 'q',
          answer: 'a',
        })
      ).rejects.toThrow('FAQ作成に失敗');
    });
  });

  describe('delete', () => {
    it('deletes FAQ without error', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      const from = vi.fn().mockReturnValue({ delete: mockDelete });
      const repo = new SupabaseFaqRepository({ from } as never);

      await expect(repo.delete('faq-1')).resolves.not.toThrow();
    });
  });
});
