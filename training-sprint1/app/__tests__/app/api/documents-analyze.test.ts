import { describe, it, expect, vi } from 'vitest';
import { AuthService } from '@/domain/services/auth-service';
import { PdfAnalysisService } from '@/domain/services/pdf-analysis';
import {
  createMockUserRepo,
  createMockDocumentRepo,
  createMockDocumentChunkRepo,
  createMockStorageRepo,
  createMockAIClient,
} from '../../helpers/mock-factories';

describe('Documents Analyze API Integration', () => {
  describe('POST /api/admin/documents/:id/analyze - full flow', () => {
    it('allows admin to trigger PDF analysis', async () => {
      const userRepo = createMockUserRepo();
      vi.mocked(userRepo.findRoleById).mockResolvedValue('admin');
      const authService = new AuthService(userRepo);

      await expect(authService.requireAdmin('admin-1')).resolves.not.toThrow();

      const documentRepo = createMockDocumentRepo();
      const chunkRepo = createMockDocumentChunkRepo();
      const storageRepo = createMockStorageRepo();
      const aiClient = createMockAIClient();

      vi.mocked(documentRepo.findById).mockResolvedValue({
        id: 'doc-1', file_path: 'prop-1/test.pdf', property_id: 'prop-1',
      } as never);
      vi.mocked(documentRepo.updateStatus).mockResolvedValue(undefined);
      vi.mocked(chunkRepo.deleteByDocumentId).mockResolvedValue(undefined);
      vi.mocked(chunkRepo.insertBatch).mockResolvedValue(undefined);
      vi.mocked(storageRepo.download).mockResolvedValue(new Blob(['fake pdf']));
      vi.mocked(aiClient.generateEmbeddings).mockResolvedValue([[0.1, 0.2]]);

      const pdfService = new PdfAnalysisService(documentRepo, chunkRepo, storageRepo, aiClient);
      const result = await pdfService.analyzePdf('doc-1');
      expect(result).toHaveProperty('success');
    });

    it('denies non-admin users', async () => {
      const userRepo = createMockUserRepo();
      vi.mocked(userRepo.findRoleById).mockResolvedValue('tenant');
      const authService = new AuthService(userRepo);

      await expect(authService.requireAdmin('tenant-1')).rejects.toThrow('権限がありません');
    });
  });
});
