# Step 3: 深掘り計画

## 深掘り対象の選定

実装コードを以下の4セグメントに分けて詳細に分析する。

### セグメント一覧

| # | セグメント | 対象ファイル | 分析観点 |
|---|-----------|------------|---------|
| 1 | **認証・ルーティング** | `middleware.ts`, `login/actions.ts`, `api/auth/signout/` | 認証フロー、ロール判定、セキュリティ |
| 2 | **AI コア（RAG パイプライン）** | `chat-answer.ts`, `pdf-analysis.ts`, `api/conversations/*/messages/` | RAG アーキテクチャ、ベクトル検索、プロンプト設計 |
| 3 | **管理者CRUD** | `admin/documents/actions.ts`, `admin/faqs/actions.ts`, `api/admin/*` | Server Actions パターン、バリデーション、Storage連携 |
| 4 | **フロントエンド（UI）** | `chat-client.tsx`, `home-client.tsx`, `admin/page.tsx` | コンポーネント設計、状態管理、UX |

## 各セグメントの分析項目

### セグメント 1: 認証・ルーティング
- Supabase Auth のセッション管理方式（Cookie ベース SSR）
- Middleware でのロール判定ロジック
- 保護ルートの実装パターン
- Server Action での認証チェック

### セグメント 2: AI コア（RAG パイプライン）
- PDF テキスト抽出 → チャンク分割 → Embeddings の流れ
- pgvector による cosine similarity 検索
- プロンプトエンジニアリング（system prompt 構造）
- FAQ 検索との組み合わせ（ハイブリッド検索）
- エラーハンドリングとステータス管理

### セグメント 3: 管理者 CRUD
- Next.js Server Actions パターン
- Supabase Storage 連携（アップロード/削除）
- revalidatePath によるキャッシュ無効化
- 楽観的 UI 更新パターン

### セグメント 4: フロントエンド（UI）
- Client Component vs Server Component の使い分け
- チャット UI の状態管理（仮メッセージ → 正式メッセージ差替え）
- タイピングアニメーション
- フィードバック UI

## 深掘りの優先順位

```
1. AI コア（RAG） ← 最も複雑、プロジェクトの核心
2. 認証・ルーティング ← セキュリティ上重要
3. 管理者 CRUD ← Server Actions パターン理解
4. フロントエンド UI ← React パターン理解
```
