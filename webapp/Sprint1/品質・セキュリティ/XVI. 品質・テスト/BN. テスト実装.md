# BN. テスト実装

## 概要

具体的なテスト実装技術を学びます。ユニットテストの書き方、モック・スタブ・スパイの使い分け、アサーション、非同期処理のテスト、テストの独立性確保などにより、品質の高いテストスイートを構築します。

---

## ユニットテストの基礎

### テストフレームワークの選択

JavaScriptでは複数のフレームワークが存在します。Jest（Facebook製）は設定が少なく、統合機能が豊富で広く使われています。各テストは describe / test / beforeEach / afterEach で構成。

### テスト対象の関数設計

依存関係を明示的にすることが重要です。外部API呼び出しやデータベースアクセスは関数の引数として注入するDI（Dependency Injection）パターンを採用。モック化しやすくなります。

```javascript
// ✗ テストしにくい設計
async function fetchAndProcessUser(userId) {
  const response = await fetch(`/api/users/${userId}`);
  localStorage.setItem('currentUser', JSON.stringify(response));
}

// ✓ テストしやすい設計（依存性注入）
async function fetchAndProcessUser(userId, fetchFn, storage) {
  const response = await fetchFn(`/api/users/${userId}`);
  storage.setItem('currentUser', JSON.stringify(response));
}

// テスト時には mock を注入
test('fetchAndProcessUser stores user data', async () => {
  const mockFetch = jest.fn().mockResolvedValue(
    { json: () => ({ id: 1, name: 'Alice' }) }
  );
  const mockStorage = { setItem: jest.fn() };

  await fetchAndProcessUser(1, mockFetch, mockStorage);
  expect(mockStorage.setItem).toHaveBeenCalled();
});
```

---

## モック・スタブ・スパイの使い分け

### モック（Mock）

外部サービスをシミュレートし、テスト対象のコード動作を検証。支払い処理などで外部のペイメントゲートウェイを置き換える際に使用。期待値と実際の呼び出しを比較。

### スタブ（Stub）

最小限の実装で決まった値のみ返す簡易オブジェクト。データベースのリポジトリを置き換える際に、常に同じテストデータを返すよう実装。値の検証に焦点。

### スパイ（Spy）

元の実装を保ちつつ、呼び出しを監視したい場合に使用。例えば、メール送信サービスの実装は保持しながら、正しいパラメータで呼ばれたかを確認。

---

## アサーション（Assertion）による結果検証

### 基本的なアサーション

期待値と実際の値を比較するマッチャーメソッド：

- `toBe()`: 厳密等価（===）
- `toEqual()`: 値の等価性（オブジェクト比較用）
- `toContain()`: 配列・文字列に要素が含まれるか
- `toThrow()`: エラーが発生するか
- `toMatch()`: 正規表現にマッチするか

### エラーハンドリングのテスト

エラーが発生することを期待、または発生しないことを期待するテスト。例外が正しいメッセージで発生しているか、特定のエラータイプか確認。

---

## 非同期処理のテスト

### Promise のテスト

fetch呼び出しなどPromiseを返す場合、テストから`return`してPromiseの解決を待機。または`resolves`/`rejects`マッチャーで期待値を指定。

### async/await でのテスト

テスト関数を`async`にして、`await`で非同期処理の完了を待ち、その後アサーションを実行。try-catchでエラーハンドリングのテストも可能。

```javascript
test('should fetch user using async/await', async () => {
  const service = new DataService();
  const user = await service.fetchUser(1);
  expect(user.id).toBe(1);
});

test('should handle errors in async/await', async () => {
  const service = new DataService();
  try {
    await service.fetchUser(-1);
    fail('Should have thrown');
  } catch (error) {
    expect(error.message).toContain('User not found');
  }
});
```

---

## テスト実装のベストプラクティス

### テストの独立性と再現性

各テストが独立して実行できることが重要。グローバル変数への依存やテスト実行順序への依存を避ける。beforeEach で各テスト前に状態を初期化。

### テストのカテゴリ化と優先度

重要なテストのみを`test.only`で実行、修正中のテストは`test.skip`で一時的にスキップ。本番環境に直結するテストから優先実行。

---

## テスト実装の効率化

### テストデータファクトリーの活用

ユーザー、注文などのテストデータを生成する工場パターン。`createUser()`メソッドで基本データ、カスタマイズしたデータを効率的に生成。繰り返しテストデータ設定の手間を削減。
