# Training Sprint {SPRINT_NUMBER} - AI駆動開発ガイド

研修生が実装を進めるための Claude Code 設定です。

## 役割

あなたは、このスプリントの実装を支援する AI 開発パートナーです。
研修生と一緒に、**Vertical Slice Architecture（VSA）** に基づいた計画を立て、
**3レイヤードアーキテクチャ** で実装を進めます。

## アーキテクチャ方針

### Vertical Slice Architecture（VSA）
- 機能を**縦スライス**として分割
- 各スライスは、UI → ビジネスロジック → DB まで一貫した機能を含む
- 複数スライスを**段階的に**実装することで、早期に動作確認が可能

### 3レイヤードアーキテクチャ
```
┌─────────────────────────────────────┐
│  Presentation Layer (UI/API)        │
│  - React Components / Next.js Pages  │
│  - API Routes / Controllers          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Business Logic Layer               │
│  - ドメインロジック                  │
│  - ビジネスルール                    │
│  - サービス・ユースケース            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Data Access Layer (Repository)     │
│  - データベースアクセス               │
│  - クエリ構築                        │
│  - ORM・ドライバー操作               │
└─────────────────────────────────────┘
```

## 実装計画策定

### 初回実行時（`detail-plan.md` が未作成）

1. 要件ドキュメントを確認（Source of Truth セクション参照）
   - `docs/requirements/functions.md` で機能スコープを確認
   - `docs/requirements/ui.md` で画面構成を理解
   - `docs/requirements/data.md` でデータ構造を確認

2. `/planner` コマンドでプランナーエージェントを呼び出す
   - VSA（Vertical Slice Architecture）で機能を縦スライスに分割
   - `docs/detail-plan.md` を生成

### 2回目以降

- `docs/detail-plan.md` を参照して実装を進める
- 計画の追加・修正があれば `/planner` を再度呼び出す

## Source of Truth

以下のドキュメントがプロジェクト仕様の正とします。実装フェーズでは常に参照：

| ドキュメント | 用途 |
|------------|------|
| `docs/requirements/journey.md` | ユーザージャーニー（背景・コンテキスト） |
| `docs/requirements/project.md` | プロジェクト概要・技術スタック・設計原則 |
| `docs/requirements/functions.md` | 機能一覧（実装スコープの確認） |
| `docs/requirements/ui.md` | 画面仕様（Presentation層の実装基準） |
| `docs/requirements/data.md` | データ仕様（Data Access層の実装基準） |
| `docs/requirements/api.md` | 外部インターフェース（API実装の基準） |
| `docs/detail-plan.md` | VSA実装計画（スライス分割と実装順序） |

**重要**: 実装前に必ず関連ドキュメントを確認してください。

## 開発時の核となる原則

### 1. 3レイヤードアーキテクチャの遵守
全ての実装は以下の3層に厳密に分離：
- **Presentation Layer**: UI/API コントローラー
- **Business Logic Layer**: ドメインロジック・ビジネスルール
- **Data Access Layer**: DB操作・Repository パターン

層間の依存関係を逆にしない。下位層へのアクセスのみを許可。

### 2. TDD（テスト駆動開発）の厳密実施
**Red-Green-Refactor サイクルを必ず順守**：
**新機能追加時は必ず `/tdd-integration` を実行してください。**

## 開発時のチェックリスト

- [ ] `detail-plan.md` を確認してから実装を開始
- [ ] 各スライスの依存関係を把握している
- [ ] **3レイヤーの責務分離を意識している**（`.claude/rules/three-layer-architecture.md`）
- [ ] **新機能は必ず `/tdd-integration` を実行**（`.claude/rules/tdd-guide.md`）
- [ ] **テストなしでは実装しない**

## 困ったときは

- **VSA について**: `.claude/rules/vsa-guide.md` を参照
- **3レイヤー について**: `.claude/rules/three-layer-architecture.md` を参照
- **TDD について**: `.claude/rules/tdd-guide.md` を参照
- **計画の修正**: `/planner` を実行

## エージェント一覧

| エージェント | 役割 |
|------------|------|
| **planner** | VSA 実装計画策定、`detail-plan.md` 生成 |
| **test-writer** | 🔴 RED：失敗するテストを書く |
| **implementer** | 🟢 GREEN：テストを通す実装を書く |
| **refactor** | 🔵 REFACTOR：コード品質を改善 |
