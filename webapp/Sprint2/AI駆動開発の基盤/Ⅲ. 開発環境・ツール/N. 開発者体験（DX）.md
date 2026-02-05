# N. 開発者体験（DX）

## 概要

開発者体験（DX: Developer Experience）は、開発効率とチーム生産性を左右する重要な要素です。タスクランナー、dotfiles、オンボーディング、自動化の優先順位付けなど、複数の観点から DX を向上させることで、チーム全体のエンジニアリング品質が向上します。

---

## 1. タスクランナーの目的

**タスクランナー:** npm scripts、Make、タスクエンジニアリングツール

```json
{
  "scripts": {
    "lint": "eslint src/",
    "test": "jest",
    "build": "tsc && webpack",
    "dev": "npm run lint && npm run test && npm run build"
  }
}
```

**メリット:**
- 入口を一つに統一（`npm run dev`）
- チーム全体で同じコマンドを使用
- ドキュメント不要で使い方が自明

---

## 2. 依存関係と失敗伝播

**タスク間の依存関係:**

```bash
dev: lint → test → build
```

**失敗伝播（&&を使用）:**

```json
{
  "scripts": {
    "lint": "eslint src/",
    "test": "jest",
    "build": "tsc && webpack",
    "dev": "npm run lint && npm run test && npm run build"
  }
}
```

**動作:** lint が失敗するとそこで停止、test は実行されない

---

## 3. 引数・環境変数・デフォルト値

**環境変数の活用:**

```bash
NODE_ENV=production npm run build
DEBUG=app:* npm start
```

**スクリプト内でのデフォルト値:**

```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "deploy": "ENV=${DEPLOY_ENV:-staging} npm run build && ./deploy.sh"
  }
}
```

---

## 4. CI との整合性

**ローカルと CI で同じコマンドを実行:**

```yaml
# .github/workflows/ci.yml
- run: npm run lint
- run: npm run test
- run: npm run build
```

**メリット:**
- ローカルで成功したら CI でも成功する確率が高い
- 環境差分による予期しない失敗を減らす

---

## 5. 基本タスク群の定義

**推奨タスク群:**

```json
{
  "scripts": {
    "lint": "eslint src/ --fix",
    "format": "prettier --write src/",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "build": "tsc && webpack",
    "dev": "npm run lint && npm run test && npm run build",
    "ci": "npm run lint && npm run type-check && npm run test && npm run build"
  }
}
```

---

## 6. README とオンボーディング

**README に含めるべき内容:**

```markdown
# Project Name

## Getting Started

### Prerequisites
- Node.js v18+
- npm v9+

### Installation
\`\`\`bash
npm install
\`\`\`

### Development
\`\`\`bash
npm run dev
\`\`\`

### Testing
\`\`\`bash
npm test
npm test:watch
\`\`\`

### Build
\`\`\`bash
npm run build
\`\`\`

## Project Structure
\`\`\`
src/
├── components/
├── pages/
├── utils/
└── types/
\`\`\`

## CI/CD
CI は GitHub Actions で自動実行。
マージ前に全テストが通ることを確認。
```

---

## 7. dotfiles 管理

**dotfiles の範囲:**

```
.editorconfig     # エディタ設定（推奨）
.prettierrc        # フォーマッタ設定（推奨）
.eslintrc         # リンター設定（推奨）
.env.example      # 環境変数テンプレート（必須）
.env              # 実際の環境変数（gitignore に追加）
.gitignore        # Git 除外ファイル（推奨）
```

**注意:** `.env` は git で管理しない

---

## 8. dotfiles のリポジトリ化

**Git 管理 + シンボリックリンク:**

```bash
# dotfiles を別リポジトリで管理
git clone https://github.com/team/dotfiles ~/.dotfiles

# シンボリックリンクを作成
ln -s ~/.dotfiles/.editorconfig ~/.editorconfig
ln -s ~/.dotfiles/.prettierrc ~/.prettierrc
```

**メリット:**
- チーム全体で設定を共有
- 設定の更新が一箇所で完結
- 新しいチームメンバーのセットアップが簡単

---

## 9. OS 差分の吸収

**クロスプラットフォーム対応:**

```json
{
  "scripts": {
    "clean": "rm -rf dist/ || rmdir dist /s /q",
    "copy": "cp -r src/assets dist/ || xcopy src\\assets dist\\ /E"
  }
}
```

**または rimraf / cpx などのツールを使用：**

```json
{
  "devDependencies": {
    "rimraf": "^4.0.0"
  },
  "scripts": {
    "clean": "rimraf dist"
  }
}
```

---

## 10. オンボーディングのボトルネック

**典型的なボトルネック:**

1. **環境ボトルネック:** Node.js インストール、PATH 設定
2. **ドメインボトルネック:** チーム固有の知識（API, 設計パターン）
3. **フローボトルネック:** 開発フロー（PR 作成、デプロイ）

**対応：**

- README をゼロから環境構築できるレベルで充実
- セットアップスクリプトを用意（`npm run setup`）
- Runbook で手順を明記

---

## 11. ナレッジの鮮度管理

**古い手順を殺す:**

```markdown
# ⚠️ 非推奨（2024-01-01 で廃止）

以前は X をしていましたが、現在は Y を使用してください。
詳細: [ドキュメント](link)
```

**定期レビュー:**

- 3ヶ月ごと に README を確認
- 古い手順を削除
- 最新の推奨ツール/パターンを反映

---

## 12. 自動化の優先順位

**優先順位の決め方:**

1. **頻度**: 毎日実行する処理か？
2. **手間**: 5分以上かかるか？
3. **エラーリスク**: 手作業でミスが生じやすいか？

**高優先度の自動化:**
- ビルド/テスト（毎日）
- デプロイ（毎日～毎週）
- ログ分析（毎日）

**低優先度:**
- 年1回の設定更新
- 複雑なロジックが絡む業務

---

## 13. 実装のポイント

- README は環境構築手順から始める
- タスクランナーで入口を統一
- dotfiles でチーム設定を共有
- 自動化は高頻度・高リスク から
- 定期的にオンボーディング手順を検証
