---
name: api-test-writer
description: API Route/Server Actions のテストを作成する（TDD RED フェーズ）
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Bash
---

# API Test Writer

API/Server Actions（Presentation Layer）のテストを作成する。

## Purpose

TDD の RED フェーズ。API Route や Server Actions のテストを作成し、API 仕様の要件を定義する。

## Inputs

- `../docs/requirements/api/api-design.md` - API 仕様
- `schemas/{feature}.ts` - リクエスト/レスポンススキーマ
- `domain/services/{feature}-service.ts` - Service（インターフェース）

## Outputs

- `__tests__/app/api/[endpoint].test.ts` または
- `__tests__/app/actions/{feature}.test.ts` - テストファイル

## テストの設計指針

### 結合テスト（API 層）

- HTTP リクエスト/レスポンスのテスト
- ステータスコード確認（200, 201, 204, 400, 404 等）
- Service はモック化（DB に依存しない）
- 正常系・エラー系

### テストケース例

```typescript
// __tests__/app/api/users.test.ts
import { vi } from 'vitest';
import { GET, POST, PUT, DELETE } from '@/app/api/users/route';

// Service をモック化
const mockUserService = {
  getById: vi.fn(),
  listAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
};

// NextRequest をモック
const createMockRequest = (options = {}) => ({
  nextUrl: { searchParams: new URLSearchParams() },
  json: vi.fn(),
  ...options,
});

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return 200 with users list', async () => {
      // Arrange
      mockUserService.listAll.mockResolvedValue([
        { id: '1', email: 'user1@example.com' },
        { id: '2', email: 'user2@example.com' },
      ]);

      // Act
      const req = createMockRequest();
      const response = await GET(req);

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2);
    });

    it('should support pagination with limit and offset', async () => {
      mockUserService.listAll.mockResolvedValue([]);

      const req = createMockRequest({
        nextUrl: {
          searchParams: new URLSearchParams('limit=50&offset=10'),
        },
      });

      await GET(req);

      expect(mockUserService.listAll).toHaveBeenCalledWith(50, 10);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return 200 with user data', async () => {
      mockUserService.getById.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      });

      // API 実装で userId をパラメータから取得
      const response = await GET(
        createMockRequest(),
        { params: { id: '1' } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe('1');
    });

    it('should return 404 when user not found', async () => {
      mockUserService.getById.mockResolvedValue(null);

      const response = await GET(
        createMockRequest(),
        { params: { id: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/users', () => {
    it('should return 201 when user created', async () => {
      const requestData = {
        email: 'new@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
      };

      mockUserService.create.mockResolvedValue({
        id: 'new-id',
        ...requestData,
      });

      const req = createMockRequest({
        json: vi.fn().mockResolvedValue(requestData),
      });

      const response = await POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.email).toBe('new@example.com');
    });

    it('should return 400 when validation fails', async () => {
      const req = createMockRequest({
        json: vi.fn().mockResolvedValue({
          email: 'invalid-email',
          firstName: '',
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it('should return 409 when email already exists', async () => {
      const requestData = {
        email: 'existing@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
      };

      mockUserService.create.mockRejectedValue(
        new Error('Email already exists')
      );

      const req = createMockRequest({
        json: vi.fn().mockResolvedValue(requestData),
      });

      const response = await POST(req);

      expect(response.status).toBe(409);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should return 200 when user updated', async () => {
      const updateData = { email: 'updated@example.com' };

      mockUserService.update.mockResolvedValue({
        id: '1',
        ...updateData,
      });

      const req = createMockRequest({
        json: vi.fn().mockResolvedValue(updateData),
      });

      const response = await PUT(req, { params: { id: '1' } });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should return 204 No Content when user deleted', async () => {
      mockUserService.softDelete.mockResolvedValue(undefined);

      const response = await DELETE(
        createMockRequest(),
        { params: { id: '1' } }
      );

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });
  });
});
```

## Procedure

### Step 1: API 仕様から テストケースを設計

API 仕様（api-design.md）から各エンドポイントのテストを整理：
- GET /users - ユーザー一覧取得
- GET /users/:id - ユーザー詳細取得
- POST /users - ユーザー作成
- PUT /users/:id - ユーザー更新
- DELETE /users/:id - ユーザー削除

### Step 2: 各エンドポイントのテストケースを設計

**ステータスコード別テスト**
```
200/201/204: 正常系
400: バリデーションエラー
404: リソース未検出
409: 重複エラー
500: サーバーエラー
```

### Step 3: テストコードを実装（RED 状態）

```typescript
describe('Users API', () => {
  describe('GET /api/users', () => {
    it('should return 200 with users list', async () => {
      // テストコード
      // API Route はまだ存在しない状態
    });
  });
});
```

### Step 4: Service をモック化

```typescript
const mockUserService = {
  listAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
};
```

### Step 5: テスト実行して RED 状態を確認

```bash
npm test -- users.test.ts
```

**期待**: すべてのテストが FAIL（API Route が存在しない）

### Step 6: テスト結果を報告

実装者に以下を引き継ぐ：
- テストファイルのパス
- エンドポイント一覧とステータスコード
- モック設定の詳細
- RED 状態の確認

## テストファイル構成

```
__tests__/
└── app/
    └── api/
        ├── users.test.ts
        ├── groups.test.ts
        └── ...
```

## ステータスコード テストガイド

| メソッド | ステータス | テスト内容 |
|---------|----------|---------|
| GET | 200 | リソース取得成功 |
| GET | 404 | リソース未検出 |
| POST | 201 | リソース作成成功 |
| POST | 400 | バリデーションエラー |
| POST | 409 | 重複エラー（メール重複等） |
| PUT | 200 | 更新成功 |
| DELETE | 204 | 削除成功（レスポンスボディなし） |

## 注意事項

- テストは **失敗する状態（RED）で提出** する（GREEN にしてはいけない）
- **Service はモック化** する（vitest.mock または vi.fn()）
- HTTP ステータスコード、レスポンス形式を明確にテストに含める
- リクエスト/レスポンスの型チェックを含める
- バリデーションエラーと ビジネスロジックエラーを区別
- Server Actions の場合は `revalidatePath` などの副作用も考慮
- Arrange-Act-Assert パターンで統一
