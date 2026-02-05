-- R2B Personal Database Schema
-- Git管理対象外：研修生個人の進捗データ、クイズ受験記録

-- 研修生（ローカル環境では基本1人）
CREATE TABLE IF NOT EXISTS trainees (
  trainee_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  current_sprint INTEGER DEFAULT 0  -- Sprint 0=初期化済み、1〜4=進行中
);

-- Sprint進行管理
-- 注: status は trainee_sprint_phases から自動計算で導出される（Single Source of Truth）
CREATE TABLE IF NOT EXISTS trainee_sprints (
  trainee_id TEXT NOT NULL,
  sprint INTEGER NOT NULL,                         -- 1〜4
  started_at TIMESTAMP,                            -- Sprint 初期化時刻
  completed_at TIMESTAMP,                          -- Sprint 完了時刻（全 phase が completed 時）
  PRIMARY KEY (trainee_id, sprint),
  FOREIGN KEY (trainee_id) REFERENCES trainees(trainee_id)
);

-- フェーズ進行管理（Sprint内の learn→design→build→review→presentation）
-- 注: phase の status が Single Source of Truth。Sprint status はこれから導出される
CREATE TABLE IF NOT EXISTS trainee_sprint_phases (
  trainee_id TEXT NOT NULL,
  sprint INTEGER NOT NULL,                         -- 1〜4
  phase TEXT NOT NULL,                             -- 'learn'|'design'|'build'|'review'|'presentation'
  status TEXT NOT NULL DEFAULT 'not_started',      -- 'not_started' | 'in_progress' | 'completed'
  started_at TIMESTAMP,                            -- フェーズ開始時刻
  completed_at TIMESTAMP,                          -- フェーズ完了時刻
  PRIMARY KEY (trainee_id, sprint, phase),
  FOREIGN KEY (trainee_id) REFERENCES trainees(trainee_id)
);

-- クイズ受験記録
CREATE TABLE IF NOT EXISTS trainee_quiz_attempts (
  attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
  trainee_id TEXT NOT NULL,
  sprint INTEGER NOT NULL,  -- 1..4
  subcategory_id TEXT NOT NULL,  -- Master DB への論理参照
  question_id TEXT NOT NULL,  -- Quiz DB への論理参照
  is_correct BOOLEAN,
  answer_payload TEXT,  -- JSON形式で回答内容を保存
  FOREIGN KEY (trainee_id) REFERENCES trainees(trainee_id)
);

-- クイズ合格記録
CREATE TABLE IF NOT EXISTS trainee_quiz_pass (
  trainee_id TEXT NOT NULL,
  sprint INTEGER NOT NULL,  -- 1..4
  subcategory_id TEXT NOT NULL,  -- Master DB への論理参照
  passed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (trainee_id, sprint, subcategory_id),
  FOREIGN KEY (trainee_id) REFERENCES trainees(trainee_id)
);

-- デフォルト研修生を作成（初回起動時、名前は /r2b-init で更新される）
INSERT OR IGNORE INTO trainees (trainee_id, name, is_active, current_sprint) VALUES ('default', 'user', TRUE, 1);

-- Sprint 1 初期化（最初のSprintを自動作成）
-- trainee_sprints レコード作成（started_at は /r2b-learn で更新される）
INSERT OR IGNORE INTO trainee_sprints (trainee_id, sprint, started_at)
VALUES ('default', 1, CURRENT_TIMESTAMP);

-- trainee_sprint_phases: 全 phase を 'not_started' で作成
INSERT OR IGNORE INTO trainee_sprint_phases (trainee_id, sprint, phase, status)
VALUES
  ('default', 1, 'learn', 'not_started'),
  ('default', 1, 'design', 'not_started'),
  ('default', 1, 'build', 'not_started'),
  ('default', 1, 'review', 'not_started'),
  ('default', 1, 'presentation', 'not_started');

-- インデックス
CREATE INDEX IF NOT EXISTS idx_trainee_sprints_trainee ON trainee_sprints(trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainee_sprint_phases_trainee_sprint ON trainee_sprint_phases(trainee_id, sprint);
CREATE INDEX IF NOT EXISTS idx_trainee_sprint_phases_status ON trainee_sprint_phases(trainee_id, status);
CREATE INDEX IF NOT EXISTS idx_trainee_quiz_attempts_trainee_id ON trainee_quiz_attempts(trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainee_quiz_attempts_sprint ON trainee_quiz_attempts(sprint);
CREATE INDEX IF NOT EXISTS idx_trainee_quiz_attempts_subcategory_id ON trainee_quiz_attempts(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_trainee_quiz_pass_trainee_id ON trainee_quiz_pass(trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainee_quiz_pass_sprint ON trainee_quiz_pass(sprint);
