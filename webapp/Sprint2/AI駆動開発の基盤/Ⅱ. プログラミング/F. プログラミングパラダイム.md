# F. プログラミングパラダイム

## 概要

プログラミングパラダイムは、コードの構造と思考方法を根本的に変える設計思想です。特に関数型プログラミングは、不変性と純粋関数の概念により、テスト性と保守性を大幅に向上させます。AI生成コードのレビューや改善においても、これらの原則理解が不可欠です。

---

## 1. 不変性（Immutability）と純粋関数（Pure Function）

不変性とは、一度作成されたデータが変更されないという原則です。純粋関数は同じ入力に対して常に同じ出力を返し、副作用を持ちません。

**特徴:**
- 状態変更を最小化し、予測可能なコードを実現
- テスト時に外部依存を気にせず検証可能
- 並行処理での競合状態を排除

**例:**
```javascript
// 純粋関数の例
const addToCart = (cart, item) => [...cart, item];

// 非純粋関数（避けるべき）
const addToCartMutating = (cart, item) => {
  cart.push(item);
  return cart;
};
```

不変性により、前の状態と新しい状態を同時に保持でき、デバッグやロールバックが容易になります。

---

## 2. 高階関数と関数合成

高階関数は、関数を引数に受け取るか、関数を戻り値として返す関数です。関数合成は複数の単純な関数を組み合わせて、より複雑な処理を構築する技法です。

**活用パターン:**
- `map/filter/reduce` で宣言的データ変換
- コールバック関数で振る舞いをカスタマイズ
- 関数の部分適用（Partial Application）で新しい関数を生成

**例:**
```javascript
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

const users = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 17 }
];

const getAdultNames = users =>
  users
    .filter(u => u.age >= 18)
    .map(u => u.name)
    .sort();
```

---

## 3. Map/Filter/Reduceの役割

これら3つの関数は、データ変換の基本パターンです。

| 関数 | 役割 | 例 |
|------|------|-----|
| map | 各要素を変換 | `[1,2,3].map(x => x * 2)` → `[2,4,6]` |
| filter | 条件に合う要素を抽出 | `[1,2,3,4].filter(x => x > 2)` → `[3,4]` |
| reduce | 要素を集約 | `[1,2,3].reduce((sum, x) => sum + x, 0)` → `6` |

ループ処理をこれらに置き換えることで、コードの意図が明確になり、テスト性も向上します。

---

## 4. 副作用の境界とI/O分離

副作用（I/O操作、状態変更、ログ出力）と計算ロジックを分離することは、テスト性向上の鍵です。

**設計原則:**
- 計算部分：純粋関数として実装
- 副作用部分：計算後に集約して実行

**例:**
```javascript
// 計算ロジック（純粋）
const calculateDiscount = (price, rate) => price * (1 - rate);

// 副作用をまとめた関数
const applyDiscountAndLog = async (price, rate) => {
  const discounted = calculateDiscount(price, rate);
  await log(`Discount applied: ${discounted}`);
  return discounted;
};
```

AI生成コードで計算と副作用が混在していないか確認することが重要です。

---

## 5. 状態更新中心の実装から不変データ中心への改善

従来の命令型コードは状態を変更しながら進行しますが、関数型アプローチでは状態遷移を明確にします。

**改善前（命令型）:**
```javascript
let total = 0;
let items = [];
for (let i = 0; i < products.length; i++) {
  items.push(products[i]);
  total += products[i].price;
}
```

**改善後（関数型）:**
```javascript
const { items, total } = products.reduce(
  (acc, p) => ({
    items: [...acc.items, p],
    total: acc.total + p.price
  }),
  { items: [], total: 0 }
);
```

関数型スタイルにより、各ステップの入出力が明確になり、レビュアーが意図を理解しやすくなります。

---

## 6. 関数合成による処理フロー整理

処理の流れを関数の合成で表現することで、データ変換のパイプラインが見える化されます。

複雑なビジネスロジックをシンプルな関数の積み重ねで表現することで、AI生成コードの検証と改善が効率化されます。
