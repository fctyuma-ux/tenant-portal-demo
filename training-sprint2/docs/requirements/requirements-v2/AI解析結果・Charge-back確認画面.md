# 要件定義書 v2: AI解析結果・Charge-back確認画面（P003）

> DB設計を踏まえた要件定義書の更新

## 目的

AIが構造化したトラブルデータ（現象/原因の分類）と自動計算された総損失額（修繕費＋機会損失）をプレビューし、設計部門への責任コスト請求（Charge-back）を即時実行する。

## 機能

| # | 機能 | 説明 | DB関連テーブル |
|---|------|------|--------------|
| 1 | AI構造化データ表示 | AIが入力テキストから抽出した「現象」「推定原因」「関連部品」「過去類似件数」を表示 | `ai_analyses` READ, `trouble_reports` READ, `parts` READ |
| 2 | 総損失額プレビュー | 直接費（修繕費・部品代）＋機会損失（停止時間×ライン別単価）の内訳と合計を表示 | `lines` READ（cost_per_minute）, `trouble_reports` READ, `ai_analyses` READ |
| 3 | 責任判定表示 | AIが判定した設計起因度（%）と判定根拠を表示 | `ai_analyses` READ |
| 4 | Charge-back実行 | 設計部門への責任コスト請求を即時実行（承認フローなし） | `chargebacks` INSERT, `ai_analyses` READ |
| 5 | 報告の修正 | AI構造化データの内容を手動で修正・補足 | `ai_analyses` UPDATE, `trouble_reports` UPDATE |

## Input / Process / Output

| 機能 | Input | Process | Output | DB関連テーブル |
|------|-------|---------|--------|--------------|
| AI構造化データ表示 | トラブルレポートID（P002から遷移時に取得） | `ai_analyses`テーブルからreport_idで取得。`parts`テーブルとrelated_part_nameを照合 | 構造化データ（symptom_category, estimated_root_cause, related_part_name, similar_count） | `ai_analyses` READ, `trouble_reports` READ, `parts` READ |
| 総損失額プレビュー | 停止時間（分）、ライン名 | `lines`テーブルからline_idでcost_per_minuteを取得。機会損失=downtime_minutes×cost_per_minute。`ai_analyses`のopportunity_cost_yen, total_loss_yenを表示 | 損失額内訳（直接費 + 機会損失 = 総損失額） | `lines` READ, `trouble_reports` READ, `ai_analyses` READ |
| 責任判定表示 | トラブルレポートID、AI解析結果 | `ai_analyses`テーブルからdesign_responsibility_pctとresponsibility_reasoningを取得 | 設計起因度（%）、判定根拠テキスト | `ai_analyses` READ |
| Charge-back実行 | トラブルレポートID、総損失額、設計起因度 | `chargebacks`テーブルにINSERT（amount_yen=total_loss_yen×design_responsibility_pct/100, equipment_id, part_code, is_historical=FALSE）。設計部門のダッシュボードに即時反映 | 成功: P002へ遷移（累計金額更新）/ 失敗: エラーメッセージ | `chargebacks` INSERT, `ai_analyses` READ, `trouble_reports` READ |
| 報告の修正 | 修正後の構造化データ（現象・原因・部品の変更） | `ai_analyses`テーブルを上書きUPDATE。損失額・責任判定を再計算しai_analysesも更新 | 更新された構造化データ・損失額・責任判定の再表示 | `ai_analyses` UPDATE, `trouble_reports` UPDATE |

## UI状態遷移

| 要素 | 対応機能 | 状態 | DB関連テーブル |
|------|---------|------|--------------|
| AI構造化データカード | AI構造化データ表示 | ローディング（AI解析中）→ 結果表示 → 編集モード（修正ボタン押下時） | `ai_analyses` READ |
| 損失額内訳パネル | 総損失額プレビュー | ローディング → 金額表示（直接費・機会損失・総額の内訳） | `lines` READ, `ai_analyses` READ |
| 責任判定パネル | 責任判定表示 | ローディング → 判定結果表示（起因度%＋根拠テキスト） | `ai_analyses` READ |
| 修正ボタン | 報告の修正 | 表示モード: 「修正」→ 編集モード: 「保存」「キャンセル」 | `ai_analyses` UPDATE |
| 設計へ請求ボタン | Charge-back実行 | 無効（AI解析中）→ 有効（解析完了）→ ローディング（請求処理中）→ 完了（P002へ遷移） | `chargebacks` INSERT |

---

## 次のステップ

→ `/design-api` でAPI設計書を作成する
