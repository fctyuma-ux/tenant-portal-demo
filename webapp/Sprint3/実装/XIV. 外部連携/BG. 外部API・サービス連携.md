# BG. 外部API・サービス連携

## 概要

外部サービス（決済、SNS、認証）との連携は、ビジネス機能の拡張を実現します。同期・非同期の選択、連携アーキテクチャ（ポイントツーポイント vs ハブアンドスポーク）、認証フロー（OAuth 2.0）の理解が重要です。

---

## 1. 同期 vs 非同期

**同期呼び出し：** リアルタイムな応答が必要。例：決済処理、データ照合。

```python
# 同期呼び出し（決済）
payment_result = stripe.charge.create(
    amount=1000,
    currency='jpy',
    source=token
)
if payment_result.status == 'succeeded':
    order.status = 'paid'
```

**非同期呼び出し：** 時間的余裕あり。例：メール送信、分析処理。メッセージキューで送信側の負荷軽減。

```python
# 非同期呼び出し（メール）
send_email.delay(user_id, template='welcome')
```

**選択基準：** リアルタイム性 → 同期、スケーラビリティ → 非同期。

---

## 2. 連携アーキテクチャ

**ポイントツーポイント（P2P）：** 複数サービス間が直接通信。少数サービスには簡潔。

```
App ─→ Payment API
  ├─→ Email API
  └─→ SMS API
```

実装複雑化のリスク：各組み合わせで実装・テストが増加。

**ハブアンドスポーク：** 統合層（API ゲートウェイ / 統合基盤）を中心に通信。疎結合。

```
App → Integration Hub → Payment API
                     → Email API
                     → SMS API
```

メリット：サービス追加時、ハブ側のみ拡張。スケーラビリティ向上。

---

## 3. アーキテクチャ図作成

**C4 モデル（Context, Container, Component, Code）:**
- **Level 1 (Context)：** 全体システム全体・外部サービス
- **Level 2 (Container)：** API Gateway、Auth Service、DB等
- **Level 3 (Component)：** Controller、Service、Repository 等

図作成ツール：PlantUML、Miro、draw.io。VCS 管理は PlantUML 推奨。

---

## 4. OAuth 2.0 認証フロー

**ソーシャルログイン：** Google / GitHub / Twitter などのプロバイダーで認証。ユーザーが別途パスワード管理不要。

**Authorization Code Flow（推奨）：**

1. ユーザーがログインボタンをクリック
2. Google 認可画面にリダイレクト
3. ユーザーが許可 → Authorization Code 返却
4. バックエンド：Code を Token に交換（Client Secret 使用）
5. Token で Google API からユーザー情報取得
6. ローカル DB に登録・セッション開始

**PKCE（Proof Key for Code Exchange）：** モバイル・SPA 向けセキュリティ向上。Code Verifier を Code Challenge に変換。

---

## 5. フレームワーク統合

**NextAuth.js (Auth.js)：** Next.js 向けの認証フレームワーク。OAuth / Email / Credentials 対応。

```javascript
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    }
  }
});
```

---

## 6. アダプター / トランスレーターパターン

**Adapter：** 外部サービスのインターフェースを統一。実装の詳細を隠蔽。

```python
# Payment Adapter
class PaymentAdapter:
    def charge(self, amount, token):
        # Stripe, Square 等を統一インターフェースで呼び出し
        pass

class StripeAdapter(PaymentAdapter):
    def charge(self, amount, token):
        return stripe.Charge.create(amount=amount, source=token)
```

**変換層：** API レスポンスを内部スキーマに変換。プロバイダー変更時も変換層のみ修正。

---

## 要件カバレッジ

本セクションは以下のitemsをカバーしています：同期 vs 非同期、ポイントツーポイント vs ハブアンドスポーク、アーキテクチャ図の作成、OAuth 2.0フロー、ソーシャルログイン、NextAuth.js導入、Adapterパターン / Translatorパターン、変換層の実装
