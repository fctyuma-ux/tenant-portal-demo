---
name: foundation-migration-seeder
description: マイグレーションスクリプト・モデルファクトリー・シーダー実装
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# Slice 0-3: Migration & Seeder

マイグレーションスクリプト・モデルファクトリー・シーダーを実装するスキル。

## Purpose

開発・テスト用のデータ基盤を整備する：

1. Supabase マイグレーション管理スクリプト実装
2. モデルファクトリー実装（テスト用ダミーデータ生成）
3. シーダー実装（初期データ投入）
4. 動作確認

## When to use

- `/foundation-database-setup` 完了後に実行
- テスト用ダミーデータを生成したい
- 初期データを投入したい

## Outputs

```
db/
├── schema.sql              # テーブル定義
├── migrations/             # マイグレーションファイル
│   └── 001_initial_schema.sql
├── factories/              # モデルファクトリー
│   └── index.ts
└── seeders/               # シーダー
    └── seed.ts

__tests__/
└── factories/
    └── user.factory.ts
```

## Procedure

### Step 1: マイグレーション管理の仕組みを構築

#### 1-1. マイグレーション格納フォルダ作成

```bash
mkdir -p db/migrations
```

#### 1-2. マイグレーション初期ファイル作成

`db/migrations/001_initial_schema.sql` を作成：

```sql
-- Migration: Initial Schema
-- Created: 2026-02-11
-- Description: 初期テーブル・スキーマ作成

-- users テーブル
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- group_members テーブル
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
```

#### 1-3. マイグレーション実行スクリプト

`db/run-migrations.ts` を作成（Node.js スクリプト）：

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const client = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`Running migration: ${file}`);

    try {
      const { error } = await client.sql(sql);
      if (error) {
        console.error(`Error in ${file}:`, error);
      } else {
        console.log(`✓ ${file} completed`);
      }
    } catch (e) {
      console.error(`Exception in ${file}:`, e);
    }
  }
}

runMigrations().catch(console.error);
```

### Step 2: モデルファクトリー実装

#### 2-1. ファクトリーヘルパーを作成

`db/factories/index.ts` を作成：

```typescript
import { faker } from '@faker-js/faker/locale/ja';

// User Factory
export function createUserData(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    first_name: faker.person.firstName('male'),
    last_name: faker.person.lastName('male'),
    password_hash: 'hashed_password_' + faker.string.alphaNumeric(10),
    deleted_at: null,
    created_at: faker.date.past(),
    updated_at: faker.date.recent(),
    ...overrides,
  };
}

// Group Factory
export function createGroupData(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: faker.lorem.paragraph(),
    created_at: faker.date.past(),
    updated_at: faker.date.recent(),
    ...overrides,
  };
}

// GroupMember Factory
export function createGroupMemberData(groupId: string, userId: string, overrides = {}) {
  return {
    id: faker.string.uuid(),
    group_id: groupId,
    user_id: userId,
    role: faker.helpers.arrayElement(['admin', 'member']),
    created_at: faker.date.past(),
    ...overrides,
  };
}

// Batch: 複数生成
export function createUsers(count: number, overrides = {}) {
  return Array.from({ length: count }, () => createUserData(overrides));
}

export function createGroups(count: number, overrides = {}) {
  return Array.from({ length: count }, () => createGroupData(overrides));
}
```

#### 2-2. package.json に faker 追加

```bash
npm install --save-dev @faker-js/faker
```

### Step 3: シーダー実装

`db/seeders/seed.ts` を作成：

```typescript
import { createClient } from '@supabase/supabase-js';
import {
  createUserData,
  createGroupData,
  createGroupMemberData,
  createUsers,
  createGroups,
} from '../factories';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const client = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  console.log('🌱 Database seeding started...');

  try {
    // テーブルをクリア（既存データ削除）
    console.log('Clearing existing data...');
    await client.from('group_members').delete().neq('id', '');
    await client.from('groups').delete().neq('id', '');
    await client.from('users').delete().neq('id', '');

    // ユーザーを 5 人作成
    console.log('Creating users...');
    const users = createUsers(5, {});
    const { data: insertedUsers, error: userError } = await client
      .from('users')
      .insert(users)
      .select();

    if (userError) {
      console.error('Error inserting users:', userError);
      return;
    }

    console.log(`✓ Created ${insertedUsers.length} users`);

    // グループを 3 個作成
    console.log('Creating groups...');
    const groups = createGroups(3, {});
    const { data: insertedGroups, error: groupError } = await client
      .from('groups')
      .insert(groups)
      .select();

    if (groupError) {
      console.error('Error inserting groups:', groupError);
      return;
    }

    console.log(`✓ Created ${insertedGroups.length} groups`);

    // グループメンバーを追加
    console.log('Creating group members...');
    const groupMembers = [];
    for (const group of insertedGroups) {
      // グループごとに 2-3 人のユーザーを割り当て
      const membersCount = Math.floor(Math.random() * 2) + 2;
      const selectedUsers = insertedUsers.slice(0, membersCount);

      for (const user of selectedUsers) {
        groupMembers.push(
          createGroupMemberData(group.id, user.id, {
            role: Math.random() > 0.7 ? 'admin' : 'member',
          })
        );
      }
    }

    const { data: insertedMembers, error: memberError } = await client
      .from('group_members')
      .insert(groupMembers)
      .select();

    if (memberError) {
      console.error('Error inserting group members:', memberError);
      return;
    }

    console.log(`✓ Created ${insertedMembers.length} group members`);

    console.log('✨ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

seedDatabase();
```

### Step 4: package.json にスクリプト追加

```json
{
  "scripts": {
    "db:migrate": "ts-node db/run-migrations.ts",
    "db:seed": "ts-node db/seeders/seed.ts",
    "db:reset": "npm run db:seed"
  }
}
```

### Step 5: テスト用ファクトリーも作成（オプション）

`__tests__/factories/user.factory.ts` を作成：

```typescript
import { createUserData, createUsers } from '../../db/factories';

describe('User Factory', () => {
  it('should create a valid user object', () => {
    const user = createUserData();

    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('password_hash');
    expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('should override properties', () => {
    const user = createUserData({
      email: 'custom@example.com',
      first_name: 'John',
    });

    expect(user.email).toBe('custom@example.com');
    expect(user.first_name).toBe('John');
  });

  it('should create multiple users', () => {
    const users = createUsers(5);

    expect(users).toHaveLength(5);
    expect(users.every(u => u.id)).toBe(true);
  });
});
```

### Step 6: 動作確認

#### 6-1. マイグレーション実行

```bash
npm run db:migrate
```

**確認**:
```
Running migration: 001_initial_schema.sql
✓ 001_initial_schema.sql completed
```

#### 6-2. シーダー実行

```bash
npm run db:seed
```

**確認**:
```
🌱 Database seeding started...
Clearing existing data...
Creating users...
✓ Created 5 users
Creating groups...
✓ Created 3 groups
Creating group members...
✓ Created 6 group members
✨ Database seeding completed successfully!
```

#### 6-3. Supabase Dashboard で確認

```
Supabase Dashboard
  → Database
    → Tables
      → users: 5 件のデータ
      → groups: 3 件のデータ
      → group_members: 6 件のデータ
```

## チェックリスト

### Slice 0-3 完了時

- [ ] db/migrations/ フォルダ作成
- [ ] マイグレーション初期ファイル作成
- [ ] マイグレーション実行スクリプト実装
- [ ] モデルファクトリー実装（User, Group）
- [ ] @faker-js/faker インストール
- [ ] シーダー実装
- [ ] package.json に db:migrate, db:seed スクリプト追加
- [ ] マイグレーション実行確認
- [ ] シーダー実行確認
- [ ] Supabase Dashboard でデータ確認

### 次のステップ

Slice 0-3 完了後は、**Slice 1-1: User Authentication を実行**

```
Slice 0-1: Project Setup
  ↓
Slice 0-2: Database Setup
  ↓
Slice 0-3: Migration & Seeder（ここ）
  ↓
Slice 1-1: User Authentication
```

## よくある落とし穴

- ❌ マイグレーションファイル番号の重複（001, 002 など規則的に）
- ❌ faker インストール忘れ
- ❌ SERVICE_ROLE_KEY を環境変数に設定忘れ
- ❌ シーダー実行時にテーブルがない
- ❌ マイグレーション順序を考慮しない（FK 参照エラー）

## 注意事項

- 開発環境でのみシーダー実行
- 本番環境では手動でマイグレーション管理を推奨（Supabase CLI 使用）
- データベーススキーマ変更時はマイグレーションファイルを新規作成
- faker の locale を日本語（ja）に設定
- 大量データテスト時は timeout 設定に注意
