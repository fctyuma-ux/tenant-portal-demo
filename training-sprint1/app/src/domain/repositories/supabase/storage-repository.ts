import { SupabaseClient } from '@supabase/supabase-js';
import type { IStorageRepository } from '../interfaces/storage-repository';

export class SupabaseStorageRepository implements IStorageRepository {
  constructor(
    private supabase: SupabaseClient,
    private bucket: string = 'documents'
  ) {}

  async upload(path: string, file: File | Blob): Promise<void> {
    const { error } = await this.supabase.storage.from(this.bucket).upload(path, file);
    if (error) throw new Error(`アップロードに失敗: ${error.message}`);
  }

  async download(path: string): Promise<Blob> {
    const { data, error } = await this.supabase.storage.from(this.bucket).download(path);
    if (error || !data) throw new Error(`ダウンロードに失敗: ${error?.message}`);
    return data;
  }

  async remove(paths: string[]): Promise<void> {
    const { error } = await this.supabase.storage.from(this.bucket).remove(paths);
    if (error) throw new Error(`削除に失敗: ${error.message}`);
  }
}
