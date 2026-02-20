# API設計書

> DB設計・要件定義書v2・IPO一覧から作成
> フロントエンド（Next.js）↔ バックエンド（FastAPI）間の全APIを定義

---

## API一覧

| # | エンドポイント | メソッド | 機能 | 対応IPO | 対応テーブル | 認可 |
|---|--------------|---------|------|---------|------------|------|
| 1 | /api/users/me | GET | ログインユーザー情報取得 | #2 | `users` | all |
| 2 | /api/equipment | GET | 設備マスタ一覧取得 | #5 | `equipment` | all |
| 3 | /api/lines | GET | ラインマスタ一覧取得 | #5 | `lines`, `factories` | all |
| 4 | /api/trouble-reports | POST | トラブルレポート新規作成 | #8 | `trouble_reports` | manufacturing |
| 5 | /api/trouble-reports | GET | トラブルレポート一覧取得 | #9,#21,#31 | `trouble_reports`, `ai_analyses`, `equipment` | all |
| 6 | /api/trouble-reports/{report_id} | GET | トラブルレポート詳細取得 | #33 | `trouble_reports`, `ai_analyses`, `chargebacks`, `countermeasures` | all |
| 7 | /api/trouble-reports/{report_id}/analysis | GET | AI解析結果取得 | #10,#11,#12 | `ai_analyses`, `trouble_reports`, `lines`, `parts` | all |
| 8 | /api/trouble-reports/{report_id}/analysis | PUT | AI解析結果修正 | #14 | `ai_analyses`, `trouble_reports` | manufacturing |
| 9 | /api/analysis/summary | GET | 設備・部品別AI分析集約 | #20 | `trouble_reports`, `ai_analyses`, `equipment`, `parts` | design |
| 10 | /api/search/semantic | POST | セマンティック検索 | #6,#27 | FAISS → `trouble_reports`, `ai_analyses` | all |
| 11 | /api/search/keyword | GET | キーワード検索 | #28 | `trouble_reports`（pg_trgm） | all |
| 12 | /api/chargebacks | POST | Charge-back実行 | #13 | `chargebacks`, `ai_analyses` | manufacturing |
| 13 | /api/chargebacks/summary | GET | Charge-back集計取得 | #7,#15 | `chargebacks` | all |
| 14 | /api/chargebacks/ranking | GET | ワーストランキング取得 | #16 | `chargebacks`, `equipment`, `parts` | design |
| 15 | /api/chargebacks/unread | GET | 未読Charge-back一覧取得 | #19 | `chargebacks`, `trouble_reports`, `equipment` | design |
| 16 | /api/chargebacks/{id}/read | PATCH | Charge-back既読マーク | #19 | `chargebacks` | design |
| 17 | /api/countermeasures | GET | 対策情報取得 | #22 | `countermeasures` | design |
| 18 | /api/countermeasures/roi | POST | ROIシミュレーション実行 | #22 | `trouble_reports`, `ai_analyses`, `countermeasures` | design |
| 19 | /api/countermeasures/proposal | POST | AI投資提案文生成 | #23 | FAISS → `trouble_reports`, `countermeasures` | design |
| 20 | /api/countermeasures/{id}/status | PATCH | 対策ステータス更新 | #24,#25 | `countermeasures`, `notifications`, `trouble_reports` | design |
| 21 | /api/notifications | GET | 通知一覧取得 | #25 | `notifications` | all |
| 22 | /api/import/validate | POST | CSVバリデーション | #35,#36 | ― | admin |
| 23 | /api/import/execute | POST | インポートバッチ実行 | #37 | 全マスタ, `trouble_reports`, `ai_analyses`, `chargebacks`, `import_jobs`, `import_records`, FAISS | admin |
| 24 | /api/import/jobs/{job_id} | GET | インポート進捗取得 | #38 | `import_jobs` | admin |
| 25 | /api/import/jobs/{job_id}/errors | GET | インポートエラー詳細取得 | #39 | `import_records` | admin |

---

## 認証・認可

| 項目 | 内容 |
|------|------|
| 認証方式 | Supabase Auth JWT（Bearer token） |
| トークン送信 | `Authorization: Bearer <supabase_access_token>` |
| トークン検証 | FastAPI側でSupabase JWT公開鍵を使い検証。`sub`クレームからuser_idを取得 |
| Role取得 | JWT検証後、`users`テーブルからroleを取得しリクエストコンテキストに保持 |
| 認可ルール | manufacturing: P002,P003,P006系API / design: P004,P005,P006系API / admin: P007系API / all: 共通API |
| 未認証時 | 401 Unauthorized |
| 権限不足時 | 403 Forbidden |

---

## 共通レスポンス形式

### 成功レスポンス

```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20
  }
}
```

### エラーレスポンス

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "停止時間は必須です",
    "details": [
      { "field": "downtime_minutes", "message": "この項目は必須です" }
    ]
  }
}
```

### 共通HTTPステータスコード

| ステータス | 意味 | 使用場面 |
|-----------|------|---------|
| 200 | OK | GET成功、PATCH成功 |
| 201 | Created | POST成功（リソース作成） |
| 400 | Bad Request | バリデーションエラー、不正なリクエスト |
| 401 | Unauthorized | 未認証（JWTなし・期限切れ） |
| 403 | Forbidden | 権限不足（roleが不一致） |
| 404 | Not Found | リソースが存在しない |
| 409 | Conflict | 重複（既にCharge-back作成済み等） |
| 422 | Unprocessable Entity | CSVフォーマット不適合 |
| 500 | Internal Server Error | サーバー内部エラー |
| 503 | Service Unavailable | LLM/FAISSサービスが応答不能 |

---

## エンドポイント詳細

---

### 1. GET /api/users/me

- **目的**: ログインユーザーの情報とRoleを取得（P001 #2 Role判定）
- **対応テーブル**: `users`
- **認可**: all（認証済みユーザー全員）

#### リクエスト

パラメータなし（JWTからuser_idを取得）

#### レスポンス（成功: 200）

```json
{
  "data": {
    "id": "uuid-xxx",
    "email": "tanaka@example.com",
    "role": "manufacturing",
    "display_name": "田中 守"
  }
}
```

#### エラー

| ステータス | エラーコード | 説明 |
|-----------|------------|------|
| 401 | AUTH_REQUIRED | JWTが無効または期限切れ |
| 404 | USER_NOT_FOUND | usersテーブルにレコードがない |

---

### 2. GET /api/equipment

- **目的**: 設備マスタ一覧取得（P002 #5 起票時の選択肢）
- **対応テーブル**: `equipment`
- **認可**: all

#### リクエスト（Query）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| search | string | No | 設備名で部分一致検索 |

#### レスポンス（成功: 200）

```json
{
  "data": [
    {
      "equipment_id": "EQ-017",
      "name": "組付コンベア",
      "manufacturer": "ダイフク",
      "installation_year": 2018
    }
  ]
}
```

---

### 3. GET /api/lines

- **目的**: ラインマスタ一覧取得（P002 #5 起票時の選択肢）
- **対応テーブル**: `lines`, `factories`
- **認可**: all

#### リクエスト（Query）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| factory_id | integer | No | 工場IDで絞り込み |

#### レスポンス（成功: 200）

```json
{
  "data": [
    {
      "line_id": "LINE-A4",
      "name": "コンロ組立ライン（Mytone/テーブル）",
      "factory_name": "大口工場",
      "cost_per_minute": 10000
    }
  ]
}
```

---

### 4. POST /api/trouble-reports

- **目的**: トラブルレポート新規作成（P002 #8 報告送信）
- **対応テーブル**: `trouble_reports` INSERT
- **認可**: manufacturing
- **副作用**: AI解析ジョブを非同期起動。完了後に`ai_analyses`INSERT、FAISS登録（internal_id）

#### リクエスト（Body）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| equipment_id | string | Yes | 設備ID |
| line_id | string | Yes | ラインID |
| description_symptom | string | Yes | 現象記述テキスト |
| error_code | string | No | エラーコード |
| downtime_minutes | integer | Yes | 停止時間（分） |

```json
{
  "equipment_id": "EQ-017",
  "line_id": "LINE-A4",
  "description_symptom": "組付コンベアが突然停止し、近接センサーのエラーE-401が点灯",
  "error_code": "E-401",
  "downtime_minutes": 45
}
```

#### レスポンス（成功: 201）

```json
{
  "data": {
    "report_id": "MR-2026-089",
    "internal_id": 301,
    "status": "未対応",
    "created_at": "2026-02-18T10:30:00Z"
  }
}
```

#### エラー

| ステータス | エラーコード | 説明 |
|-----------|------------|------|
| 400 | VALIDATION_ERROR | 必須項目不足・型不正 |
| 404 | EQUIPMENT_NOT_FOUND | equipment_idが存在しない |
| 404 | LINE_NOT_FOUND | line_idが存在しない |

---

### 5. GET /api/trouble-reports

- **目的**: トラブルレポート一覧取得（P002 #9, P005 #21, P006 #31）
- **対応テーブル**: `trouble_reports` JOIN `ai_analyses` JOIN `equipment`
- **認可**: all

#### リクエスト（Query）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| reported_by | string | No | `me`を指定で自分の報告のみ（P002 #9） |
| equipment_id | string | No | 設備IDで絞り込み（P005 #21） |
| part_code | string | No | 部品コードで絞り込み（P005 #21） |
| status | string | No | ステータス絞り込み（未対応/対応中/完了） |
| trouble_category | string | No | トラブル区分絞り込み |
| from | string | No | 期間開始日（ISO 8601） |
| to | string | No | 期間終了日（ISO 8601） |
| sort | string | No | ソートキー（occurred_at / total_loss_yen / equipment_name）。デフォルト: `-occurred_at` |
| page | integer | No | ページ番号（デフォルト: 1） |
| per_page | integer | No | 1ページあたり件数（デフォルト: 20, 最大: 100） |

#### レスポンス（成功: 200）

```json
{
  "data": [
    {
      "report_id": "MR-2026-089",
      "occurred_at": "2026-02-18T08:15:00Z",
      "equipment_name": "組付コンベア",
      "line_name": "コンロ組立ライン",
      "description_symptom": "近接センサーのエラーE-401が点灯し停止",
      "downtime_minutes": 45,
      "status": "未対応",
      "total_loss_yen": 580000,
      "symptom_category": "センサー異常",
      "design_responsibility_pct": 75
    }
  ],
  "meta": {
    "total": 156,
    "page": 1,
    "per_page": 20
  }
}
```

---

### 6. GET /api/trouble-reports/{report_id}

- **目的**: トラブルレポート全詳細取得（P006 #33 ナレッジ閲覧モーダル）
- **対応テーブル**: `trouble_reports` JOIN `ai_analyses` JOIN `chargebacks` JOIN `countermeasures`
- **認可**: all

#### レスポンス（成功: 200）

```json
{
  "data": {
    "report_id": "MR-2026-089",
    "internal_id": 301,
    "occurred_at": "2026-02-18T08:15:00Z",
    "completed_at": null,
    "equipment": { "equipment_id": "EQ-017", "name": "組付コンベア" },
    "line": { "line_id": "LINE-A4", "name": "コンロ組立ライン", "cost_per_minute": 10000 },
    "trouble_category": "突発故障",
    "downtime_minutes": 45,
    "production_impact": "ライン停止",
    "description_symptom": "近接センサーのエラーE-401が点灯し停止",
    "description_cause": "センサー経年劣化",
    "description_treatment": "近接センサー交換",
    "error_code": "E-401",
    "part": { "part_code": "PRT-027", "name": "近接センサー" },
    "part_cost_yen": 15000,
    "outsourcing_cost_yen": 0,
    "total_direct_cost_yen": 15000,
    "status": "未対応",
    "analysis": {
      "symptom_category": "センサー異常",
      "estimated_root_cause": "振動環境下でのセンサー経年劣化",
      "related_part_name": "近接センサー",
      "similar_count": 12,
      "design_responsibility_pct": 75,
      "responsibility_reasoning": "同一設備で過去12件の類似故障...",
      "opportunity_cost_yen": 450000,
      "total_loss_yen": 465000
    },
    "chargeback": {
      "id": "uuid-cb-xxx",
      "amount_yen": 348750,
      "is_read": false,
      "created_at": "2026-02-18T10:35:00Z"
    },
    "countermeasure": null
  }
}
```

#### エラー

| ステータス | エラーコード | 説明 |
|-----------|------------|------|
| 404 | REPORT_NOT_FOUND | report_idが存在しない |

---

### 7. GET /api/trouble-reports/{report_id}/analysis

- **目的**: AI解析結果の取得（P003 #10,#11,#12）
- **対応テーブル**: `ai_analyses`, `trouble_reports`, `lines`, `parts`
- **認可**: all
- **設計意図**: AI解析は非同期処理（POST #4の副作用）のため、「処理中」と「純粋なエラー」をフロントエンドが判別できる必要がある。`analysis_status`フィールドで状態を明示し、未完了でも200を返す

#### レスポンス（成功: 200 — 解析完了時）

```json
{
  "data": {
    "report_id": "MR-2026-089",
    "analysis_status": "completed",
    "symptom_category": "センサー異常",
    "estimated_root_cause": "振動環境下でのセンサー経年劣化",
    "related_part_name": "近接センサー",
    "similar_count": 12,
    "design_responsibility_pct": 75,
    "responsibility_reasoning": "同一設備で過去12件の類似故障が発生...",
    "opportunity_cost_yen": 450000,
    "total_loss_yen": 465000,
    "loss_breakdown": {
      "direct_cost_yen": 15000,
      "opportunity_cost_yen": 450000,
      "line_cost_per_minute": 10000,
      "downtime_minutes": 45
    }
  }
}
```

#### レスポンス（成功: 200 — 解析処理中）

`analysis_status`が`pending`または`processing`の場合、解析結果フィールドはnull。フロントエンドはステータスを見てローディング表示を継続し、数秒後にリトライする。

```json
{
  "data": {
    "report_id": "MR-2026-089",
    "analysis_status": "processing",
    "symptom_category": null,
    "estimated_root_cause": null,
    "related_part_name": null,
    "similar_count": null,
    "design_responsibility_pct": null,
    "responsibility_reasoning": null,
    "opportunity_cost_yen": null,
    "total_loss_yen": null,
    "loss_breakdown": null
  }
}
```

#### レスポンス（成功: 200 — 解析失敗時）

`analysis_status`が`failed`の場合。フロントエンドはエラーメッセージを表示し、再解析ボタンを有効化する。

```json
{
  "data": {
    "report_id": "MR-2026-089",
    "analysis_status": "failed",
    "error_detail": "LLMタイムアウト: 構造化処理が30秒以内に完了しなかった"
  }
}
```

#### analysis_status 一覧

| ステータス | 説明 | フロントエンド動作 |
|-----------|------|-----------------|
| pending | AI解析ジョブがキュー待ち | ローディング表示、数秒後にリトライ |
| processing | AI解析処理中 | ローディング表示、数秒後にリトライ |
| completed | AI解析完了 | 解析結果を表示、Charge-backボタン有効化 |
| failed | AI解析失敗 | エラーメッセージ表示、再解析ボタン表示 |

#### エラー

| ステータス | エラーコード | 説明 |
|-----------|------------|------|
| 404 | REPORT_NOT_FOUND | report_idが存在しない |

---

### 8. PUT /api/trouble-reports/{report_id}/analysis

- **目的**: AI解析結果の手動修正（P003 #14）
- **対応テーブル**: `ai_analyses` UPDATE, `trouble_reports` UPDATE
- **認可**: manufacturing
- **副作用**: 損失額・責任判定を再計算
- **ビジネスルール（不変性制約）**: 既にCharge-backが実行済み（`chargebacks`テーブルに該当report_idのレコードが存在する）の場合、AI解析結果の修正はブロックされる。責任会計の不変性（Immutability）を担保するため、確定済みの会計データに影響する上流データの変更を禁止する。TDDでは「Charge-back済みレポートの修正が409を返すこと」を最初の異常系テスト（Red）として実装する

#### 事前チェック

1. `chargebacks`テーブルで`report_id`に一致するレコードの有無を確認
2. 存在する場合 → 409 Conflict を即時返却（修正処理は一切実行しない）
3. 存在しない場合 → 修正処理を続行

#### リクエスト（Body）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| symptom_category | string | No | 修正後の現象カテゴリ |
| estimated_root_cause | string | No | 修正後の推定原因 |
| related_part_name | string | No | 修正後の関連部品名 |

```json
{
  "symptom_category": "機械摩耗",
  "estimated_root_cause": "コンベアベルトの張力不足による振動増大"
}
```

#### レスポンス（成功: 200）

修正後のAI解析結果（#7と同じ形式、`analysis_status: "completed"`）を返す。損失額・責任判定は再計算済み。

#### エラー

| ステータス | エラーコード | 説明 |
|-----------|------------|------|
| 404 | REPORT_NOT_FOUND | report_idが存在しない |
| 404 | ANALYSIS_NOT_FOUND | AI解析結果が存在しない |
| 409 | CHARGEBACK_EXISTS | Charge-back実行済みのため修正不可。会計データの不変性を担保 |

---

### 9. GET /api/analysis/summary

- **目的**: 設備・部品別のAI分析集約結果（P005 #20）
- **対応テーブル**: `trouble_reports`, `ai_analyses`, `equipment`, `parts`
- **認可**: design

#### リクエスト（Query）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| equipment_id | string | Yes* | 対象設備ID |
| part_code | string | Yes* | 対象部品コード |

※ equipment_id または part_code の少なくとも1つが必須

#### レスポンス（成功: 200）

```json
{
  "data": {
    "equipment": { "equipment_id": "EQ-017", "name": "組付コンベア" },
    "part": { "part_code": "PRT-027", "name": "近接センサー" },
    "total_incidents": 12,
    "total_loss_yen": 5580000,
    "avg_design_responsibility_pct": 72,
    "top_symptom_categories": [
      { "category": "センサー異常", "count": 8 },
      { "category": "機械摩耗", "count": 3 }
    ],
    "top_root_causes": [
      { "cause": "経年劣化", "count": 6 },
      { "cause": "設計マージン不足", "count": 4 }
    ],
    "frequency_per_month": 1.5
  }
}
```

---

### 10. POST /api/search/semantic

- **目的**: セマンティック検索（P002 #6 RAGサジェスト, P006 #27）
- **対応テーブル**: FAISS → `trouble_reports` JOIN（internal_id）, `ai_analyses`
- **認可**: all

#### リクエスト（Body）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| query | string | Yes | 検索テキスト |
| top_k | integer | No | 取得件数（デフォルト: 5, 最大: 20） |

```json
{
  "query": "組付コンベアが突然停止し、近接センサーのエラーが点灯",
  "top_k": 5
}
```

#### レスポンス（成功: 200）

```json
{
  "data": [
    {
      "report_id": "MR-2025-042",
      "score": 0.92,
      "description_symptom": "コンベア停止、近接センサーE-401エラー",
      "description_treatment": "センサー交換で復旧",
      "equipment_name": "組付コンベア",
      "occurred_at": "2025-11-05T14:20:00Z",
      "symptom_category": "センサー異常"
    }
  ]
}
```

#### エラー

| ステータス | エラーコード | 説明 |
|-----------|------------|------|
| 503 | FAISS_UNAVAILABLE | FAISSインデックスが読み込めない |

---

### 11. GET /api/search/keyword

- **目的**: キーワード検索（P006 #28）
- **対応テーブル**: `trouble_reports`（pg_trgm LIKE）, `ai_analyses`
- **認可**: all

#### リクエスト（Query）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| q | string | Yes | 検索キーワード（例: E-401, PRT-015） |
| equipment_id | string | No | 設備IDフィルタ |
| part_code | string | No | 部品コードフィルタ |
| status | string | No | ステータスフィルタ |
| from | string | No | 期間開始日 |
| to | string | No | 期間終了日 |
| sort | string | No | ソートキー |
| page | integer | No | ページ番号 |
| per_page | integer | No | 1ページあたり件数 |

#### レスポンス（成功: 200）

#5（GET /api/trouble-reports）と同じ形式。

---

### 12. POST /api/chargebacks

- **目的**: Charge-back実行（P003 #13）
- **対応テーブル**: `chargebacks` INSERT, `ai_analyses` READ
- **認可**: manufacturing

#### リクエスト（Body）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| report_id | string | Yes | 対象トラブルレポートID |

```json
{
  "report_id": "MR-2026-089"
}
```

#### Process

1. `ai_analyses`から`total_loss_yen`と`design_responsibility_pct`を取得
2. `amount_yen = total_loss_yen × design_responsibility_pct / 100` を計算
3. `trouble_reports`から`equipment_id`と`part_code`を取得
4. `chargebacks`テーブルにINSERT（`is_historical=FALSE`）

#### レスポンス（成功: 201）

```json
{
  "data": {
    "id": "uuid-cb-xxx",
    "report_id": "MR-2026-089",
    "amount_yen": 348750,
    "equipment_id": "EQ-017",
    "part_code": "PRT-027",
    "is_historical": false,
    "created_at": "2026-02-18T10:35:00Z"
  }
}
```

#### エラー

| ステータス | エラーコード | 説明 |
|-----------|------------|------|
| 404 | REPORT_NOT_FOUND | report_idが存在しない |
| 404 | ANALYSIS_NOT_FOUND | AI解析が未完了 |
| 409 | CHARGEBACK_EXISTS | 既にCharge-back作成済み |

---

### 13. GET /api/chargebacks/summary

- **目的**: Charge-back集計取得（P002 #7 累計表示, P004 #15 損失総額）
- **対応テーブル**: `chargebacks`
- **認可**: all

#### リクエスト（Query）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| period | string | No | 期間（monthly / quarterly / yearly / all）。デフォルト: monthly |

#### レスポンス（成功: 200）

```json
{
  "data": {
    "total_amount_yen": 12450000,
    "period": "monthly",
    "period_label": "2026年2月",
    "previous_amount_yen": 9800000,
    "change_rate": 27.0,
    "count": 34
  }
}
```

---

### 14. GET /api/chargebacks/ranking

- **目的**: ワーストランキング取得（P004 #16 パレート図用データ）
- **対応テーブル**: `chargebacks`, `equipment`, `parts`
- **認可**: design

#### リクエスト（Query）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| type | string | Yes | ランキング種別（equipment / parts） |
| period | string | No | 期間（monthly / quarterly / yearly / all） |
| limit | integer | No | 取得件数（デフォルト: 10） |

#### レスポンス（成功: 200）

```json
{
  "data": [
    {
      "equipment_id": "EQ-017",
      "name": "組付コンベア",
      "total_amount_yen": 3480000,
      "count": 8,
      "cumulative_pct": 28.0
    },
    {
      "equipment_id": "EQ-003",
      "name": "溶接ロボットA",
      "total_amount_yen": 2150000,
      "count": 5,
      "cumulative_pct": 45.2
    }
  ]
}
```

---

### 15. GET /api/chargebacks/unread

- **目的**: 未読Charge-back一覧（P004 #19 新着請求通知）
- **対応テーブル**: `chargebacks` JOIN `trouble_reports` JOIN `equipment`
- **認可**: design
- **フィルタ条件**: `WHERE is_read=FALSE AND is_historical=FALSE`

#### レスポンス（成功: 200）

```json
{
  "data": {
    "unread_count": 3,
    "items": [
      {
        "id": "uuid-cb-xxx",
        "report_id": "MR-2026-089",
        "amount_yen": 348750,
        "equipment_name": "組付コンベア",
        "symptom_category": "センサー異常",
        "created_at": "2026-02-18T10:35:00Z"
      }
    ]
  }
}
```

---

### 16. PATCH /api/chargebacks/{id}/read

- **目的**: Charge-backの既読マーク（P004 #19）
- **対応テーブル**: `chargebacks` UPDATE
- **認可**: design

#### リクエスト

パラメータなし（パスのidで特定）

#### レスポンス（成功: 200）

```json
{
  "data": {
    "id": "uuid-cb-xxx",
    "is_read": true
  }
}
```

---

### 17. GET /api/countermeasures

- **目的**: 対策情報取得（P005 #22 既存の対策がある場合の表示）
- **対応テーブル**: `countermeasures`
- **認可**: design

#### リクエスト（Query）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| equipment_id | string | Yes* | 対象設備ID |
| part_code | string | Yes* | 対象部品コード |

※ equipment_id または part_code の少なくとも1つが必須

#### レスポンス（成功: 200）

```json
{
  "data": {
    "id": 1,
    "equipment_id": "EQ-017",
    "part_code": "PRT-027",
    "status": "未対応",
    "cost_yen": null,
    "predicted_annual_loss_yen": null,
    "payback_period_months": null,
    "investment_proposal_text": null
  }
}
```

---

### 18. POST /api/countermeasures/roi

- **目的**: ROIシミュレーション実行（P005 #22 Deterministic計算）
- **対応テーブル**: `trouble_reports`, `ai_analyses`, `countermeasures` UPSERT
- **認可**: design

#### リクエスト（Body）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| equipment_id | string | Yes | 対象設備ID |
| part_code | string | No | 対象部品コード |
| cost_yen | integer | Yes | 対策コスト（ユーザー入力、¥） |

```json
{
  "equipment_id": "EQ-017",
  "part_code": "PRT-027",
  "cost_yen": 2000000
}
```

#### Process（Deterministic）

1. `trouble_reports` + `ai_analyses`から該当設備・部品の過去トラブルを全取得
2. 発生頻度（件/年）× 平均`total_loss_yen`で予測年間損失額を算出
3. 回収期間（月）= `cost_yen` ÷ `predicted_annual_loss_yen` × 12
4. `countermeasures`テーブルにUPSERT

#### レスポンス（成功: 200）

```json
{
  "data": {
    "countermeasure_id": 1,
    "cost_yen": 2000000,
    "predicted_annual_loss_yen": 6960000,
    "payback_period_months": 3.4,
    "roi_ratio": 3.48,
    "calculation_basis": {
      "incident_count": 12,
      "observation_months": 8,
      "frequency_per_year": 18.0,
      "avg_loss_per_incident": 386667
    }
  }
}
```

---

### 19. POST /api/countermeasures/proposal

- **目的**: AI投資提案文の自動生成（P005 #23 AI-Driven Insight）
- **対応テーブル**: FAISS → `trouble_reports` JOIN, `countermeasures` UPDATE
- **認可**: design

#### リクエスト（Body）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| countermeasure_id | integer | Yes | 対策ID（ROI算出済み） |

```json
{
  "countermeasure_id": 1
}
```

#### Process（AI-Driven）

1. `countermeasures`からROI数値を取得
2. FAISSから該当設備・部品の類似トラブルテキスト群を取得（internal_id → `trouble_reports` JOIN）
3. ROI数値＋テキスト群をLLMプロンプトに渡し、提案文生成
4. `countermeasures.investment_proposal_text`にUPDATE

#### レスポンス（成功: 200）

```json
{
  "data": {
    "countermeasure_id": 1,
    "investment_proposal_text": "## 技術的背景\n\n組付コンベア（EQ-017）の近接センサーは...\n\n## 経営的リスク\n\n年間推定損失額 ¥6,960,000 に対し...\n\n## 推奨アクション\n\n1. センサー設計のマージン見直し..."
  }
}
```

#### エラー

| ステータス | エラーコード | 説明 |
|-----------|------------|------|
| 400 | ROI_NOT_CALCULATED | ROI未算出（先にROIシミュレーションが必要） |
| 503 | LLM_UNAVAILABLE | LLMサービスが応答不能 |

---

### 20. PATCH /api/countermeasures/{id}/status

- **目的**: 対策ステータス更新（P005 #24）＋完了時の現場自動通知（#25）
- **対応テーブル**: `countermeasures` UPDATE, `notifications` INSERT, `trouble_reports` READ
- **認可**: design

#### リクエスト（Body）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| status | string | Yes | 新ステータス（未対応 / 対応中 / 完了） |

```json
{
  "status": "完了"
}
```

#### Process

1. `countermeasures`テーブルのstatusをUPDATE
2. status=「完了」の場合:
   - `trouble_reports`から該当equipment_id/part_codeの報告者（reported_by）を一意に取得
   - `notifications`テーブルに各報告者向けの通知レコードをINSERT

#### レスポンス（成功: 200）

```json
{
  "data": {
    "id": 1,
    "status": "完了",
    "notifications_sent": 5
  }
}
```

---

### 21. GET /api/notifications

- **目的**: 通知一覧取得（P002画面での通知表示、P005 #25で作成された通知の受信）
- **対応テーブル**: `notifications`
- **認可**: all

#### リクエスト（Query）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| unread_only | boolean | No | trueで未読のみ |

#### レスポンス（成功: 200）

```json
{
  "data": {
    "unread_count": 2,
    "items": [
      {
        "id": "uuid-notif-xxx",
        "message": "設備「組付コンベア」の近接センサー対策が完了しました",
        "is_read": false,
        "created_at": "2026-02-18T15:00:00Z"
      }
    ]
  }
}
```

---

### 22. POST /api/import/validate

- **目的**: CSVファイルのアップロード＆バリデーション（P007 #35,#36）
- **対応テーブル**: ―（クライアント側パース結果の検証）
- **認可**: admin

#### リクエスト（multipart/form-data）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| file | File | Yes | CSVファイル（固定26カラム） |

#### Process

1. ファイル拡張子・サイズ検証
2. CSVパースしヘッダー行の26カラム名を照合
3. 先頭10行をプレビュー用に抽出
4. 総行数をカウント

#### レスポンス（成功: 200）

```json
{
  "data": {
    "valid": true,
    "total_rows": 300,
    "preview": [
      {
        "record_id": "MR-2025-001",
        "発生日時": "2025-01-15 08:30",
        "工場": "大口工場",
        "設備ID": "EQ-017",
        "設備名": "組付コンベア",
        "現象記述": "近接センサーエラー..."
      }
    ],
    "columns_detected": 26
  }
}
```

#### エラー

| ステータス | エラーコード | 説明 |
|-----------|------------|------|
| 400 | INVALID_FILE_TYPE | CSV以外のファイル |
| 400 | FILE_TOO_LARGE | ファイルサイズ上限超過 |
| 422 | COLUMN_MISMATCH | カラム不足（不足カラム名をdetailsに列挙） |

```json
{
  "error": {
    "code": "COLUMN_MISMATCH",
    "message": "必要な26カラムのうち2カラムが不足しています",
    "details": {
      "missing_columns": ["部品コード", "交換部品名"]
    }
  }
}
```

---

### 23. POST /api/import/execute

- **目的**: インポートバッチ実行（P007 #37）
- **対応テーブル**: `factories`, `lines`, `equipment`, `parts`, `products`（UPSERT）, `trouble_reports`（INSERT）, `ai_analyses`（INSERT）, `chargebacks`（INSERT, is_historical=TRUE）, `import_jobs`（INSERT/UPDATE）, `import_records`（INSERT/UPDATE）, FAISS（WRITE）
- **認可**: admin
- **実行方式**: FastAPI BackgroundTasks（非同期）

#### リクエスト（multipart/form-data）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| file | File | Yes | バリデーション済みCSVファイル |

#### Process（BackgroundTasks）

> **実装上の制約（FastAPI UploadFile ライフサイクル）**: FastAPIの仕様上、リクエスト完了時にUploadFileオブジェクトはクローズされる。BackgroundTasksはリクエスト完了後に実行されるため、UploadFileを直接渡すとファイルが読めずクラッシュする。**必ずリクエストハンドラ内で**CSVの全内容をメモリ上のデータ構造（パース済み行リスト `list[dict]`）に変換し、そのデータ構造をBackgroundTasksのワーカー関数に引数として渡すこと。大容量ファイルの場合は、一時ファイル（`tempfile.NamedTemporaryFile(delete=False)`）に書き出し、ファイルパスをワーカーに渡してワーカー側で処理後に削除する方式も可。

1. **（リクエストハンドラ内・同期）** CSVファイルを読み込み、全行をパース済み行リスト（`list[dict]`）に変換
2. **（リクエストハンドラ内・同期）** `import_jobs`にINSERT（status=pending, total_count=行数）
3. **（リクエストハンドラ内・同期）** ジョブIDを即時レスポンス（202 Accepted）
4. **（BackgroundTasks・非同期）** パース済み行リストを受け取り、1件ずつ処理:
   - マスタデータ（`factories`, `lines`, `equipment`, `parts`, `products`）をUPSERT
   - `trouble_reports`にINSERT（internal_id自動採番）
   - `import_records`にINSERT
   - LLM構造化 → `ai_analyses`にINSERT
   - ベクトル化 → FAISS登録（キー: internal_id）
   - `chargebacks`にINSERT（`is_historical=TRUE`）
   - `import_records`・`import_jobs`のステータス更新

#### レスポンス（成功: 202 Accepted）

```json
{
  "data": {
    "job_id": "uuid-job-xxx",
    "status": "pending",
    "total_count": 300
  }
}
```

---

### 24. GET /api/import/jobs/{job_id}

- **目的**: インポート進捗取得（P007 #38 ポーリング）
- **対応テーブル**: `import_jobs`
- **認可**: admin
- **ポーリング間隔**: フロントエンドから3秒間隔

#### レスポンス（成功: 200）

```json
{
  "data": {
    "job_id": "uuid-job-xxx",
    "status": "processing",
    "total_count": 300,
    "processed_count": 145,
    "error_count": 2,
    "progress_pct": 48.3,
    "is_completed": false
  }
}
```

---

### 25. GET /api/import/jobs/{job_id}/errors

- **目的**: インポートエラー詳細取得（P007 #39）
- **対応テーブル**: `import_records`（status=error）
- **認可**: admin

#### レスポンス（成功: 200）

```json
{
  "data": {
    "job_id": "uuid-job-xxx",
    "total_count": 300,
    "success_count": 296,
    "error_count": 4,
    "errors": [
      {
        "row_number": 45,
        "error_detail": "LLMタイムアウト: 構造化処理が30秒以内に完了しなかった"
      },
      {
        "row_number": 123,
        "error_detail": "パースエラー: 停止時間_分が数値ではない（値: 'N/A'）"
      }
    ]
  }
}
```

---

## API × 画面マッピング

| 画面 | 使用API |
|------|---------|
| P001 ログイン | Supabase Auth（client SDK）→ #1 GET /api/users/me |
| P002 製造ダッシュボード | #2, #3（マスタ取得）, #4（報告作成）, #5（自分の報告）, #10（RAG）, #13（累計）, #21（通知） |
| P003 AI解析・Charge-back | #7（解析結果）, #8（修正）, #12（Charge-back実行） |
| P004 設計ダッシュボード | #13（総額）, #14（ランキング）, #15（未読）, #16（既読マーク） |
| P005 対策実行 | #5（履歴）, #9（分析集約）, #17（対策取得）, #18（ROI）, #19（提案文）, #20（ステータス） |
| P006 ナレッジ検索 | #5（一覧）, #6（詳細）, #10（セマンティック）, #11（キーワード） |
| P007 データインポート | #22（バリデーション）, #23（実行）, #24（進捗）, #25（エラー） |

---

## 次のステップ

→ 設計フェーズ完了。Build フェーズに進む。
