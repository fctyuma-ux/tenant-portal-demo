# I. クリーンコード・リファクタリング

## 概要

リファクタリングは、外部仕様（入出力の挙動）を変えずにコードを改善するプロセスです。可読性・保守性・拡張性を向上させながら、テストによる保護のもとで安全に実施します。

小刻みなリファクタリング手順を身につけることで、AI生成コードの品質向上や技術的負債の解消が効率的に進みます。

---

## 1. リファクタリングの定義

**リファクタリング:** 外部仕様は変わらず、内部実装を改善する

**リファクタリング vs バグ修正:** 
- リファクタリング：挙動は同じ、コード品質を改善
- バグ修正：挙動を修正して正しくする

**リファクタリングの前提:**
- テストスイートで既存の挙動を保護
- 小さなステップで実施し、各ステップで動作検証

---

## 2. Rename（名前で設計する）

**目的:** コードの意図を明確化し、読み手の認知負荷を削減

**対象:**
- 変数名：`temp`, `x` → `cartTotal`, `orderId`
- 関数名：`calc()` → `calculateOrderTotal()`
- クラス名：`Handler` → `PaymentProcessor`

**確認項目:**
- 名前だけで役割が推測できるか？
- チーム内で一貫した命名規則を使用しているか？

---

## 3. Extract Method / Extract Variable

**Extract Method:** 複雑な処理を独立した関数に抽出

```typescript
// 抽出前
const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
const tax = total * 0.1;
const final = total + tax;

// 抽出後
function calculateTax(subtotal) { return subtotal * 0.1; }
function calculateTotal(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return subtotal + calculateTax(subtotal);
}
```

**Extract Variable:** 式を変数に割り当て、中間結果の意図を明確化

```typescript
// 抽出前
if (user.age >= 18 && user.verified && !user.suspended) { /* ... */ }

// 抽出後
const isEligible = user.age >= 18 && user.verified && !user.suspended;
if (isEligible) { /* ... */ }
```

---

## 4. Inline（不要な抽象を戻す）

**目的:** 過度な抽象化を除去し、シンプルさを回復

```typescript
// リファクタリング前：過度な抽象化
function getPerson(id) { return getById(id); }

// リファクタリング後：不要な関数を削除
const person = getById(id);
```

**判断基準:**
- 関数が1回だけ使用される
- ラッパーが処理を追加していない
- インライン化で可読性が向上する

---

## 5. Replace Temp with Query / Introduce Parameter Object

**Replace Temp with Query:** 計算結果をローカル変数でなくメソッドで計算

```typescript
// 改善前
const discountedPrice = price * 0.9;
const finalPrice = discountedPrice + tax;

// 改善後
function getDiscountedPrice() { return price * 0.9; }
const finalPrice = getDiscountedPrice() + tax;
```

**Introduce Parameter Object:** 多くのパラメータをオブジェクトに統合

```typescript
// 改善前
function createOrder(userId, items, address, phone, paymentMethod) { /* ... */ }

// 改善後
function createOrder(userId, orderData) {
  const { items, address, phone, paymentMethod } = orderData;
}
```

---

## 6. 小刻みなリファクタリング

**プロセス:**

1. テストスイートが全て通ることを確認
2. 1つの小さな変更を実施（変数名変更、メソッド抽出）
3. テストを再実行
4. コミット
5. 2～4を繰り返す

**利点:**
- 各ステップで動作が保証される
- バグが生じたら直前の変更をロールバック
- コミット履歴が追跡可能

---

## 7. 過剰抽象の改善

**過剰抽象の兆候:**

- 深いネスト構造：7階層以上
- メソッドチェーン：3段階以上が続く
- パラメータの多さ：5個以上

**改善手順:**

1. 複数の小さなメソッドに分割
2. Inlineで不要な抽象を除去
3. テストで動作を確認

---

## 8. AI生成コードのリファクタリング

**よくある問題:**

- 変数名が`temp`, `result`, `data`
- 複数の責務が1つのメソッドに混在
- ネストが深い条件分岐

**改善戦略:**
1. テストスイートを実装して既存の挙動を保護
2. Extract Method で関心を分離
3. Rename で意図を明確化
4. 不要な抽象をInlineで削除
5. PRで段階的な改善を提案

---

## 9. 実装のポイント

- リファクタリングは機能追加の前に実施し、基盤を整える
- テストなしのリファクタリングは避ける
- 大規模なリファクタリングは複数PRに分割
- コードレビューで設計改善をフィードバック
