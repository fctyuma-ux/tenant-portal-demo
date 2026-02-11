---
name: service-test-writer
description: Service（Business Logic Layer）のテストを作成する（TDD RED フェーズ）
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Bash
---

# Service Test Writer

Business Logic Layer（Service）のテストを作成する。

## Purpose

TDD の RED フェーズ。Service のメソッドに対する失敗するテストを作成し、ビジネスロジックの要件を定義する。

## Inputs

- `../docs/detail-plan.md` - 実装スライスの詳細
- `domain/repositories/{feature}-repository.ts` - リポジトリ（Repository インターフェース確認）
- `domain/models/{feature}.ts` - ドメインモデル型
- `../docs/requirements/requirements-v2/` - ビジネスロジック要件

## Outputs

- `__tests__/domain/services/{feature}.test.ts` - テストファイル

## テストの設計指針

### 単体テスト（Service 層）

- ビジネスロジック・検証ロジックのテスト
- 正常系・異常系・エッジケース
- Repository はモック化（DB に依存しない）

### テストケース例

```typescript
// __tests__/domain/services/user-service.test.ts
import { vi } from 'vitest';
import { UserService } from '@/domain/services/user-service';

// Repository をモック化
const mockUserRepository = {
  getById: vi.fn(),
  getByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    // モック初期化
    vi.clearAllMocks();
    service = new UserService(mockUserRepository);
  });

  describe('create', () => {
    it('should create user with valid data', async () => {
      // Arrange: モック設定
      mockUserRepository.getByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: expect.any(String),
      });

      // Act: メソッド実行
      const user = await service.create(
        'test@example.com',
        'John',
        'Doe',
        'password123'
      );

      // Assert: 結果確認
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should throw error when email already exists', async () => {
      // Arrange: 既存ユーザーをモック
      mockUserRepository.getByEmail.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      // Act & Assert: エラーをスロー
      await expect(
        service.create('test@example.com', 'John', 'Doe', 'password123')
      ).rejects.toThrow('Email already exists');

      // repository.create は呼ばれない
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should hash password before creating user', async () => {
      mockUserRepository.getByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: expect.any(String),
      });

      await service.create(
        'test@example.com',
        'John',
        'Doe',
        'password123'
      );

      // パスワードがハッシュ化されていることを確認
      const createCall = mockUserRepository.create.mock.calls[0][1];
      expect(createCall.passwordHash).not.toBe('password123');
    });
  });

  describe('updateEmail', () => {
    it('should update email when valid', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'old@example.com',
      };

      mockUserRepository.getById.mockResolvedValue(existingUser);
      mockUserRepository.getByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        email: 'new@example.com',
      });

      const result = await service.updateEmail('user-1', 'new@example.com');

      expect(result.email).toBe('new@example.com');
    });

    it('should throw error when new email already exists', async () => {
      mockUserRepository.getById.mockResolvedValue({
        id: 'user-1',
        email: 'old@example.com',
      });

      mockUserRepository.getByEmail.mockResolvedValue({
        id: 'other-user',
        email: 'new@example.com',
      });

      await expect(
        service.updateEmail('user-1', 'new@example.com')
      ).rejects.toThrow('Email already exists');
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.getById.mockResolvedValue(null);

      await expect(
        service.updateEmail('non-existent-id', 'new@example.com')
      ).rejects.toThrow('User not found');
    });
  });
});
```

## Procedure

### Step 1: Service で必要なメソッド（ユースケース）を確認

要件から必要なメソッドを整理：
- 作成ロジック（バリデーション、パスワードハッシュ化等）
- 更新ロジック（重複チェック、アクセス権限等）
- 削除ロジック

### Step 2: 各メソッドのテストケースを設計

**正常系・異常系・エッジケース + ビジネスルール**
```
正常系: 期待通りの動作
異常系: バリデーションエラー、重複チェック
エッジケース: 空データ、無効な値
ビジネスルール: ハッシュ化、権限チェック等
```

### Step 3: テストコードを実装（RED 状態）

```typescript
describe('UserService', () => {
  let service: UserService;
  const mockRepository = { /* モック定義 */ };

  beforeEach(() => {
    service = new UserService(mockRepository);
  });

  // テストケースを記述
  // Service クラスはまだ存在しない状態
});
```

### Step 4: テスト実行して RED 状態を確認

```bash
npm test -- user-service.test.ts
```

**期待**: すべてのテストが FAIL（Service が存在しない）

### Step 5: テスト結果を報告

実装者に以下を引き継ぐ：
- テストファイルのパス
- テストケース一覧（正常系・異常系）
- モック設定の詳細
- RED 状態の確認

## テストファイル構成

```
__tests__/
└── domain/
    └── services/
        ├── user-service.test.ts
        ├── group-service.test.ts
        └── ...
```

## モック化の重要性

Repository をモック化することで：
- DB に依存しないテスト実行
- テスト速度の向上
- Service のビジネスロジックのみをテスト

```typescript
// ✅ Repository はモック化
const mockRepository = {
  getById: vi.fn(),
  create: vi.fn(),
};

// ❌ 実際の Repository インスタンスを使わない
// const repository = new UserRepository();
```

## 注意事項

- テストは **失敗する状態（RED）で提出** する（GREEN にしてはいけない）
- **Repository はモック化** する（vitest.mock または vi.fn()）
- Arrange-Act-Assert パターンで統一
- 1 テストケース = 1 つの検証
- テストケース名は明確に（`should_create_when_valid_then_returns_user`）
- テストは実装の要件定義。ビジネスロジックを明確に表現
