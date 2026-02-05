# U. テスト駆動開発（TDD）

## 概要

テスト駆動開発（TDD: Test-Driven Development）は、テストを先に書き、その後に実装する開発手法です。Red-Green-Refactor サイクルを通じて、要件を明確化しながら、変更に強いコードを段階的に構築できます。

---

## 1. リファクタリングの定義

**リファクタリング:** 外部仕様を変えずにコードを改善

- **対象:** 可読性、保守性、パフォーマンス
- **前提:** テストで既存の挙動を保護

**TDD でのリファクタリング:**

1. テストが GREEN（合格）な状態を確保
2. コードの品質を改善
3. テストが GREEN のまま（挙動は変わらない）

---

## 2. テストとリファクタの関係

**TDD サイクル（Red-Green-Refactor）:**

```
1. RED: テストを書く（失敗する）
2. GREEN: 最小限の実装でテストを通す
3. REFACTOR: コードを改善、テストが GREEN を維持
4. 1に戻る
```

**各フェーズの役割:**

- **RED:** 要件を明確化、設計を検討
- **GREEN:** 最小限の実装で機能を確保
- **REFACTOR:** テストに守られながら品質向上

---

## 3. テスト仕様の明確化

**テストが要件定義書の役割:**

```typescript
describe('calculateOrderTotal', () => {
  it('should sum item prices correctly', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 }
    ];
    const result = calculateOrderTotal(items);
    expect(result).toBe(250);
  });

  it('should apply discount for bulk orders', () => {
    const items = Array(10).fill({ price: 100, quantity: 1 });
    const result = calculateOrderTotal(items);
    expect(result).toBe(1000 * 0.9); // 10% 割引
  });
});
```

**テストを読むだけで仕様が理解できる**

---

## 4. 小さくやる（ステップ分割）

**大きな機能を小さなテストに分割:**

```
❌ 大きすぎる：
test('ユーザー登録フロー全体が動く')

✓ 適切：
test('メールアドレスが妥当性チェックされる')
test('パスワードが暗号化される')
test('ユーザーがDBに保存される')
test('確認メールが送信される')
```

**各テストは独立した単位で実装**

---

## 5. 重複と巨大関数の改善

**TDD で段階的に改善:**

```typescript
// 1. まずテストを書く
test('複数の数値の合計を計算', () => {
  expect(sum([1, 2, 3, 4, 5])).toBe(15);
});

// 2. 最小限の実装
function sum(nums) {
  let total = 0;
  for (let i = 0; i < nums.length; i++) {
    total += nums[i];
  }
  return total;
}

// 3. REFACTOR（テストはまだ GREEN）
function sum(nums) {
  return nums.reduce((acc, num) => acc + num, 0);
}

// 4. さらにテストを追加
test('空配列を処理', () => {
  expect(sum([])).toBe(0);
});

// テストが GREEN のまま、実装の品質が向上
```

---

## 6. テストに保護されたリファクタ PR

**安全なリファクタリング PR:**

```markdown
## Refactor: Simplify order calculation logic

テストで既存の挙動を保護した上で、
複雑なネスト構造を簡潔に改善

### 変更内容
- calculateOrderTotal 関数をシンプル化
- 仲介変数を削除
- テスト数：15 件、全て PASS

### テスト実行結果
$ npm test
Test Suites: 5 passed
Tests: 42 passed
```

**レビュアーの安心:** 「テストが全て通ってるなら大丈夫」

---

## 7. TDD のメリット

**品質向上:**
- バグが少ない（テストで検証済み）
- 仕様が明確（テストが仕様書）

**保守性:**
- 既存の挙動を保ちながらリファクタ可能
- 回帰テストで安全性を確保

**設計:**
- テストしやすい設計に自然と収束
- 関心の分離がしやすい

---

## 8. TDD のデメリットと対策

**学習コスト:**
- テスト記法の習熟が必要
- 対策：テンプレートを用意、ペアプログラミング

**時間がかかる（初期）:**
- 最初は遅く感じる
- 対策：バグ修正の時間が減り、結果的に高速化

---

## 9. AI生成コードへの適用

**AI が実装を生成する場合：**

```
プロンプト：
「calculateTax 関数を実装してください。
テスト：
  - 価格 100 円の場合、税金 10 円（10%）
  - 価格 1000 円の場合、税金 100 円（10%）
  - 価格 0 円の場合、税金 0 円
実装は上記テストを通すコード
」
```

**テストを先に提供することで、実装品質が向上**

---

## 10. 実装のポイント

- テストを先に書く習慣
- Red-Green-Refactor サイクルを繰り返す
- テストが GREEN を維持しながらリファクタ
- テストは要件定義書として機能
- CI でテスト実行を自動化
