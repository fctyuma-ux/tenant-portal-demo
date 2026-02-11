-- ========================================
-- 物件テーブル
-- ========================================
create table properties (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================================
-- ユーザーテーブル
-- ========================================
create table users (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  role varchar(20) not null check (role in ('tenant', 'admin')),
  name varchar(255) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_users_email on users(email);
create index idx_users_property_id on users(property_id);

-- ========================================
-- ドキュメントテーブル
-- ========================================
create table documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  file_name varchar(255) not null,
  file_path varchar(1024) not null,
  page_count integer not null default 0,
  analysis_status varchar(20) not null default 'pending'
    check (analysis_status in ('pending', 'processing', 'completed', 'error')),
  publish_status varchar(20) not null default 'unpublished'
    check (publish_status in ('unpublished', 'published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_documents_property_id on documents(property_id);

-- ========================================
-- ドキュメントチャンクテーブル（ナレッジベース）
-- ========================================
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,
  embedding vector(1536) not null,
  page_number integer not null,
  page_image_path varchar(1024),
  created_at timestamptz default now()
);

create index idx_document_chunks_document_id on document_chunks(document_id);

-- ========================================
-- FAQテーブル
-- ========================================
create table faqs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  category varchar(100) not null,
  question text not null,
  answer text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_faqs_property_id on faqs(property_id);
create index idx_faqs_category on faqs(category);

-- ========================================
-- 会話テーブル
-- ========================================
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  created_at timestamptz default now()
);

create index idx_conversations_user_id on conversations(user_id);

-- ========================================
-- メッセージテーブル
-- ========================================
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role varchar(20) not null check (role in ('user', 'assistant')),
  content text not null,
  feedback varchar(20) check (feedback in ('positive', 'negative')),
  created_at timestamptz default now()
);

create index idx_messages_conversation_id on messages(conversation_id);

-- ========================================
-- お知らせテーブル
-- ========================================
create table announcements (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  title varchar(255) not null,
  body text not null,
  published_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_announcements_property_id on announcements(property_id);
create index idx_announcements_published_at on announcements(published_at desc);
