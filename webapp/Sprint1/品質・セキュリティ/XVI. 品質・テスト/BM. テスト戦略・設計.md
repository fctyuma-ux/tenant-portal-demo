# BM. テスト戦略・設計

## 概要

効果的なテスト計画と戦略について学びます。テストピラミッドの概念で適切なテスト層を設計し、テスト計画を策定し、カバレッジを管理することで、品質を保ちながら開発効率を高めます。

---

## テストピラミッドの理解

### ピラミッド構造と各層

テストは3つのレベルに分類されます：

```
        E2E       ← 少数・実行時間が長い・高コスト
       統合テスト  ← 適度な数・中程度の実行時間
      単体テスト  ← 多数・実行時間が短い・低コスト
```

**単体テスト（70%）**: 個別の関数・メソッドの動作検証。実行速度が速く、デバッグが容易。CI/CDパイプラインで毎回実行できます。

**統合テスト（20%）**: 複数コンポーネントやサービスの連携確認。実環境に近いシナリオをテスト。

**E2Eテスト（10%）**: ユーザー視点からアプリケーション全体の動作検証。実行時間が長いため、重要なシナリオに絞ります。

```javascript
// 単体テストの例
describe('sum function', () => {
  test('adds 2 + 2 to equal 4', () => {
    expect(sum(2, 2)).toBe(4);
  });
});

// 統合テストの例
describe('UserService', () => {
  test('creates and retrieves user', async () => {
    const user = await userService.createUser({ name: 'Alice' });
    const retrieved = await userService.getUserById(user.id);
    expect(retrieved).toEqual(user);
  });
});
```

---

## テスト計画の策定

### テスト戦略の定義

プロジェクト開始時に全体の方針を決定します：

- **テスト範囲**: 単体テスト（単一責任の関数）→ 統合テスト（複数コンポーネント）→ E2Eテスト（ユーザーフロー）
- **テスト環境**: 開発環境、ステージング環境、テストDB
- **実装順序**: 入力検証 → ビジネスロジック → データ永続化 → エンドツーエンドフロー

### リスク分析に基づく優先順位

金銭的・セキュリティ的リスクが高い機能（支払い、認証）から100%テストカバレッジで実装。中程度のリスク（レポート表示）は80%程度。低リスク（UI要素）は手動テスト重視。

---

## コードカバレッジの管理

### カバレッジメトリクスの種類

**ステートメントカバレッジ**: 実行された行の割合。全行数に対する実行行数の比率。

**ブランチカバレッジ**: 条件分岐のすべてのパスが実行されたか。if/else、switch文の全分岐を確認。

**関数カバレッジ**: 定義された関数が実行されたか。

**行カバレッジ**: 実行された行数。

### カバレッジ目標の設定

一般的な目標値：行カバレッジ85%以上、ブランチカバレッジ80%以上。新機能は100%目指す。Jest設定で自動チェックを実装。

---

## テスト駆動開発（TDD）の実践

### レッド・グリーン・リファクタサイクル

**RED**: 失敗するテストを先に書く
**GREEN**: テストを通すための最小限の実装
**REFACTOR**: コード品質を改善しながらテストは通したまま

```javascript
// RED: 失敗するテスト
test('multiply should multiply two numbers', () => {
  const calc = new Calculator();
  expect(calc.multiply(3, 4)).toBe(12);
});

// GREEN: 最小限の実装
class Calculator {
  multiply(a, b) { return a * b; }
}

// REFACTOR: 入力検証を追加
class Calculator {
  multiply(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('Arguments must be numbers');
    }
    return a * b;
  }
}
```

---

## テスト設計のベストプラクティス

### テストの命名規則と構造

「何をテストし、どのような状況で、何を期待するか」を明記。Arrange（準備）→ Act（実行）→ Assert（検証）の流れで構成。

良い例：「should return success status when payment amount is valid」
悪い例：「test payment」

