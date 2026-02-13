import { describe, it, expect, vi } from 'vitest';
import { SupabaseStorageRepository } from '@/domain/repositories/supabase/storage-repository';

describe('SupabaseStorageRepository', () => {
  describe('upload', () => {
    it('uploads file successfully', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ upload: mockUpload });
      const supabase = { storage: { from: mockFrom } } as never;
      const repo = new SupabaseStorageRepository(supabase);

      await expect(repo.upload('path/file.pdf', new Blob())).resolves.not.toThrow();
      expect(mockFrom).toHaveBeenCalledWith('documents');
    });

    it('throws on upload error', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
      const mockFrom = vi.fn().mockReturnValue({ upload: mockUpload });
      const supabase = { storage: { from: mockFrom } } as never;
      const repo = new SupabaseStorageRepository(supabase);

      await expect(repo.upload('path/file.pdf', new Blob())).rejects.toThrow('アップロードに失敗');
    });
  });

  describe('download', () => {
    it('downloads file successfully', async () => {
      const blob = new Blob(['test']);
      const mockDownload = vi.fn().mockResolvedValue({ data: blob, error: null });
      const mockFrom = vi.fn().mockReturnValue({ download: mockDownload });
      const supabase = { storage: { from: mockFrom } } as never;
      const repo = new SupabaseStorageRepository(supabase);

      const result = await repo.download('path/file.pdf');
      expect(result).toBe(blob);
    });

    it('throws on download error', async () => {
      const mockDownload = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
      const mockFrom = vi.fn().mockReturnValue({ download: mockDownload });
      const supabase = { storage: { from: mockFrom } } as never;
      const repo = new SupabaseStorageRepository(supabase);

      await expect(repo.download('path/file.pdf')).rejects.toThrow('ダウンロードに失敗');
    });
  });

  describe('remove', () => {
    it('removes files successfully', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ remove: mockRemove });
      const supabase = { storage: { from: mockFrom } } as never;
      const repo = new SupabaseStorageRepository(supabase);

      await expect(repo.remove(['path/file.pdf'])).resolves.not.toThrow();
    });
  });
});
