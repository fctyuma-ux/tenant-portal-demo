# T. ドメイン駆動設計（DDD）

## 概要

ドメイン駆動設計（DDD）は複雑なビジネスロジックを整理し、変更に強いコード設計を実現します。エンティティ、値オブジェクト、集約などの戦術パターンと、レイヤード構造の戦略パターンを習得することで、スケーラブルな設計ができます。

---

## 1. エンティティと値オブジェクト

**エンティティ:** ID で一意に識別される「もの」

```typescript
class User {
  constructor(id: UserId, name: string) {
    this.id = id;  // ID で一意
    this.name = name;
  }
}
// User(id=1, name="Alice") ≠ User(id=2, name="Alice")
```

**値オブジェクト:** 属性値で判定される「値」

```typescript
class Email {
  constructor(value: string) {
    if (!this.isValid(value)) throw new Error();
    this.value = value;  // 不変
  }
}
// Email("a@ex.com") === Email("a@ex.com")
```

| 項目 | エンティティ | 値オブジェクト |
|---|---|---|
| 識別 | ID で一意 | 属性値で判定 |
| 可変性 | 可変 | 不変 |
| 寿命 | 長い | 短い |

---

## 2. 集約（整合性の境界）

関連するエンティティ・値オブジェクトをグループ化

```
Aggregate: Order
├── Order（root entity）
│   ├── OrderId
│   └── orderLines[]
└── OrderLine（part entity）
    ├── ProductId
    └── Quantity
```

整合性チェック：
```typescript
class Order {
  addLineItem(product: Product, qty: number) {
    this.validateStock(product, qty);  // 整合性確保
    this.lines.push(new OrderLine(product, qty));
  }
}
```

---

## 3. リポジトリ（永続化の抽象）

```typescript
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  delete(id: OrderId): Promise<void>;
}
```

**メリット：** DB変更の影響を局所化、テスト時にメモリ実装

---

## 4. ドメインサービス

どのエンティティにも属さないビジネスルール

```typescript
class OrderCancellationPolicy {
  canCancel(order: Order): boolean {
    return order.status === 'pending' &&
           order.createdAt.getTime() + 24*60*60*1000 > Date.now();
  }
}
```

---

## 5. レイヤード構造

```
Presentation → Application → Domain → Infrastructure
```

**依存方向:** 上から下へのみ

| 層 | 責務 |
|---|---|
| Presentation | UI、HTTP |
| Application | ユースケース実行 |
| Domain | ビジネスロジック |
| Infrastructure | DB、外部API |

---

## 6. アプリケーションサービス

ユースケース実行：

```typescript
class CreateOrderService {
  async execute(customerId: CustomerId, items: Item[]): Promise<OrderId> {
    // 1. 在庫確認
    for (const item of items) {
      if (!this.inventoryService.hasStock(item)) {
        throw new OutOfStockError();
      }
    }
    // 2. 注文作成
    const order = new Order(customerId, items);
    // 3. 永続化
    await this.orderRepository.save(order);
    return order.id;
  }
}
```

---

## 7. ACL（アンチコラプションレイヤー）

外部API の形式を内部Model に変換

```typescript
class ExternalPaymentACL {
  async convertToOurModel(externalResponse: any): Promise<Payment> {
    return new Payment(
      id: externalResponse.transaction_id,
      amount: externalResponse.amount_cents / 100
    );
  }
}
```

---

## 8. DDD の段階的導入

```
Phase 1: エンティティ定義
Phase 2: リポジトリ → 永続化抽象
Phase 3: 集約境界
Phase 4: ドメインサービス、ACL
```

完璧を目指さず小さく始める

---

## 9. 実践スキル

- Entity/Value Object/Repository 実装
- 集約設計と整合性判定
- ACL で外部API変換
- レイヤード実装（UseCase → Domain → Infrastructure）

