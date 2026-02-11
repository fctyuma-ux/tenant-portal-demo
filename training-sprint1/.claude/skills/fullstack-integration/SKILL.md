---
name: fullstack-integration
description: フルスタック機能をTDD（テスト駆動開発）で一気通貫実装。型設計から Repository、Service、API、UI コンポーネントまで段階的に構築し、統合テストで検証する。
invocation: explicit-only
allowed-tools:
  - Read
  - Grep
  - Glob
  - Write
  - Edit
  - Bash
  - Task
---

# Fullstack 統合実装オーケストレーター（TDD版）

単一のスライス機能をフルスタックで実装する際の TDD ベースの一気通貫オーケストレーション。

型・スキーマ設計 → Data Access → Business Logic → API → UI → 統合テスト

## 実装フロー

```
Foundation Setup: 準備・機能確認
├── /foundation-setup
│   ├── 実装対象スライスを特定
│   ├── 関連ドキュメント読み込み
│   ├── 既存パターン確認
│   └── 前提条件チェック
         ↓
Phase 0: 型・スキーマ設計
├── /api-schema-designer
│   ├── ドメインモデル型
│   ├── API リクエスト/レスポンス型
│   └── Zod バリデーションスキーマ
         ↓
Phase 1: Data Access Layer
├── /repository-test-writer（テスト作成・RED）
└── /repository-implementer（実装・GREEN）
         ↓
Phase 2: Business Logic Layer
├── /service-test-writer（テスト作成・RED）
└── /service-implementer（実装・GREEN）
         ↓
Phase 3: API/Server Actions
├── /api-test-writer（テスト作成・RED）
└── /api-implementer（実装・GREEN）
         ↓
Phase 4: UI Components
├── /component-test-writer（テスト作成・RED）
└── /component-builder（実装・GREEN）
         ↓
Phase 5: 統合テスト・動作確認
└── /integration-checker（E2E テスト・動作確認）
```

## When to use

- `/fullstack-integration` を実行したとき
- 単一スライス機能をフルスタックで実装したいとき
- TDD サイクルを厳密に回したいとき

## Inputs（必ず確認するドキュメント）

- `docs/detail-plan.md` - 実装するスライス（機能）の定義
- `docs/requirements/requirements-v2/` - 最新の要件定義
- `docs/requirements/database/database-design.md` - データベーススキーマ
- `docs/requirements/api/api-design.md` - API 仕様
- `domain/models/` - 既存のドメインモデル（参考）
- `domain/repositories/` - リポジトリのインターフェース定義

## Outputs

実装されるファイル（スライス機能毎）：
- `domain/models/{feature}.ts` - ドメインモデル型
- `schemas/{feature}.ts` - Zod バリデーション
- `domain/repositories/{feature}-repository.ts` - Data Access
- `domain/services/{feature}-service.ts` - Business Logic
- `app/api/[endpoint]/route.ts` または `app/actions/{feature}.ts` - API/Server Actions
- `app/components/[feature]/` - UI コンポーネント群
- `__tests__/` 配下 - テストファイル群

## Procedure

## Step 0: 実装対象の確認

実装開始前に、以下をユーザーに確認してください：

**Question**: `docs/detail-plan.md` に記載されている内容の中で、今回のスライス実装で何を実装したいですか？

例えば：
- 「ユーザー認証機能」
- 「商品検索機能」
- 「支払い処理機能」

など

### このステップで行うこと：
1. ユーザーから実装対象スライスをヒアリング
2. `docs/detail-plan.md` の該当セクションを読み込む
3. 関連ドキュメントを確認：
   - `docs/requirements/requirements-v2/` - 要件定義
   - `docs/requirements/database/database-design.md` - DB スキーマ
   - `docs/requirements/api/api-design.md` - API 仕様
4. 既存実装パターン（`domain/models/`, `domain/repositories/`）を参照
5. 前提条件をチェック

**確認後**: ユーザーと実装内容を確認してから先に進む

---

## Step 1: Phase 0 - 型・スキーマ設計

型・スキーマ設計エージェント（`./.claude/agents/api-schema-designer`）を呼び出す：

```
/api-schema-designer
```

**出力**：
- `domain/models/{feature}.ts` - ドメインモデル型
- `schemas/{feature}.ts` - Zod バリデーション

## Step 2: Phase 1 - Data Access Layer（Repository）

TDD サイクルを実行：

1. テスト作成（`./.claude/agents/repository-test-writer`）
   ```
   /repository-test-writer
   ```

2. 実装（`./.claude/agents/repository-implementer`）
   ```
   /repository-implementer
   ```

3. テスト実行確認
   ```bash
   npm test -- domain/repositories
   ```

## Step 3: Phase 2 - Business Logic Layer（Service）

TDD サイクルを実行：

1. テスト作成（`./.claude/agents/service-test-writer`）
   ```
   /service-test-writer
   ```

2. 実装（`./.claude/agents/service-implementer`）
   ```
   /service-implementer
   ```

3. テスト実行確認
   ```bash
   npm test -- domain/services
   ```

## Step 4: Phase 3 - API/Server Actions

TDD サイクルを実行：

1. テスト作成（`./.claude/agents/api-test-writer`）
   ```
   /api-test-writer
   ```

2. 実装（`./.claude/agents/api-implementer`）
   ```
   /api-implementer
   ```

3. テスト実行確認
   ```bash
   npm test -- app/api
   npm test -- app/actions
   ```

## Step 5: Phase 4 - UI Components

TDD サイクルを実行：

1. テスト作成（`./.claude/agents/component-test-writer`）
   ```
   /component-test-writer
   ```

2. 実装（`./.claude/agents/component-builder`）
   ```
   /component-builder
   ```

3. テスト実行確認
   ```bash
   npm test -- app/components
   ```

## Step 6: Phase 5 - 統合テスト・動作確認

統合テスト・動作確認エージェント（`./.claude/agents/integration-checker`）を呼び出す：

```
/integration-checker
```

**確認項目**：
- E2E テスト実行
- ブラウザでの動作確認
- パフォーマンス確認
- アクセシビリティ確認

次は `/git-commit` を実行してコミットしてください。

## Subagent 一覧

| エージェント | 役割 | Phase |
|------------|------|-------|
| **api-schema-designer** | 型・スキーマ設計（models, schemas） | Phase 0 |
| **repository-test-writer** | Repository テスト作成（RED） | Phase 1 |
| **repository-implementer** | Repository 実装（GREEN） | Phase 1 |
| **service-test-writer** | Service テスト作成（RED） | Phase 2 |
| **service-implementer** | Service 実装（GREEN） | Phase 2 |
| **api-test-writer** | API/Server Actions テスト作成（RED） | Phase 3 |
| **api-implementer** | API/Server Actions 実装（GREEN） | Phase 3 |
| **component-test-writer** | UI コンポーネントテスト作成（RED） | Phase 4 |
| **component-builder** | UI コンポーネント実装（GREEN） | Phase 4 |
| **integration-checker** | E2E・統合テスト・動作確認 | Phase 5 |

## 重要なルール

### 1. TDD を守る（Red-Green-Refactor）

- 🔴 **RED**: テストを書く（失敗する）
- 🟢 **GREEN**: テストを通す実装を書く
- 🔵 **REFACTOR**: コード品質を改善

各フェーズ（Repository → Service → API → Component）でこのサイクルを守る。

### 2. 順序を守る

必ず Phase 0 → 1 → 2 → 3 → 4 → 5 の順序で実装。
下位層（Repository）が完成しないうちに上位層（Service）に進まない。

### 3. 3レイヤー分離を守る

- **Presentation Layer** (`app/`): UI/API
- **Business Logic Layer** (`domain/services/`): ビジネスルール
- **Data Access Layer** (`domain/repositories/`): DB操作

層間の依存関係を逆にしない。

### 4. テストなしで進まない

各フェーズでテストが全て GREEN になるまで進まない。

## 困ったときは

- **TDD について**: `.claude/rules/tdd-guide.md` を参照
- **3レイヤー について**: `.claude/rules/three-layer-architecture.md` を参照
- **VSA について**: `.claude/rules/vsa-guide.md` を参照

## 注意事項

- Subagent の出力を確認してから次フェーズに進む
- テストが失敗している場合は、実装を修正してテストを通す
- API 変更時は必ずクライアント側の型に反映する
- 型定義に変更がある場合は、関連するすべてのテストを確認する
- 不明点があればユーザーに確認する
