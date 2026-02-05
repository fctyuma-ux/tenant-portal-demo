-- R2B Quiz Database Schema
-- Git管理対象：クイズ問題と選択肢
-- Sprint × Subcategory に1問固定

-- クイズ問題
CREATE TABLE IF NOT EXISTS quiz_questions (
  question_id TEXT PRIMARY KEY,
  sprint INTEGER NOT NULL,  -- 1..4
  subcategory_id TEXT NOT NULL,  -- Master DB への論理参照
  question_text TEXT NOT NULL,
  explanation TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(sprint, subcategory_id)
);

-- クイズ選択肢
CREATE TABLE IF NOT EXISTS quiz_choices (
  choice_id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct BOOLEAN,
  sort_order INTEGER,
  feedback TEXT,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_quiz_questions_sprint ON quiz_questions(sprint);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_subcategory_id ON quiz_questions(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_sprint_subcategory ON quiz_questions(sprint, subcategory_id);
CREATE INDEX IF NOT EXISTS idx_quiz_choices_question_id ON quiz_choices(question_id);
