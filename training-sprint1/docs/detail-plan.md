# Sprint 1 実装計画

## 概要

このドキュメントは、Vertical Slice Architecture（VSA）に基づいた
実装計画です。各スライスを順序通りに実装することで、
早期の動作確認と段階的な進捗を実現します。

### 技術スタック

- **Frontend**: Next.js (App Router)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenAI (GPT-4, text-embedding-3-small)
- **PDF解析**: pdf-parse, LangChain 等
- **ベクトル検索**: pgvector

### 優先度方針

| 優先度 | スライス | 理由 |
|--------|---------|------|
| **Must** | 1, 2, 3, 5, 6, 7 | 「PDFアップロード→AI回答」のコア価値を証明 |
| **Want** | 4, 8, 9 | CRUD代替可能 or デモ本質ではない |

### 推奨実装ルート

```
Phase 1 (基盤) → Slice 3 (Doc管理) → Slice 5 (PDF解析) → Slice 6 (AIチャット) → Slice 7 (プレビュー) → Want
```

## 機能スライス一覧と実装順序

### Phase 1: 基盤構築（依存なし）【Must】

#### Slice 1: プロジェクトセットアップ + DB構築
- **概要**: Next.js プロジェクト初期化、Supabase接続設定、全テーブルのマイグレーション作成・実行、シードデータ投入
- **優先度**: Must
- **実装期間**: 推定1日
- **関連データ**: 全8テーブル（properties, users, documents, document_chunks, faqs, conversations, messages, announcements）

**実装手順（概略）**:
1. Next.js (App Router) プロジェクト作成、Tailwind CSS 設定
2. Supabase プロジェクト作成、接続設定（環境変数）
3. pgvector 拡張の有効化
4. 全テーブルのマイグレーション SQL 作成・実行
5. シードデータ投入（テスト用物件、ユーザー）
6. Supabase Client の初期化ヘルパー作成

**チェックリスト**:
- [ ] Next.js プロジェクト作成完了
- [ ] Supabase 接続確認
- [ ] pgvector 拡張有効化
- [ ] 全テーブル作成完了
- [ ] シードデータ投入完了
- [ ] 動作確認済み

---

#### Slice 2: 認証（ログイン + ロール別リダイレクト）
- **概要**: ログイン画面UI、Supabase Auth連携、ロール判定によるリダイレクト、認証ミドルウェア
- **優先度**: Must
- **実装期間**: 推定1日
- **対象画面**: ログイン画面
- **関連データ**: users, properties
- **API**: `POST /api/auth/login`, `GET /api/auth/me`

**実装手順（概略）**:
1. Data Access層: Supabase Auth のサインイン処理
2. Business Logic層: ロール判定ロジック（tenant/admin）
3. Presentation層: ログインフォーム UI
4. ミドルウェア: 認証チェック、admin ルート保護
5. テスト作成
6. 動作確認（入居者→ホーム、管理者→ダッシュボード）

**チェックリスト**:
- [ ] ログイン画面 UI 完成
- [ ] Supabase Auth 連携完了
- [ ] ロール別リダイレクト動作確認
- [ ] 認証ミドルウェア実装
- [ ] 未認証時のリダイレクト確認
- [ ] テスト実装

---

### Phase 2: ドキュメント管理（Phase 1に依存）【Must】

#### Slice 3: ドキュメント管理（CRUD）
- **概要**: PDFアップロード（Supabase Storage）、ドキュメント一覧表示、公開/非公開切替、削除
- **優先度**: Must
- **実装期間**: 推定1〜2日
- **対象画面**: ドキュメント管理画面（テストプレビュー以外）
- **関連データ**: documents
- **API**: `GET /api/admin/documents`, `POST /api/admin/documents`, `PATCH /api/admin/documents/:id`, `DELETE /api/admin/documents/:id`

**実装手順（概略）**:
1. Data Access層: documents テーブルの CRUD、Supabase Storage へのファイルアップロード
2. Business Logic層: アップロードバリデーション（PDF形式チェック）、ステータス管理
3. Presentation層: 管理者レイアウト（サイドナビ）、アップロードエリア（D&D）、一覧テーブル、公開トグル、削除確認ダイアログ
4. テスト作成
5. 動作確認

**チェックリスト**:
- [ ] 管理者レイアウト（サイドナビ）完成
- [ ] PDF アップロード機能完成
- [ ] ドキュメント一覧表示
- [ ] 公開/非公開切替
- [ ] ドキュメント削除（確認ダイアログ付き）
- [ ] テスト実装

---

### Phase 3: AI機能（Phase 2に依存）【Must】

#### Slice 5: PDF解析パイプライン
- **概要**: アップロードされたPDFからテキスト・画像を抽出し、チャンク分割、OpenAI Embeddings でベクトル化してナレッジベースを構築する
- **優先度**: Must
- **実装期間**: 推定2日
- **依存**: Slice 3（ドキュメントがアップロード済みであること）
- **関連データ**: documents, document_chunks

**実装手順（概略）**:
1. Data Access層: document_chunks テーブルへの一括挿入、ページ画像の Storage 保存
2. Business Logic層: PDF解析（pdf-parse / LangChain）、テキストチャンク分割、OpenAI Embeddings API 呼び出し、ページ画像生成
3. Presentation層: 解析プログレスバー、ステータス表示更新
4. documents.analysis_status の更新処理（processing → completed / error）
5. テスト作成
6. 動作確認（PDFアップロード→解析完了→チャンク確認）

**チェックリスト**:
- [ ] PDF テキスト抽出完成
- [ ] チャンク分割ロジック完成
- [ ] OpenAI Embeddings 連携完了
- [ ] ページ画像の抽出・保存
- [ ] 解析プログレス表示
- [ ] analysis_status 更新処理
- [ ] テスト実装

---

#### Slice 6: AI チャット（対話 + 引用表示）
- **概要**: チャットUI（吹き出し形式）、ベクトル類似度検索、AI回答生成（OpenAI/Claude）、引用画像サムネイル表示、関連ドキュメントリンク、会話履歴
- **優先度**: Must
- **実装期間**: 推定2日
- **依存**: Slice 5（ナレッジベースが構築済みであること）
- **対象画面**: チャット画面
- **関連データ**: document_chunks, faqs, conversations, messages, documents
- **API**: `POST /api/conversations`, `GET /api/conversations/:id/messages`, `POST /api/conversations/:id/messages`

**実装手順（概略）**:
1. Data Access層: conversations/messages CRUD、pgvector 類似度検索クエリ（cosine similarity）
2. Business Logic層: 質問テキストのベクトル化、類似チャンク検索、プロンプト構築、OpenAI Chat API 呼び出し、引用元の特定
3. Presentation層: チャットUI（吹き出し形式、ユーザー右寄せ/AI左寄せ）、メッセージ入力バー（画面下部固定）、引用画像サムネイル（クリック拡大）、ドキュメントリンク、タイピングアニメーション
4. テスト作成
5. 動作確認（質問→AI回答→引用表示）

**チェックリスト**:
- [ ] チャット UI（吹き出し形式）完成
- [ ] ベクトル類似度検索完成
- [ ] AI 回答生成（OpenAI）完成
- [ ] 引用画像サムネイル表示
- [ ] 関連ドキュメントリンク表示
- [ ] 会話履歴（スクロール）
- [ ] テスト実装

---

#### Slice 7: テストプレビュー
- **概要**: ドキュメント管理画面内で、公開前にテスト質問を入力しAI回答が正しく生成されるか確認する機能
- **優先度**: Must
- **実装期間**: 推定0.5日
- **依存**: Slice 5, 6（AI回答ロジックの再利用）
- **対象画面**: ドキュメント管理画面（テストプレビュー枠）
- **関連データ**: document_chunks, faqs
- **API**: `POST /api/admin/documents/preview`

**実装手順（概略）**:
1. Business Logic層: Slice 6 のAI回答ロジックを再利用（未公開ドキュメントも検索対象に含める）
2. Presentation層: テスト質問入力欄、AI回答プレビュー表示エリア
3. テスト作成
4. 動作確認

**チェックリスト**:
- [ ] テストプレビュー枠 UI 完成
- [ ] 未公開ドキュメント含む検索
- [ ] AI回答プレビュー表示
- [ ] テスト実装

---

### Phase 4: Want（時間があれば実装）

#### Slice 4: FAQ管理（CRUD）
- **概要**: FAQ一覧、追加・編集・削除、カテゴリフィルタ・検索
- **優先度**: Want
- **実装期間**: 推定1日
- **対象画面**: FAQ管理画面
- **関連データ**: faqs
- **API**: `GET /api/admin/faqs`, `POST /api/admin/faqs`, `PUT /api/admin/faqs/:id`, `DELETE /api/admin/faqs/:id`

**チェックリスト**:
- [ ] FAQ一覧表示
- [ ] FAQ追加（モーダル）
- [ ] FAQ編集
- [ ] FAQ削除
- [ ] カテゴリフィルタ・検索

---

#### Slice 8: ホーム画面（入居者トップ）
- **概要**: 質問入力バー、カテゴリカード、お知らせ一覧
- **優先度**: Want
- **実装期間**: 推定0.5〜1日
- **対象画面**: ホーム画面
- **関連データ**: faqs, announcements
- **API**: `GET /api/announcements`, `GET /api/categories`

**チェックリスト**:
- [ ] 質問入力バー
- [ ] カテゴリカード表示
- [ ] お知らせ一覧
- [ ] チャット画面への遷移

---

#### Slice 9: フィードバック + 管理者ダッシュボード
- **概要**: フィードバックボタン（はい/いいえ）、ダッシュボード集計
- **優先度**: Want
- **実装期間**: 推定1日
- **対象画面**: チャット画面（フィードバック部分）、管理者ダッシュボード
- **関連データ**: messages, conversations
- **API**: `PATCH /api/messages/:id/feedback`, `GET /api/admin/dashboard`

**チェックリスト**:
- [ ] フィードバックボタン UI
- [ ] フィードバック送信 API
- [ ] ダッシュボード集計表示
- [ ] 頻出トピックTOP5

---

## 依存関係マップ

```
Slice 1 (セットアップ+DB) ─────┐
                               ├──→ Slice 3 (Doc管理)
Slice 2 (認証) ────────────────┘         │
                                         ▼
                               Slice 5 (PDF解析)
                                         │
                                         ▼
                               Slice 6 (AIチャット) ──→ Slice 7 (プレビュー)
                                         │
                                         ▼
                              ┌──── Want ────┐
                              │              │
                        Slice 8 (ホーム)  Slice 9 (ダッシュボード)

Slice 4 (FAQ管理) ← Phase 1完了後いつでも実装可（独立）
```

## Must 実装の見積もり合計

| Slice | 推定期間 |
|-------|---------|
| Slice 1: セットアップ+DB | 1日 |
| Slice 2: 認証 | 1日 |
| Slice 3: ドキュメント管理 | 1〜2日 |
| Slice 5: PDF解析 | 2日 |
| Slice 6: AIチャット | 2日 |
| Slice 7: テストプレビュー | 0.5日 |
| **合計** | **約7.5〜8.5日** |

## アーキテクチャ参照

- **Vertical Slice Architecture（VSA）**: `.claude/rules/vsa-guide.md`
- **3レイヤードアーキテクチャ**: `.claude/rules/three-layer-architecture.md`
- **TDD**: `.claude/rules/tdd-guide.md`

## 計画の変更

計画を変更する場合は planner エージェントを再度実行してください。

---

生成日時: 2026-02-11
