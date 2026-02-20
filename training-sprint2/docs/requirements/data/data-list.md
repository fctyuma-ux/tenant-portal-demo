# Data 一覧

> IPO一覧および実データCSV（26カラム）から抽出した全データ項目。マスタ / トランザクション / AI生成 / システムの4カテゴリで整理。

---

## 1. マスタデータ（Master）

> 事前に登録され、トランザクションから参照される基盤データ

| # | データ名 | 説明 | 関連機能 | データ型 | 必須 |
|---|---------|------|---------|---------|------|
| M01 | user_id | ユーザーの一意識別子（Supabase Auth連携） | #1認証, #2Role判定 | UUID | Yes |
| M02 | email | ログイン用メールアドレス | #1認証 | string | Yes |
| M03 | password_hash | パスワードハッシュ（Supabase Auth管理） | #1認証 | string | Yes |
| M04 | role | ユーザーの役割（manufacturing / design / admin） | #2Role判定, #3リダイレクト | enum | Yes |
| M05 | factory_name | 工場名（例: 大口工場） | CSV: 工場 | string | Yes |
| M06 | line_id | ラインの一意識別子（例: LINE-A4） | CSV: ラインID, #5起票 | string | Yes |
| M07 | line_name | ライン名称（例: コンロ組立ライン（Mytone/テーブル）） | CSV: ライン名, #5起票 | string | Yes |
| M08 | line_cost_per_minute | ライン別の1分あたり生産額（機会損失計算用単価） | #11損失額計算, #22ROI年換算 | integer | Yes |
| M09 | equipment_id | 設備の一意識別子（例: EQ-017） | CSV: 設備ID, #5起票, #18遷移 | string | Yes |
| M10 | equipment_name | 設備名称（例: 組付コンベア） | CSV: 設備名, #5起票, #16ランキング | string | Yes |
| M11 | equipment_manufacturer | 設備メーカー名（例: ダイフク） | CSV: 設備メーカー | string | No |
| M12 | equipment_installation_year | 設備の導入年 | CSV: 導入年 | integer | No |
| M13 | part_code | 部品の一意識別子（例: PRT-027） | CSV: 部品コード, #10照合 | string | No |
| M14 | part_name | 交換部品名（例: 近接センサー） | CSV: 交換部品名, #16ランキング | string | No |
| M15 | product_category | 製品カテゴリ（例: ビルトインガスコンロ） | CSV: 製品カテゴリ | string | No |
| M16 | product_name | 対象製品名（例: Lisse（リッセ）） | CSV: 対象製品 | string | No |
| M17 | product_model_number | 製品型番（例: RHS31W32L17RSTW） | CSV: 型番, #28キーワード検索 | string | No |
| M18 | operator_code | 担当者コード（例: MT-009） | CSV: 担当者コード | string | No |

---

## 2. トランザクションデータ（Transaction）

> トラブル発生のたびに作成される業務データ

| # | データ名 | 説明 | 関連機能 | データ型 | 必須 |
|---|---------|------|---------|---------|------|
| T01 | report_id | トラブルレポートの一意識別子（例: MR-2026-089） | #8送信, #10構造化, #13Charge-back | string | Yes |
| T01b | internal_id | FAISS連携用の整数ID（SERIAL）。FAISSはint64のみ受付のため、ベクトル検索ではこのIDを使用しreport_idとJOIN | #6RAG, #27セマンティック検索, #37バッチ | serial | Yes |
| T02 | reported_by | 報告者のuser_id | #8送信, #9過去報告, #25通知 | UUID | Yes |
| T03 | occurred_at | トラブル発生日時 | CSV: 発生日時, #5起票 | timestamp | Yes |
| T04 | completed_at | トラブル対応完了日時 | CSV: 完了日時 | timestamp | No |
| T05 | line_id | 発生ライン（ラインマスタFK） | #5起票, #11単価取得 | string | Yes |
| T06 | equipment_id | 発生設備（設備マスタFK） | #5起票, #18遷移, #20集約 | string | Yes |
| T07 | trouble_category | トラブル区分（突発故障 / 品質不良 / 計画保守） | CSV: トラブル区分 | enum | Yes |
| T08 | downtime_minutes | 停止時間（分） | CSV: 停止時間_分, #5起票, #11計算 | integer | Yes |
| T09 | production_impact | 生産影響（チョコ停 / 設備単体停止 / ライン停止 / 品質低下等） | CSV: 生産影響 | string | No |
| T10 | description_symptom | 現象記述（自然言語テキスト） | CSV: 現象記述, #5起票, #6RAGサジェスト | text | Yes |
| T11 | description_cause | 原因記述（自然言語テキスト） | CSV: 原因記述 | text | No |
| T12 | description_treatment | 処置記述（自然言語テキスト） | CSV: 処置記述 | text | No |
| T13 | note | 備考・引継ぎ情報 | CSV: 備考_引継ぎ | text | No |
| T14 | error_code | 設備のエラーコード（例: E-401） | #5起票, #28キーワード検索 | string | No |
| T15 | part_code | 交換部品コード（部品マスタFK） | CSV: 部品コード, #10照合 | string | No |
| T16 | part_cost_yen | 部品費（円） | CSV: 部品費_円 | integer | No |
| T17 | outsourcing_cost_yen | 外注費（円） | CSV: 外注費_円 | integer | No |
| T18 | total_direct_cost_yen | 合計直接コスト（円）= 部品費 + 外注費 | CSV: 合計コスト_円, #11直接費 | integer | No |
| T19 | status | トラブルの対策ステータス（未対応 / 対応中 / 完了） | #24ステータス更新, #31一覧, #34フィルタ | enum | Yes |
| T20 | created_at | レコード作成日時 | #8送信 | timestamp | Yes |

---

## 3. AI生成データ（AI-Generated）

> LLM / RAG によって生成・算出されるデータ

| # | データ名 | 説明 | 関連機能 | データ型 | 必須 |
|---|---------|------|---------|---------|------|
| A01 | symptom_category | AIが分類した現象カテゴリ | #10構造化, #37バッチ | string | Yes |
| A02 | estimated_root_cause | AIが推定した根本原因 | #10構造化, #37バッチ | text | Yes |
| A03 | related_part_name | AIが照合した関連部品名 | #10構造化 | string | No |
| A04 | similar_count | 過去の類似トラブル件数 | #10構造化 | integer | No |
| A05 | design_responsibility_pct | 設計起因度（0〜100%） | #12責任判定, #37バッチ | integer | Yes |
| A06 | responsibility_reasoning | 設計起因度の判定根拠テキスト | #12責任判定 | text | Yes |
| A07 | opportunity_cost_yen | 機会損失額（停止時間 × ライン別単価） | #11損失額計算 | integer | Yes |
| A08 | total_loss_yen | 総損失額（直接費 + 機会損失） | #11損失額計算, #13Charge-back | integer | Yes |
| A09 | embedding_vector | テキストのベクトル表現（Embedding）。FAISSファイルに保存。キーはtrouble_reports.internal_id（int64） | #6RAG, #27セマンティック検索, #37バッチ | vector(FAISS) | Yes |
| A10 | investment_proposal_text | AI生成の投資提案文（技術的背景・経営リスク・推奨アクション） | #23AI提案文 | text | No |

---

## 4. システムデータ（System）

> Charge-back、通知、ジョブ管理などのシステム運用データ

| # | データ名 | 説明 | 関連機能 | データ型 | 必須 |
|---|---------|------|---------|---------|------|
| S01 | chargeback_id | Charge-backレコードの一意識別子 | #13実行 | UUID | Yes |
| S02 | chargeback_report_id | 対象トラブルレポートID（FK） | #13実行 | string | Yes |
| S03 | chargeback_amount_yen | Charge-back金額（総損失額 × 設計起因度/100） | #13実行, #7累計, #15総額, #16ランキング | integer | Yes |
| S04 | chargeback_equipment_id | 対象設備ID（集計用FK） | #16ランキング | string | Yes |
| S05 | chargeback_part_code | 対象部品コード（集計用FK） | #16ランキング | string | No |
| S06 | chargeback_created_at | Charge-back作成日時 | #7累計（当月集計）, #15（期間集計） | timestamp | Yes |
| S07 | chargeback_is_read | 設計部門の既読フラグ | #19新着通知 | boolean | Yes |
| S07b | chargeback_is_historical | 過去データインポート由来フラグ。TRUEならパレート集計には含むが新着通知には非表示 | #19新着通知, #37バッチ | boolean | Yes |
| S08 | notification_id | 通知の一意識別子 | #25通知 | UUID | Yes |
| S09 | notification_user_id | 通知先ユーザーID | #25通知 | UUID | Yes |
| S10 | notification_message | 通知メッセージ本文 | #25通知 | text | Yes |
| S11 | notification_created_at | 通知作成日時 | #25通知 | timestamp | Yes |
| S12 | notification_is_read | 通知の既読フラグ | P002（表示制御） | boolean | Yes |
| S13 | import_job_id | インポートジョブの一意識別子 | #37バッチ, #38ポーリング | UUID | Yes |
| S14 | import_job_status | ジョブ全体のステータス（pending / processing / completed / error） | #38ポーリング | enum | Yes |
| S15 | import_job_total_count | インポート対象の総件数 | #38ポーリング | integer | Yes |
| S16 | import_job_processed_count | 処理済み件数 | #38ポーリング | integer | Yes |
| S17 | import_job_error_count | エラー件数 | #38ポーリング, #39結果 | integer | Yes |
| S18 | import_job_created_at | ジョブ作成日時 | #37バッチ | timestamp | Yes |
| S19 | import_record_status | 個別レコードのステータス（pending / processing / completed / error） | #37バッチ | enum | Yes |
| S20 | import_record_error_detail | 個別レコードのエラー詳細 | #39結果 | text | No |
| S21 | countermeasure_cost_yen | 恒久対策の見積りコスト（ユーザー入力） | #22ROI | integer | No |
| S22 | predicted_annual_loss_yen | 予測年間損失額（過去実績年換算） | #22ROI | integer | No |
| S23 | payback_period_months | 投資回収期間（月） | #22ROI | float | No |

---

## データ項目サマリー

| カテゴリ | 件数 | 説明 |
|---------|------|------|
| マスタデータ（M） | 18 | ユーザー・工場・ライン・設備・部品・製品 |
| トランザクションデータ（T） | 21 | トラブルレポートの業務データ（+internal_id for FAISS） |
| AI生成データ（A） | 10 | LLM構造化・責任判定・損失計算・Embedding（FAISS） |
| システムデータ（S） | 24 | Charge-back（+is_historical）・通知・ジョブ管理・ROI |
| **合計** | **73** | |

---

## 次のステップ

→ `/design-db` でDB設計書を作成する
