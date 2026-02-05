# V. 振る舞い駆動開発（BDD）

## 概要

振る舞い駆動開発（BDD）はユーザーの要求を「仕様」として捉え、その仕様に対するテストを自動化します。Outside-In アプローチにより、外から中へ段階的に実装を進め、要件と実装がズレない開発を実現します。

---

## 1. 受け入れテスト（Acceptance Test）

**役割:** 仕様の最終確認。テストそのものが「仕様」

```gherkin
機能: 商品購入
  シナリオ: 在庫がある商品を購入できる
    前提条件: 商品Aが100個在庫
    もし ユーザーが商品Aを5個購入する
    ならば 注文が確定される
    そして 在庫が95個に減る
```

**Gherkin フォーマット:** Given (前提) / When (実行) / Then (検証)

**メリット：** 非技術者も理解可能、テスト = 仕様書、要件ズレ検出

---

## 2. Flaky テスト（不安定なテスト）

同じテストが時々失敗、時々成功

```typescript
// 問題：API応答を await しない
test('メッセージが表示', async () => {
  fetchData();
  const text = document.querySelector('.message').textContent;
  expect(text).toBe('成功');
});
```

**原因：** タイミング、環境差異、依存

**回避：**
```typescript
// 改善：async/await で完了を待つ
test('メッセージが表示', async () => {
  const data = await fetchData();
  expect(data.message).toBe('成功');
});
```

---

## 3. テストデータと環境分離

**問題:** テスト同士がデータを汚染

```typescript
// 悪い：本番DBを操作
beforeEach(() => {
  database = getRealDatabase();
  database.users.delete({});
});
```

**改善:** テスト用DBを分離

```typescript
beforeEach(() => {
  database = getTestDatabase();
});

afterEach(() => {
  database.clear();
});

test('ユーザーが存在', () => {
  database.users.create({ name: 'Alice' });
  expect(database.users.count()).toBe(1);  // 安定
});
```

---

## 4. Outside-In アプローチ

外から中へ段階的に実装

```
1. ユーザーストーリーを受け入れテストで記述
   ↓
2. テスト実行（失敗）
   ↓
3. ユニットテスト書く
   ↓
4. 機能実装
   ↓
5. 受け入れテスト成功
```

**メリット：** 要件から実装へ、一貫した流れ

---

## 5. テストの重複と穴

**重複：** 同じ動作を複数層でテスト

```
E2E:    「商品購入全体」
統合:   「OrderService + Repository」
ユニット: 「calculatePrice()」
        ← 同じロジックが3回
```

**穴：** 統合時に失敗する（個別テストは成功）

**バランス：**
- ユニット：コア計算ロジック
- 統合：リポジトリ + サービス連携
- E2E：全体ユースケース（1～2個）

---

## 6. 協調的開発（仕様合意 → 実装）

チーム（PO + Dev + QA）で要件を Gherkin 記述

```
1. 仕様を Gherkin で記述
   ↓
2. テストコード化
   ↓
3. テスト失敗 → 実装
   ↓
4. テスト成功で完了
```

**メリット：** 要件の曖昧さ削減、開発中に誤解気づく

---

## 7. BDD ツール

| ツール | 言語 | フォーマット |
|---|---|---|
| **Cucumber** | Ruby/Java/Python | Gherkin |
| **Jest** | JavaScript | describe/it |
| **Playwright** | JavaScript | コード |
| **Cypress** | JavaScript | コード |

---

## 8. 実践スキル

- Gherkin で仕様記述
- Cucumber で自動化
- Flaky 原因調査・修正
- Outside-In で完全実装

