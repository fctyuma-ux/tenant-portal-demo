'use server';

import { revalidatePath } from 'next/cache';
import { DocumentUploadSchema } from '@/schemas/document';
import { actionAuth, actionAuthWithProperty } from '@/lib/action-helpers';

export async function uploadDocument(formData: FormData) {
  const auth = await actionAuthWithProperty();
  if (!auth.ok) return auth.error;

  const file = formData.get('file') as File;
  if (!file || file.size === 0) return { error: 'ファイルを選択してください' };

  const parsed = DocumentUploadSchema.safeParse({
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const result = await auth.services.document.upload(auth.propertyId, file);
    revalidatePath('/admin/documents');
    return { success: true, documentId: result.documentId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'アップロードに失敗しました' };
  }
}

export async function togglePublishStatus(
  documentId: string,
  newStatus: 'published' | 'unpublished'
) {
  const auth = await actionAuth();
  if (!auth.ok) return auth.error;

  try {
    await auth.services.document.togglePublishStatus(documentId, newStatus);
    revalidatePath('/admin/documents');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : '更新に失敗しました' };
  }
}

export async function deleteDocument(documentId: string) {
  const auth = await actionAuth();
  if (!auth.ok) return auth.error;

  try {
    await auth.services.document.delete(documentId);
    revalidatePath('/admin/documents');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : '削除に失敗しました' };
  }
}
