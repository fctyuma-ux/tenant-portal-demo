-- R2B Personal Database Schema
-- Git管理対象外：研修生個人の進捗データ

-- 研修生（ローカル環境では基本1人）
CREATE TABLE IF NOT EXISTS trainee (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL,
  current_sprint INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 研修生進捗
CREATE TABLE IF NOT EXISTS progress (
  item_id TEXT NOT NULL,            -- "CK-5" or "CK-5-K1"
  status TEXT NOT NULL,             -- "check", "build", "explained", "understood"
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  note TEXT,
  PRIMARY KEY (item_id)
);

-- 進捗履歴
CREATE TABLE IF NOT EXISTS progress_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  sprint INTEGER NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- デフォルト研修生を作成（初回起動時、名前は /r2b-init で更新される）
INSERT OR IGNORE INTO trainee (id, name, current_sprint) VALUES ('default', 'user', 0);

-- パーソナルDB用のインデックス
CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(status);
CREATE INDEX IF NOT EXISTS idx_progress_updated_at ON progress(updated_at);
CREATE INDEX IF NOT EXISTS idx_progress_history_item_id ON progress_history(item_id);
