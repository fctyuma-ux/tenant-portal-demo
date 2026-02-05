# BE. イベント駆動アーキテクチャ

## 概要

イベント駆動アーキテクチャは、システムコンポーネント間を疎結合に保ちながら、ビジネスイベントの発生に応じた非同期処理を実現します。トピックベースの通信と Pub/Sub パターンで、スケーラビリティと柔軟性が向上。

---

## 1. トピックベース通信

**トピック：** イベントタイプを表す論理的な通路。例：`user.created`、`order.completed`。

複数のサービスが同じイベントを購読可能。新しいコンシューマー追加時、プロデューサー側の変更不要。

**イベントスキーマの定義：**

```json
{
  "eventType": "user.created",
  "timestamp": "2025-02-04T10:30:00Z",
  "data": {
    "userId": "uuid-1234",
    "email": "user@example.com"
  }
}
```

---

## 2. ファンアウト（Fanout）

**1つのイベント → 複数サービスへの配信。**

例：ユーザー登録イベント
- メールサービス：ウェルカムメール送信
- 分析サービス：ユーザー統計更新
- 通知サービス：プッシュ通知

ファンアウト実装により、新機能追加時に既存コードに影響なし。

```
EventBridge / EventGrid
  └─ user.created
      ├─ → SES (メール送信)
      ├─ → DynamoDB (分析)
      └─ → SNS (通知)
```

---

## 3. Pub/Sub パターン実装

**Publisher（プロデューサー）：** イベント発行者。ビジネスロジック実行後、トピックに発行。

**Subscriber（コンシューマー）：** イベント購読者。トピックの購読登録し、イベント発生時にハンドラー実行。

**実装例：** AWS SNS （Simple Notification Service）

```python
# Publisher
import boto3
sns = boto3.client('sns')
sns.publish(
    TopicArn='arn:aws:sns:region:account:user-events',
    Message='{"userId": "123", "action": "created"}',
    MessageAttributes={
        'eventType': {'DataType': 'String', 'StringValue': 'user.created'}
    }
)

# Subscriber
def lambda_handler(event, context):
    for record in event['Records']:
        message = json.loads(record['Sns']['Message'])
        send_welcome_email(message['userId'])
```

---

## 4. スケーラビリティと信頼性

**非同期処理：** メッセージブローカーが配信を保証。クライアント側の負荷低減。

**順序保証：** FIFO トピック（SQS FIFO）で順序保証。並列処理性能とのトレードオフ。

**デッドレターキュー：** 処理失敗メッセージを保持。後日分析・リトライ可能。

---

## 5. イベントスキーマ管理

**スキーマレジストリ（Schema Registry）：** Avro / Protocol Buffers で型安全性確保。

バージョン管理により、スキーマ進化時の互換性維持。

---

## 要件カバレッジ

本セクションは以下のitemsをカバーしています：トピックベース通信、ファンアウト、Pub/Subの実装
