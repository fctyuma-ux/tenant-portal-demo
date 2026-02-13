import { z } from 'zod';
import { UUIDSchema } from './common';

export const DocumentUploadSchema = z.object({
  fileName: z.string().min(1, 'ファイル名は必須です'),
  fileType: z.literal('application/pdf', {
    message: 'PDFファイルのみアップロードできます',
  }),
  fileSize: z.number().positive().max(50 * 1024 * 1024, 'ファイルサイズは50MB以下にしてください'),
});

export const DocumentTogglePublishSchema = z.object({
  documentId: UUIDSchema,
  newStatus: z.enum(['published', 'unpublished']),
});

export const DocumentDeleteSchema = z.object({
  documentId: UUIDSchema,
});

export const DocumentAnalyzeSchema = z.object({
  documentId: UUIDSchema,
});

export const DocumentPreviewSchema = z.object({
  content: z.string().trim().min(1, '質問テキストが必要です'),
});

export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;
export type DocumentTogglePublish = z.infer<typeof DocumentTogglePublishSchema>;
export type DocumentDelete = z.infer<typeof DocumentDeleteSchema>;
export type DocumentAnalyze = z.infer<typeof DocumentAnalyzeSchema>;
export type DocumentPreview = z.infer<typeof DocumentPreviewSchema>;
