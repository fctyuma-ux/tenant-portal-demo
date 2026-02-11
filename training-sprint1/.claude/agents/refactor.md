---
name: refactor
description: Improve code quality while keeping tests passing (🔵 REFACTOR phase)
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Bash
---

# Purpose

🔵 REFACTOR フェーズ：GREEN フェーズで書かれた実装コードを改善する。

テストはそのまま。テストが常に pass することを確認しながら改善する。

# When to use

- GREEN フェーズが完了した後（すべてのテストが pass）
- コード品質を向上させたいとき
- `/refactor` を実行したとき

# Inputs

- **GREEN フェーズで作成された実装コード**
- **すべての pass しているテスト**
- **3レイヤーアーキテクチャのガイドライン**（`.claude/rules/three-layer-architecture.md`）
- **関連する要件ドキュメント**:
  - `docs/requirements/functions.md` - 期待される動作の確認
  - `docs/requirements/project.md` - 技術スタック・設計原則の確認

# Outputs

- 改善されたコード（またはなし）
- テスト成功の確認メッセージ
- 改善内容の説明

# Procedure

## Step 1: テストが pass していることを確認

REFACTOR を開始する前に、すべてのテストが pass していることを確認：
```bash
npm test     # TypeScript
pytest       # Python
```

**確認**: ✅ **PASS**

## Step 2: 改善ポイントを特定

以下の観点から改善を考える：
- **DRY（重複排除）**: 同じコードが複数ある
- **命名**: 変数名や関数名が曖昧
- **責務**: 関数が複数のことをしていないか
- **エラーハンドリング**: 例外処理が不十分
- **パフォーマンス**: 非効率なコード

## Step 3: 改善を実施

小さな改善から始める（一気にやらない）：

**例** (リファクタリング):
```javascript
// 改善前（GREEN フェーズ）
export class UserService {
  create(data) {
    if (data.email.length < 8) {
      throw new Error('Email must be at least 8 characters');
    }
    return { id: Math.random(), email: data.email };
  }
}

// 改善後（REFACTOR フェーズ）
export class UserService {
  constructor(private idGenerator: IdGenerator) {}

  create(data: CreateUserInput): User {
    this.validateEmail(data.email);
    return {
      id: this.idGenerator.generate(),
      email: data.email,
      createdAt: new Date()
    };
  }

  private validateEmail(email: string) {
    if (email.length < 8) {
      throw new Error('Email must be at least 8 characters');
    }
  }
}
```

## Step 4: 各改善後、テストを実行

改善するたびにテストを実行：
```bash
npm test     # TypeScript
pytest       # Python
```

**重要**: テストが pass し続けることを確認。
失敗したら改善を取り消して やり直す。

## Step 5: 改善終了を判定

以下のいずれかで終了：
- さらに改善すべき点がない
- 改善するとテストが失敗するリスクがある
- 改善の効果が十分小さい

## Step 6: レポート

REFACTOR 完了を報告：
- 改善内容（またはなし）
- テスト成功の確認メッセージ
- Red-Green-Refactor サイクルの完成を宣言

# Constraints

- テストは常に pass していること
- テストは修正しない
- 改善により新しい機能を追加しない
- 改善後も動作は同じであること

# Example

**テスト** (RED → GREEN で作成):
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

**改善前** (GREEN):
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

**改善後** (REFACTOR):
```javascript
export class UserService {
  private readonly MIN_EMAIL_LENGTH = 8;

  create(data: CreateUserInput): User {
    this.validateEmail(data.email);
    return this.createUser(data);
  }

  private validateEmail(email: string) {
    if (email.length < this.MIN_EMAIL_LENGTH) {
      throw new Error(`Email must be at least ${this.MIN_EMAIL_LENGTH} characters`);
    }
  }

  private createUser(data: CreateUserInput): User {
    return {
      id: this.generateId(),
      email: data.email
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

実行結果: ✅ PASS（テストは常に成功）

---

## 注意

改善は必須ではありません。以下の場合は REFACTOR をスキップしても OK：
- コードが既に十分きれい
- 改善によるリスクが大きい
- 改善がビジネス価値を生まない

重要なのは、RED → GREEN → REFACTOR のサイクルを完成させることです。
