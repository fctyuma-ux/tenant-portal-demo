# Training Sprint - AI駆動開発ガイド

実装を進めるための Claude Code 設定です。

## ディレクトリ構造

```
training-sprint{N}/
├── app/                         # Presentation Layer
│   ├── (routes)/                # ページ・レイアウト（Next.js App Router）
│   ├── api/                     # Route Handlers（外部API）
│   ├── actions/                 # Server Actions
│   ├── components/              # UIコンポーネント
│   ├── lib/
│   │   ├── supabase/            # Supabase client
│   │   ├── llm/                 # LLM API wrapper
│   │   └── utils/               # 共通ユーティリティ
│   └── layout.tsx
├── domain/                      # Business Logic Layer
│   ├── models/                  # ドメインモデル（型定義）
│   ├── services/                # ビジネスロジック・ユースケース
│   └── repositories/            # Data Access Layer（DB操作抽象）
├── schemas/                     # バリデーション・型定義
│   └── (Zod schema / 入出力型)
├── types/                       # 共通型定義
└── docs/
    ├── requirements/            # 設計ドキュメント
    └── detail-plan.md           # VSA実装計画
```

## 技術スタック

| レイヤー | 技術 | 備考 |
|---------|------|------|
| **フロントエンド** | Next.js 14（App Router）、React、Tailwind CSS | フルスタックとして使用 |
| **バックエンド** | Next.js API Routes、Server Actions | RPC的に使用 |
| **データベース** | **Supabase（PostgreSQL）** | マネージドDB |
| **LLM** | **Open Responses API** | Structured Outputで型安全 |
| **デプロイ** | **Vercel + Supabase** | 実運用までを想定 |

## 実装方針

**Vertical Slice Architecture（VSA）** に基づいた計画を立て、
**3レイヤードアーキテクチャ** で実装を進めます。

### レイヤーとディレクトリのマッピング

```
┌──────────────────────────────────────┐
│  Presentation Layer (app/)           │
│  - (routes)/ : ページ・レイアウト     │
│  - api/ : Route Handlers             │
│  - actions/ : Server Actions          │
│  - components/ : UIコンポーネント     │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│  Business Logic Layer (domain/)      │
│  - services/ : ビジネスロジック       │
│  - models/ : ドメインモデル型         │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│  Data Access Layer (domain/)         │
│  - repositories/ : DB操作抽象         │
└──────────────────────────────────────┘
```

### Vertical Slice Architecture（VSA）
- 機能を**縦スライス**として分割
- 各スライスは、UI → ビジネスロジック → DB まで一貫した機能を含む
- 複数スライスを**段階的に**実装することで、早期に動作確認が可能

## 責務分離ガイド

### app/ - Presentation Layer
- **ページ・レイアウト** `(routes)/` : ユーザーに見える画面
- **API Route** `api/` : 外部とのインターフェース
- **Server Action** `actions/` : フォーム送信など
- **Component** `components/` : 再利用可能なUI部品
- **ライブラリ** `lib/` : Supabase client、LLM wrapper、ユーティリティ

### domain/ - Business Logic & Data Access Layer
- **models/** : ドメインモデルの型（User, Post など）
- **services/** : ビジネスロジック（計算、変換、検証）
- **repositories/** : DB操作の抽象化（Repository パターン）

### schemas/ - バリデーション層
- Zod schema による入出力のバリデーション
- API/LLM レスポンスの型安全化

### types/ - 共通型定義
- アプリケーション全体で使う共通型

## 実装計画策定

### 初回実行時（`detail-plan.md` が未作成）

1. 要件ドキュメントを確認
   - `docs/requirements/` 配下のドキュメント

2. `/planner` コマンドでプランナーエージェントを呼び出す
   - VSA で機能を縦スライスに分割
   - `docs/detail-plan.md` を生成

### 2回目以降

- `docs/detail-plan.md` を参照して実装を進める
- 計画の追加・修正があれば `/planner` を再度呼び出す

## 開発時の核となる原則

### 1. 3レイヤードアーキテクチャの遵守
全ての実装は以下の3層に厳密に分離：
- **Presentation Layer** (`app/`) : UI/API
- **Business Logic Layer** (`domain/services/`) : ドメインロジック・ビジネスルール
- **Data Access Layer** (`domain/repositories/`) : DB操作

層間の依存関係を逆にしない。下位層へのアクセスのみを許可。

### 2. TDD（テスト駆動開発）の厳密実施
**Red-Green-Refactor サイクルを必ず順守**：
- 🔴 **RED**: 失敗するテストを書く
- 🟢 **GREEN**: テストを通す実装を書く
- 🔵 **REFACTOR**: コード品質を改善

## 開発時のチェックリスト

- [ ] `detail-plan.md` を確認してから実装を開始
- [ ] ディレクトリ構造を理解している
- [ ] **3レイヤーの責務分離を意識している**（`.claude/rules/three-layer-architecture.md`）
- [ ] **TDD で実装している**（`.claude/rules/tdd-guide.md`）
- [ ] **テストなしでは実装しない**

## 困ったときは

- **VSA について**: `.claude/rules/vsa-guide.md` を参照
- **3レイヤー について**: `.claude/rules/three-layer-architecture.md` を参照
- **TDD について**: `.claude/rules/tdd-guide.md` を参照
- **計画の修正**: `/planner` を実行
- **ディレクトリ構造**: このファイルのディレクトリ構造セクションを参照

## エージェント一覧

| エージェント | 役割 |
|------------|------|
| **planner** | VSA 実装計画策定、`detail-plan.md` 生成 |
| **test-writer** | 🔴 RED：失敗するテストを書く |
| **implementer** | 🟢 GREEN：テストを通す実装を書く |
| **refactor** | 🔵 REFACTOR：コード品質を改善 |
