# T. ドメイン駆動設計（DDD）

## 概要

ドメイン駆動設計（DDD: Domain-Driven Design）は、ビジネスドメインを中心にシステム設計を進める手法です。サブドメイン分類、境界づけられたコンテキスト、コンテキストマップにより、複雑なビジネスロジックを整理し、チーム間の認識を統一できます。

---

## 1. サブドメイン分類

**サブドメインの3分類:**

- **コアドメイン（Core Domain）:** ビジネスの競争優位性を生む領域
  - 例：オンラインショップの「レコメンデーション機能」
  - 特徴：社内で高い専門知識が必要、ビジネスバリューが大きい

- **サポートドメイン（Supporting Subdomain）:** コアドメインをサポートする領域
  - 例：「在庫管理」「配送管理」
  - 特徴：ビジネス独自だが、競争優位性は相対的に低い

- **汎用ドメイン（Generic Subdomain）:** 業界標準の領域
  - 例：「認証」「メール送信」「ログ管理」
  - 特徴：社内で開発するより、外部ライブラリを使用する方が効率的

**分類の効果:**

- コアドメイン：最高の人材・リソースを投下
- サポートドメイン：標準的なアプローチで実装
- 汎用ドメイン：既製品・OSS を活用

---

## 2. 境界づけられたコンテキスト

**概念:** 特定のドメイン知識が有効な領域

```
┌─ 注文コンテキスト ─┐
│ - Order          │
│ - OrderItem      │
│ - Payment        │
└──────────────────┘
     ↓
┌─ 在庫コンテキスト ─┐
│ - Stock          │
│ - WarehouseItem  │
│ - Reservation    │
└──────────────────┘
```

**特徴:**

- 各コンテキストは独立した User language（用語体系）を持つ
- 同じ「Product」という概念でも、コンテキストごとに意味が異なる可能性

---

## 3. コンテキストマップ

**統合関係の整理:**

```
┌─ 顧客コンテキスト ───┐
│   (Customer)         │
└──────┬───────────────┘
       │ (Downstream)
       │ API で取得
       ↓
┌─ 注文コンテキスト ─┐
│   (Order)        │
└──────┬────────────┘
       │ (Upstream)
       │ イベント発行
       ↓
┌─ 在庫コンテキスト ─┐
│   (Inventory)    │
└──────────────────┘
```

**統合パターン:**

- **ACL（Anti-Corruption Layer）:** 互換性のないインターフェースを翻訳
- **公開API:** REST API で機能を提供
- **イベント駆動:** ドメインイベントで非同期統合

---

## 4. ドメイン言語の統一

**ユビキタス言語（Ubiquitous Language）:**

チーム全体（ビジネス、設計者、開発者）が同じ言葉を使用

- ✓ 「オーダー」「注文」を混用しない → 「Order」に統一
- ✗ 技術用語だけで説明しない → ビジネス意図を反映した名前

**実装での反映:**

```typescript
// ✓ 良い例：ビジネス用語を反映
class Order {
  customer: Customer;
  items: OrderItem[];
  status: OrderStatus; // 'pending' | 'confirmed' | 'shipped'
  calculateTotal(): Money { /* ... */ }
}

// ✗ 悪い例：技術用語が先行
class Obj {
  usr: User;
  arr: Item[];
  st: number;
  calc(): number { /* ... */ }
}
```

---

## 5. 簡易コンテキストマップの作成

**手順:**

1. 主要なビジネスプロセスを列挙
2. 各プロセスに関わる Entity / Value Object を特定
3. Bounded Context を定義
4. Context 間の統合関係を整理

**図示例:**

```
ユースケース：商品購入

┌─ CatalogContext ──┐
│ (Product, Price)  │ ← 商品検索・価格確認
└─────┬─────────────┘
      │
┌─ OrderContext ────┐
│ (Order, Payment)  │ ← 注文作成・決済
└─────┬─────────────┘
      │
┌─ ShippingContext ─┐
│ (Shipment, Track) │ ← 配送管理
└───────────────────┘
```

---

## 6. 責務の明確化

**Entity（エンティティ）:** ID で一意に識別される概念
```typescript
class Order {
  orderId: OrderId;
  items: OrderItem[];
  status: OrderStatus;
}
```

**Value Object（値オブジェクト）:** 不変で、値で比較される概念
```typescript
class Money {
  currency: string;
  amount: number;
  
  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount === other.amount;
  }
}
```

**Aggregate（集約）:** Entity と Value Object をまとめた単位
```typescript
class OrderAggregate {
  orderId: OrderId;
  items: OrderItem[];
  total: Money;
}
```

---

## 7. イベント駆動の設計

**ドメインイベント:** ビジネス上の重要な出来事

```typescript
class OrderPlaced {
  orderId: OrderId;
  customerId: CustomerId;
  timestamp: Date;
}

// イベント発行
order.place(); // OrderPlaced イベントが発行される

// リスナーで処理
eventBus.on(OrderPlaced, (event) => {
  inventory.reserve(event.orderId, event.items);
});
```

---

## 8. アーキテクチャとの関連

**DDD は設計思想、アーキテクチャパターンと組み合わせて活用**

```
Domain Layer
├── Entities
├── Value Objects
├── Aggregates
└── Domain Services

Application Layer (Usecase)
├── ApplicationService
└── DTO

Infrastructure Layer
├── Repository Implementation
└── External Services
```

---

## 9. 実装のポイント

- ビジネスドメイン中心に設計（技術ではなく）
- Bounded Context ごとに責務を明確化
- ユビキタス言語をコード・ドキュメントに反映
- イベント駆動で Context 間を疎結合化
- 過度な設計を避け、シンプルさを保つ

---

## 10. AI 生成コードとの連携

**DDD 概念を AI に指示:**

```
プロンプト：
「OrderAggregate を実装してください。
Entity: Order（orderId で識別）
Value Object: Money（currency と amount を持つ不変オブジェクト）
Aggregate root: Order
責務：注文の状態遷移（pending → confirmed → shipped）を管理
」
```

**レビュー観点:**

- [ ] Entity と Value Object が適切に分離されているか？
- [ ] Aggregate boundary は妥当か？
- [ ] ビジネスルール（状態遷移など）が実装されているか？
