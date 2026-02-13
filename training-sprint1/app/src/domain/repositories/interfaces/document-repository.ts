import type { Document, AnalysisStatus, PublishStatus } from '@/lib/types/database';

export interface IDocumentRepository {
  findById(documentId: string): Promise<Document | null>;
  findByPropertyId(propertyId: string): Promise<Document[]>;
  create(data: {
    property_id: string;
    file_name: string;
    file_path: string;
    page_count: number;
    analysis_status: AnalysisStatus;
    publish_status: PublishStatus;
  }): Promise<{ id: string }>;
  updateStatus(
    documentId: string,
    data: Partial<{
      analysis_status: AnalysisStatus;
      publish_status: PublishStatus;
      page_count: number;
      updated_at: string;
    }>
  ): Promise<void>;
  delete(documentId: string): Promise<void>;
  findFileNamesByIds(ids: string[]): Promise<{ id: string; file_name: string }[]>;
  findFilePathById(documentId: string): Promise<string | null>;
}
