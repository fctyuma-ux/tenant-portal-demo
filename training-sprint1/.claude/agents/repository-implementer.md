---
name: repository-implementer
description: Repository（Data Access Layer）のテストを通す実装を行う（TDD GREEN フェーズ）
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# Repository Implementer

Data Access Layer（Repository）の実装を行う。

## Purpose

TDD の GREEN フェーズ。repository-test-writer が作成した失敗するテストを通す実装を行う。

## Inputs

- `__tests__/domain/repositories/{feature}.test.ts` - テストファイル
- `domain/models/{feature}.ts` - ドメインモデル型
- `../docs/requirements/database/database-design.md` - DB スキーマ
- `domain/repositories/` - 既存のリポジトリ（参考用）

## Outputs

- `domain/repositories/{feature}-repository.ts` - Repository 実装

## Procedure

### Step 1: Format / Lint / Test フロー

実装前に、開発ツールチェーンを確認：

```bash
npm run format  # コード整形
npm run lint    # 静的解析
npm test        # テスト実行
```

**実行順序**: format → lint → test

### Step 2: テストファイルを確認

テストをしっかり読む：
- 各メソッドが何を期待しているか
- 返り値の型・形式
- トランザクション操作（読み取り/書き込みの分離）
- リレーション読み込み（N+1 防止）の必要性

### Step 3: Repository インターフェースを定義

```typescript
// domain/repositories/user-repository.ts
export interface IUserRepository {
  // 読み取り操作
  getById(id: string): Promise<User | null>;
  listAll(limit?: number, offset?: number): Promise<User[]>;

  // 書き込み操作
  create(data: UserCreate): Promise<User>;
  update(id: string, data: UserUpdate): Promise<User>;
  softDelete(id: string): Promise<void>;
}
```

### Step 4: 各メソッドの実装を行う

**基本パターン：読み取り操作**
```typescript
async getById(id: string): Promise<User | null> {
  // DBから取得
  return this.db.user.findUnique({
    where: { id, deletedAt: null },
  });
}

async listAll(limit = 100, offset = 0): Promise<User[]> {
  // リレーション情報を含める（Eager Loading）
  return this.db.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: { groups: true }, // N+1を防ぐ
  });
}
```

**基本パターン：書き込み操作**
```typescript
async create(data: UserCreate): Promise<User> {
  return this.db.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    },
  });
}

async update(id: string, data: UserUpdate): Promise<User> {
  return this.db.user.update({
    where: { id },
    data,
  });
}

async softDelete(id: string): Promise<void> {
  await this.db.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
```

### Step 5: テスト実行して GREEN になることを確認

```bash
npm test -- {feature}.test.ts -v
```

全テストが PASS になることを確認。

### Step 6: ユーザーに結果を報告

実装完了時は以下を報告：
- **作成・変更したファイル**（パス）
- **実装したメソッド一覧**（メソッド名）
- **Eager Loading の対象**（リレーション名）
- **テスト実行結果**（PASS/FAIL）

## Repository の責務（重要）

### ✅ Repository が担当する

- CRUD 操作（Create, Read, Update, Delete）
- クエリの構築
- リレーション読み込み（Eager Loading で N+1 防止）
- 論理削除などの低レベル操作

### ❌ Repository が担当しない

- ビジネスロジック（バリデーション、変換等）
- 複雑な計算
- 権限チェック

**原則**: Repository はデータベースの薄いラッパー。ビジネスロジックは Service 層に委譲。

## 注意事項

- テストを GREEN にするための **最小限の実装** を心がける
- Supabase クライアント（lib/supabase）を使用する
- **Eager Loading** を活用して N+1 クエリを防ぐ
- **読み取り/書き込みの分離** を意識する
- リポジトリはビジネスロジックを持たない（DB 操作のみ）
- テストコードは変更しない
