import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseDocumentRepository } from '@/domain/repositories/supabase/document-repository';

function mockChain() {
  const result = { data: null as unknown, error: null as unknown, count: null as unknown };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  const methods = ['select', 'eq', 'in', 'single', 'insert', 'update', 'delete', 'order'];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain['single'] = vi.fn().mockImplementation(() => Promise.resolve(result));
  chain['order'] = vi.fn().mockImplementation(() => Promise.resolve(result));

  return { chain, result, from: vi.fn().mockReturnValue(chain) };
}

describe('SupabaseDocumentRepository', () => {
  describe('findById', () => {
    it('returns document when found', async () => {
      const { chain, result, from } = mockChain();
      result.data = { id: 'doc-1', file_name: 'test.pdf' };
      const repo = new SupabaseDocumentRepository({ from } as never);

      const doc = await repo.findById('doc-1');
      expect(doc).toEqual({ id: 'doc-1', file_name: 'test.pdf' });
      expect(from).toHaveBeenCalledWith('documents');
    });

    it('returns null when not found', async () => {
      const { chain, result, from } = mockChain();
      result.data = null;
      const repo = new SupabaseDocumentRepository({ from } as never);

      const doc = await repo.findById('nonexistent');
      expect(doc).toBeNull();
    });
  });

  describe('create', () => {
    it('creates document and returns id', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const from = vi.fn().mockReturnValue({ insert: mockInsert });
      const repo = new SupabaseDocumentRepository({ from } as never);

      const result = await repo.create({
        property_id: 'prop-1',
        file_name: 'test.pdf',
        file_path: 'prop-1/test.pdf',
        page_count: 0,
        analysis_status: 'pending',
        publish_status: 'unpublished',
      });
      expect(result.id).toBe('new-id');
    });

    it('throws on error', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const from = vi.fn().mockReturnValue({ insert: mockInsert });
      const repo = new SupabaseDocumentRepository({ from } as never);

      await expect(
        repo.create({
          property_id: 'p',
          file_name: 'f',
          file_path: 'fp',
          page_count: 0,
          analysis_status: 'pending',
          publish_status: 'unpublished',
        })
      ).rejects.toThrow('ドキュメント作成に失敗');
    });
  });

  describe('findFileNamesByIds', () => {
    it('returns empty array for empty ids', async () => {
      const from = vi.fn();
      const repo = new SupabaseDocumentRepository({ from } as never);

      const result = await repo.findFileNamesByIds([]);
      expect(result).toEqual([]);
      expect(from).not.toHaveBeenCalled();
    });
  });
});
