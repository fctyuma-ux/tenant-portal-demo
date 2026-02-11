# API設計書

> DB設計・要件定義書v2・IPO一覧から作成

## API一覧

| # | エンドポイント | メソッド | 機能 | 対応テーブル |
|---|--------------|---------|------|------------|
| 1 | /api/auth/login | POST | ログイン認証 | users |
| 2 | /api/auth/me | GET | ログインユーザー情報取得 | users |
| 3 | /api/announcements | GET | お知らせ一覧取得 | announcements |
| 4 | /api/categories | GET | FAQカテゴリ一覧取得 | faqs |
| 5 | /api/conversations | POST | 新規会話作成 | conversations |
| 6 | /api/conversations/:id/messages | GET | 会話履歴取得 | conversations, messages |
| 7 | /api/conversations/:id/messages | POST | AI質問送信・回答取得 | messages, document_chunks, faqs |
| 8 | /api/messages/:id/feedback | PATCH | フィードバック送信 | messages |
| 9 | /api/admin/dashboard | GET | ダッシュボード集計データ取得 | messages, conversations |
| 10 | /api/admin/documents | GET | ドキュメント一覧取得 | documents |
| 11 | /api/admin/documents | POST | PDFアップロード+解析開始 | documents, document_chunks |
| 12 | /api/admin/documents/:id | PATCH | 公開ステータス切替 | documents |
| 13 | /api/admin/documents/:id | DELETE | ドキュメント削除 | documents, document_chunks |
| 14 | /api/admin/documents/preview | POST | テストプレビュー（AI回答テスト） | document_chunks, faqs |
| 15 | /api/admin/faqs | GET | FAQ一覧取得 | faqs |
| 16 | /api/admin/faqs | POST | FAQ追加 | faqs |
| 17 | /api/admin/faqs/:id | PUT | FAQ編集 | faqs |
| 18 | /api/admin/faqs/:id | DELETE | FAQ削除 | faqs |

## 認証・認可

| 項目 | 内容 |
|------|------|
| 認証方式 | Supabase Auth（JWT） |
| トークン送信 | Authorization: Bearer &lt;token&gt; |
| トークン有効期限 | 1時間（リフレッシュトークンで自動更新） |
| ロール | tenant（入居者）、admin（管理者） |
| デフォルト権限 | 認証済みユーザーのみアクセス可。/api/admin/* は admin ロールのみ |

## エラーレスポンス共通形式

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーの説明"
  }
}
```

| ステータス | 意味 | 使用場面 |
|-----------|------|---------|
| 400 | Bad Request | バリデーションエラー（必須項目不足、形式不正） |
| 401 | Unauthorized | 認証トークンなし、または期限切れ |
| 403 | Forbidden | 権限不足（tenant が admin API にアクセス等） |
| 404 | Not Found | 指定されたリソースが存在しない |
| 500 | Internal Server Error | サーバー内部エラー |

## エンドポイント詳細

### 1. ログイン認証

- **Method**: POST
- **Path**: /api/auth/login
- **目的**: メールアドレスとパスワードでユーザーを認証し、JWTトークンを発行する
- **対応テーブル**: users
- **認証**: 不要

#### リクエスト

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| email | string | Yes | ログイン用メールアドレス |
| password | string | Yes | パスワード |

**リクエスト例**:
```json
{
  "email": "tanaka@example.com",
  "password": "password123"
}
```

#### レスポンス（成功）

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "tanaka@example.com",
    "name": "田中 美咲",
    "role": "tenant",
    "property_id": "uuid"
  }
}
```

#### レスポンス（エラー）

| ステータス | エラーコード | 説明 |
|-----------|------------|------|
| 400 | INVALID_CREDENTIALS | メールアドレスまたはパスワードが正しくない |
| 400 | VALIDATION_ERROR | 必須項目が不足している |

---

### 2. ログインユーザー情報取得

- **Method**: GET
- **Path**: /api/auth/me
- **目的**: 現在ログイン中のユーザー情報を取得する（ロール判定・ヘッダー表示用）
- **対応テーブル**: users, properties
- **認証**: 必要

#### レスポンス（成功）

```json
{
  "id": "uuid",
  "email": "tanaka@example.com",
  "name": "田中 美咲",
  "role": "tenant",
  "property": {
    "id": "uuid",
    "name": "大手町パークビルディング"
  }
}
```

---

### 3. お知らせ一覧取得

- **Method**: GET
- **Path**: /api/announcements
- **目的**: ユーザーが所属する物件のお知らせ一覧を最新順で取得する
- **対応テーブル**: announcements
- **認証**: 必要（tenant）

#### リクエスト（クエリパラメータ）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| limit | integer | No | 取得件数（デフォルト: 10） |
| offset | integer | No | オフセット（デフォルト: 0） |

#### レスポンス（成功）

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "ゴミ出しルールが変更になりました",
      "body": "2026年3月1日より...",
      "published_at": "2026-02-10T09:00:00Z"
    }
  ],
  "total": 5
}
```

---

### 4. FAQカテゴリ一覧取得

- **Method**: GET
- **Path**: /api/categories
- **目的**: ホーム画面のカテゴリカード表示用に、FAQのカテゴリ一覧を取得する
- **対応テーブル**: faqs
- **認証**: 必要（tenant）

#### レスポンス（成功）

```json
{
  "data": [
    "ゴミ出し",
    "空調",
    "駐車場",
    "入退館",
    "防災",
    "申請手続き"
  ]
}
```

---

### 5. 新規会話作成

- **Method**: POST
- **Path**: /api/conversations
- **目的**: 新しいチャットセッションを開始する
- **対応テーブル**: conversations
- **認証**: 必要（tenant）

#### レスポンス（成功）

```json
{
  "id": "uuid",
  "created_at": "2026-02-10T10:00:00Z"
}
```

---

### 6. 会話履歴取得

- **Method**: GET
- **Path**: /api/conversations/:id/messages
- **目的**: 指定した会話のメッセージ履歴を取得する
- **対応テーブル**: conversations, messages
- **認証**: 必要（tenant、自分の会話のみ）

#### レスポンス（成功）

```json
{
  "conversation_id": "uuid",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "休日入館の申請はどうすればいいですか？",
      "feedback": null,
      "created_at": "2026-02-10T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "休日入館には「休日入退館届」の提出が必要です...",
      "feedback": "positive",
      "sources": [
        {
          "document_name": "入居のしおり.pdf",
          "page_number": 15,
          "page_image_url": "/storage/pages/doc-uuid/15.png"
        }
      ],
      "related_documents": [
        {
          "file_name": "休日入退館届.pdf",
          "download_url": "/storage/documents/uuid/休日入退館届.pdf"
        }
      ],
      "created_at": "2026-02-10T10:00:05Z"
    }
  ]
}
```

---

### 7. AI質問送信・回答取得

- **Method**: POST
- **Path**: /api/conversations/:id/messages
- **目的**: ユーザーの質問を送信し、AIがナレッジベースを検索して回答を生成する
- **対応テーブル**: messages, document_chunks, faqs
- **認証**: 必要（tenant）

#### リクエスト

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| content | string | Yes | ユーザーの質問テキスト |

**リクエスト例**:
```json
{
  "content": "休日入館の申請はどうすればいいですか？"
}
```

#### レスポンス（成功）

```json
{
  "user_message": {
    "id": "uuid",
    "role": "user",
    "content": "休日入館の申請はどうすればいいですか？",
    "created_at": "2026-02-10T10:00:00Z"
  },
  "assistant_message": {
    "id": "uuid",
    "role": "assistant",
    "content": "休日入館には「休日入退館届」の提出が必要です。防災センターへ3日前までに提出してください。",
    "sources": [
      {
        "document_name": "入居のしおり.pdf",
        "page_number": 15,
        "page_image_url": "/storage/pages/doc-uuid/15.png"
      }
    ],
    "related_documents": [
      {
        "file_name": "休日入退館届.pdf",
        "download_url": "/storage/documents/uuid/休日入退館届.pdf"
      }
    ],
    "created_at": "2026-02-10T10:00:05Z"
  }
}
```

#### 処理フロー

1. ユーザーメッセージを messages テーブルに保存
2. 質問テキストをベクトル化
3. document_chunks テーブルで類似度検索（公開中ドキュメントのみ）
4. faqs テーブルでも検索
5. 検索結果をコンテキストとしてAI（OpenAI/Claude）に回答生成を依頼
6. AI回答を messages テーブルに保存
7. 引用元（sources）と関連ドキュメントを含めてレスポンス

---

### 8. フィードバック送信

- **Method**: PATCH
- **Path**: /api/messages/:id/feedback
- **目的**: AI回答に対する「役に立った/立たなかった」のフィードバックを送信する
- **対応テーブル**: messages
- **認証**: 必要（tenant）

#### リクエスト

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| feedback | string | Yes | "positive" または "negative" |

**リクエスト例**:
```json
{
  "feedback": "positive"
}
```

#### レスポンス（成功）

```json
{
  "id": "uuid",
  "feedback": "positive"
}
```

---

### 9. ダッシュボード集計データ取得

- **Method**: GET
- **Path**: /api/admin/dashboard
- **目的**: 管理者ダッシュボードに表示する問い合わせ概要・フィードバックサマリーを取得する
- **対応テーブル**: messages, conversations
- **認証**: 必要（admin）

#### リクエスト（クエリパラメータ）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| period | string | No | 集計期間（"week", "month"。デフォルト: "week"） |

#### レスポンス（成功）

```json
{
  "summary": {
    "total_questions": 142,
    "period": "week"
  },
  "top_topics": [
    { "topic": "ゴミ出し", "count": 32 },
    { "topic": "空調", "count": 28 },
    { "topic": "駐車場", "count": 21 },
    { "topic": "入退館", "count": 18 },
    { "topic": "防災", "count": 12 }
  ],
  "negative_feedback": [
    {
      "message_id": "uuid",
      "question": "管球交換の依頼方法は？",
      "feedback_count": 5
    }
  ]
}
```

---

### 10. ドキュメント一覧取得

- **Method**: GET
- **Path**: /api/admin/documents
- **目的**: 管理者が登録済みドキュメントの一覧を取得する
- **対応テーブル**: documents
- **認証**: 必要（admin）

#### レスポンス（成功）

```json
{
  "data": [
    {
      "id": "uuid",
      "file_name": "入居のしおり.pdf",
      "page_count": 45,
      "analysis_status": "completed",
      "publish_status": "published",
      "created_at": "2026-02-01T09:00:00Z"
    }
  ],
  "total": 3
}
```

---

### 11. PDFアップロード+解析開始

- **Method**: POST
- **Path**: /api/admin/documents
- **目的**: マニュアルPDFをアップロードし、AI解析処理を開始する
- **対応テーブル**: documents, document_chunks
- **認証**: 必要（admin）

#### リクエスト（multipart/form-data）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| file | File | Yes | アップロードするPDFファイル |

#### レスポンス（成功）

```json
{
  "id": "uuid",
  "file_name": "入居のしおり_v2.pdf",
  "analysis_status": "processing",
  "publish_status": "unpublished",
  "created_at": "2026-02-10T10:00:00Z"
}
```

#### 処理フロー

1. PDFファイルをSupabase Storageにアップロード
2. documents テーブルにレコード作成（analysis_status: "processing"）
3. バックグラウンドでPDF解析を開始:
   - PDFからページ毎にテキスト・画像を抽出
   - テキストをチャンクに分割
   - 各チャンクをベクトル化（OpenAI Embeddings API）
   - document_chunks テーブルに保存
   - ページ画像をStorageに保存
4. 解析完了時に analysis_status を "completed" に更新

---

### 12. 公開ステータス切替

- **Method**: PATCH
- **Path**: /api/admin/documents/:id
- **目的**: ドキュメントの公開/非公開ステータスを切り替える
- **対応テーブル**: documents
- **認証**: 必要（admin）

#### リクエスト

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| publish_status | string | Yes | "published" または "unpublished" |

**リクエスト例**:
```json
{
  "publish_status": "published"
}
```

#### レスポンス（成功）

```json
{
  "id": "uuid",
  "publish_status": "published"
}
```

---

### 13. ドキュメント削除

- **Method**: DELETE
- **Path**: /api/admin/documents/:id
- **目的**: ドキュメントと関連するチャンクデータを削除する
- **対応テーブル**: documents, document_chunks（CASCADE DELETE）
- **認証**: 必要（admin）

#### レスポンス（成功）

```json
{
  "success": true
}
```

---

### 14. テストプレビュー

- **Method**: POST
- **Path**: /api/admin/documents/preview
- **目的**: 公開前にテスト質問を入力し、AI回答が正しく生成されるか確認する
- **対応テーブル**: document_chunks, faqs
- **認証**: 必要（admin）

#### リクエスト

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| content | string | Yes | テスト質問テキスト |

**リクエスト例**:
```json
{
  "content": "ゴミ出しのルールが変わった点は？"
}
```

#### レスポンス（成功）

```json
{
  "content": "2026年3月1日より、可燃ゴミの回収が週3回から週2回に変更されます...",
  "sources": [
    {
      "document_name": "入居のしおり_v2.pdf",
      "page_number": 8,
      "page_image_url": "/storage/pages/doc-uuid/8.png",
      "publish_status": "unpublished"
    }
  ]
}
```

#### 備考

- テストプレビューでは未公開ドキュメントも検索対象に含める
- 結果はDBに保存しない（messagesテーブルに記録しない）

---

### 15. FAQ一覧取得

- **Method**: GET
- **Path**: /api/admin/faqs
- **目的**: 登録済みFAQ一覧を取得する（カテゴリフィルタ・検索対応）
- **対応テーブル**: faqs
- **認証**: 必要（admin）

#### リクエスト（クエリパラメータ）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| category | string | No | カテゴリでフィルタ |
| q | string | No | キーワード検索（質問・回答を対象） |
| limit | integer | No | 取得件数（デフォルト: 20） |
| offset | integer | No | オフセット（デフォルト: 0） |

#### レスポンス（成功）

```json
{
  "data": [
    {
      "id": "uuid",
      "category": "ゴミ出し",
      "question": "ゴミの分別ルールを教えてください",
      "answer": "可燃ゴミは月・水・金、不燃ゴミは...",
      "created_at": "2026-01-15T09:00:00Z"
    }
  ],
  "total": 24
}
```

---

### 16. FAQ追加

- **Method**: POST
- **Path**: /api/admin/faqs
- **目的**: 新規FAQを登録する
- **対応テーブル**: faqs
- **認証**: 必要（admin）

#### リクエスト

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| category | string | Yes | カテゴリ |
| question | string | Yes | 質問テキスト |
| answer | string | Yes | 回答テキスト |

**リクエスト例**:
```json
{
  "category": "ゴミ出し",
  "question": "ダンボールはどこに捨てますか？",
  "answer": "B1階の資源ゴミ置き場に..."
}
```

#### レスポンス（成功）

```json
{
  "id": "uuid",
  "category": "ゴミ出し",
  "question": "ダンボールはどこに捨てますか？",
  "answer": "B1階の資源ゴミ置き場に...",
  "created_at": "2026-02-10T10:00:00Z"
}
```

---

### 17. FAQ編集

- **Method**: PUT
- **Path**: /api/admin/faqs/:id
- **目的**: 既存FAQの質問・回答・カテゴリを更新する
- **対応テーブル**: faqs
- **認証**: 必要（admin）

#### リクエスト

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| category | string | Yes | カテゴリ |
| question | string | Yes | 質問テキスト |
| answer | string | Yes | 回答テキスト |

#### レスポンス（成功）

```json
{
  "id": "uuid",
  "category": "ゴミ出し",
  "question": "ダンボールはどこに捨てますか？",
  "answer": "B1階の資源ゴミ置き場に...(更新済み)",
  "updated_at": "2026-02-10T11:00:00Z"
}
```

---

### 18. FAQ削除

- **Method**: DELETE
- **Path**: /api/admin/faqs/:id
- **目的**: FAQを削除する
- **対応テーブル**: faqs
- **認証**: 必要（admin）

#### レスポンス（成功）

```json
{
  "success": true
}
```

---

## 次のステップ

→ 設計フェーズ完了。Build フェーズに進む。
