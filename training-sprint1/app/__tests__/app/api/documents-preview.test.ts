import { describe, it, expect, vi } from 'vitest';
import { AuthService } from '@/domain/services/auth-service';
import { ChatAnswerService } from '@/domain/services/chat-answer';
import { DocumentPreviewSchema } from '@/schemas/document';
import {
  createMockUserRepo,
  createMockDocumentChunkRepo,
  createMockDocumentRepo,
  createMockFaqRepo,
  createMockAIClient,
} from '../../helpers/mock-factories';

describe('Documents Preview API Integration', () => {
  describe('POST /api/admin/documents/preview - full flow', () => {
    it('validates input, checks admin, generates preview answer', async () => {
      const parsed = DocumentPreviewSchema.safeParse({ content: 'テスト質問' });
      expect(parsed.success).toBe(true);

      const userRepo = createMockUserRepo();
      vi.mocked(userRepo.findRoleById).mockResolvedValue('admin');
      vi.mocked(userRepo.findPropertyIdById).mockResolvedValue('prop-1');
      const authService = new AuthService(userRepo);
      const info = await authService.getUserRoleAndPropertyId('admin-1');
      expect(info).not.toBeNull();
      expect(info!.role).toBe('admin');

      const chunkRepo = createMockDocumentChunkRepo();
      const documentRepo = createMockDocumentRepo();
      const faqRepo = createMockFaqRepo();
      const aiClient = createMockAIClient();

      vi.mocked(chunkRepo.searchByVector).mockResolvedValue([
        { document_id: 'doc-1', content: 'chunk', page_number: 1, page_image_path: null },
      ]);
      vi.mocked(documentRepo.findFileNamesByIds).mockResolvedValue([{ id: 'doc-1', file_name: 'draft.pdf' }]);
      vi.mocked(faqRepo.searchByKeyword).mockResolvedValue([]);
      vi.mocked(aiClient.generateEmbedding).mockResolvedValue([0.1, 0.2]);
      vi.mocked(aiClient.chatCompletion).mockResolvedValue('プレビュー回答');

      const chatService = new ChatAnswerService(chunkRepo, documentRepo, faqRepo, aiClient);
      const answer = await chatService.generateAnswer('テスト質問', 'prop-1', {
        includeUnpublished: true,
      });

      expect(answer.content).toBe('プレビュー回答');
      expect(answer.sources).toHaveLength(1);
      expect(answer.sources[0].document_name).toBe('draft.pdf');
      expect(chunkRepo.searchByVector).toHaveBeenCalledWith(
        expect.any(Array), 'prop-1', { includeUnpublished: true }
      );
    });

    it('rejects empty content at schema level', () => {
      expect(DocumentPreviewSchema.safeParse({ content: '' }).success).toBe(false);
    });

    it('rejects non-admin users', async () => {
      const userRepo = createMockUserRepo();
      vi.mocked(userRepo.findRoleById).mockResolvedValue('tenant');
      vi.mocked(userRepo.findPropertyIdById).mockResolvedValue('prop-1');
      const authService = new AuthService(userRepo);
      const info = await authService.getUserRoleAndPropertyId('tenant-1');
      expect(info!.role).not.toBe('admin');
    });
  });
});
