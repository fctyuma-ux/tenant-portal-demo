# DB設計書

> IPO と Data 一覧から、効果的なDB設計を作成
> RDB: PostgreSQL（Docker） / ベクトル検索: FAISS（ファイルベース）

## テーブル一覧

| # | テーブル名 | 種別 | 目的 | 関連データ項目 |
|---|-----------|------|------|--------------|
| 1 | users | マスタ | ユーザー情報とRole管理（Supabase Auth連携） | M01〜M04 |
| 2 | factories | マスタ | 工場マスタ | M05 |
| 3 | lines | マスタ | ラインマスタ（機会損失の単価含む） | M06〜M08 |
| 4 | equipment | マスタ | 設備マスタ | M09〜M12 |
| 5 | parts | マスタ | 部品マスタ | M13〜M14 |
| 6 | products | マスタ | 製品マスタ | M15〜M17 |
| 7 | trouble_reports | トランザクション | トラブルレポート（CSVインポート＋アプリ起票） | T01〜T20 |
| 8 | ai_analyses | AI生成 | AI構造化解析結果（LLM出力） | A01〜A08 |
| 9 | chargebacks | システム | Charge-back（責任コスト請求）レコード | S01〜S07 |
| 10 | notifications | システム | アプリ内通知 | S08〜S12 |
| 11 | import_jobs | システム | CSVインポートジョブ管理 | S13〜S18 |
| 12 | import_records | システム | インポート個別レコードのステータス管理 | S19〜S20 |
| 13 | countermeasures | システム | 設備・部品単位の対策管理とROI計算 | S21〜S23, T19 |

## ER図

```mermaid
erDiagram
    users ||--o{ trouble_reports : "reports"
    users ||--o{ notifications : "receives"

    factories ||--o{ lines : "has"
    lines ||--o{ trouble_reports : "occurs_on"
    equipment ||--o{ trouble_reports : "occurs_at"
    parts ||--o{ trouble_reports : "replaced"
    products ||--o{ trouble_reports : "affected"

    trouble_reports ||--o| ai_analyses : "analyzed_by"
    trouble_reports ||--o| chargebacks : "charged_back"

    equipment ||--o{ countermeasures : "targeted"
    parts ||--o{ countermeasures : "targeted"

    import_jobs ||--o{ import_records : "contains"
    import_records ||--o| trouble_reports : "creates"

    users {
        uuid id PK
        string email UK
        string role
        timestamp created_at
    }

    factories {
        serial id PK
        string name UK
        timestamp created_at
    }

    lines {
        string line_id PK
        string name
        int factory_id FK
        int cost_per_minute
        timestamp created_at
    }

    equipment {
        string equipment_id PK
        string name
        string manufacturer
        int installation_year
        timestamp created_at
    }

    parts {
        string part_code PK
        string name
        timestamp created_at
    }

    products {
        serial id PK
        string category
        string name
        string model_number
        timestamp created_at
    }

    trouble_reports {
        string report_id PK
        serial internal_id UK
        uuid reported_by FK
        timestamp occurred_at
        timestamp completed_at
        string line_id FK
        string equipment_id FK
        string trouble_category
        int downtime_minutes
        string production_impact
        text description_symptom
        text description_cause
        text description_treatment
        text note
        string error_code
        string part_code FK
        int product_id FK
        int part_cost_yen
        int outsourcing_cost_yen
        int total_direct_cost_yen
        string operator_code
        string status
        timestamp created_at
    }

    ai_analyses {
        serial id PK
        string report_id FK-UK
        string symptom_category
        text estimated_root_cause
        string related_part_name
        int similar_count
        int design_responsibility_pct
        text responsibility_reasoning
        int opportunity_cost_yen
        int total_loss_yen
        timestamp created_at
    }

    chargebacks {
        uuid id PK
        string report_id FK-UK
        int amount_yen
        string equipment_id FK
        string part_code FK
        boolean is_read
        boolean is_historical
        timestamp created_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        text message
        boolean is_read
        timestamp created_at
    }

    import_jobs {
        uuid id PK
        string status
        int total_count
        int processed_count
        int error_count
        timestamp created_at
    }

    import_records {
        serial id PK
        uuid job_id FK
        string status
        text error_detail
        string report_id FK
        timestamp created_at
    }

    countermeasures {
        serial id PK
        string equipment_id FK
        string part_code FK
        string status
        int cost_yen
        int predicted_annual_loss_yen
        float payback_period_months
        text investment_proposal_text
        timestamp created_at
        timestamp updated_at
    }
```

## テーブル詳細

### users

**目的**: ユーザー情報とRole管理。Supabase Authと連携し、auth.usersのidを参照。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | UUID | PK | Supabase Auth の user_id |
| email | VARCHAR(255) | NOT NULL, UNIQUE | ログイン用メールアドレス |
| role | VARCHAR(20) | NOT NULL, CHECK(role IN ('manufacturing','design','admin')) | ユーザー役割 |
| display_name | VARCHAR(100) | | 表示名 |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

### factories

**目的**: 工場マスタ。CSVの「工場」カラムから取得。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | SERIAL | PK | 自動採番ID |
| name | VARCHAR(100) | NOT NULL, UNIQUE | 工場名（例: 大口工場） |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

### lines

**目的**: ラインマスタ。機会損失計算に使うライン別単価を保持。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| line_id | VARCHAR(20) | PK | ラインID（例: LINE-A4）。CSVの「ラインID」 |
| name | VARCHAR(200) | NOT NULL | ライン名称（例: コンロ組立ライン） |
| factory_id | INTEGER | FK → factories.id, NOT NULL | 所属工場 |
| cost_per_minute | INTEGER | NOT NULL, DEFAULT 10000 | 1分あたり生産額（¥）。機会損失計算用 |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

### equipment

**目的**: 設備マスタ。CSVの設備情報を正規化して管理。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| equipment_id | VARCHAR(20) | PK | 設備ID（例: EQ-017）。CSVの「設備ID」 |
| name | VARCHAR(200) | NOT NULL | 設備名称（例: 組付コンベア） |
| manufacturer | VARCHAR(100) | | 設備メーカー（例: ダイフク） |
| installation_year | INTEGER | | 導入年 |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

### parts

**目的**: 部品マスタ。CSVの部品情報を正規化。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| part_code | VARCHAR(20) | PK | 部品コード（例: PRT-027）。CSVの「部品コード」 |
| name | VARCHAR(200) | | 部品名称（例: 近接センサー） |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

### products

**目的**: 製品マスタ。CSVの製品カテゴリ・製品名・型番を正規化。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | SERIAL | PK | 自動採番ID |
| category | VARCHAR(100) | | 製品カテゴリ（例: ビルトインガスコンロ） |
| name | VARCHAR(200) | | 製品名（例: Lisse（リッセ）） |
| model_number | VARCHAR(100) | UNIQUE | 型番（例: RHS31W32L17RSTW） |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

### trouble_reports

**目的**: トラブルレポートの中核テーブル。CSVインポートとアプリからの起票の両方を保持。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| report_id | VARCHAR(30) | PK | レポートID（例: MR-2026-089）。CSVの「record_id」 |
| internal_id | SERIAL | UNIQUE, NOT NULL | FAISS連携用の整数ID。FAISSはint64のみ受付のため、ベクトル検索ではこのIDを使用しreport_idとJOINする |
| reported_by | UUID | FK → users.id | 報告者。アプリ起票時はログインユーザー、CSV時はNULL |
| occurred_at | TIMESTAMP | NOT NULL | 発生日時 |
| completed_at | TIMESTAMP | | 対応完了日時 |
| line_id | VARCHAR(20) | FK → lines.line_id, NOT NULL | 発生ライン |
| equipment_id | VARCHAR(20) | FK → equipment.equipment_id, NOT NULL | 発生設備 |
| trouble_category | VARCHAR(20) | NOT NULL, CHECK(IN ('突発故障','品質不良','計画保守')) | トラブル区分 |
| downtime_minutes | INTEGER | NOT NULL | 停止時間（分） |
| production_impact | VARCHAR(50) | | 生産影響（チョコ停・設備単体停止・ライン停止等） |
| description_symptom | TEXT | NOT NULL | 現象記述（自然言語） |
| description_cause | TEXT | | 原因記述 |
| description_treatment | TEXT | | 処置記述 |
| note | TEXT | | 備考・引継ぎ |
| error_code | VARCHAR(20) | | エラーコード（例: E-401） |
| part_code | VARCHAR(20) | FK → parts.part_code | 交換部品コード |
| product_id | INTEGER | FK → products.id | 対象製品 |
| operator_code | VARCHAR(20) | | 担当者コード |
| part_cost_yen | INTEGER | DEFAULT 0 | 部品費（円） |
| outsourcing_cost_yen | INTEGER | DEFAULT 0 | 外注費（円） |
| total_direct_cost_yen | INTEGER | DEFAULT 0 | 合計直接コスト（円） |
| status | VARCHAR(10) | NOT NULL, DEFAULT '未対応', CHECK(IN ('未対応','対応中','完了')) | 対策ステータス |
| created_at | TIMESTAMP | DEFAULT NOW() | レコード作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | レコード更新日時 |

### ai_analyses

**目的**: LLMによるAI構造化解析結果。トラブルレポートと1:1。損失額の計算結果も保持。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | SERIAL | PK | 自動採番ID |
| report_id | VARCHAR(30) | FK → trouble_reports.report_id, UNIQUE, NOT NULL | 対象レポートID（1:1） |
| symptom_category | VARCHAR(100) | | AIが分類した現象カテゴリ |
| estimated_root_cause | TEXT | | AIが推定した根本原因 |
| related_part_name | VARCHAR(200) | | AIが照合した関連部品名 |
| similar_count | INTEGER | DEFAULT 0 | 過去の類似トラブル件数 |
| design_responsibility_pct | INTEGER | DEFAULT 0, CHECK(BETWEEN 0 AND 100) | 設計起因度（0〜100%） |
| responsibility_reasoning | TEXT | | 設計起因度の判定根拠テキスト |
| opportunity_cost_yen | INTEGER | DEFAULT 0 | 機会損失額（停止時間×ライン単価） |
| total_loss_yen | INTEGER | DEFAULT 0 | 総損失額（直接費＋機会損失） |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

### chargebacks

**目的**: 製造部門から設計部門へのCharge-back（責任コスト請求）レコード。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Charge-back ID |
| report_id | VARCHAR(30) | FK → trouble_reports.report_id, UNIQUE, NOT NULL | 対象レポートID（1:1） |
| amount_yen | INTEGER | NOT NULL | Charge-back金額（総損失額×設計起因度/100） |
| equipment_id | VARCHAR(20) | FK → equipment.equipment_id, NOT NULL | 対象設備（集計用） |
| part_code | VARCHAR(20) | FK → parts.part_code | 対象部品（集計用） |
| is_read | BOOLEAN | NOT NULL, DEFAULT FALSE | 設計部門の既読フラグ |
| is_historical | BOOLEAN | NOT NULL, DEFAULT FALSE | 過去データインポート由来フラグ。TRUEの場合、パレート集計には含まれるが新着通知（P004 #19）には表示されない |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

### notifications

**目的**: アプリ内通知。対策完了時の現場通知など。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 通知ID |
| user_id | UUID | FK → users.id, NOT NULL | 通知先ユーザー |
| message | TEXT | NOT NULL | 通知メッセージ本文 |
| is_read | BOOLEAN | NOT NULL, DEFAULT FALSE | 既読フラグ |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

### import_jobs

**目的**: CSVインポートのバッチジョブ管理。FastAPI BackgroundTasksのジョブ単位。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | ジョブID |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending', CHECK(IN ('pending','processing','completed','error')) | ジョブステータス |
| total_count | INTEGER | NOT NULL | インポート対象の総件数 |
| processed_count | INTEGER | NOT NULL, DEFAULT 0 | 処理済み件数 |
| error_count | INTEGER | NOT NULL, DEFAULT 0 | エラー件数 |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

### import_records

**目的**: インポートジョブ内の個別レコード管理。エラー追跡用。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | SERIAL | PK | 自動採番ID |
| job_id | UUID | FK → import_jobs.id, NOT NULL | 所属ジョブ |
| row_number | INTEGER | NOT NULL | CSV内の行番号（エラー特定用） |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending', CHECK(IN ('pending','processing','completed','error')) | レコードステータス |
| error_detail | TEXT | | エラー詳細（LLMタイムアウト・パースエラー等） |
| report_id | VARCHAR(30) | FK → trouble_reports.report_id | 作成されたレポートID |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

### countermeasures

**目的**: 設備・部品単位の対策管理。ROI計算結果とAI投資提案文を保持。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | SERIAL | PK | 自動採番ID |
| equipment_id | VARCHAR(20) | FK → equipment.equipment_id, NOT NULL | 対象設備 |
| part_code | VARCHAR(20) | FK → parts.part_code | 対象部品 |
| status | VARCHAR(10) | NOT NULL, DEFAULT '未対応', CHECK(IN ('未対応','対応中','完了')) | 対策ステータス |
| cost_yen | INTEGER | | 恒久対策の見積りコスト（ユーザー入力） |
| predicted_annual_loss_yen | INTEGER | | 予測年間損失額（過去実績年換算） |
| payback_period_months | REAL | | 投資回収期間（月） |
| investment_proposal_text | TEXT | | AI生成の投資提案文 |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

---

## インデックス設計

| テーブル | カラム | 種類 | 目的 |
|---------|--------|------|------|
| trouble_reports | occurred_at | B-tree | 日時範囲検索の高速化 |
| trouble_reports | equipment_id | B-tree | 設備単位の集計クエリ |
| trouble_reports | line_id | B-tree | ライン単位のフィルタ |
| trouble_reports | status | B-tree | ステータスフィルタ |
| trouble_reports | description_symptom | GIN (pg_trgm) | キーワード部分一致検索（P006 #28） |
| ai_analyses | design_responsibility_pct | B-tree | 設計起因度でのフィルタ |
| chargebacks | created_at | B-tree | 期間集計（月次・四半期）の高速化 |
| chargebacks | equipment_id | B-tree | 設備別パレート集計 |
| chargebacks | is_read, is_historical | 複合B-tree | 新着通知クエリ（is_read=FALSE AND is_historical=FALSE） |
| notifications | user_id, is_read | 複合B-tree | ユーザー別の未読通知取得 |

## ベクトル検索（FAISS）

ベクトルデータはPostgreSQLではなくFAISSファイルで管理する。

| 項目 | 内容 |
|------|------|
| ストレージ | ファイルベース（`data/faiss_index.bin`） |
| Embeddingモデル | OpenAI text-embedding-ada-002 等 |
| インデックス方式 | FAISS IndexFlatIP（内積）またはIndexFlatL2（L2距離） |
| IDマッピング | FAISSはint64のみ受付のため、`trouble_reports.internal_id`（SERIAL）をFAISS IDとして使用。検索結果のinternal_idでPostgreSQLにJOINしreport_idや詳細データを取得 |
| 書込タイミング | P002 #8（新規報告時）, P007 #37（バッチインポート時） |
| 読取タイミング | P002 #6（RAGサジェスト）, P005 #23（AI提案文用テキスト取得）, P006 #27（セマンティック検索） |

## 正規化メモ

- **第3正規化を基本**とし、パフォーマンスが必要な箇所のみ非正規化を許容
- `trouble_reports.total_direct_cost_yen` は `part_cost_yen + outsourcing_cost_yen` の冗長だが、CSVに元々存在するカラムのためそのまま保持。アプリ起票時はDB側で自動計算
- `chargebacks` に `equipment_id` と `part_code` を持たせているのは、パレート集計時にJOINを減らすための意図的な非正規化
- `countermeasures` は設備×部品の組み合わせ単位。P005画面の対策ステータスとROI計算結果を永続化
- `chargebacks.is_historical` は過去データインポート（P007）由来のレコードを区別し、新着通知スパムを防止するフラグ。パレート集計（#15,#16）には全件含まれるが、新着バッジ（#19）には `is_historical=FALSE` のみ表示
- `trouble_reports.internal_id` はFAISSのID制約（int64のみ）に対応するための整数キー。ビジネスキーの `report_id`（VARCHAR）とは別に、ベクトル検索専用のJOINキーとして機能

---

## 次のステップ

→ `/design-requirements-v2` で要件定義書を更新する
