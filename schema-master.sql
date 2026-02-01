-- R2B Master Database Schema
-- Git管理対象：チェックリストとSprint計画のマスターデータ

-- チェックリスト項目（マスター）
CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,              -- "CK-5"
  domain INTEGER NOT NULL,          -- 0-5
  category TEXT NOT NULL,           -- "XXI. LLM・生成AI"
  subcategory TEXT NOT NULL,        -- "CK. LLMアプリケーション構築"
  title TEXT NOT NULL,              -- "音声入出力"
  type TEXT NOT NULL                -- "implementation_required" 等
);

-- Sprint計画（どのSprintでどのStatusまで到達するか）
CREATE TABLE IF NOT EXISTS sprint_plan (
  item_id TEXT NOT NULL,
  sprint INTEGER NOT NULL,          -- 1-4
  required_status TEXT NOT NULL,    -- JSON ["check", "build", "explained"]
  PRIMARY KEY (item_id, sprint),
  FOREIGN KEY (item_id) REFERENCES checklist_items(id)
);

-- チェックリスト詳細項目（知識・経験）
CREATE TABLE IF NOT EXISTS checklist_details (
  id TEXT PRIMARY KEY,              -- "CK-5-K1"
  parent_id TEXT NOT NULL,          -- "CK-5"
  type TEXT NOT NULL,               -- "knowledge" or "experience"
  title TEXT NOT NULL,
  description TEXT,
  required_status TEXT NOT NULL,    -- JSON ["check", "explained", "understood"]
  reference_url TEXT,
  FOREIGN KEY (parent_id) REFERENCES checklist_items(id)
);

-- ビュー: Sprint別チェックリスト一覧
CREATE VIEW IF NOT EXISTS v_sprint_checklist AS
SELECT
  sp.sprint,
  ci.id,
  ci.domain,
  ci.category,
  ci.subcategory,
  ci.title,
  ci.type,
  sp.required_status
FROM sprint_plan sp
JOIN checklist_items ci ON sp.item_id = ci.id
ORDER BY sp.sprint, ci.domain, ci.id;
