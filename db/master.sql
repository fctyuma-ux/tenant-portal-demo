-- R2B Master Database Initial Data
-- マスターDBの初期データ

-- Status定義
INSERT INTO status_defs (status, rank) VALUES
  ('CHECKED', 1),
  ('BUILT', 2),
  ('EXPLAINED', 3),
  ('UNDERSTOOD', 4);

-- 項目タイプごとのルール
INSERT INTO item_type_rules (item_type, max_status, built_allowed, built_required) VALUES
  ('implementation_required', 'UNDERSTOOD', TRUE, TRUE),
  ('implementation_optional', 'UNDERSTOOD', TRUE, FALSE),
  ('judgment_focused', 'UNDERSTOOD', FALSE, FALSE),
  ('check_only', 'CHECKED', FALSE, FALSE);

-- Domain定義
INSERT INTO domains (domain_id, name, sort_order) VALUES
  (0, 'AI駆動開発の基盤', 1),
  (1, '設計・要件', 2),
  (2, '実装', 3),
  (3, '品質・セキュリティ', 4),
  (4, '運用', 5);

-- 以下、実装プロジェクトで categories, subcategories, checklist_items を投入
