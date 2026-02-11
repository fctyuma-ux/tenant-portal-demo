'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '認証されていません' };

  const { data: userData } = await supabase
    .from('users')
    .select('property_id')
    .eq('id', user.id)
    .single();
  if (!userData) return { error: 'ユーザー情報が見つかりません' };

  const file = formData.get('file') as File;
  if (!file || file.size === 0) return { error: 'ファイルを選択してください' };
  if (file.type !== 'application/pdf') return { error: 'PDF ファイルのみアップロードできます' };

  // Supabase Storage にアップロード
  const fileName = `${Date.now()}_${file.name}`;
  const storagePath = `${userData.property_id}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, file);

  if (uploadError) {
    return { error: `アップロードに失敗しました: ${uploadError.message}` };
  }

  // documents テーブルにレコード作成
  const { data: newDoc, error: dbError } = await supabase
    .from('documents')
    .insert({
      property_id: userData.property_id,
      file_name: file.name,
      file_path: storagePath,
      page_count: 0,
      analysis_status: 'pending',
      publish_status: 'unpublished',
    })
    .select('id')
    .single();

  if (dbError || !newDoc) {
    return { error: `DB登録に失敗しました: ${dbError?.message}` };
  }

  revalidatePath('/admin/documents');
  return { success: true, documentId: newDoc.id };
}

export async function togglePublishStatus(
  documentId: string,
  newStatus: 'published' | 'unpublished'
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '認証されていません' };

  const { error } = await supabase
    .from('documents')
    .update({ publish_status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', documentId);

  if (error) return { error: `更新に失敗しました: ${error.message}` };

  revalidatePath('/admin/documents');
  return { success: true };
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '認証されていません' };

  // ファイルパスを取得
  const { data: doc } = await supabase
    .from('documents')
    .select('file_path')
    .eq('id', documentId)
    .single();

  if (doc?.file_path) {
    // Storage からファイル削除
    await supabase.storage.from('documents').remove([doc.file_path]);
  }

  // DB からレコード削除（document_chunks は CASCADE で削除）
  const { error } = await supabase.from('documents').delete().eq('id', documentId);

  if (error) return { error: `削除に失敗しました: ${error.message}` };

  revalidatePath('/admin/documents');
  return { success: true };
}
