# BI. アプリケーションセキュリティ

## 概要

OWASP Top 10に代表される脆弱性（XSS、CSRF、SQLインジェクション等）を理解し、バリデーション→サニタイゼーション→処理の流れを徹底します。多層防御と信頼できないデータの前提が必須です。

## XSS（Cross-Site Scripting）

**反射型XSS**: ユーザー入力をそのまま出力し、JavaScriptが実行される
**DOM型XSS**: JavaScriptがDOM操作時に入力を直接処理

**対策**: HTMLエスケープ、Content Security Policy（CSP）設定、httpOnlyクッキー使用

```javascript
// HTMLエスケープ関数
const escapeHtml = (text) => {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// DOM操作時は textContent 使用、innerHTML避ける
document.getElementById('output').textContent = userInput;
```

**CSP設定**:
```
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com; style-src 'self' 'unsafe-inline'
```

## CSRF（Cross-Site Request Forgery）

攻撃者が他サイトからユーザーの意図しないリクエストを発行させる脆弱性です。

**対策①**: SameSiteクッキー属性（Strict/Lax/None）設定が最優先
**対策②**: CSRFトークン（ページ生成時サーバー側で生成、送信時に検証）

```javascript
// CSRF対策: トークン検証
app.post('/transfer', (req, res) => {
  if (req.body.csrfToken !== req.session.csrfToken) {
    return res.status(403).json({ error: 'CSRF token invalid' });
  }
  // 処理
});
```

## SQLインジェクション

SQL文にユーザー入力が直接組み込まれる脆弱性です。

**対策**: パラメータ化クエリを必ず使用（ORM推奨）、入力バリデーション、DBユーザーに最小権限、汎用エラーメッセージ

```javascript
// パラメータ化クエリ（脆弱性対策の基本）
const query = 'SELECT * FROM users WHERE username = ?';
db.query(query, [username]);

// またはORM使用
const user = await User.findOne({ where: { username: req.body.username } });
```

## 入力検証とサニタイゼーション

**バリデーション**: 予期された形式のみ許可（ホワイトリスト方式）
**サニタイゼーション**: 危険な文字・パターンを除去

流れ: バリデーション → サニタイゼーション → DB保存

## HTTPセキュリティヘッダー

重要なヘッダー設定:
- `X-Content-Type-Options: nosniff` - MIME type嗅ぎ探し防止
- `X-Frame-Options: DENY` - クリックジャッキング対策
- `Strict-Transport-Security: max-age=31536000` - HTTPS強制
- `Content-Security-Policy` - スクリプト実行を厳密に制御
- `Referrer-Policy: strict-origin-when-cross-origin` - 参照元情報制限

## レート制限

ブルートフォース・DoS攻撃を防止。ログイン試行（max: 5回/15分）、API全体（max: 100回/15分）で実装。

## エラーハンドリング

**本番環境**: 一般的なメッセージのみ（"Internal server error"等）
**開発環境**: 詳細なエラー情報を返す
**全環境**: 内部ログに詳細を記録し、DB固有エラーは表示しない

## ベストプラクティス

- すべてのユーザー入力は悪意があると仮定
- 単一対策に依存しない（多層防御）
- フレームワーク機能を活用（ORM、テンプレートエンジン）
- セキュリティヘッダーを必ず設定
- 不正パターンの検知とログ記録

## チェックリスト

- [ ] すべてのユーザー入力をバリデーション
- [ ] XSS対策: HTMLエスケープ+CSP+httpOnlyクッキー
- [ ] CSRF対策: SameSiteクッキー+CSRFトークン
- [ ] SQLインジェクション対策: パラメータ化クエリ+ORM
- [ ] HTTPセキュリティヘッダー設定
- [ ] レート制限実装
- [ ] エラー情報過剰出力防止
- [ ] 入力長制限
- [ ] ファイルアップロードバリデーション
- [ ] 本番環境でのディバッグ情報非表示
