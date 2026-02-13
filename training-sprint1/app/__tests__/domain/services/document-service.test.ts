import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentService } from '@/domain/services/document-service';
import { createMockDocumentRepo, createMockStorageRepo } from '../../helpers/mock-factories';

describe('DocumentService', () => {
  let documentRepo: ReturnType<typeof createMockDocumentRepo>;
  let storageRepo: ReturnType<typeof createMockStorageRepo>;
  let service: DocumentService;

  beforeEach(() => {
    documentRepo = createMockDocumentRepo();
    storageRepo = createMockStorageRepo();
    service = new DocumentService(documentRepo, storageRepo);
  });

  describe('upload', () => {
    it('uploads file and creates document record', async () => {
      vi.mocked(storageRepo.upload).mockResolvedValue();
      vi.mocked(documentRepo.create).mockResolvedValue({ id: 'doc-1' });

      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      const result = await service.upload('prop-1', file);

      expect(result.documentId).toBe('doc-1');
      expect(storageRepo.upload).toHaveBeenCalled();
      expect(documentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          property_id: 'prop-1',
          file_name: 'test.pdf',
          analysis_status: 'pending',
          publish_status: 'unpublished',
        })
      );
    });
  });

  describe('togglePublishStatus', () => {
    it('updates publish status', async () => {
      vi.mocked(documentRepo.updateStatus).mockResolvedValue();

      await service.togglePublishStatus('doc-1', 'published');
      expect(documentRepo.updateStatus).toHaveBeenCalledWith(
        'doc-1',
        expect.objectContaining({ publish_status: 'published' })
      );
    });
  });

  describe('delete', () => {
    it('removes file from storage and deletes record', async () => {
      vi.mocked(documentRepo.findFilePathById).mockResolvedValue('prop-1/file.pdf');
      vi.mocked(storageRepo.remove).mockResolvedValue();
      vi.mocked(documentRepo.delete).mockResolvedValue();

      await service.delete('doc-1');
      expect(storageRepo.remove).toHaveBeenCalledWith(['prop-1/file.pdf']);
      expect(documentRepo.delete).toHaveBeenCalledWith('doc-1');
    });

    it('skips storage removal when no file path', async () => {
      vi.mocked(documentRepo.findFilePathById).mockResolvedValue(null);
      vi.mocked(documentRepo.delete).mockResolvedValue();

      await service.delete('doc-1');
      expect(storageRepo.remove).not.toHaveBeenCalled();
      expect(documentRepo.delete).toHaveBeenCalledWith('doc-1');
    });
  });
});
