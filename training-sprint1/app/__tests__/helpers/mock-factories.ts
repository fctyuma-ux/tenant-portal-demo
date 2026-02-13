import { vi } from 'vitest';
import type {
  IUserRepository,
  IDocumentRepository,
  IDocumentChunkRepository,
  IFaqRepository,
  IConversationRepository,
  IMessageRepository,
  IStorageRepository,
  IAIClient,
} from '@/domain/repositories/interfaces';

export function createMockUserRepo(): IUserRepository {
  return {
    findRoleById: vi.fn(),
    findPropertyIdById: vi.fn(),
    findNameById: vi.fn(),
    findByPropertyId: vi.fn(),
  };
}

export function createMockDocumentRepo(): IDocumentRepository {
  return {
    findById: vi.fn(),
    findByPropertyId: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    findFileNamesByIds: vi.fn(),
    findFilePathById: vi.fn(),
  };
}

export function createMockDocumentChunkRepo(): IDocumentChunkRepository {
  return {
    searchByVector: vi.fn(),
    deleteByDocumentId: vi.fn(),
    insertBatch: vi.fn(),
  };
}

export function createMockFaqRepo(): IFaqRepository {
  return {
    findByPropertyId: vi.fn(),
    searchByKeyword: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockConversationRepo(): IConversationRepository {
  return {
    create: vi.fn(),
    findByIdAndUserId: vi.fn(),
    countByUserIds: vi.fn(),
    findRecentByUserIds: vi.fn(),
  };
}

export function createMockMessageRepo(): IMessageRepository {
  return {
    findByConversationId: vi.fn(),
    create: vi.fn(),
    updateFeedback: vi.fn(),
    findByIdWithConversation: vi.fn(),
    countByRoleInConversations: vi.fn(),
    countByFeedbackInConversations: vi.fn(),
  };
}

export function createMockStorageRepo(): IStorageRepository {
  return {
    upload: vi.fn(),
    download: vi.fn(),
    remove: vi.fn(),
  };
}

export function createMockAIClient(): IAIClient {
  return {
    generateEmbedding: vi.fn(),
    generateEmbeddings: vi.fn(),
    chatCompletion: vi.fn(),
  };
}
