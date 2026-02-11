/**
 * モデルファクトリー
 * テスト・シーダー用のダミーデータ生成
 */
import { faker } from '@faker-js/faker/locale/ja';

// ========================================
// Property Factory
// ========================================
export function createPropertyData(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.helpers.arrayElement([
      '大手町パークビルディング',
      '丸の内二重橋ビル',
      '新丸の内ビルディング',
      '有楽町ビル',
      '横浜ランドマークタワー',
    ]),
    ...overrides,
  };
}

// ========================================
// User Factory
// ========================================
export function createUserData(overrides: Record<string, unknown> = {}) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    id: faker.string.uuid(),
    property_id: faker.string.uuid(),
    email: faker.internet.email({ firstName, lastName }),
    password_hash: 'managed_by_supabase_auth',
    role: faker.helpers.arrayElement(['tenant', 'admin']) as 'tenant' | 'admin',
    name: `${lastName} ${firstName}`,
    ...overrides,
  };
}

// ========================================
// Document Factory
// ========================================
export function createDocumentData(overrides: Record<string, unknown> = {}) {
  const fileName = faker.helpers.arrayElement([
    'テナントマニュアル.pdf',
    '入居者ハンドブック.pdf',
    'ビル利用規約.pdf',
    '防災マニュアル.pdf',
    '共用部利用ガイド.pdf',
  ]);
  return {
    id: faker.string.uuid(),
    property_id: faker.string.uuid(),
    file_name: fileName,
    file_path: `documents/${faker.string.uuid()}/${fileName}`,
    page_count: faker.number.int({ min: 5, max: 100 }),
    analysis_status: faker.helpers.arrayElement([
      'pending',
      'processing',
      'completed',
      'error',
    ]) as 'pending' | 'processing' | 'completed' | 'error',
    publish_status: faker.helpers.arrayElement(['unpublished', 'published']) as
      | 'unpublished'
      | 'published',
    ...overrides,
  };
}

// ========================================
// DocumentChunk Factory
// ========================================
export function createDocumentChunkData(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    document_id: faker.string.uuid(),
    content: faker.lorem.paragraphs(2),
    embedding: Array.from({ length: 1536 }, () => faker.number.float({ min: -1, max: 1 })),
    page_number: faker.number.int({ min: 1, max: 50 }),
    page_image_path: null,
    ...overrides,
  };
}

// ========================================
// FAQ Factory
// ========================================
export function createFaqData(overrides: Record<string, unknown> = {}) {
  const category = faker.helpers.arrayElement([
    'ゴミ出し',
    '空調',
    '駐車場',
    '入退館',
    '防災',
    '申請手続き',
  ]);
  return {
    id: faker.string.uuid(),
    property_id: faker.string.uuid(),
    category,
    question: `${category}について教えてください`,
    answer: faker.lorem.paragraph(),
    ...overrides,
  };
}

// ========================================
// Conversation Factory
// ========================================
export function createConversationData(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    ...overrides,
  };
}

// ========================================
// Message Factory
// ========================================
export function createMessageData(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    conversation_id: faker.string.uuid(),
    role: faker.helpers.arrayElement(['user', 'assistant']) as 'user' | 'assistant',
    content: faker.lorem.paragraph(),
    feedback: null as 'positive' | 'negative' | null,
    ...overrides,
  };
}

// ========================================
// Announcement Factory
// ========================================
export function createAnnouncementData(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    property_id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    body: faker.lorem.paragraphs(2),
    published_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

// ========================================
// Batch Helpers
// ========================================
export function createMany<T>(factory: (overrides?: Record<string, unknown>) => T, count: number, overrides: Record<string, unknown> = {}): T[] {
  return Array.from({ length: count }, () => factory(overrides));
}
