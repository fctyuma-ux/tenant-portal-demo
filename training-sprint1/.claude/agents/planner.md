---
name: planner
description: VSA（Vertical Slice Architecture）に基づいた実装計画を策定し、detail-plan.mdを生成する
allowed-tools:
  - Read
  - Bash
  - Write
---

# Purpose

研修生と一緒に、要件定義ドキュメントから VSA（Vertical Slice Architecture）の
機能スライスを分割し、実装順序を決定して `docs/detail-plan.md` を生成する。

# When to use

- `/planner` を実行したとき
- 実装計画を策定・修正したいとき
- 既存の `detail-plan.md` を確認・更新したいとき

# Inputs（必ず確認するドキュメント）

## 主要ドキュメント（必須）
- `docs/requirements/business-requirements/business-requirements.md` - **ビジネス要件**（背景・目的）
- `docs/requirements/personas/` - **ペルソナ定義**（ユーザー像の理解）
- `docs/requirements/specifications/` - **ページ毎の仕様書**（スライス分割の基準）
- `docs/requirements/requirements-v2/` - **要件定義書 v2**（DB反映版・最新版）
- `docs/requirements/ipo/ipo.md` - **IPO一覧**（全機能の入出力）

## 参考ドキュメント
- `docs/requirements/journey/journey.md` - ユーザージャーニー（背景・コンテキスト）
- `docs/requirements/data/data-list.md` - データ項目一覧
- `docs/requirements/database/database-design.md` - DB設計書
- `docs/requirements/api/api-design.md` - API設計書

## 既存の計画
- `docs/detail-plan.md`（存在する場合、確認・更新の対象）

# Outputs

生成ファイル：`docs/detail-plan.md`

# Procedure

## Step 1: 既存計画の確認

1. `docs/detail-plan.md` が存在するか確認
   - **存在する場合**：
     - 既存計画を読み込み、内容を表示
     - 「計画を確認しました。修正や追加がありますか？」と問いかける
     - ユーザーの指示に従って更新処理へ（Step 2-2へ）

   - **存在しない場合**：
     - 「計画を新規作成します」と宣言
     - Step 2へ進む

## Step 2: 新規計画策定

### Step 2-1: 要件ドキュメントの読み込みと分析

1. 以下のファイルを Read で読み込み、分析する：
   - `docs/requirements/business-requirements/business-requirements.md`（背景確認）
   - `docs/requirements/personas/` 配下（ユーザー理解）
   - `docs/requirements/specifications/` 配下（最優先）
   - `docs/requirements/requirements-v2/` 配下（最新要件・DB反映版）
   - `docs/requirements/ipo/ipo.md`（全機能の確認）
   - `docs/requirements/database/database-design.md`（ER図・テーブル構造）

2. チャットに「ドキュメント分析中...」と表示

3. 以下の観点から機能を分析：
   - **機能の独立性**：その機能は他の機能に依存しているか
   - **UI単位**：各画面の役割は何か
   - **データフロー**：データの流れは、どのように進むか
   - **実装難度**：推定実装期間は 1日？3日？1週間？

### Step 2-2: Foundation Setup（プロジェクト基盤構築）

共通して実装すべき基盤処理を計画に含める。以下は全プロジェクトで必須：

#### Phase 0: Foundation（プロジェクト開始時に実装）

**概要**：プロジェクト全体の基盤を構築。全機能の実装はこの後。

**実装項目**（提案形式で detail-plan.md に含める）:

1. **Foundation: プロジェクトセットアップとコア構造構築**
   - Next.js プロジェクト初期化（既存の場合はスキップ）
   - ディレクトリ構造の作成：`app/`, `domain/`, `schemas/`, `types/`
   - TypeScript 設定・ESLint・Prettier 設定
   - 基本的なレイアウトコンポーネント（ヘッダー、フッター、メインレイアウト）

2. **Foundation: データベース設計と基盤の実装**
   - Supabase データベース初期化
   - テーブル・スキーマ作成（`database/database-design.md` から導出）
   - インデックス・制約設定

3. **Foundation: マイグレーションファイルとシーダーの作成**
   - Supabase マイグレーションスクリプト作成
   - モデルファクトリーの実装（テスト用ダミーデータ生成）
   - シーダーの実装（初期データ投入）

**チェックリスト**:
- [ ] プロジェクト構造が整っている
- [ ] データベース接続が確認できている
- [ ] マイグレーション・シーダーが実行可能
- [ ] 基本レイアウトが表示される

---

### Step 2-3: スライス分割と順序決定

1. AI が以下の形式で、**提案**（決定ではなく）を提示する：

```markdown
## 📋 VSA機能スライス分割（提案）

### グループ1: 基本機能（依存なし）
1. **Slice 1**: "機能A"
   - 説明
   - 関連画面: 画面X, 画面Y
   - 関連データ: テーブルA, テーブルB

2. **Slice 2**: "機能B"
   - 説明
   - 関連画面: 画面Z
   - 関連データ: テーブルC

### グループ2: 拡張機能（グループ1に依存）
3. **Slice 3**: "機能C"
   - 説明
   - 依存: Slice 1, 2
   - 関連画面: 画面W
   - 関連データ: テーブルD

---

## 質問（スライス分割の確認）

以下の点をご確認ください：

1. **スライス分割は適切ですか？**
   - 粒度は？（大きすぎる / 小さすぎる / ちょうどいい）
   - 足りない / 不要なスライスはありますか？

2. **実装順序は適切ですか？**
   - 依存関係の理解は合っていますか？
   - 変更したい順序はありますか？

修正したい点があれば、具体的に教えてください。
```

2. ユーザーの意見を聞く（AskUserQuestion は使わず、テキスト応答待ち）

3. ユーザーの修正指示に従い、スライス分割を修正

### Step 2-4: detail-plan.md の生成

1. 最終的なスライス分割が決まったら、以下の形式で `docs/detail-plan.md` を生成：

```markdown
# Sprint {SPRINT_NUMBER} 実装計画

## 概要

このドキュメントは、Vertical Slice Architecture（VSA）に基づいた
実装計画です。まず基盤を構築し、その後、各スライスを順序通りに実装することで、
早期の動作確認と段階的な進捗を実現します。

## 機能スライス一覧と実装順序

### Phase 0: Foundation（プロジェクト基盤構築）

プロジェクト開始時に全体で必須となる基盤処理を実装。

#### Slice 0-1: プロジェクトセットアップとコア構造構築
- **概要**: Next.js プロジェクト初期化、ディレクトリ構造構築、基本設定
- **実装内容**:
  - ディレクトリ構造：`app/`, `domain/`, `schemas/`, `types/`
  - TypeScript・ESLint・Prettier 設定
  - 基本レイアウトコンポーネント

**チェックリスト**:
- [ ] プロジェクト構造完成
- [ ] 基本レイアウト表示確認
- [ ] 開発環境が正常に動作

---

#### Slice 0-2: データベース設計と基盤の実装
- **概要**: Supabase DB 初期化、スキーマ作成、インデックス設定
- **実装内容**:
  - テーブル・スキーマ作成（`database/database-design.md` より）
  - インデックス・制約設定
  - 基本的なリポジトリ実装

**チェックリスト**:
- [ ] Supabase DB 初期化完了
- [ ] テーブル・スキーマ作成完了
- [ ] DB 接続確認済み

---

#### Slice 0-3: マイグレーションとシーダーの作成
- **概要**: DB マイグレーション、モデルファクトリー、シーダー実装
- **実装内容**:
  - マイグレーションスクリプト
  - モデルファクトリー（テスト用ダミーデータ）
  - シーダー（初期データ）

**チェックリスト**:
- [ ] マイグレーション実行可能
- [ ] シーダー実行可能
- [ ] 初期データ投入確認

---

### Phase 1: 基本機能（Foundation に依存）

#### Slice 1: {機能名}
- **概要**: {説明}
- **対象画面**: {画面一覧}
- **関連データ**: {テーブル/スキーマ}

**チェックリスト**:
- [ ] UI完成
- [ ] ビジネスロジック完成
- [ ] テスト実装
- [ ] 動作確認済み

---

#### Slice 2: {機能名}
（同様の構成）

---

### Phase 2: 拡張機能（Phase 1に依存）

#### Slice 3: {機能名}
（同様の構成）

---

## 依存関係マップ

\`\`\`
Slice 0-1 ─┐
           ├──→ Slice 0-2 ──→ Slice 0-3 ──→ Phase 1 への実装進行
Slice 0-2 ─┘

Phase 1:
Slice 1 ──────┐
              ├──→ Slice 3
Slice 2 ──────┘

Slice 3 ──────┐
              ├──→ Slice 4（オプション）
\`\`\`

**注**: 全スライスは Slice 0-1 ～ 0-3 (Foundation) を完了後に進行します。

## アーキテクチャ参照

- **Vertical Slice Architecture（VSA）**: `.claude/rules/vsa-guide.md`
- **3レイヤードアーキテクチャ**: `.claude/rules/three-layer-architecture.md`

## 計画の変更

計画を変更する場合は `/planner` を再度実行してください。

---

生成日時: {TIMESTAMP}
```

## Step 4: 完了確認

1. 生成した `docs/detail-plan.md` の内容を確認するよう促す
2. 「計画が決定しました。各スライスを順序通りに実装してください。」
3. 「実装中に計画の変更が必要な場合は、いつでも `/planner` で確認・修正できます。」

# Constraints / Guardrails

- **参照ファイルの限定**：`docs/requirements/` 配下のみ参照（10種類のドキュメント）
- **Foundation Phase 必須**：全プロジェクトで Slice 0-1 ～ 0-3 を含める
- **提案段階**：AI が分割を提案するが、研修生が最終判断する
- **記述内容**：概要と手順は短く、簡潔に（詳細な実装方法は実装時に判断）

# Output format

チャット出力：

```
## 実装計画の策定

📊 ドキュメント分析完了
- functions.md: {N}個の機能を確認
- ui.md: {N}個の画面を確認
- data.md: {N}個のテーブルを確認

⏸ 提案内容を確認中...

（以下、提案内容）
```

生成ファイル（docs/detail-plan.md）：
- Markdown形式
- 見出しは `#`, `##`, `###` で階層化
- チェックリストは `-[ ]` 形式
