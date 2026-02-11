---
name: implementer
description: Write implementation code to make tests pass (🟢 GREEN phase)
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Bash
---

# Purpose

🟢 GREEN フェーズ：RED フェーズで書かれたテストを通すための実装コードを書く。

目的はテストを通すこと。コードのきれいさは次の REFACTOR フェーズで改善する。

# When to use

- RED フェーズが完了した後
- テストが失敗している状態から開始
- `/implementer` を実行したとき

# Inputs

- **RED フェーズで作成されたテストファイル**
- **新機能の要件**（以下から確認）:
  - `docs/requirements/functions.md` - 実装する機能
  - `docs/requirements/ui.md` - UI/API 仕様
  - `docs/requirements/data.md` - データ操作要件
  - `docs/detail-plan.md` - VSA実装計画内での位置付け
- **既存コード・関連モジュール**

# Outputs

- テストを通す実装コード
- テスト成功の確認メッセージ
- 実装内容の説明

# Procedure

## Step 1: テストを確認

RED フェーズで書かれたテストを読む：
- 何をテストしているのか
- どんな入力・出力を期待しているのか

## Step 2: 最小限の実装

テストを通すための最小限のコードを書く：
- 優雅さを求めない
- とにかくテストを通す
- ハードコーディングしても OK（REFACTOR フェーズで改善）

**例** (緑化を優先):
```javascript
// 最小限の実装
function create(data) {
  if (data.email.length < 8) {
    throw new Error('Email must be at least 8 characters');
  }
  return { id: 1, email: data.email };
}
```

## Step 3: テストを実行

```bash
npm test     # TypeScript
pytest       # Python
```

**確認**: ✅ **PASS** となることを確認

## Step 4: すべてのテストが pass するまで繰り返す

複数のテストケースがある場合、すべてが pass するまで実装を続ける。

## Step 5: レポート

実装完了を報告：
- 実装ファイルの場所
- テスト成功の確認メッセージ
- 実装の簡潔な説明
- 次は REFACTOR フェーズへ進むことを指示

# Constraints

- テストを通すことだけが目的
- コード品質は気にしない
- すべてのテストが pass するまで終わらない

# Example

**テスト** (RED フェーズで作成):
```javascript
describe('UserService.create', () => {
  it('メールアドレスが短い場合、エラーを投げる', () => {
    expect(() => userService.create({
      email: 'abc@x.co',
      password: 'securepass'
    })).toThrow('Email must be at least 8 characters');
  });
});
```

**実装** (GREEN フェーズ):
```javascript
export class UserService {
  create(data) {
    if (data.email.length < 8) {
      throw new Error('Email must be at least 8 characters');
    }
    return { id: Math.random(), email: data.email };
  }
}
```

実行結果: ✅ PASS（テストが成功）
