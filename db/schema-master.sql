-- R2B Master Database Schema
-- Git管理対象：チェックリスト、Sprint計画、ルール定義のマスターデータ

-- ドメイン定義
CREATE TABLE IF NOT EXISTS domains (
  domain_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER
);

-- カテゴリ（Domain配下）
CREATE TABLE IF NOT EXISTS categories (
  category_id TEXT PRIMARY KEY,
  domain_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER,
  FOREIGN KEY (domain_id) REFERENCES domains(domain_id)
);

-- サブカテゴリ（Category配下）
CREATE TABLE IF NOT EXISTS subcategories (
  subcategory_id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER,
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- チェックリスト項目
CREATE TABLE IF NOT EXISTS checklist_items (
  item_id TEXT PRIMARY KEY,
  subcategory_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL,  -- "check_only" | "judgment_focused" | "implementation_optional" | "implementation_required"
  sort_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id)
);

-- Sprint別要件
CREATE TABLE IF NOT EXISTS sprint_requirements (
  item_id TEXT NOT NULL,
  sprint INTEGER NOT NULL,  -- 1..4
  required_status TEXT NOT NULL,  -- "CHECKED" | "BUILT" | "EXPLAINED" | "UNDERSTOOD"
  PRIMARY KEY (item_id, sprint),
  FOREIGN KEY (item_id) REFERENCES checklist_items(item_id)
);

-- 項目タイプごとのルール
CREATE TABLE IF NOT EXISTS item_type_rules (
  item_type TEXT PRIMARY KEY,
  max_status TEXT NOT NULL,  -- 到達可能なStatus上限
  built_allowed BOOLEAN,
  built_required BOOLEAN
);

-- Status定義
CREATE TABLE IF NOT EXISTS status_defs (
  status TEXT PRIMARY KEY,  -- "CHECKED" | "BUILT" | "EXPLAINED" | "UNDERSTOOD"
  rank INTEGER NOT NULL  -- 1..4（lower = earlier）
);

-- 項目リソース（参照資料、URL等）
CREATE TABLE IF NOT EXISTS item_resources (
  resource_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  kind TEXT,  -- 対応フェーズ（任意）
  title TEXT NOT NULL,
  url TEXT,
  FOREIGN KEY (item_id) REFERENCES checklist_items(item_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_categories_domain_id ON categories(domain_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_subcategory_id ON checklist_items(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_sprint_requirements_item_id ON sprint_requirements(item_id);
CREATE INDEX IF NOT EXISTS idx_sprint_requirements_sprint ON sprint_requirements(sprint);
CREATE INDEX IF NOT EXISTS idx_item_resources_item_id ON item_resources(item_id);
