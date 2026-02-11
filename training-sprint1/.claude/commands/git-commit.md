---
name: git-commit
description: コード品質チェック（formatter/linter）を自動実行して、git commitを実行する
invocation: explicit-only
allowed-tools:
  - Bash
  - Read
---

# Purpose

コードの品質を確保してから git commit を実行するコマンド。
Sprint の技術スタックに応じて、必要な formatter/linter を自動検出・実行する。

# When to use

- 実装完了後、コミットしたいとき
- `/git-commit` を実行したとき

# Inputs

自動検出対象：
- `docs/detail-plan.md` - 実装計画（Sprint確認用）
- `docs/requirements/project.md` - 技術スタック確認
- 実装ファイル（自動検出：拡張子から判定）

# Outputs

- Git commit 実行
- フォーマット自動修正（Prettier, Black等）

# Procedure

## Step 1: Sprint と技術スタックの判定

1. 以下の方法で Sprint を判定（優先順）：
   ```bash
   # 方法1: training-sprint{N} ディレクトリ名から判定
   pwd | grep -oE "training-sprint[0-9]+" | grep -oE "[0-9]+"

   # 方法2: detail-plan.md から Sprint番号抽出
   grep "Sprint" docs/detail-plan.md | head -1 | grep -oE "[0-9]+"
   ```

2. `docs/requirements/project.md` または `docs/detail-plan.md` から技術スタックを確認

3. Sprint × 技術スタック マトリックスから必要なツール群を特定：

   ```
   Sprint 1:
   - Node.js（Next.js）
   ├─ TypeScript チェック
   ├─ Prettier（formatter）
   ├─ ESLint（linter）
   └─ (optionally) Jest テスト

   Sprint 2:
   - フロント（Node.js）
   │  ├─ TypeScript チェック
   │  ├─ Prettier
   │  ├─ ESLint
   │  └─ Jest テスト
   └─ バック（Python + FastAPI）
      ├─ Black（formatter）
      ├─ Ruff（linter）
      ├─ mypy（type check）
      └─ pytest テスト

   Sprint 3-4:
   - Sprint 2と同じ
   + Terraform（ある場合）
     ├─ terraform fmt
     └─ terraform validate
   ```

## Step 2: ツール実装確認と自動インストール

1. 各ツールのインストール状況を確認：
   ```bash
   # Node.js系
   npx prettier --version 2>/dev/null || echo "Prettier not found"
   npx eslint --version 2>/dev/null || echo "ESLint not found"
   npx tsc --version 2>/dev/null || echo "TypeScript not found"

   # Python系
   python3 -m black --version 2>/dev/null || echo "Black not found"
   python3 -m ruff --version 2>/dev/null || echo "Ruff not found"
   python3 -m mypy --version 2>/dev/null || echo "mypy not found"

   # Terraform
   terraform version 2>/dev/null || echo "Terraform not found"
   ```

2. 未インストールの場合、自動インストール提案：
   ```
   ⚠️  以下のツールがインストールされていません：
   - Prettier: npm install --save-dev prettier
   - ESLint: npm install --save-dev eslint

   インストールを実行しますか？ (Y/n)
   ```

## Step 3: Formatter 実行（自動修正）

チャットに進捗表示（例）:
```
🔧 コード品質チェック実行中...

▶ Prettier（formatter）
```

### 3-1: Node.js系 formatter

```bash
# Prettier - TypeScript / JSX ファイル
npx prettier --write src/**/*.{ts,tsx,js,jsx}
npx prettier --write pages/**/*.{ts,tsx}
npx prettier --write app/**/*.{ts,tsx}
npx prettier --write *.{ts,tsx,js,jsx,json}
```

### 3-2: Python系 formatter

```bash
# Black - Python ファイル
python3 -m black .

# または特定ディレクトリ
python3 -m black backend/ scripts/
```

### 3-3: Terraform formatter

```bash
# terraform fmt - HCL ファイル
terraform fmt -recursive .
```

## Step 4: Linter 実行（エラー検出）

### 4-1: Node.js系 linter

```bash
# ESLint
npx eslint src/**/*.{ts,tsx} pages/**/*.ts --report-unused-disable-directives-severity error

# TypeScript type check
npx tsc --noEmit
```

結果：
- エラーなし → Step 5へ
- エラーあり → 詳細表示、修正促す

### 4-2: Python系 linter

```bash
# Ruff（高速）
python3 -m ruff check . --show-fixes

# または Pylint
# python3 -m pylint backend/

# mypy type check
python3 -m mypy .
```

結果：
- エラーなし → Step 5へ
- エラーあり → 詳細表示、修正促す

### 4-3: Terraform linter

```bash
# terraform validate
terraform validate
```

## Step 5: テスト実行（オプション）

テストが存在する場合、簡易実行：

```bash
# Node.js
npm test 2>/dev/null

# Python
python3 -m pytest --co -q 2>/dev/null  # テスト有無確認のみ
```

## Step 6: Husky Pre-Commit Hook 設定（Node.js環境）

すべてのチェックが合格した後、今後の自動チェックのため husky の pre-commit hook を設定します（Node.js環境のみ）：

### 6-1: Husky インストール確認

```bash
# husky インストール状況確認
npm ls husky 2>/dev/null || echo "husky未インストール"
```

### 6-2: Husky インストール（未インストール時）

```bash
npm install husky --save-dev
npx husky install
```

### 6-3: Pre-Commit Hook スクリプト作成

`.husky/pre-commit` を作成：

```bash
#!/bin/sh
set -e

echo "🔧 Pre-commit チェック実行中..."

# Prettier - formatter
npx prettier --write src/**/*.{ts,tsx,js,jsx} pages/**/*.{ts,tsx} app/**/*.{ts,tsx} 2>/dev/null || true

# ESLint - linter
npx eslint src/**/*.{ts,tsx} pages/**/*.ts --report-unused-disable-directives-severity error || {
  echo "❌ ESLint エラー：修正してください"
  exit 1
}

# TypeScript type check
npx tsc --noEmit || {
  echo "❌ TypeScript エラー：修正してください"
  exit 1
}

echo "✅ Pre-commit チェック合格"
```

### 6-4: Hook ファイルの権限設定

```bash
chmod +x .husky/pre-commit
```

**結果**: 今後 `git commit` するたびに、自動的に Prettier / ESLint / TypeScript が実行されます。

---

## Step 7: Git commit 実行

すべてのチェック合格後、commit を実行します。この時点で、husky pre-commit hook がセットアップされています：

```bash
git add .
git commit -m "{COMMIT_MESSAGE}"
```

**注**: これ以降の `git commit` では、`.husky/pre-commit` が自動実行されます。

## Step 8: 完了メッセージ

```
✅ すべてのチェックが合格しました

実行したチェック：
- Prettier（formatter）
- ESLint（linter）
- TypeScript（type check）
- Black（formatter）（Python環境の場合）
- Ruff（linter）（Python環境の場合）
- mypy（type check）（Python環境の場合）

✅ Commit: {COMMIT_HASH}

✅ Husky pre-commit hook をセットアップしました

今後のコミット：
- 以降、`git commit` するたびに自動的に Prettier / ESLint / TypeScript が実行されます
- エラーが発生した場合、修正してから再度 `git commit` してください

次のステップ：
- `git push` でリモートにプッシュしてください
- または続けて実装を進めてください
```

# Constraints / Guardrails

- **エラーが合格しない場合**：
  - エラー詳細をチャットに表示
  - commit は実行しない
  - ユーザーに修正を促す

- **formatter で自動修正されたファイル**：
  - 修正内容をチャットに一覧表示（変更行数など）
  - ユーザーが内容確認後、再度 `/git-commit` 実行

- **ツール未インストール**：
  - インストール提案を表示
  - ユーザー確認後、インストール実行
  - 然る後、チェック再実行

# Commit Message Generation

コミットメッセージは以下の優先順で生成：

1. ユーザーが直接指定した場合 → そのまま使用
2. `git status` でステージ内容を判定 → 自動生成
3. テンプレート：
   ```
   [type] Brief description

   - Changed files
   - ...

   Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
   ```

# Tool Detection by Sprint

| Sprint | フロント | バック | IaC | 実行ツール |
|--------|---------|--------|-----|-----------|
| 1 | Next.js | - | - | Prettier, ESLint, TypeScript |
| 2 | Next.js | FastAPI | - | + Black, Ruff, mypy |
| 3-4 | Next.js | FastAPI | Terraform | + terraform fmt, validate |

