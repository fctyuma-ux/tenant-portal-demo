# BD. メッセージキュー

## 概要

メッセージキューは、プロセス間の非同期通信を実現する基盤です。分散システムでは、送信者がレシーバーの処理完了を待たず、メッセージをキューに送信します。**At-least-once保証** の理解と、その上での **冪等処理の実装** が重要です。

---

## 1. At-least-once（少なくとも一回）

メッセージキューの基本的な配信保証戦略：

```
[メッセージ配信の流れ]

送信者 → キュー → 受信者
        ├─ 受信確認(Ack)
        └─ 確認されるまで保管

保証レベル:
- At-most-once: 0回または1回（配信保証なし）
- At-least-once: 1回以上（重複可能性あり）※推奨
- Exactly-once: 正確に1回（実装困難）
```

**At-least-once の仕組み:**
```
1. 送信者がメッセージをキューに送信
2. 受信者がメッセージを取得
3. 受信者が処理完了後、確認(Ack)を送信
4. キューが確認を受けたらメッセージを削除

もし、受信者が処理中にクラッシュ:
→ Ackが返されない
→ キューがメッセージを保管し続ける
→ 別の受信者が再度処理（重複可能）
```

**実装例（RabbitMQ）:**
```python
import pika

def send_message(queue_name, message):
    connection = pika.BlockingConnection(
        pika.ConnectionParameters('localhost')
    )
    channel = connection.channel()
    channel.queue_declare(queue=queue_name, durable=True)

    # durable=True で永続化、Ack必須設定
    channel.basic_publish(
        exchange='',
        routing_key=queue_name,
        body=message,
        properties=pika.BasicProperties(delivery_mode=2)
    )
    connection.close()

def consume_message(queue_name):
    connection = pika.BlockingConnection(
        pika.ConnectionParameters('localhost')
    )
    channel = connection.channel()
    channel.queue_declare(queue=queue_name, durable=True)

    # auto_ack=False: 手動Ack（重要）
    channel.basic_qos(prefetch_count=1)

    def callback(ch, method, properties, body):
        try:
            # メッセージ処理
            process_message(body)
            # 処理完了後にAck
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            # 失敗時は Nack (再キュー)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    channel.basic_consume(
        queue=queue_name,
        on_message_callback=callback,
        auto_ack=False
    )
    channel.start_consuming()
```

---

## 2. Everything is Idempotent（すべてが冪等）

At-least-once の下では、**重複メッセージは必ず発生する** と仮定する必要があります。

```
[非冪等処理での問題]

メッセージ: "10000円を転送"

1回目: A口座から10000円減、B口座に10000円増加 → 正常
2回目: A口座から10000円減、B口座に10000円増加 → 不正

→ 結果: A口座は20000円減、B口座は20000円増加（バランス崩壊）
```

**冪等設計の原則:**
- リクエストIDで重複を検出
- 同じリクエストIDは同じ結果を返す
- 副作用（状態変更）は1回のみ実行

---

## 3. 冪等処理の実装

```python
import hashlib
from datetime import datetime, timedelta

class IdempotentMessageHandler:
    def __init__(self, db):
        self.db = db

    def handle_message(self, message):
        """メッセージを冪等に処理"""
        request_id = message['request_id']

        # 1. 既に処理済みか確認
        existing = self.db.get_processed_request(request_id)
        if existing:
            # 前回の結果を返す
            return existing['result']

        # 2. 初回処理
        try:
            result = self._execute_business_logic(message)
        except Exception as e:
            # 処理失敗の記録
            self.db.store_failed_request(request_id, str(e))
            raise

        # 3. 結果を保存（冪等キー付き）
        self.db.store_processed_request(
            request_id=request_id,
            result=result,
            processed_at=datetime.now()
        )

        return result

    def _execute_business_logic(self, message):
        """実際のビジネスロジック（冪等である必要がある）"""
        # 例: 送金処理
        from_account = message['from_account']
        to_account = message['to_account']
        amount = message['amount']

        # UPDATE で冪等性を確保
        updated = self.db.execute("""
            UPDATE accounts
            SET balance = balance - %s
            WHERE account_id = %s AND balance >= %s
        """, (amount, from_account, amount))

        if updated != 1:
            raise Exception("Insufficient balance")

        self.db.execute("""
            UPDATE accounts
            SET balance = balance + %s
            WHERE account_id = %s
        """, (amount, to_account))

        return {'status': 'success', 'transaction_id': hashlib.md5(
            f"{from_account}_{to_account}_{amount}".encode()
        ).hexdigest()}
```

**キー設計:**
```
request_id = "{user_id}_{action}_{timestamp}"

例: "user-123_transfer_2025-01-15T10:30:00"

有効期限:
- 短期（1時間）: テスト環境
- 中期（24時間）: 通常運用
- 長期（90日）: 監査用
```

---

## 4. 冪等キーの保管戦略

```python
# Redis を冪等キー保管に使用
import redis

redis_client = redis.Redis(host='localhost', port=6379)

def store_idempotency(request_id, result, ttl_seconds=3600):
    """処理結果をキャッシュ"""
    redis_client.setex(
        f"idempotent:{request_id}",
        ttl_seconds,
        json.dumps(result)
    )

def get_idempotency(request_id):
    """キャッシュから結果を取得"""
    cached = redis_client.get(f"idempotent:{request_id}")
    if cached:
        return json.loads(cached)
    return None
```

---

## 5. デッドレターキュー (DLQ)

処理に失敗したメッセージの処理：

```
[DLQの役割]

通常キュー
  ├─ 処理成功 → Ack (削除)
  ├─ 処理失敗（リトライ可能）→ 再キュー
  └─ 処理失敗（リトライ不可）→ DLQへ移動

Dead Letter Queue (DLQ)
  ├─ 監視・アラート
  ├─ 手動調査
  └─ 修正後の再処理
```

**リトライ戦略:**
```python
def retry_with_backoff(message, attempt=0):
    max_retries = 3
    backoff_seconds = [1, 5, 30]  # 指数バックオフ

    if attempt >= max_retries:
        # DLQへ移動
        send_to_dlq(message)
        return

    try:
        process_message(message)
    except RetryableException:
        # 指定時間後に再試行
        delay_seconds = backoff_seconds[attempt]
        reschedule_message(message, delay=delay_seconds)
    except NonRetryableException:
        # リトライ不可 → DLQへ
        send_to_dlq(message)
```

---

## 6. メッセージ監視

キューシステムの健全性監視：

| メトリクス | 閾値 | アクション |
|-----------|------|----------|
| キュー長 | > 1000 | 処理者追加/スケーリング |
| 処理時間 | > 5分 | ボトルネック分析 |
| DLQ件数 | > 10/時間 | 障害対応 |
| 重複率 | > 1% | 冪等性の見直し |

