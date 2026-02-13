import { z } from 'zod';
import { UUIDSchema } from './common';

export const FaqCreateSchema = z.object({
  category: z.string().trim().min(1, 'カテゴリは必須です'),
  question: z.string().trim().min(1, '質問は必須です'),
  answer: z.string().trim().min(1, '回答は必須です'),
});

export const FaqUpdateSchema = z.object({
  faqId: UUIDSchema,
  category: z.string().trim().min(1, 'カテゴリは必須です'),
  question: z.string().trim().min(1, '質問は必須です'),
  answer: z.string().trim().min(1, '回答は必須です'),
});

export const FaqDeleteSchema = z.object({
  faqId: UUIDSchema,
});

export type FaqCreate = z.infer<typeof FaqCreateSchema>;
export type FaqUpdate = z.infer<typeof FaqUpdateSchema>;
export type FaqDelete = z.infer<typeof FaqDeleteSchema>;
