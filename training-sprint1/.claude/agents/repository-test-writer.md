---
name: repository-test-writer
description: Repository（Data Access Layer）のテストを作成する（TDD RED フェーズ）
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Bash
---

# Repository Test Writer

Data Access Layer（Repository）のテストを作成する。

## Purpose

TDD の RED フェーズ。Repository のメソッドに対する失敗するテストを作成し、実装の要件を定義する。

## Inputs

- `../docs/detail-plan.md` - 実装スライスの詳細
- `domain/models/{feature}.ts` - ドメインモデル型
- `../docs/requirements/database/database-design.md` - DB スキーマ確認

## Outputs

- `__tests__/domain/repositories/{feature}.test.ts` - テストファイル

## テストの設計指針

### 単体テスト（Repository 層）

- CRUD 操作のテスト（Create, Read, Update, Delete）
- 正常系・異常系・エッジケース
- データベースの実際の動作をテスト

### テストケース例

```typescript
// __tests__/domain/repositories/user-repository.test.ts
describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    repository = new UserRepository();
  });

  // 読み取り操作
  describe('getById', () => {
    it('should return user when exists', async () => {
      // Arrange: テストデータ作成
      const userId = 'test-id-1';

      // Act: メソッド実行
      const user = await repository.getById(userId);

      // Assert: 結果確認
      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
    });

    it('should return null when user not found', async () => {
      const user = await repository.getById('non-existent-id');
      expect(user).toBeNull();
    });
  });

  // 書き込み操作
  describe('create', () => {
    it('should create user with valid data', async () => {
      const data = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = await repository.create(data);

      expect(user).toBeDefined();
      expect(user.email).toBe(data.email);
      expect(user.id).toBeDefined();
    });

    it('should throw error when email already exists', async () => {
      const email = 'duplicate@example.com';

      // 最初のユーザー作成
      await repository.create({
        email,
        firstName: 'John',
        lastName: 'Doe',
      });

      // 重複メール でのエラー
      await expect(
        repository.create({
          email,
          firstName: 'Jane',
          lastName: 'Doe',
        })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update user with valid data', async () => {
      const user = await repository.create({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      const updated = await repository.update(user.id, {
        firstName: 'Jane',
      });

      expect(updated.firstName).toBe('Jane');
    });
  });

  describe('softDelete', () => {
    it('should soft delete user', async () => {
      const user = await repository.create({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      await repository.softDelete(user.id);

      const found = await repository.getById(user.id);
      expect(found).toBeNull(); // 論理削除で見えない
    });
  });
});
```

## Procedure

### Step 1: Repository で必要なメソッドを確認

DB スキーマと要件から必要なメソッドを整理：
- 読み取り操作（getById, listAll, getByEmail など）
- 書き込み操作（create, update, delete など）
- リレーション読み込み（getWithGroups など）

### Step 2: 各メソッドのテストケースを設計

**正常系・異常系・エッジケース**
```
正常系: 期待通りの動作
異常系: バリデーションエラー、存在しないデータ
エッジケース: 境界値、空文字列、特殊文字など
```

### Step 3: テストコードを実装（RED 状態）

```typescript
describe('UserRepository', () => {
  // テストケースを記述
  // Repository クラスはまだ存在しない状態
});
```

### Step 4: テスト実行して RED 状態を確認

```bash
npm test -- user-repository.test.ts
```

**期待**: すべてのテストが FAIL（Repository が存在しない）

### Step 5: テスト結果を報告

実装者に以下を引き継ぐ：
- テストファイルのパス
- テストケース一覧
- RED 状態の確認スクリーンショット

## テストファイル構成

```
__tests__/
└── domain/
    └── repositories/
        ├── user-repository.test.ts
        ├── group-repository.test.ts
        └── ...
```

## テストケース命名規則

```typescript
// 明確な命名
it('should return user when user exists', () => {});
it('should return null when user not found', () => {});
it('should throw error when email already exists', () => {});

// 避けるべき命名
it('test getById', () => {});
it('should work', () => {});
```

## 注意事項

- テストは **失敗する状態（RED）で提出** する（GREEN にしてはいけない）
- Arrange-Act-Assert パターンで統一
- テストデータはテスト内で作成・クリーンアップ
- 1 テストケース = 1 つの検証
- モックは使わない（実際の DB 操作をテスト）
- テストは実装の要件定義。明確に書く
