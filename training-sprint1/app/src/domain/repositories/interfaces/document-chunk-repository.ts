export interface VectorSearchResult {
  document_id: string;
  content: string;
  page_number: number;
  page_image_path: string | null;
}

export interface IDocumentChunkRepository {
  searchByVector(
    queryEmbedding: number[],
    propertyId: string,
    options?: { includeUnpublished?: boolean; matchThreshold?: number; matchCount?: number }
  ): Promise<VectorSearchResult[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
  insertBatch(
    chunks: {
      document_id: string;
      content: string;
      embedding: string;
      page_number: number;
      page_image_path: string | null;
    }[]
  ): Promise<void>;
}
