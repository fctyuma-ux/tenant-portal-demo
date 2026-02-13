import { describe, it, expect } from 'vitest';
import { UUIDSchema, PaginationSchema } from '@/schemas/common';
import { LoginInputSchema } from '@/schemas/auth';
import {
  DocumentUploadSchema,
  DocumentTogglePublishSchema,
  DocumentDeleteSchema,
  DocumentPreviewSchema,
} from '@/schemas/document';
import { FaqCreateSchema, FaqUpdateSchema, FaqDeleteSchema } from '@/schemas/faq';
import { MessageSendSchema, MessageFeedbackSchema } from '@/schemas/message';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('Common Schemas', () => {
  describe('UUIDSchema', () => {
    it('accepts valid UUID', () => {
      expect(UUIDSchema.safeParse(VALID_UUID).success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      expect(UUIDSchema.safeParse('not-a-uuid').success).toBe(false);
    });

    it('rejects empty string', () => {
      expect(UUIDSchema.safeParse('').success).toBe(false);
    });
  });

  describe('PaginationSchema', () => {
    it('accepts valid pagination', () => {
      const result = PaginationSchema.safeParse({ limit: 10, offset: 0 });
      expect(result.success).toBe(true);
    });

    it('applies defaults', () => {
      const result = PaginationSchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('rejects limit > 100', () => {
      expect(PaginationSchema.safeParse({ limit: 101 }).success).toBe(false);
    });

    it('rejects negative offset', () => {
      expect(PaginationSchema.safeParse({ offset: -1 }).success).toBe(false);
    });
  });
});

describe('Auth Schemas', () => {
  describe('LoginInputSchema', () => {
    it('accepts valid login', () => {
      const result = LoginInputSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = LoginInputSchema.safeParse({
        email: 'not-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = LoginInputSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Document Schemas', () => {
  describe('DocumentUploadSchema', () => {
    it('accepts valid PDF upload', () => {
      const result = DocumentUploadSchema.safeParse({
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-PDF file type', () => {
      const result = DocumentUploadSchema.safeParse({
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileSize: 1024,
      });
      expect(result.success).toBe(false);
    });

    it('rejects file too large', () => {
      const result = DocumentUploadSchema.safeParse({
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 60 * 1024 * 1024,
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty file name', () => {
      const result = DocumentUploadSchema.safeParse({
        fileName: '',
        fileType: 'application/pdf',
        fileSize: 1024,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DocumentTogglePublishSchema', () => {
    it('accepts valid publish toggle', () => {
      const result = DocumentTogglePublishSchema.safeParse({
        documentId: VALID_UUID,
        newStatus: 'published',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = DocumentTogglePublishSchema.safeParse({
        documentId: VALID_UUID,
        newStatus: 'draft',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DocumentDeleteSchema', () => {
    it('accepts valid UUID', () => {
      expect(DocumentDeleteSchema.safeParse({ documentId: VALID_UUID }).success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      expect(DocumentDeleteSchema.safeParse({ documentId: 'bad' }).success).toBe(false);
    });
  });

  describe('DocumentPreviewSchema', () => {
    it('accepts valid content', () => {
      expect(DocumentPreviewSchema.safeParse({ content: 'test question' }).success).toBe(true);
    });

    it('rejects empty content', () => {
      expect(DocumentPreviewSchema.safeParse({ content: '' }).success).toBe(false);
    });

    it('rejects whitespace-only content', () => {
      expect(DocumentPreviewSchema.safeParse({ content: '   ' }).success).toBe(false);
    });
  });
});

describe('FAQ Schemas', () => {
  describe('FaqCreateSchema', () => {
    it('accepts valid FAQ', () => {
      const result = FaqCreateSchema.safeParse({
        category: '設備',
        question: 'エアコンの使い方は？',
        answer: 'リモコンで操作してください',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty category', () => {
      const result = FaqCreateSchema.safeParse({
        category: '',
        question: '質問',
        answer: '回答',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty question', () => {
      const result = FaqCreateSchema.safeParse({
        category: 'カテゴリ',
        question: '',
        answer: '回答',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('FaqUpdateSchema', () => {
    it('accepts valid update with UUID', () => {
      const result = FaqUpdateSchema.safeParse({
        faqId: VALID_UUID,
        category: '設備',
        question: '更新された質問',
        answer: '更新された回答',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = FaqUpdateSchema.safeParse({
        faqId: 'bad',
        category: '設備',
        question: '質問',
        answer: '回答',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('FaqDeleteSchema', () => {
    it('accepts valid UUID', () => {
      expect(FaqDeleteSchema.safeParse({ faqId: VALID_UUID }).success).toBe(true);
    });
  });
});

describe('Message Schemas', () => {
  describe('MessageSendSchema', () => {
    it('accepts valid message', () => {
      const result = MessageSendSchema.safeParse({
        conversationId: VALID_UUID,
        content: 'こんにちは',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty content', () => {
      const result = MessageSendSchema.safeParse({
        conversationId: VALID_UUID,
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects whitespace-only content', () => {
      const result = MessageSendSchema.safeParse({
        conversationId: VALID_UUID,
        content: '   ',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('MessageFeedbackSchema', () => {
    it('accepts positive feedback', () => {
      const result = MessageFeedbackSchema.safeParse({
        messageId: VALID_UUID,
        feedback: 'positive',
      });
      expect(result.success).toBe(true);
    });

    it('accepts negative feedback', () => {
      const result = MessageFeedbackSchema.safeParse({
        messageId: VALID_UUID,
        feedback: 'negative',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid feedback', () => {
      const result = MessageFeedbackSchema.safeParse({
        messageId: VALID_UUID,
        feedback: 'neutral',
      });
      expect(result.success).toBe(false);
    });
  });
});
