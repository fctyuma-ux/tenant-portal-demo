# Step 1: 全体像

## プロジェクト概要

**テナント入居者ポータル** は、ビル入居者が管理事務所に問い合わせることなく、AIチャットで自己解決できるデモアプリケーション。

### 解決する課題
- ビル管理会社がPDF形式で配布する「テナントマニュアル」の内容を入居者が簡単に検索・参照できない
- 管理事務所への問い合わせ負荷が高い

### ソリューション
- PDFをアップロード → AI が解析・ベクトル化 → 入居者がチャットで質問 → RAG で回答生成

## 技術スタック

| レイヤー | 技術 | 役割 |
|---------|------|------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | SSR/CSR ハイブリッドUI |
| Backend | Next.js API Routes + Server Actions | API + フォーム処理 |
| Database | Supabase (PostgreSQL + pgvector) | データ永続化 + ベクトル検索 |
| Auth | Supabase Auth | 認証・セッション管理 |
| Storage | Supabase Storage | PDFファイル保管 |
| AI | OpenAI GPT-4o-mini + text-embedding-3-small | 回答生成 + ベクトル化 |
| Deploy | Vercel | ホスティング |

## ユーザーロール

| ロール | できること |
|--------|-----------|
| **入居者 (tenant)** | チャットで質問、ホーム画面閲覧 |
| **管理者 (admin)** | PDF管理、FAQ管理、ダッシュボード閲覧、テストプレビュー |

## 主要フロー

### 入居者フロー
1. ログイン → ホーム画面
2. 質問入力 → チャット画面へ遷移
3. AI が RAG で回答生成 → 引用元表示
4. フィードバック（役に立った / 立たなかった）

### 管理者フロー
1. ログイン → ダッシュボード
2. PDF アップロード → 解析実行 → ナレッジベース構築
3. テストプレビューで回答品質を確認
4. 公開切替で入居者に公開
5. FAQ を登録・管理

## ファイル構成（主要ファイル）

```
app/src/
├── app/
│   ├── login/           # 認証（Server Action）
│   ├── home/            # 入居者ホーム画面
│   ├── chat/            # AIチャット画面
│   ├── admin/
│   │   ├── page.tsx         # ダッシュボード
│   │   ├── documents/       # ドキュメント管理
│   │   └── faqs/            # FAQ管理
│   └── api/
│       ├── auth/signout/           # サインアウト
│       ├── conversations/          # 会話作成
│       ├── conversations/[id]/messages/  # メッセージ送受信
│       ├── messages/[id]/feedback/       # フィードバック
│       └── admin/documents/
│           ├── [id]/analyze/       # PDF解析トリガー
│           └── preview/            # テストプレビュー
├── domain/services/
│   ├── chat-answer.ts   # AI回答生成（RAG）
│   └── pdf-analysis.ts  # PDF解析パイプライン
├── lib/supabase/
│   ├── client.ts        # クライアント用Supabase
│   ├── server.ts        # サーバー用Supabase
│   └── admin.ts         # Service Role Key用
└── middleware.ts         # 認証・ルーティング制御
```

## データベース（8テーブル）

| テーブル | 役割 |
|---------|------|
| properties | 物件マスタ |
| users | ユーザー（tenant/admin） |
| documents | アップロードPDF管理 |
| document_chunks | チャンク + ベクトル（pgvector） |
| faqs | FAQ |
| conversations | チャットセッション |
| messages | チャットメッセージ + フィードバック |
| announcements | お知らせ |
