import { SupabaseClient } from '@supabase/supabase-js';
import type {
  IDocumentChunkRepository,
  VectorSearchResult,
} from '../interfaces/document-chunk-repository';

export class SupabaseDocumentChunkRepository implements IDocumentChunkRepository {
  constructor(private supabase: SupabaseClient) {}

  async searchByVector(
    queryEmbedding: number[],
    propertyId: string,
    options: { includeUnpublished?: boolean; matchThreshold?: number; matchCount?: number } = {}
  ): Promise<VectorSearchResult[]> {
    const funcName = options.includeUnpublished
      ? 'match_document_chunks_preview'
      : 'match_document_chunks';

    const { data, error } = await this.supabase.rpc(funcName, {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: options.matchThreshold ?? 0.5,
      match_count: options.matchCount ?? 5,
      target_property_id: propertyId,
    });

    if (error) {
      console.error('Vector search error:', error.message);
      return [];
    }

    return data ?? [];
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);
    if (error) throw new Error(`チャンク削除に失敗: ${error.message}`);
  }

  async insertBatch(
    chunks: {
      document_id: string;
      content: string;
      embedding: string;
      page_number: number;
      page_image_path: string | null;
    }[]
  ): Promise<void> {
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const { error } = await this.supabase.from('document_chunks').insert(batch);
      if (error) throw new Error(`チャンク保存エラー: ${error.message}`);
    }
  }
}
