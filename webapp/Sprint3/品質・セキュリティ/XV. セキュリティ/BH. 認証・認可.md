# BH. 認証・認可

## 概要

認証・認可はWebアプリケーションの最も重要なセキュリティ要素です。本セクションではOAuth 2.0とOpenID Connectの仕組み、認可スコープ、そしてソーシャルログイン実装まで段階的に解説します。

適切な認可制御により、ユーザーは安全に他サービスとの連携を行え、システムは最小限の権限で運用できます。

---

## 1. OAuth 2.0 の基本

**OAuth 2.0 のロール**
- リソースオーナー：ユーザー（Google アカウント所有者など）
- クライアント：あなたのアプリケーション
- 認可サーバー：Google、GitHub など（リソースオーナーのデータを保持）
- リソースサーバー：認可サーバーと同じ（ユーザーの実際のデータを保有）

各ロールが協調することで、ユーザーがパスワードを知られることなく安全に認可できます。

**認可コードフロー (Authorization Code Flow)**
```
ユーザー → クライアント
         ↓ (ユーザーを認可サーバーへリダイレクト)
認可サーバー ← ユーザー
         ↓ (コード発行)
         → クライアント
         ↓ (クライアント秘密鍵を含めてトークン請求)
         ← アクセストークン
```

標準的で最も安全なフローです。ブラウザベースのアプリケーション推奨です。

---

## 2. OpenID Connect (OIDC)

OpenID Connect は OAuth 2.0 の上位レイヤーで、**認証**機能を追加します。

- OAuth 2.0：認可（「このアプリにデータアクセスを許可する」）
- OIDC：認証 + 認可（「あなたが本人であること」を証明 + 基本情報取得）

OIDC を使用すると、ID トークンでユーザー情報を取得できます。

---

## 3. スコープと権限管理

**スコープ (Scope)**
- OAuth 2.0 でアプリケーションが要求する権限の範囲
- `openid`：ユーザーの識別（OIDC）
- `profile`：ユーザープロフィール情報
- `email`：メールアドレス
- `offline_access`：更新トークン取得権

ユーザーが「どの情報まで共有するか」を明示的に選択できます。

**最小権限の原則**
```python
# 必要最小限のスコープを要求する例
scopes = ['openid', 'email']  # Good
# scopes = ['openid', 'profile', 'email', 'phone']  # 過度
```

---

## 4. ソーシャルログイン実装

**ソーシャルログインの実装**
```python
from flask_oauthlib.client import OAuth

oauth = OAuth()
google = oauth.remote_app(
    'google',
    consumer_key='YOUR_CLIENT_ID',
    consumer_secret='YOUR_CLIENT_SECRET',
    request_token_params={'scope': ['email', 'profile']},
    base_url='https://www.googleapis.com/oauth2/v1/',
    request_token_url=None,
    access_token_url='https://accounts.google.com/o/oauth2/token',
    authorize_url='https://accounts.google.com/o/oauth2/auth'
)
```

Google、GitHub、Facebook など複数の認可サーバーに対応可能です。

---

## 5. トークンと検証

**アクセストークンによるAPI連携**
- アクセストークン：API 呼び出し時に`Authorization`ヘッダに付与
- JWT 形式：署名付きで改ざん検知可能
- 有効期限：短命（数時間）で、期限切れ時は更新トークンで再取得

**stateパラメータの検証**
```python
import secrets

# トークンリクエスト送出時
state = secrets.token_urlsafe(32)
session['oauth_state'] = state
redirect_uri = f'...?state={state}'

# コールバック時
if request.args['state'] != session['oauth_state']:
    raise Exception('CSRF attack detected!')
```

CSRF 攻撃を防ぐため、stateパラメータでリクエストとコールバックの同一性を確認します。

---

## 6. セキュリティベストプラクティス

- アクセストークンはブラウザのメモリに保持（localStorage は避ける）
- 更新トークンは HTTP-Only Cookie に保存（JavaScript からアクセス不可）
- スコープは常に最小限に
- 定期的にスコープ権限をレビュー
