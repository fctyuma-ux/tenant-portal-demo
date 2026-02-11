---
name: foundation-database-setup
description: Supabase データベース初期化・テーブル・スキーマ・インデックス設定
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# Slice 0-2: Database Setup

Supabase データベース初期化・スキーマ作成・インデックス・制約設定を行うスキル。

## Purpose

データベースの基盤を整備する：

1. Supabase プロジェクト初期化（既存の場合はスキップ）
2. テーブル・スキーマ作成（database-design.md から導出）
3. インデックス・制約設定
4. 初期化スクリプト実行確認

## When to use

- `/foundation-project-setup` 完了後に実行
- データベーススキーマを初期化したい
- テーブル・インデックスを作成したい

## Inputs

- `../docs/requirements/database/database-design.md` - DB スキーマ設計
- Supabase プロジェクト認証情報

## Outputs

Supabase 上に初期化されたテーブル：
```
users
├── id (UUID, PK)
├── email (VARCHAR, UNIQUE)
├── first_name, last_name
├── password_hash
├── deleted_at (TIMESTAMP, NULL)
├── created_at, updated_at

groups
├── id (UUID, PK)
├── name (VARCHAR)
├── description (TEXT)
├── created_at, updated_at

group_members
├── group_id, user_id (FK)
├── role (VARCHAR)
├── created_at

... (その他テーブル)
```

## Procedure

### Step 1: Supabase プロジェクト確認・初期化

#### 1-1. Supabase プロジェクト確認

Supabase にログインして確認：
- [ ] Supabase プロジェクトが存在するか
- [ ] プロジェクト URL を確認
- [ ] API Key を確認

**なければプロジェクト作成**:
```
https://supabase.com → New Project → Organization 選択 → Project 作成
```

#### 1-2. 環境変数を設定

`.env.local` を作成：

```bash
# Supabase 設定
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 2: database-design.md を確認

`../docs/requirements/database/database-design.md` からスキーマ情報を取得：

**確認項目**:
- [ ] テーブル一覧を確認
- [ ] カラム定義（型・制約）を確認
- [ ] リレーション（FK）を確認
- [ ] インデックス戦略を確認

**例**:
```markdown
## Table: users
- id (UUID, PK, DEFAULT gen_random_uuid())
- email (VARCHAR, UNIQUE, NOT NULL)
- first_name (VARCHAR)
- last_name (VARCHAR)
- password_hash (VARCHAR, NOT NULL)
- deleted_at (TIMESTAMP, NULL)
- created_at (TIMESTAMP, DEFAULT now())
- updated_at (TIMESTAMP, DEFAULT now())

## Indexes
- idx_users_email (email)
- idx_users_deleted_at (deleted_at)
```

### Step 3: テーブル作成スクリプト生成

`db/schema.sql` を作成（database-design.md から導出）：

```sql
-- users テーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- groups テーブル
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- group_members テーブル（リレーション）
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- インデックス作成
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);

-- RLS（Row Level Security）有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
```

### Step 4: Supabase SQL エディタで実行

Supabase Dashboard の SQL エディタでスクリプト実行：

```
Supabase Dashboard
  → SQL Editor
  → 新規クエリ
  → schema.sql の内容をコピペ
  → Execute
```

**確認**:
- [ ] エラーなく実行完了
- [ ] テーブルが作成されている（Table ビューで確認）

### Step 5: ローカルスキーマファイル作成

プロジェクト内に `db/schema.sql` を保存（バージョン管理用）：

```bash
mkdir -p db
cat > db/schema.sql << 'EOF'
-- schema.sql の内容をコピペ
EOF
```

### Step 6: RLS ポリシー設定（認証あり）

認証が必要な場合は RLS ポリシーを設定：

**例（users テーブル）**:
```sql
-- 自分のレコードのみ閲覧可能
CREATE POLICY select_own_user ON users
  FOR SELECT
  USING (auth.uid() = id);

-- サインアップ時のみ insert 可能
CREATE POLICY insert_user ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 自分のレコードのみ update 可能
CREATE POLICY update_own_user ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### Step 7: 初期化確認

```bash
# Supabase CLI でスキーマ確認
supabase db list

# または、Supabase Dashboard で確認
# Dashboard → Database → Tables
```

**確認項目**:
- [ ] テーブルがすべて作成されている
- [ ] カラム型が正しい
- [ ] インデックスが作成されている
- [ ] FK が正しく設定されている

## チェックリスト

### Slice 0-2 完了時

- [ ] Supabase プロジェクト初期化完了
- [ ] database-design.md を確認した
- [ ] schema.sql を作成した
- [ ] Supabase SQL エディタで実行完了
- [ ] テーブル・インデックス・FK 確認完了
- [ ] db/schema.sql をプロジェクトに保存した
- [ ] RLS ポリシー設定完了（認証あり）

### 次のステップ

Slice 0-2 完了後は、**Slice 0-3: Migration & Seeder を実行**

```
Slice 0-1: Project Setup
  ↓
Slice 0-2: Database Setup（ここ）
  ↓
Slice 0-3: Migration & Seeder
  ↓
Slice 1-1: User Authentication
```

## よくある落とし穴

- ❌ database-design.md を確認せずにテーブル作成
- ❌ PRIMARY KEY や FOREIGN KEY 設定忘れ
- ❌ インデックス設定忘れ（パフォーマンス低下）
- ❌ RLS ポリシー設定忘れ（セキュリティリスク）
- ❌ 環境変数設定忘れ（接続エラー）

## 注意事項

- Supabase 無料プランは 1GB ストレージまで
- 本番環境での migration は別途管理（Supabase CLI 使用推奨）
- database-design.md が最新か確認してから実行
- スキーマ変更時はすべてのドキュメント（API, Service）と整合確認
