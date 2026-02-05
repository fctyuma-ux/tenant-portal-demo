# BK. セキュリティ監査・コンプライアンス

## 概要

デジタル事業の拡大に伴い、個人情報保護法（日本）、GDPR（EU）、PCI DSSなどの規制要件への対応が必須となりました。本セクションでは主要な法規制の内容と、実装上のプライバシーバイデザイン、データ主体の権利への対応を解説します。

---

## 1. 国・地域別の規制

**個人情報保護法（日本）**
- 日本国内で個人情報を取得・利用する事業者に適用
- 個人情報の定義：氏名、生年月日、住所、メールアドレス等
- 本人同意（原則）または法的根拠での利用
- 破壊・漏洩時は本人への通知義務あり

**GDPR（EU 一般データ保護規則）**
- EU 居住者の個人データを取得する全企業に適用（国籍問わず）
- 適用範囲が非常に広く、違反時の罰金は最大 4,000 万ユーロまたは売上の 4% の高い方
- データ主体の権利（アクセス、削除、訂正）を実装

**PCI DSS（ペイメントカード業界 データセキュリティスタンダード）**
- クレジットカード情報を扱う事業者向け
- 12 個の要件（ネットワーク保護、アクセス制御、ログ管理等）
- 監査・検証が毎年実施される

---

## 2. 基本的な実装：プライバシーポリシー

**プライバシーポリシーの確認項目**
- 収集するデータの種類と目的
- 第三者への提供（あるし、どの企業か）
- データ保持期間
- ユーザーの権利（アクセス、削除等）
- お問い合わせ先（データ保護責任者）

**記載例**
```markdown
# プライバシーポリシー

## 1. 個人情報の収集
当社は以下のデータを収集します：
- ユーザー登録時：氏名、メール、パスワード
- 利用時：IP アドレス、クリック情報、閲覧履歴

## 2. 利用目的
サービス提供、改善、マーケティング（同意時のみ）

## 3. 第三者提供
Google Analytics、AWS に一部情報を送信します。
```

---

## 3. Cookie 同意とバナー

**Cookie 同意バナー（Cookie Consent）の実装**
```html
<!-- Cookie Consent Banner -->
<div id="cookie-banner" class="banner">
  <p>当サイトは最高のサービスを提供するため Cookie を使用します。</p>
  <button id="accept-all">すべて同意</button>
  <button id="reject">拒否</button>
  <a href="/privacy">詳細を確認</a>
</div>

<script>
document.getElementById('accept-all').addEventListener('click', () => {
  localStorage.setItem('cookie-consent', 'accepted');
  // GA, 広告など全トラッキング有効化
  gtag('consent', 'update', {'ad_user_data': 'granted'});
});
</script>
```

**重要なポイント**
- 事前同意（Pre-consent）：ユーザーアクションなしでは Cookie を設定しない
- 拒否オプション：同意拒否も同じく簡単に選択可能
- 同意の記録：ユーザーの選択をサーバーに保存

---

## 4. データ主体の権利

**データ主体の権利（Data Subject Rights）**
- **アクセス権**：自分のデータを確認できる
- **削除権**（右忘れられる権）：データ削除を要求できる
- **訂正権**：間違ったデータの訂正要求
- **携帯権**：データをエクスポートし他社へ移管可能
- **処理制限権**：処理の一時停止を要求可能

**実装の優先順位**
1. **削除機能（退会処理）**：最優先実装
2. **データエクスポート機能**：CSV または JSON 形式
3. **訂正機能**：ユーザープロフィールの編集機能で対応

---

## 5. データの所在管理

**データの所在と越境移転**
- GDPR：EU 域外への移転は「十分性決定」国のみ（日本は認定済み）
- 個人情報保護法：基本的に国内処理、越境時は契約で対応
- クラウドサービス：AWS, GCP 等が各地域でデータセンター運用

**実装例：地域ごとのストレージ分離**
```python
import boto3

# EU ユーザーデータは eu-west-1 に保存
def store_user_data(user, region):
    s3 = boto3.client('s3', region_name=region)
    if user['country'] == 'EU':
        s3.put_object(Bucket='users-eu', Key=f"{user['id']}.json")
    else:
        s3.put_object(Bucket='users-global', Key=f"{user['id']}.json")
```

---

## 6. Privacy by Design / Default

**設計段階からのプライバシー保護**
- データ最小化：必要最小限のデータのみ収集
- 目的限定：明示された目的以外に使用しない
- 保存期間制限：不要になったら速やかに削除
- インテグリティ・機密性：暗号化、アクセス制限

**例：ユーザー行動分析**
```python
# 個人識別可能な情報を除去（匿名化）
def anonymize_event(event):
    return {
        'event_type': event['type'],
        'timestamp': event['time'],
        'anonymous_user_hash': hash(event['user_id']),  # 個人特定不可
        'page': event['page']
    }
```

---

## 7. 削除機能と退会処理

**データ削除機能（退会処理）の設計**
```python
@app.route('/user/delete', methods=['POST'])
def delete_user():
    user_id = session['user_id']

    # 関連データをすべて削除
    db.users.delete_one({'id': user_id})
    db.orders.delete_many({'user_id': user_id})
    db.logs.delete_many({'user_id': user_id})
    db.sessions.delete_many({'user_id': user_id})

    # クラウドストレージから画像等も削除
    s3.delete_object(Bucket='user-data', Key=f"{user_id}")

    return {'status': 'deleted'}
```

**チェックリスト**
- すべての関連レコード削除確認
- バックアップからも削除（またはマスク化）
- 削除完了を ユーザーに通知

---

## 8. データエクスポート機能

**ユーザーがデータを取得できる実装**
```python
@app.route('/user/export', methods=['GET'])
def export_user_data():
    user_id = session['user_id']
    user = db.users.find_one({'id': user_id})
    orders = list(db.orders.find({'user_id': user_id}))

    data = {
        'user': user,
        'orders': orders
    }

    # JSON または CSV で返却
    return jsonify(data)
```

データエクスポート機能により、ユーザーは自分の情報を新しいプラットフォームへ移管できます。
