# BH. 認証・認可

## 概要

認証（ユーザー本人確認）と認可（アクセス権限判定）は、Webアプリケーションセキュリティの基盤です。両者は独立した仕組みとして実装し、最小権限の原則を徹底します。

## 認証方式

**パスワード認証**: bcrypt/Argon2でハッシュ化、ソルト使用、複雑性要件設定
**多要素認証（MFA）**: TOTP、SMS OTP、プッシュ通知で多層防御
**OAuth 2.0**: Google/GitHub等の認可サーバーと連携、認可コードをサーバー側で安全保管

## JWT（JSON Web Token）

HS256/RS256で署名、有効期限は短期（15分）、リフレッシュトークン（長期）で更新。ローカルストレージを避け、httpOnlyクッキーで保管。

```javascript
// JWT署名検証の実装例
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: user.id, role: user.role }, SECRET, { expiresIn: '15m' });
jwt.verify(token, SECRET);  // 署名と有効期限確認
```

## 認可モデル

**RBAC（ロールベース）**: ユーザー→ロール→権限グループ→リソース
**ABAC（属性ベース）**: リソース+ユーザー+環境属性の組合せで判定

```javascript
// ミドルウェアでの権限チェック
function requirePermission(perm) {
  return (req, res, next) => {
    if (!req.user.role.permissions.includes(perm)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
app.delete('/api/users/:id', requirePermission('users:delete'), handler);
```

## セッション・トークン管理

**セッション**:セッションIDをサーバーで管理、Secure/HttpOnly/SameSite属性設定、30分～2時間の有効期限
**リセットフロー**: メール送信の有無に関わらず同じメッセージ、リセットトークンは1回限り有効、TTL 15分～1時間

## ベストプラクティス

- 認証と認可を完全に分離して実装
- デフォルト拒否（Deny by default）の原則
- トークン/セッション/秘密鍵は環境変数またはKMS等で安全に管理
- 認証失敗、権限変更、機密リソースアクセスをログ記録
- 定期的にアクセス権限を監査

## チェックリスト

- [ ] bcrypt/Argon2でハッシュ化、ソルト使用
- [ ] MFA実装（管理者は必須）
- [ ] JWT署名検証を厳密に実装
- [ ] セッションクッキーにSecure/HttpOnly/SameSite属性設定
- [ ] RBAC権限定義、エンドポイントで検証
- [ ] ユーザー列挙防止（リセット等で統一メッセージ）
- [ ] 失敗ログ記録と監視
- [ ] 定期的な権限見直し
