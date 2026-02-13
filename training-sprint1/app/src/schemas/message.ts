import { z } from 'zod';
import { UUIDSchema } from './common';

export const MessageSendSchema = z.object({
  conversationId: UUIDSchema,
  content: z.string().trim().min(1, '質問テキストが必要です'),
});

export const MessageFeedbackSchema = z.object({
  messageId: UUIDSchema,
  feedback: z.enum(['positive', 'negative'], {
    message: 'feedback は positive または negative',
  }),
});

export type MessageSend = z.infer<typeof MessageSendSchema>;
export type MessageFeedback = z.infer<typeof MessageFeedbackSchema>;
