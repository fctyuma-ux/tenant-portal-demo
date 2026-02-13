import type { IDocumentRepository, IStorageRepository } from '@/domain/repositories/interfaces';
import type { Document } from '@/lib/types/database';

export class DocumentService {
  constructor(
    private documentRepo: IDocumentRepository,
    private storageRepo: IStorageRepository
  ) {}

  async getByPropertyId(propertyId: string): Promise<Document[]> {
    return this.documentRepo.findByPropertyId(propertyId);
  }

  async upload(
    propertyId: string,
    file: File
  ): Promise<{ documentId: string }> {
    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `${propertyId}/${fileName}`;

    await this.storageRepo.upload(storagePath, file);

    const result = await this.documentRepo.create({
      property_id: propertyId,
      file_name: file.name,
      file_path: storagePath,
      page_count: 0,
      analysis_status: 'pending',
      publish_status: 'unpublished',
    });

    return { documentId: result.id };
  }

  async togglePublishStatus(
    documentId: string,
    newStatus: 'published' | 'unpublished'
  ): Promise<void> {
    await this.documentRepo.updateStatus(documentId, {
      publish_status: newStatus,
      updated_at: new Date().toISOString(),
    });
  }

  async delete(documentId: string): Promise<void> {
    const filePath = await this.documentRepo.findFilePathById(documentId);
    if (filePath) {
      await this.storageRepo.remove([filePath]);
    }
    await this.documentRepo.delete(documentId);
  }
}
