# W. 仕様駆動開発（SDD）

## 概要

仕様駆動開発（SDD: Specification-Driven Development）は、機械可読な仕様（Schema / Contract）をソースとして、コード生成やバリデーション、ドキュメント生成を自動化する開発手法です。OpenAPI、JSON Schema などを活用することで、仕様の一貫性を保ちながら開発効率を向上させます。

---

## 1. 機械可読な仕様とは

**特徴:**

- **人間が読める:** JSON / YAML で可読性が高い
- **機械が処理できる:** パーサーが自動解析できる
- **コード生成の基盤:** スキーマから TypeScript 型、API クライアント、バリデーションを自動生成
- **ドキュメント生成の基盤:** Swagger UI、ReDoc などで対話的なドキュメント生成

**例：OpenAPI 仕様**

```yaml
openapi: 3.0.0
info:
  title: Order API
  version: 1.0.0

paths:
  /orders:
    post:
      summary: 注文を作成
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Order'
      responses:
        '201':
          description: 注文作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'

components:
  schemas:
    Order:
      type: object
      properties:
        customerId:
          type: string
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
      required:
        - customerId
        - items
```

---

## 2. コード生成の使いどころ

**自動生成が有効な場合：**

1. **API クライアント:** 仕様から TypeScript 型を生成
2. **バリデーション:** スキーマから入力検証ロジックを自動生成
3. **ドキュメント:** OpenAPI から Swagger UI を生成
4. **Mock サーバー:** 仕様からダミー API サーバーを生成

**ツール:**

- `openapi-generator`: 多言語コード生成
- `json-schema-to-typescript`: JSON Schema から TypeScript 型生成
- `zod`，`joi`: スキーマベースのバリデーション

---

## 3. 変更管理と互換性

**互換性の分類:**

- **後方互換（Backward Compatible）:** クライアントを変更しなくても新バージョンを使用できる
  - 新しいフィールドを追加（既存フィールドは変更しない）
  - 新しいエンドポイントを追加

- **破壊的変更（Breaking Change）:** クライアントの修正が必要
  - フィールド削除
  - フィールド型の変更
  - 必須フィールドの追加

**バージョニング戦略:**

```yaml
# v1.0.0（初版）
Order:
  properties:
    orderId: string
    total: number

# v1.1.0（後方互換：新フィールド追加）
Order:
  properties:
    orderId: string
    total: number
    discount: number  # 新規、オプション

# v2.0.0（破壊的変更）
Order:
  properties:
    orderId: string
    totalAmount: number  # 型が変更
    # total フィールドは削除
```

---

## 4. スキーマファースト開発

**フロー：**

1. **スキーマ設計:** OpenAPI / JSON Schema を設計
2. **コード生成:** スキーマから型・クライアント・サーバー骨組みを生成
3. **実装:** ビジネスロジックを追加
4. **テスト:** スキーマに基づいてテスト

**メリット:**

- API 仕様が最初に明確化される
- フロント・バック開発の並行化が容易
- コード生成で定型的な部分を削減

---

## 5. スキーマバリデーション

**入力検証をスキーマベースで実装:**

```typescript
import { z } from 'zod';

const OrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive()
    })
  ),
  totalAmount: z.number().positive()
});

// バリデーション実行
const result = OrderSchema.safeParse(inputData);
if (!result.success) {
  console.error(result.error);
}
```

**OpenAPI スキーマから検証ロジックを自動生成することも可能**

---

## 6. 事前条件（Precondition）

**事前条件:** メソッド実行前に満たすべき条件

```typescript
class Order {
  pay(amount: number) {
    // 事前条件：金額が 0 より大きい
    if (amount <= 0) {
      throw new Error('Invalid amount');
    }

    // 事前条件：注文がまだ支払われていない
    if (this.status === 'paid') {
      throw new Error('Already paid');
    }

    this.status = 'paid';
  }
}
```

**設計時に事前条件を明記:**

```yaml
Order:
  pay:
    preconditions:
      - amount > 0
      - status == 'pending'
```

---

## 7. 事後条件（Postcondition）

**事後条件:** メソッド実行後に保証される条件

```typescript
class Order {
  pay(amount: number): PaymentResult {
    // ... 支払い処理

    // 事後条件：ステータスが 'paid' に更新される
    if (this.status !== 'paid') {
      throw new Error('Payment failed');
    }

    // 事後条件：支払い記録が生成される
    const paymentRecord = this.getLastPayment();
    if (!paymentRecord) {
      throw new Error('Payment record not created');
    }

    return paymentRecord;
  }
}
```

---

## 8. 不変条件（Invariant）

**不変条件:** オブジェクトのライフサイクル全体で常に真である条件

```typescript
class BankAccount {
  private balance: number;

  // 不変条件：balance >= 0（口座残高は常に 0 以上）
  deposit(amount: number) {
    if (amount <= 0) throw new Error('Invalid amount');
    this.balance += amount;
    // 不変条件を確認
    console.assert(this.balance >= 0, 'Invariant violated');
  }

  withdraw(amount: number) {
    if (amount > this.balance) throw new Error('Insufficient balance');
    this.balance -= amount;
    // 不変条件を確認
    console.assert(this.balance >= 0, 'Invariant violated');
  }
}
```

---

## 9. 契約違反の扱い

**エラーハンドリング:**

```typescript
interface ContractViolation {
  type: 'precondition' | 'postcondition' | 'invariant';
  message: string;
}

class Order {
  pay(amount: number) {
    // 事前条件違反
    if (amount <= 0) {
      throw new Error(JSON.stringify({
        type: 'precondition',
        message: 'Amount must be positive'
      }));
    }

    // ... 処理

    // 事後条件違反
    if (this.status !== 'paid') {
      throw new Error(JSON.stringify({
        type: 'postcondition',
        message: 'Status not updated to paid'
      }));
    }
  }
}
```

**エラー設計:**
- Precondition 違反 → 400 Bad Request（クライアント側の問題）
- Postcondition 違反 → 500 Internal Server Error（サーバー側の問題）
- Invariant 違反 → 500 Internal Server Error（システムエラー）

---

## 10. 契約を文章化して実装に落とす

**文書化のフォーマット:**

```markdown
## Order.pay(amount)

### Preconditions
- amount > 0
- status == 'pending'

### Postconditions
- status == 'paid'
- payment_record が作成されている

### Invariants
- total_amount >= 0

### Side Effects
- Payment イベント発行
- メール送信（支払い確認）

### Exceptions
- PaymentDeclined: 決済が拒否された場合
- InsufficientFunds: 口座残高が足りない場合
```

**実装時にこの契約を参照して実装**

---

## 11. 実装のポイント

- OpenAPI / JSON Schema で仕様を機械可読に
- スキーマから型・バリデーション・ドキュメントを自動生成
- 仕様の後方互換性を慎重に管理
- 契約（事前条件・事後条件・不変条件）を明記
- エラー処理を仕様で定義
- AI生成時に仕様をプロンプトに含める
