# U. テスト駆動開発（TDD）

## 概要

テスト駆動開発（TDD）は「テストを先に書く」方法論です。しかし盲目的なテスト化は害になります。価値と効率のバランスを取り、適切なテスト戦略を判断することが実践的な TDD です。

---

## 1. TDD の基本サイクル：Red → Green → Refactor

```
1. Red:      テスト失敗（当然失敗）
2. Green:    最小実装で成功
3. Refactor: コード改善
4. 繰り返し
```

---

## 2. Over-testing（価値 < コスト）

自明なコードまでテストするのは効率悪化

```typescript
// 価値なし
test('1 + 1 = 2', () => expect(1 + 1).toBe(2));

// 重要：ビジネスロジック
test('割引計算', () => {
  expect(calculateDiscount(100, 0.2)).toBe(80);
});
```

**テストすべき：** ビジネスロジック、エッジケース、統合点

**テスト不要：** ライブラリ機能、自明なコード

---

## 3. 脆いテスト（実装依存）

実装が少し変わるだけで失敗

```typescript
// 弱い：実装に依存
test('userの構造', () => {
  const user = createUser('Alice');
  expect(user.firstName).toBe('Alice');  // fieldが変わると失敗
});

// 強い：動作を検証
test('ユーザー名取得', () => {
  const user = createUser('Alice');
  expect(user.getName()).toBe('Alice');  // 実装変更でも動作同じなら成功
});
```

**脆さの原因：** private メソッドテスト、UI構造確認、実装詳細

---

## 4. テスト容易性と設計のトレードオフ

```typescript
// テスト容易：依存注入
class UserService {
  constructor(private repo: UserRepository) {}
}

// vs

// シンプル：依存固定
class UserService {
  getUser(id) { return UserRepository.findById(id); }
}
```

**判断基準：** テスト必要性 > 実装複雑性なら依存注入

---

## 5. 適用範囲の判断

**テスト戦略ピラミッド：**

```
       E2E         少ない
      統合
     ユニット     多い
```

| 層 | 対象 | 優先度 |
|---|---|---|
| ユニット | 関数・クラス単体 | ビジネス価値高い処理 |
| 統合 | 複数モジュール | 変更頻度高い |
| E2E | 全ユースケース | 1～2個の重要フロー |

---

## 6. 実装の工夫

```typescript
// 悪い：全依存が内部
class OrderService {
  private repo = new OrderRepository();  // 固定

  async createOrder(items) {
    // repo を差し替え不可 → テスト困難
  }
}

// 良い：依存を注入
class OrderService {
  constructor(repo: OrderRepository, inventory: InventoryService) {
    this.repo = repo;
    this.inventory = inventory;
  }
}

// テスト
const mockRepo = { save: () => Promise.resolve() };
const service = new OrderService(mockRepo, mockInventory);
```

---

## 7. 実践スキル

- テスト戦略を言語化
- 脆いテスト検出・修正
- 依存注入でテスト可能設計
- コスト/価値分析

