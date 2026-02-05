# BB. トランザクション・整合性

## 概要

分散システムにおいて、複数のリソースに跨る操作の一貫性（整合性）を保つことは困難です。従来の 2 相コミット（2PC）では強い整合性を保証する一方、スケーラビリティの課題があります。Saga パターンは、長時間実行トランザクションを複数の補償可能なステップに分割し、最終的な整合性を実現します。

本セクションでは、2PC と Saga パターン、補償トランザクション（Compensating Transaction）の実装方法について説明します。

## 2 相コミット (2PC)

2PC は、分散トランザクションの強い一貫性を保証する古典的なアルゴリズムです。コーディネーター（調整役）がリソース管理者（RM）と以下の 2 つのフェーズで調整します：

### フェーズ 1: 準備フェーズ

コーディネーターが全ての RM に対して「このトランザクションをコミットできるか」と問い合わせます。各 RM は、トランザクション実行可能性をロック保持したまま確認し、YES/NO で返答します。

### フェーズ 2: コミット/アボートフェーズ

全RM から YES が返ってきた場合、コーディネーターは全RM にコミット命令を出します。1つでも NO なら全RM にアボート命令を出し、ロールバックします。

**利点**: 強い一貫性、ACID 特性の完全保証

**欠点**: パフォーマンス低下、ブロッキング期間が長い、スケーラビリティ課題

## Saga パターン

Saga パターンは、長時間実行トランザクションを複数のローカルトランザクションに分割し、非同期で実行します。各ステップが失敗した場合、前のステップを逆操作（補償トランザクション）で取り消します。

### Choreography vs Orchestration

**Choreography（振付型）**: 各サービスが自身のイベントリスナーを持ち、イベント駆動で次のステップをトリガーします。サービス間の結合度が低いが、全体の流れを理解しにくくなります。

**Orchestration（指揮型）**: 専用の Saga Orchestrator が各サービスのステップを順序付けて実行します。流れが明確で制御しやすい一方、Orchestrator が単一障害点となる可能性があります。

## 補償トランザクションの実装

注文サンプル：在庫予約 → 支払処理 → 配送予約

いずれかのステップが失敗した場合、前のステップを取り消します。

```javascript
// Orchestration パターンでの Saga 実装
class OrderSaga {
  constructor(orderId, items, paymentInfo) {
    this.orderId = orderId;
    this.items = items;
    this.paymentInfo = paymentInfo;
    this.steps = [];
  }

  async execute() {
    try {
      // Step 1: 在庫予約
      await this.reserveInventory();
      this.steps.push('reserveInventory');

      // Step 2: 支払処理
      await this.processPayment();
      this.steps.push('processPayment');

      // Step 3: 配送予約
      await this.reserveShipment();
      this.steps.push('reserveShipment');

      return { success: true, orderId: this.orderId };

    } catch (error) {
      // エラー発生時、実行済みステップを逆順で補償
      await this.compensate();
      throw new Error(`Order saga failed: ${error.message}`);
    }
  }

  async reserveInventory() {
    const response = await inventoryService.reserve(this.items);
    if (!response.success) {
      throw new Error('Inventory reservation failed');
    }
  }

  async processPayment() {
    const response = await paymentService.charge(this.paymentInfo);
    if (!response.success) {
      throw new Error('Payment processing failed');
    }
  }

  async reserveShipment() {
    const response = await shipmentService.reserve(
      this.orderId,
      this.items
    );
    if (!response.success) {
      throw new Error('Shipment reservation failed');
    }
  }

  async compensate() {
    console.log(`Compensating order saga. Executed steps: ${this.steps}`);

    // 逆順で補償トランザクション実行
    for (let i = this.steps.length - 1; i >= 0; i--) {
      const step = this.steps[i];

      try {
        switch (step) {
          case 'reserveInventory':
            await inventoryService.release(this.items);
            break;
          case 'processPayment':
            await paymentService.refund(this.paymentInfo);
            break;
          case 'reserveShipment':
            await shipmentService.cancel(this.orderId);
            break;
        }
      } catch (error) {
        console.error(`Compensation step ${step} failed: ${error.message}`);
      }
    }
  }
}

// 使用例
const saga = new OrderSaga(
  '12345',
  [{ productId: 'P001', quantity: 2 }],
  { cardId: 'card-123', amount: 5000 }
);

try {
  const result = await saga.execute();
  console.log('Order completed:', result);
} catch (error) {
  console.error('Order failed:', error.message);
}
```

### Choreography パターンでの実装例

```javascript
// イベント駆動で各サービスが自律的に動作
const eventBus = new EventEmitter();

// 1. 注文作成
eventBus.on('order.created', async (order) => {
  try {
    await inventoryService.reserve(order.items);
    eventBus.emit('inventory.reserved', { orderId: order.id });
  } catch (error) {
    eventBus.emit('order.failed', { orderId: order.id });
  }
});

// 2. 在庫予約完了後、支払い処理
eventBus.on('inventory.reserved', async (event) => {
  try {
    const order = await orderService.getOrder(event.orderId);
    await paymentService.charge(order.paymentInfo);
    eventBus.emit('payment.completed', { orderId: event.orderId });
  } catch (error) {
    eventBus.emit('inventory.compensate', { orderId: event.orderId });
  }
});

// 3. 支払い完了後、配送予約
eventBus.on('payment.completed', async (event) => {
  try {
    const order = await orderService.getOrder(event.orderId);
    await shipmentService.reserve(event.orderId, order.items);
    eventBus.emit('order.completed', { orderId: event.orderId });
  } catch (error) {
    eventBus.emit('payment.compensate', { orderId: event.orderId });
  }
});

// 補償トランザクション
eventBus.on('order.failed', async (event) => {
  await inventoryService.release(event.orderId);
  await paymentService.refund(event.orderId);
  await shipmentService.cancel(event.orderId);
});
```

## 最終的整合性

Saga パターンは強い一貫性ではなく、**最終的整合性** を提供します。各ステップ間に遅延があり、その間は状態が一貫しないことがあります。ただし、補償トランザクション成功時には最終的に一貫した状態に到達します。

