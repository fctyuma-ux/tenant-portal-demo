# AU. サーバーサイド処理

## 概要

HTTPリクエストの受信、解析、ビジネスロジック処理、レスポンス返却までの一連のフロー、ルーティング、ミドルウェア、セッション管理、エラーハンドリングを習得します。

---

## リクエスト処理の基礎

HTTPリクエストは、メソッド（GET/POST/PUT/DELETE）、パス、ヘッダー、ボディを含みます。サーバーはこれを解析し、ルーティングで対応するハンドラーを決定します。Express.jsやNext.jsなどのフレームワークは自動的に解析を行い、`req.body`、`req.headers`、`req.params`、`req.query`でアクセス可能にします。

```javascript
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  const token = req.headers.authorization;
  res.status(201).json({ id: 1, name, email });
});
```

---

## ルーティング

ルーティングはリクエストのパスを基に処理を振り分けます。URLパラメータ（`/api/users/:id`）でID指定、クエリパラメータ（`?page=2&limit=10`）でページネーション指定が可能。RESTful設計では、リソース単位でパスを構成。

---

## ミドルウェアの役割

ミドルウェアはリクエストがハンドラーに到達する前、または到達後に実行される処理。認証、ログ記録、リクエストボディ解析、エラーハンドリングなど、複数を組み合わせてリクエスト処理フローを構築します。

```javascript
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = verifyJWT(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ userId: req.user.id });
});
```

---

## セッション管理

**ステートフル設計（セッション方式）**：サーバーがセッションデータをメモリ/Redisに保存、クライアントはセッションIDをCookieで保持。権限即座に変更可能だが、複数サーバー環境での共有が複雑。

**ステートレス設計（JWT方式）**：ユーザー情報を含むトークンをクライアント保持、サーバーは署名検証のみ。スケーラビリティに優れるがトークン無効化が難しい。

### Cookie セキュリティ属性

`HttpOnly`（XSS対策）、`Secure`（HTTPS通信のみ）、`SameSite=Strict`（CSRF対策）を設定。

---

## レスポンス構築

ステータスコードで処理結果を示す：200（OK）、201（Created）、304（Not Modified）、400（Bad Request）、401（Unauthorized）、404（Not Found）、500（Internal Server Error）。

レスポンスヘッダー（`Content-Type`、`Cache-Control`など）でクライアント側の処理やキャッシュ動作を制御。

---

## エラーハンドリング

データベース接続エラー、バリデーションエラー、予期しないエラーに応じて適切なステータスコードとメッセージで応答。アプリケーションレベルとミドルウェアレベルの両者で対応。

---

## 重要なポイント

1. リクエスト要素（body、headers、params、query）の正確な理解
2. ルーティングの明確な設計
3. ミドルウェアの適切な活用
4. セッション方式とJWT方式の使い分け
5. Cookie属性によるセキュリティ確保
6. 適切なステータスコード選択
