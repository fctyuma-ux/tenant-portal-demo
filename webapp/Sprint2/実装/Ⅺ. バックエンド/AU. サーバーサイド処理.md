# AU. サーバーサイド処理

## 概要

サーバーサイド処理は、セッション・認証・認可・ビジネスロジックを担当します。リクエスト–レスポンスサイクルにおいて、ステートレス設計とミドルウェアアーキテクチャが重要です。

---

## 1. ステートレス vs ステートフル

**ステートレス：** リクエストに必要な情報をすべて含む（推奨）
- 複数サーバーに分散可能
- スケーリングが容易
- トークン（JWT）による認証

**ステートフル：** サーバー側にセッション情報を保持
- メモリ使用量が多い
- サーバー間の同期が必要
- セッションCookieによる認証

---

## 2. Session vs JWT

**Session（ステートフル）:**

```javascript
// Node.js + Express の例
const express = require('express');
const session = require('express-session');

const app = express();

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true,      // HTTPS のみ
    httpOnly: true,    // JavaScript からアクセス不可
    sameSite: 'strict' // CSRF 対策
  },
}));

app.post('/login', (req, res) => {
  // ユーザー認証
  req.session.userId = user.id;
  res.send('ログイン成功');
});

app.get('/protected', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send('未認証');
  }
  res.send('保護されたリソース');
});
```

**JWT（ステートレス）:**

```javascript
const jwt = require('jsonwebtoken');

app.post('/login', (req, res) => {
  // ユーザー認証
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    'your-secret-key',
    { expiresIn: '1h' }
  );

  res.json({ token });
});

app.get('/protected', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).send('トークンなし');
  }

  try {
    const decoded = jwt.verify(token, 'your-secret-key');
    res.send(`Hello ${decoded.email}`);
  } catch {
    res.status(401).send('無効なトークン');
  }
});
```

---

## 3. Cookie セキュリティ属性

**必須属性:**

```javascript
// 安全なCookie設定
res.cookie('sessionId', sessionId, {
  httpOnly: true,     // JavaScript からアクセス不可（XSS対策）
  secure: true,       // HTTPS のみ（中間者攻撃対策）
  sameSite: 'strict', // クロスサイトリクエスト制限（CSRF対策）
  maxAge: 3600000,    // 有効期限（1時間）
});
```

- **httpOnly:** JavaScriptからの読み取り不可→XSS被害を最小化
- **secure:** HTTPS通信でのみ送信→中間者攻撃を防止
- **sameSite:** クロスサイトリクエストで送信しない→CSRF被害を防止

---

## 4. ミドルウェア

ミドルウェアは、リクエスト–レスポンスサイクルの中間で処理を挿入します：

```javascript
// 認証ミドルウェア
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未認証' });
  }

  try {
    const decoded = jwt.verify(token, 'your-secret-key');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: '無効なトークン' });
  }
}

// 使用例
app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({ userId: req.user.userId });
});
```

---

## 5. Edge Middleware（Next.js）

Next.jsのEdge Middlewareは、すべてのリクエストの前に実行されます：

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // 認証チェック
  const token = request.cookies.get('auth-token')?.value;

  if (!token && request.nextUrl.pathname.startsWith('/api/protected')) {
    return NextResponse.json({ error: '未認証' }, { status: 401 });
  }

  // リクエストヘッダーに情報を追加
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', token || 'anonymous');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
```

---

## 6. リダイレクト処理

```typescript
// app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // ユーザー認証
  const user = await authenticate(body.email, body.password);

  if (!user) {
    return NextResponse.json(
      { error: '認証失敗' },
      { status: 401 }
    );
  }

  // Cookieに認証情報を設定
  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.cookies.set('auth-token', generateToken(user), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });

  return response;
}
```

---

## 7. 保護されたルート

```typescript
// app/middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const isProtected = request.nextUrl.pathname.startsWith('/dashboard');

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

## 8. Server Actions（Next.js）

Next.jsのServer Actionsは、クライアント側からサーバーロジックを呼び出す方法です：

```typescript
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;

  // データベースに保存
  const post = await db.posts.create({ title });

  // キャッシュを無効化して再生成
  revalidatePath('/posts');

  return post;
}
```

```tsx
// app/posts/page.tsx
'use client';

import { createPost } from '@/app/actions';

export function CreatePostForm() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="タイトル" />
      <button type="submit">投稿</button>
    </form>
  );
}
```
