import { SupabaseClient } from '@supabase/supabase-js';
import type { Document, AnalysisStatus, PublishStatus } from '@/lib/types/database';
import type { IDocumentRepository } from '../interfaces/document-repository';

export class SupabaseDocumentRepository implements IDocumentRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(documentId: string): Promise<Document | null> {
    const { data } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
    return data ?? null;
  }

  async findByPropertyId(propertyId: string): Promise<Document[]> {
    const { data } = await this.supabase
      .from('documents')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async create(data: {
    property_id: string;
    file_name: string;
    file_path: string;
    page_count: number;
    analysis_status: AnalysisStatus;
    publish_status: PublishStatus;
  }): Promise<{ id: string }> {
    const { data: result, error } = await this.supabase
      .from('documents')
      .insert(data)
      .select('id')
      .single();
    if (error || !result) throw new Error(`ドキュメント作成に失敗: ${error?.message}`);
    return result;
  }

  async updateStatus(
    documentId: string,
    data: Partial<{
      analysis_status: AnalysisStatus;
      publish_status: PublishStatus;
      page_count: number;
      updated_at: string;
    }>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('documents')
      .update(data)
      .eq('id', documentId);
    if (error) throw new Error(`ドキュメント更新に失敗: ${error.message}`);
  }

  async delete(documentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    if (error) throw new Error(`ドキュメント削除に失敗: ${error.message}`);
  }

  async findFileNamesByIds(ids: string[]): Promise<{ id: string; file_name: string }[]> {
    if (ids.length === 0) return [];
    const { data } = await this.supabase
      .from('documents')
      .select('id, file_name')
      .in('id', ids);
    return data ?? [];
  }

  async findFilePathById(documentId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .single();
    return data?.file_path ?? null;
  }
}
