# BE. イベント駆動アーキテクチャ

## 概要

イベント駆動アーキテクチャは、システムの状態変化を**イベント**として記録し、後続プロセスが非同期に対応する設計パターンです。Event Sourcing、CQRS、Saga パターンなど複合的な手法を組み合わせることで、スケーラブルで復元力のあるシステムを構築します。

---

## 1. State vs Events の考え方

**従来の状態管理（State）:**
```
[口座]
account_id: 123
balance: 50000

時間経過で現在値のみ保持
→ 履歴情報なし、変更追跡困難
```

**イベント駆動（Events）:**
```
[イベントログ]
2025-01-15 10:00 → "初期入金" (50000円)
2025-01-15 11:00 → "送金" (-10000円)
2025-01-15 12:00 → "利息付与" (+100円)

イベントの積算 = 最新の状態
→ 完全な履歴が保持される
```

**メリット:**
- 完全なアクセス履歴
- 時間を遡ることが容易
- デバッグが簡単

**デメリット:**
- イベントログのサイズ増加
- イベント構造変更時の工夫が必要

---

## 2. リプレイ (Replay)

イベントログから状態を復元する仕組み：

```python
class AccountService:
    def __init__(self, account_id, event_store):
        self.account_id = account_id
        self.event_store = event_store
        self.balance = 0

    def rebuild_state(self):
        """イベントログから状態を再構築"""
        events = self.event_store.get_events(self.account_id)

        for event in events:
            if event['type'] == 'deposit':
                self.balance += event['amount']
            elif event['type'] == 'withdrawal':
                self.balance -= event['amount']
            elif event['type'] == 'interest':
                self.balance += event['amount']

        return self.balance

    def withdraw(self, amount):
        """出金イベントを記録"""
        if self.balance >= amount:
            self.event_store.append({
                'account_id': self.account_id,
                'type': 'withdrawal',
                'amount': amount,
                'timestamp': datetime.now(),
                'version': self.current_version + 1
            })
            self.balance -= amount
        else:
            raise ValueError("Insufficient funds")
```

**リプレイの活用:**
- システム障害後の状態復元
- 新しい集計ロジック開発時のテスト
- 履歴データの再分析

---

## 3. 銀行口座のイベントソーシング実装例

```python
from datetime import datetime
from dataclasses import dataclass

@dataclass
class BankAccount:
    account_id: str
    events: list = None

    def __post_init__(self):
        if self.events is None:
            self.events = []

    def deposit(self, amount: float):
        """入金"""
        self.events.append({
            'type': 'Deposited',
            'amount': amount,
            'timestamp': datetime.now(),
            'balance_after': self.get_balance() + amount
        })

    def withdraw(self, amount: float):
        """出金"""
        if self.get_balance() >= amount:
            self.events.append({
                'type': 'Withdrawn',
                'amount': amount,
                'timestamp': datetime.now(),
                'balance_after': self.get_balance() - amount
            })
        else:
            raise ValueError("Insufficient balance")

    def add_interest(self, rate: float):
        """利息加算"""
        interest = self.get_balance() * rate
        self.events.append({
            'type': 'InterestAdded',
            'amount': interest,
            'timestamp': datetime.now(),
            'balance_after': self.get_balance() + interest
        })

    def get_balance(self) -> float:
        """イベントから残高を計算"""
        balance = 0
        for event in self.events:
            if event['type'] in ['Deposited', 'InterestAdded']:
                balance += event['amount']
            elif event['type'] == 'Withdrawn':
                balance -= event['amount']
        return balance

    def get_history(self):
        """取引履歴を返す"""
        return self.events
```

---

## 4. Choreography vs Orchestration

複数のサービス間のワークフロー調整パターン：

**Choreography（分散調整）:**
```
[イベント駆動型の自律的なやりとり]

注文サービス
  └─ "OrderCreated"イベント発行
      ├→ 在庫サービスが受信 → "InventoryReserved"発行
      └→ 決済サービスが受信 → "PaymentProcessed"発行
            └→ 配送サービスが受信 → "ShippingStarted"発行

メリット: シンプル、サービス間の依存度が低い
デメリット: フロー全体の追跡が難しい、デバッグが困難
```

**Orchestration（中央調整）:**
```
[Sagaオーケストレーターが調整]

Sagaオーケストレーター
  ├─ 注文サービス: CreateOrder
  ├─ 在庫サービス: ReserveInventory
  ├─ 決済サービス: ProcessPayment
  └─ 配送サービス: StartShipping

メリット: フロー管理が容易、エラーハンドリングが明確
デメリット: 中央集権的、スケーラビリティに課題
```

---

## 5. 補償トランザクション

分散トランザクションのロールバック：

```
[正常フロー]
1. 在庫確保 ✓
2. 支払い処理 ✓
3. 配送指示 ✓

[支払い失敗時]
1. 在庫確保 ✓
2. 支払い処理 ✗
3. [補償] 在庫確保を取り消し ← 補償トランザクション
```

**実装例:**
```python
class OrderSaga:
    def execute_order(self, order_id, items):
        try:
            # ステップ1: 在庫確保
            reservation_id = self.inventory_service.reserve(items)

            # ステップ2: 支払い処理
            payment_id = self.payment_service.process(order_id)

            # ステップ3: 配送
            shipping_id = self.shipping_service.start(order_id)

            return {'status': 'success', 'order_id': order_id}

        except PaymentException as e:
            # 在庫予約をロールバック
            self.inventory_service.cancel_reservation(reservation_id)
            raise

        except ShippingException as e:
            # 支払いと在庫をロールバック
            self.payment_service.refund(payment_id)
            self.inventory_service.cancel_reservation(reservation_id)
            raise
```

---

## 6. 分散フローの設計

Sagaパターンの実装パターン：

```python
from enum import Enum

class OrderStatus(Enum):
    PENDING = "pending"
    INVENTORY_RESERVED = "inventory_reserved"
    PAYMENT_PROCESSED = "payment_processed"
    SHIPPED = "shipped"
    FAILED = "failed"

class OrderSaga:
    def __init__(self, order_id, services):
        self.order_id = order_id
        self.services = services
        self.status = OrderStatus.PENDING
        self.compensations = []

    def execute(self, order_data):
        """Sagaパターンのステップ実行"""
        try:
            # ステップ1
            self.services['inventory'].reserve(order_data['items'])
            self.compensations.append(
                lambda: self.services['inventory'].cancel_reservation(...)
            )
            self.status = OrderStatus.INVENTORY_RESERVED

            # ステップ2
            self.services['payment'].process(order_data['payment'])
            self.compensations.append(
                lambda: self.services['payment'].refund(...)
            )
            self.status = OrderStatus.PAYMENT_PROCESSED

            # ステップ3
            self.services['shipping'].start(order_data)
            self.status = OrderStatus.SHIPPED

        except Exception as e:
            # 補償トランザクション実行
            for compensation in reversed(self.compensations):
                try:
                    compensation()
                except Exception as comp_error:
                    # 補償失敗時はログして続行
                    print(f"Compensation failed: {comp_error}")

            self.status = OrderStatus.FAILED
            raise
```

---

## 7. CQRS（コマンド・クエリ責任分離）

**書き込みモデル（Command）:**
- イベント記録に最適化
- 正規化されたデータ構造

**読み込みモデル（Query）:**
- 読み取り性能に最適化
- 非正規化、インデックス多数

```python
# 書き込み（イベント記録）
class OrderWriteModel:
    def create_order(self, order_id, items):
        event = {
            'type': 'OrderCreated',
            'order_id': order_id,
            'items': items,
            'timestamp': datetime.now()
        }
        self.event_store.append(event)

# 読み込み（ビュー検索用）
class OrderReadModel:
    def get_orders_by_user(self, user_id):
        # 最適化されたクエリ
        return self.read_db.query(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        )
```

---

## 8. 結果整合性 (Eventual Consistency)

分散システムでの整合性：

```
[強い整合性]
更新直後に全ノードが最新値を共有
→ 実装が複雑、レイテンシが高い

[結果整合性]
最終的にはすべてのノードが同じ値に収束
→ 実装が簡単、レイテンシが低い

時刻 ---→
ノードA: 1000 → 950 (即座に更新)
ノードB: 1000 → 1000 (遅延)→ 950 (最終的に同期)
ノードC: 1000 → 1000 (遅延)→ 950 (最終的に同期)
```

---

## 9. CQRSの簡易実装

```python
class SimpleCQRS:
    def __init__(self):
        self.events = []
        self.read_model = {}

    def execute_command(self, command):
        """コマンド: 状態変更"""
        # イベント生成
        event = self._handle_command(command)
        self.events.append(event)

        # 読み取りモデル更新
        self._update_read_model(event)

        return event

    def query(self, query_type, **params):
        """クエリ: 読み取り（読み取りモデルから）"""
        return self.read_model.get(query_type, {}).get(
            params['key'], None
        )

    def _update_read_model(self, event):
        """読み取りモデルを最適化形式で更新"""
        # 書き込みモデルから読み取り用に変換・非正規化
        pass
```

---

## 10. イミュータブルなログとスナップショット

```python
class EventStore:
    def __init__(self):
        self.events = []  # イミュータブル
        self.snapshots = {}  # スナップショット保管

    def append_event(self, event):
        """イベント追加（上書き不可）"""
        event['version'] = len(self.events) + 1
        event['timestamp'] = datetime.now()
        self.events.append(event)

    def create_snapshot(self, aggregate_id, state):
        """大量のイベント読み込みを避けるためのスナップショット"""
        self.snapshots[aggregate_id] = {
            'state': state,
            'version': len(self.events),
            'created_at': datetime.now()
        }

    def rebuild_state(self, aggregate_id):
        """スナップショットから状態を復元"""
        # スナップショットが存在すれば、そこから開始
        if aggregate_id in self.snapshots:
            snapshot = self.snapshots[aggregate_id]
            state = snapshot['state']
            start_version = snapshot['version']
        else:
            state = {}
            start_version = 0

        # スナップショット以降のイベントを適用
        for event in self.events[start_version:]:
            state = self._apply_event(state, event)

        return state
```

