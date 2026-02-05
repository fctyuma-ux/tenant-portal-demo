# AR. UIフレームワーク

## 概要

UIフレームワークは、ルーティング、レイアウト、状態管理、フォーム処理を統合した開発基盤です。Next.jsはReact上の最も人気のあるメタフレームワークで、ファイルベースのルーティング、サーバーコンポーネント、本体のデータ取得など、実務的な機能を備えています。

---

## 1. Next.js基本構成

**App Router vs Pages Router:**
- **App Router（新）:** ファイル構造がより直感的、Server Components対応
- **Pages Router（旧）:** すべてClient Side Rendering、シンプルで学びやすい

```
app/              # App Router の場合
├── page.tsx      # ホームページ
├── layout.tsx    # ルートレイアウト
├── posts/
│   ├── page.tsx  # /posts ページ
│   └── [id]/
│       └── page.tsx  # /posts/123 などの動的ルート
└── api/
    └── route.ts  # API エンドポイント
```

**Next.jsプロジェクトのセットアップ:**

```bash
npx create-next-app@latest my-app --typescript
cd my-app
npm run dev
```

---

## 2. React Server Components（RSC）

**概要:** サーバー側で実行され、HTMLのみクライアントに送信されるコンポーネント

RSCの特徴：
- デフォルトがサーバーコンポーネント
- クライアント機能が不要なら、ビルド時にコンポーネントコードは削除される
- クライアント側のJavaScriptバンドルを削減

```jsx
// app/page.tsx
export default async function HomePage() {
  const posts = await fetch('https://api.example.com/posts');

  return (
    <div>
      {posts.map(post => (
        <h3 key={post.id}>{post.title}</h3>
      ))}
    </div>
  );
}
```

**"use client"ディレクティブ:** Client Side Renderingが必要な場合、ファイルの先頭に記述

```jsx
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

---

## 3. ルーティングとレイアウト

**ファイルベースのルーティング:**
```
app/
├── page.tsx          # /
├── layout.tsx        # すべてのページに適用
├── about/
│   └── page.tsx      # /about
└── products/
    ├── page.tsx      # /products
    ├── layout.tsx    # /products配下に適用
    └── [id]/
        └── page.tsx  # /products/123
```

**レイアウトコンポーネント:**

```jsx
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <header>ナビゲーション</header>
        {children}
        <footer>フッター</footer>
      </body>
    </html>
  );
}
```

---

## 4. データ取得

**Next.jsのfetch拡張:**

```jsx
export default async function Page() {
  // 3600秒キャッシュ（ISR）
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }
  });

  return <div>{JSON.stringify(data)}</div>;
}
```

**SWR / TanStack Query（クライアント側）:**

```jsx
'use client';

import useSWR from 'swr';

function Page() {
  const { data, error, isLoading } = useSWR('/api/posts', fetcher);

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

---

## 5. フォーム処理

**React Hook Formの導入:**

```jsx
'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  email: z.string().email('メールアドレスが無効です'),
  password: z.string().min(8, '8文字以上入力してください'),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} placeholder="メール" />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('password')} type="password" placeholder="パスワード" />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">ログイン</button>
    </form>
  );
}
```

---

## 6. コンポーネント設計パターン

**Container / Presentational パターン:**
- Container：ロジック、API呼び出し、状態管理を担当
- Presentational：表示のみを担当（再利用可能）

**Compound Components パターン:**

```jsx
// 複合的なコンポーネント
<Dialog>
  <Dialog.Header>タイトル</Dialog.Header>
  <Dialog.Body>内容</Dialog.Body>
  <Dialog.Footer>
    <Button>キャンセル</Button>
    <Button primary>OK</Button>
  </Dialog.Footer>
</Dialog>
```

---

## 7. 状態管理

**Context API + useReducer:**

```jsx
'use client';

import { createContext, useReducer, ReactNode } from 'react';

const CartContext = createContext();

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload) };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, { items: [] });

  return (
    <CartContext.Provider value={{ cart, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}
```

---

## 8. レンダリング戦略

**CSR（Client Side Rendering）:** クライアント側ですべてを処理

**SSR（Server Side Rendering）:** 毎リクエスト、サーバー側でレンダリング

**SSG（Static Site Generation）:** ビルド時に静的ページを生成

**ISR（Incremental Static Regeneration）:** 初回はSSG、期間経過後に再生成

---
