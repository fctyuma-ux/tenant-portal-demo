# BH. 認証・認可

## 概要

認証（Authentication）はユーザーが本人であることを確認するプロセスで、認可（Authorization）は確認されたユーザーが何ができるかを制御するプロセスです。エンタープライズアプリケーションでは、複数企業のユーザーをサポートする場合、シングルサインオン（SSO）によるセキュアな認証基盤を構築することが重要です。

本セクションでは、SSO の仕組み、SAML（Security Assertion Markup Language）プロトコル、フェデレーション、および実装例について説明します。

## SSO の仕組み

シングルサインオン（SSO）は、一度のログインで複数のアプリケーションにアクセス可能にする仕組みです。ユーザーは認証プロバイダ（IdP: Identity Provider）でログインし、取得したトークンで複数のサービスプロバイダ（SP: Service Provider）にアクセスします。

流れ：
1. ユーザーがアプリケーション A にアクセス
2. 認証されていない場合、IdP にリダイレクト
3. ユーザーが IdP でログイン
4. IdP がトークンを発行
5. ユーザーがトークンを持ってアプリケーション A に戻る
6. トークン検証後、ユーザー情報を取得、ログイン完了

アプリケーション B へのアクセス時は、既に IdP でログイン済みのため、自動的にトークンが発行され、パスワード入力を再度求められません。

## SAML (Security Assertion Markup Language)

SAML は、XML ベースの認証・認可データの交換フォーマットです。以下の 3 要素で構成されます：

### アサーション (Assertion)

ユーザーの認証情報と属性を XML で記述したもの。SAML Response として SP に返送されます。

```xml
<saml:Assertion>
  <saml:Subject>
    <saml:NameID>user@example.com</saml:NameID>
  </saml:Subject>
  <saml:AttributeStatement>
    <saml:Attribute Name="email">
      <saml:AttributeValue>user@example.com</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="groups">
      <saml:AttributeValue>admin</saml:AttributeValue>
    </saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>
```

### バインディング

XML の送信方法を定義。一般的には HTTP Redirect Binding（GET）や HTTP POST Binding（POST）が使用されます。

### プロファイル

SAML の具体的な使用シナリオを定義。Web SSO Profile が最も一般的です。

## フェデレーション (Identity Federation)

フェデレーションは、複数の独立した認証システムを相互接続し、統一されたアクセス体験を提供する仕組みです。各企業が独立した IdP を運用しながら、信頼関係を構築してユーザー認証を相互に利用します。

フェデレーション利点：
- **ユーザー管理の分散**: 各企業が独立してユーザー管理
- **セキュリティ強化**: パスワード共有なし、強力な認証方式対応
- **スケーラビリティ**: 新規組織追加時の容易な統合

## IdP の設定と連携

一般的な SAML フローの実装例（Node.js + Passport.js）：

```javascript
const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;

passport.use('saml', new SamlStrategy({
  path: '/auth/saml/callback',
  entryPoint: 'https://idp.example.com/sso',
  issuer: 'my-app',
  cert: process.env.SAML_CERT
}, (profile, done) => {
  // ユーザー情報をデータベースに保存または更新
  User.findOrCreate(
    { email: profile.email },
    {
      email: profile.email,
      name: profile.name,
      groups: profile.groups || []
    },
    (err, user) => {
      return done(err, user);
    }
  );
}));

// SAML メタデータの提供
app.get('/auth/saml/metadata', (req, res) => {
  res.type('application/xml');
  res.send(passport._strategy('saml').generateServiceProviderMetadata(
    process.env.SAML_CERT
  ));
});

// SAML ログイン初期化
app.get('/auth/saml', passport.authenticate('saml'));

// SAML コールバック
app.post('/auth/saml/callback',
  passport.authenticate('saml', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);
```

## ログアウト処理

SAML ログアウトは複雑です。SP がログアウトリクエストを IdP に送信し、IdP が確認・処理してから SP に応答します。

```javascript
// SAML SLO (Single Logout)
app.get('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    // IdP へログアウトリクエスト送信
    const samlStrategy = passport._strategy('saml');
    const logoutRequest = samlStrategy.generateLogoutRequest({
      issuer: 'my-app',
      sessionIndex: req.user.sessionIndex
    });

    res.redirect(
      `https://idp.example.com/logout?SAMLRequest=${logoutRequest}`
    );
  });
});

// IdP からのログアウト応答処理
app.get('/auth/saml/logout-callback', (req, res) => {
  res.redirect('/');
});
```

## ベストプラクティス

- **署名検証**: SAML アサーションの署名を必ず検証
- **タイムスタンプ検証**: アサーション有効期限の確認
- **HTTPS 強制**: フェデレーション通信は必ず暗号化
- **属性マッピング**: IdP の属性と SP の属性を正確にマッピング
- **ログ監査**: ログイン・ログアウト履歴の記録

