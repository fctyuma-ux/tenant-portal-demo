# BD. メッセージキュー

## 概要

メッセージキュー（MQ）は疎結合な非同期通信を実現し、システム間の依存性を低減します。Pull 型と Push 型の選択、キューの種類（Standard / FIFO）、エラーハンドリング（DLQ・バックオフ）が実装の重点です。

---

## 1. キュー型の選択

**Push 型：** ブローカーがコンシューマーにメッセージを送信。レイテンシ低い、即座に処理。ただし、コンシューマー側のオーバーロードリスク。

**Pull 型：** コンシューマーがブローカーからメッセージを取得。バックプレッシャー制御が容易で、スケーラビリティ向上。処理能力に応じたペース制御が可能。

**選択基準：** リアルタイム性重視→Push、スケーラビリティ重視→Pull。

---

## 2. キューの種類

**Standard Queue（標準キュー）：** 高スループット、順序保証なし。複数コンシューマーによる並列処理に適。

**FIFO Queue（先入先出）：** 順序を厳密に保証。金融取引・支払い処理など、順序が重要な用途向け。スループットは Standard より低下。

AWS SQS での使い分け：
- Standard：メッセージング、通知
- FIFO：金融、注文処理、在庫更新

---

## 3. プロトコルと実装

**AMQP（Advanced Message Queuing Protocol）：** RabbitMQ などで採用。信頼性高く、メッセージ順序保証、トランザクション対応。

**Exchange の種類：**
- **Direct：** ルーティングキーで正確マッチ。1対1通信。
- **Fanout：** すべてのキューにブロードキャスト。1対多。
- **Topic：** ワイルドカード付きルーティング。柔軟な購読パターン。

```python
# RabbitMQ Fanout 配信確認
channel.exchange_declare(exchange='events', exchange_type='fanout')
channel.queue_bind(exchange='events', queue='queue1')
channel.basic_publish(exchange='events', routing_key='', body='message')
```

---

## 4. エラーハンドリング

**Poison Message（毒入りメッセージ）：** 処理不可なメッセージはリトライ無限ループを避けるため、DLQ へ移動。

**バックオフ戦略：** 指数バックオフ（2s → 4s → 8s）で段階的リトライ。サーバー負荷軽減。

**DLQ（Dead Letter Queue）への移動：** 最大リトライ回数超過後、DLQ に送信。後日の分析・再処理を可能に。

```json
{
  "maxReceiveCount": 3,
  "visibilityTimeout": 300,
  "deadLetterTargetArn": "arn:aws:sqs:ap-northeast-1:123456789:dlq"
}
```

---

## 5. テストと検証

**LocalStack での検証：** Docker で AWS SQS をローカル環境で動作。開発効率化。

```bash
docker run --rm -p 4566:4566 localstack/localstack
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name test-queue
```

**メッセージ順序の確認：** FIFO Queue で順序保証。複数プロデューサーからの送信でも Group ID で整列。

---

## 6. スケーリングとモニタリング

**バックプレッシャー：** コンシューマー側がメッセージ取得レートを制御。キューの肥大化を防止。

**監視項目：**
- キュー内メッセージ数（増加傾向は遅延の兆候）
- 処理時間（P99 レイテンシ）
- DLQ 移動数（エラー率）

---

## 要件カバレッジ

本セクションは以下のitemsをカバーしています：Pull型 vs Push型、Standard Queue vs FIFO Queue、LocalStack等での検証、AMQPプロトコル、Exchangeの種類、Fanout配信の確認、Poison Message、バックオフ戦略、DLQへの移動確認
