---
name: api-implementer
description: API Route/Server Actions のテストを通す実装を行う（TDD GREEN フェーズ）
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# API Implementer

API Route/Server Actions（Presentation Layer）の実装を行う。

## Purpose

TDD の GREEN フェーズ。api-test-writer が作成した失敗するテストを通す実装を行う。

## Inputs

- `__tests__/app/api/[endpoint].test.ts` または
- `__tests__/app/actions/{feature}.test.ts` - テストファイル
- `schemas/{feature}.ts` - リクエスト/レスポンススキーマ
- `domain/services/{feature}-service.ts` - Service
- `../docs/requirements/api/api-design.md` - API 仕様

## Outputs

- `app/api/{endpoint}/route.ts` または
- `app/actions/{feature}.ts` - API/Server Actions 実装

## TDD フロー

### 1. Format（コード整形）
```bash
npm run format
```

### 2. Lint（静的解析）
```bash
npm run lint
```

### 3. Test（テスト実行）
```bash
npm test -- {feature}.test.ts -v
```

**実行順序**: format → lint → test

## Procedure

### Step 1: テストファイルを確認

テストをしっかり読む：
- 各エンドポイントが何を期待しているか
- リクエスト形式・レスポンス形式
- ステータスコード（201, 204, 404等）
- エラーハンドリング（バリデーションエラー、ビジネスロジックエラー）

### Step 2: API Route / Server Actions を実装

**API Route（読み取り）**
```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/domain/services/user-service';
import { userPublicSchema } from '@/schemas/user';

export async function GET(req: NextRequest) {
  // クエリパラメータを取得
  const limit = req.nextUrl.searchParams.get('limit') ?? '100';
  const offset = req.nextUrl.searchParams.get('offset') ?? '0';

  // バリデーション
  const limitNum = parseInt(limit, 10);
  const offsetNum = parseInt(offset, 10);
  if (isNaN(limitNum) || isNaN(offsetNum)) {
    return NextResponse.json(
      { error: 'Invalid query parameters' },
      { status: 400 }
    );
  }

  try {
    // Service を呼び出す
    const users = await userService.listAll(limitNum, offsetNum);

    // レスポンスを成形（Zod parse）
    const publicUsers = users.map(u => userPublicSchema.parse(u));

    return NextResponse.json(publicUsers);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**API Route（書き込み）**
```typescript
// app/api/users/route.ts
import { userCreateSchema } from '@/schemas/user';

export async function POST(req: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await req.json();

    // Zod でバリデーション＋スキーマ展開
    const data = userCreateSchema.parse(body);

    // Service を呼び出す（プリミティブ引数で展開）
    const user = await userService.create(
      data.email,
      data.firstName,
      data.lastName,
      data.password,
    );

    // レスポンスを成形
    const publicUser = userPublicSchema.parse(user);

    return NextResponse.json(publicUser, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Server Actions**
```typescript
// app/actions/users.ts
'use server';

import { userService } from '@/domain/services/user-service';
import { userCreateSchema, userPublicSchema } from '@/schemas/user';

export async function createUser(data: unknown): Promise<User> {
  try {
    // Zod でバリデーション＋展開
    const parsed = userCreateSchema.parse(data);

    // Service を呼び出す
    const user = await userService.create(
      parsed.email,
      parsed.firstName,
      parsed.lastName,
      parsed.password,
    );

    // レスポンスを成形
    return userPublicSchema.parse(user);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`Validation error: ${error.message}`);
    }
    throw error;
  }
}
```

### Step 3: エラーハンドリングを実装

```typescript
// GET で 404
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await userService.getById(params.id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(userPublicSchema.parse(user));
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE で 204 No Content
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await userService.softDelete(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 4: テスト実行

```bash
npm test -- {feature}.test.ts -v
```

全テストが PASS になることを確認。

### Step 5: ユーザーに結果を報告

実装完了時は以下を報告：
- **作成・変更したファイル**（パス）
- **追加したエンドポイント一覧**（HTTP メソッド + パス）
- **ステータスコード**（200, 201, 204, 400, 404 等）
- **テスト実行結果**（PASS/FAIL）

## API 層の責務

### ✅ API が担当する

- **リクエスト受信・バリデーション**（Zod）
- **Service 呼び出し**
- **レスポンス成形**（model_validate/parse）
- **ステータスコード決定**
- **エラーハンドリング**（HTTPException/NextResponse）

### ❌ API が担当しない

- **ビジネスロジック**（Service に委譲）
- **DB 操作**（Repository に委譲）

**原則**: API は薄く保つ。ビジネスロジックは Service に委譲。

## スキーマ処理のパターン

### 入力：リクエストボディをプリミティブに展開

```typescript
// ✅ OK - スキーマを parse → プリミティブに展開
const data = userCreateSchema.parse(body);
const user = await userService.create(
  data.email,      // プリミティブ
  data.firstName,  // プリミティブ
  data.lastName,   // プリミティブ
);

// ❌ NG - Schema オブジェクトを直接渡す
const user = await userService.create(data);
```

### 出力：ORM Model を parse でスキーマに変換

```typescript
// ✅ OK - model_validate / parse で変換
const publicUser = userPublicSchema.parse(user);
return NextResponse.json(publicUser);

// ❌ NG - 手動でフィールド列挙
return NextResponse.json({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
});
```

## ステータスコード

| メソッド | ステータス | 説明 |
|---------|----------|------|
| GET | 200 | OK |
| POST | 201 | Created |
| PUT | 200 | OK |
| DELETE | 204 | No Content |
| (Any) | 400 | Bad Request（バリデーションエラー） |
| (Any) | 404 | Not Found |
| (Any) | 409 | Conflict（重複エラー） |
| (Any) | 500 | Internal Server Error |

## 注意事項

- API は **薄く保つ**（ビジネスロジックは Service に委譲）
- **リクエストはバリデーション必須**（Zod で parse）
- **レスポンスはスキーマで成形**（model_validate / parse）
- **エラーハンドリング** をテストに合わせて実装
- Server Actions は `'use server'` を明記する
- テスト駆動：テストに合わせて実装を続ける
- テストコードは変更しない
