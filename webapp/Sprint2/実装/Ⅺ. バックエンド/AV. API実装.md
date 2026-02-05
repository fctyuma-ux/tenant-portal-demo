# AV. API実装

## 概要

API実装は入力検証、エラーハンドリング、冪等性、リソース指向アーキテクチャが中核です。型安全なバリデーションと一貫したエラー応答により、クライアント開発の効率と信頼性を大幅に向上させます。

---

## 1. 入力検証

**Zodによるスキーマ定義:**

```typescript
import { z } from 'zod';

// バリデーションスキーマ
const createPostSchema = z.object({
  title: z.string()
    .min(1, '「タイトル」は必須です')
    .max(200, '「タイトル」は200文字以内である必要があります'),
  content: z.string()
    .min(10, '「本文」は10文字以上である必要があります'),
  tags: z.array(z.string()).optional(),
});

type CreatePostRequest = z.infer<typeof createPostSchema>;

// API ハンドラー
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 入力検証
    const validated = createPostSchema.parse(body);

    // 処理
    const post = await db.posts.create(validated);

    return Response.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // バリデーションエラーを返却
      return Response.json(
        { errors: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

**カスタムバリデーション:**

```typescript
const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, '8文字以上のパスワードを入力してください'),
  passwordConfirm: z.string(),
}).refine(
  (data) => data.password === data.passwordConfirm,
  {
    message: 'パスワードが一致しません',
    path: ['passwordConfirm'],
  }
);
```

---

## 2. エラーハンドリング

**RFC 7807 (Problem Details for HTTP APIs) に従ったエラー応答:**

```typescript
// app/api/posts/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const post = await db.posts.findUnique({ where: { id: params.id } });

    if (!post) {
      // 404 Not Found
      return Response.json(
        {
          type: 'https://api.example.com/errors/not-found',
          title: 'リソースが見つかりません',
          status: 404,
          detail: `ID: ${params.id} の投稿は存在しません`,
        },
        { status: 404 }
      );
    }

    return Response.json(post);
  } catch (error) {
    // 500 Internal Server Error
    return Response.json(
      {
        type: 'https://api.example.com/errors/internal',
        title: 'サーバーエラーが発生しました',
        status: 500,
        detail: 'しばらく時間をおいて再度お試しください',
      },
      { status: 500 }
    );
  }
}
```

**グローバルエラーハンドラー（Next.js）:**

```typescript
// app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>エラーが発生しました</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()}>もう一度試す</button>
    </div>
  );
}
```

---

## 3. リソース指向アーキテクチャ

HTTPメソッドとステータスコードに基づいたRESTful API設計：

```typescript
// POST /api/posts - リソース作成（201 Created）
export async function POST(request: Request) {
  const body = await request.json();
  const post = await db.posts.create(body);
  return Response.json(post, { status: 201 });
}

// GET /api/posts/[id] - リソース取得（200 OK）
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const post = await db.posts.findUnique({ where: { id: params.id } });
  if (!post) return Response.json(null, { status: 404 });
  return Response.json(post);
}

// PATCH /api/posts/[id] - リソース部分更新（200 OK）
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const post = await db.posts.update({
    where: { id: params.id },
    data: body,
  });
  return Response.json(post);
}

// DELETE /api/posts/[id] - リソース削除（204 No Content）
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  await db.posts.delete({ where: { id: params.id } });
  return Response.json(null, { status: 204 });
}
```

---

## 4. 冪等性（Idempotency）

**冪等性:** 同じリクエストを複数回実行しても、結果は同じである性質

- **冪等:** GET、PUT、DELETE
- **非冪等:** POST

冪等性キーを使用してPOSTを冪等にする：

```typescript
// リクエストヘッダー: Idempotency-Key: "uuid-1234"
export async function POST(request: Request) {
  const idempotencyKey = request.headers.get('Idempotency-Key');

  if (idempotencyKey) {
    // キャッシュから検索
    const cached = await cache.get(idempotencyKey);
    if (cached) {
      return Response.json(cached, { status: 200 });
    }
  }

  const body = await request.json();
  const result = await db.posts.create(body);

  // キャッシュに保存（24時間）
  if (idempotencyKey) {
    await cache.set(idempotencyKey, result, 86400);
  }

  return Response.json(result, { status: 201 });
}
```

---

## 5. ページネーション

**オフセットベース（非推奨）:**

```typescript
// GET /api/posts?page=1&limit=10
const page = parseInt(query.page || '1');
const limit = parseInt(query.limit || '10');
const offset = (page - 1) * limit;

const posts = await db.posts.findMany({
  skip: offset,
  take: limit,
});
```

問題：レコード削除時にオフセットがズレる

**カーソルベース（推奨）:**

```typescript
// GET /api/posts?cursor=abc123&limit=10
const cursor = query.cursor as string | undefined;
const limit = parseInt(query.limit || '10');

const posts = await db.posts.findMany({
  take: limit + 1, // 次ページの有無を検知
  ...(cursor && { skip: 1, cursor: { id: cursor } }),
});

const hasMore = posts.length > limit;
const result = hasMore ? posts.slice(0, -1) : posts;

return Response.json({
  data: result,
  nextCursor: result[result.length - 1]?.id || null,
  hasMore,
});
```

---

## 6. フィルタリング

```typescript
// GET /api/posts?status=published&tag=react
const filters: any = {};

if (query.status) {
  filters.status = query.status;
}

if (query.tag) {
  filters.tags = {
    some: { name: query.tag },
  };
}

const posts = await db.posts.findMany({
  where: filters,
});
```

---

## 7. レート制限

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'),
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return Response.json(
      { error: 'レート制限に達しました' },
      { status: 429 }
    );
  }

  // 処理...
}
```
