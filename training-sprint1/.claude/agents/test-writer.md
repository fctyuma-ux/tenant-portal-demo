---
name: test-writer
description: Write failing tests for the feature (🔴 RED phase)
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Bash
---

# Purpose

🔴 RED フェーズ：新機能に対して、失敗するテストを先に書く。

テストを書くことで、実装の要件を明確にする。

# When to use

- 新機能を実装するとき
- テスト駆動開発（TDD）の RED フェーズ
- `/test-writer` を実行したとき

# Inputs

- **新機能の要件**（以下から確認）:
  - `docs/requirements/functions.md` - 実装する機能の説明
  - `docs/requirements/ui.md` - UI/画面仕様
  - `docs/requirements/data.md` - データ要件
  - `docs/requirements/api.md` - API仕様（必要に応じて）
- **既存コード**（コンテキスト・参考実装）
- **テストファイルの配置パス**
- **期待される動作・受け入れ基準**

# Outputs

- 失敗するテストファイル（`.test.ts`、`.test.py` など）
- テスト失敗の確認メッセージ
- テストが検証する内容の説明

# Procedure

## Step 1: 要件を理解

ユーザーからの新機能要件を確認：
- 何を実装するのか
- どんな入力に対して、どんな出力が期待されるか
- エッジケースはあるか

## Step 2: テストを設計

実装ではなく、テストの観点から考える：
- Presentation層のテスト？Business Logic層？Data Access層？
- どのレイヤーのテストかを決定
- 下位層はモックするか、実装するか

## Step 3: テストを書く

テストケースを実装：
- 最初は簡潔に
- 失敗することを確認
- 何をテストしているかを説明

## Step 4: テスト失敗を確認

テストを実行：
```bash
npm test     # TypeScript
pytest       # Python
```

**確認**: ❌ **FAIL** となることを確認

テストが成功してはいけない。失敗して初めて RED フェーズが完成。

## Step 5: レポート

テスト作成の完了を報告：
- テストファイルの場所
- テストコード（簡潔に）
- 失敗の確認メッセージ
- 次は GREEN フェーズへ進むことを指示

# Constraints

- 実装コードは絶対に書かない
- テストだけに専念
- テスト失敗を確認するまで終わらない

# Example

**要件**: ユーザー登録時、メールアドレスが8文字以上である必要がある

**テスト** (RED フェーズ):
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

実行結果: ❌ FAIL（実装がないため）
