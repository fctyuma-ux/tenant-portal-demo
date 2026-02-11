---
name: foundation-project-setup
description: Next.js プロジェクト初期化・ディレクトリ構造・開発環境設定
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# Slice 0-1: Project Setup

Next.js プロジェクト初期化・ディレクトリ構造構築・開発環境設定を行うスキル。

## Purpose

開発を始めるための基盤を整備する：

1. Next.js プロジェクト初期化（既存の場合はスキップ）
2. ディレクトリ構造の作成
3. TypeScript / ESLint / Prettier 設定
4. 基本的なレイアウトコンポーネント実装

## When to use

- 新しい Sprint を開始するときに最初に実行
- プロジェクト全体の基盤を整備したい
- 開発環境を初期化したい

## Outputs

プロジェクト構造：
```
training-sprint{N}/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # メインレイアウト
│   │   ├── page.tsx            # ホームページ
│   │   ├── api/                # API ルート
│   │   └── components/         # ページコンポーネント
│   ├── domain/                 # ビジネスロジック層
│   │   ├── models/             # 型定義
│   │   ├── repositories/       # Data Access Layer
│   │   └── services/           # Business Logic Layer
│   ├── schemas/                # Zod バリデーションスキーマ
│   ├── types/                  # ユーティリティ型
│   └── lib/                    # ユーティリティ関数
├── __tests__/                  # テストファイル
├── public/                     # 静的ファイル
├── tsconfig.json               # TypeScript 設定
├── next.config.js              # Next.js 設定
├── .eslintrc.json              # ESLint 設定
├── .prettierrc                 # Prettier 設定
├── package.json                # 依存関係
└── README.md                   # プロジェクトドキュメント
```

## Procedure

### Step 1: Next.js プロジェクト初期化

プロジェクトが存在するか確認：

```bash
# プロジェクトディレクトリに移動
cd training-sprint{N}

# 既存か確認
ls -la
```

**既存の場合**: Step 2 へスキップ

**新規の場合**: 初期化コマンド実行

```bash
# Next.js プロジェクト初期化
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --eslint

# または以下をインタラクティブで実行
npx create-next-app@latest
```

**セットアップ時の選択肢**:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- App Router: Yes
- Src directory: Yes

### Step 2: ディレクトリ構造を作成

必要なディレクトリを作成：

```bash
cd training-sprint{N}

# フォルダ作成
mkdir -p src/domain/{models,repositories,services}
mkdir -p src/schemas
mkdir -p src/types
mkdir -p src/lib
mkdir -p __tests__/{domain,app}
```

### Step 3: TypeScript 設定を更新

`tsconfig.json` を確認・更新：

**確認項目**:
- [ ] strict mode が enabled
- [ ] paths エイリアスを設定
- [ ] moduleResolution が bundler

**例（tsconfig.json）**:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/app/*": ["./src/app/*"],
      "@/domain/*": ["./src/domain/*"],
      "@/schemas/*": ["./src/schemas/*"],
      "@/types/*": ["./src/types/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### Step 4: ESLint 設定を更新

`.eslintrc.json` を確認・更新：

**例（.eslintrc.json）**:
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_" }
    ],
    "react/no-unescaped-entities": "off"
  }
}
```

### Step 5: Prettier 設定を作成

`.prettierrc` を作成（既存の場合は確認）：

**例（.prettierrc）**:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

`.prettierignore` も作成：
```
node_modules
.next
dist
build
*.config.js
```

### Step 6: 基本的なレイアウトコンポーネント実装

#### 6-1. メインレイアウト（src/app/layout.tsx）

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Training Sprint',
  description: 'R2B Training Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <Header />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="bg-blue-600 text-white py-4">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold">R2B Training</h1>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-4 mt-8">
      <div className="container mx-auto px-4 text-center">
        <p>&copy; 2026 R2B Training Platform</p>
      </div>
    </footer>
  );
}
```

#### 6-2. ホームページ（src/app/page.tsx）

```typescript
export default function Home() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Welcome to R2B Training</h1>
      <p className="text-lg text-gray-600">
        プロジェクトセットアップが完了しました。
      </p>
      <p className="mt-4">
        <a href="#" className="text-blue-600 hover:underline">
          → スライス実装を開始する
        </a>
      </p>
    </div>
  );
}
```

### Step 7: 必要な依存パッケージをインストール

```bash
npm install
```

**確認される依存パッケージ**:
- next
- react
- react-dom
- typescript
- @types/react
- @types/react-dom
- @types/node
- tailwindcss
- postcss
- autoprefixer
- eslint
- eslint-config-next
- prettier

### Step 8: 開発環境確認

```bash
# ビルド確認
npm run build

# 開発サーバー起動確認（Ctrl+C で終了）
npm run dev
```

**確認項目**:
- [ ] ビルドが成功する
- [ ] http://localhost:3000 にアクセスできる
- [ ] ホームページが表示される
- [ ] エラーがない

### Step 9: README.md 更新

`README.md` を作成・更新：

```markdown
# Training Sprint {N}

## プロジェクト説明
R2B 研修システムの Slice 実装用リポジトリ

## プロジェクト構造
- src/app/: UI コンポーネント・ページ
- src/domain/: ビジネスロジック層
- src/schemas/: バリデーションスキーマ
- __tests__/: テストファイル

## セットアップ
```bash
npm install
npm run dev
```

## 開発コマンド
- `npm run dev`: 開発サーバー起動
- `npm run build`: ビルド
- `npm run lint`: Lint 実行
- `npm test`: テスト実行
```

## チェックリスト

### Slice 0-1 完了時

- [ ] Next.js プロジェクト初期化完了
- [ ] ディレクトリ構造を作成した
- [ ] TypeScript 設定完了
- [ ] ESLint / Prettier 設定完了
- [ ] 基本レイアウトコンポーネント実装完了
- [ ] ビルド・開発サーバー起動確認完了
- [ ] README.md 更新完了

### 次のステップ

Slice 0-1 完了後は、**Slice 0-2: Database Setup を実行**

```
Slice 0-1（ここ）
  ↓
Slice 0-2: Database Setup
  ↓
Slice 0-3: Migration & Seeder
  ↓
Slice 1-1: User Authentication
```

## 注意事項

- プロジェクトが既に存在する場合は初期化をスキップ
- Node.js v18 以上が必要
- npm またはyarn / pnpm / bun を使用可能
- Tailwind CSS を使用しない場合は適宜調整
