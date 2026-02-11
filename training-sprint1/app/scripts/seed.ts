/**
 * 統合シーダースクリプト
 * 1. 既存データのクリア
 * 2. 物件・FAQ・お知らせの初期データ投入
 * 3. Supabase Auth ユーザー作成 + users テーブル同期
 *
 * 実行: npx tsx scripts/seed.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// .env.local を手動で読み込み
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PROPERTY_ID = 'a0000000-0000-0000-0000-000000000001';

const seedUsers = [
  {
    email: 'tanaka@example.com',
    password: 'password123',
    name: '田中 美咲',
    role: 'tenant' as const,
  },
  {
    email: 'sato@example.com',
    password: 'password123',
    name: '佐藤 健太',
    role: 'tenant' as const,
  },
  {
    email: 'suzuki@example.com',
    password: 'password123',
    name: '鈴木 誠一',
    role: 'admin' as const,
  },
];

async function clearData() {
  console.log('Clearing existing data...');

  // 子テーブルから順に削除（FK制約を考慮）
  const tables = [
    'messages',
    'conversations',
    'document_chunks',
    'documents',
    'faqs',
    'announcements',
    'users',
    // properties は保持（物件は手動管理）
  ];

  for (const table of tables) {
    const { error } = await admin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn(`  Warning: ${table} - ${error.message}`);
    } else {
      console.log(`  Cleared: ${table}`);
    }
  }
}

async function seedProperty() {
  console.log('\nSeeding property...');

  const { error } = await admin.from('properties').upsert({
    id: PROPERTY_ID,
    name: '大手町パークビルディング',
  });

  if (error) {
    console.error('  Error:', error.message);
  } else {
    console.log('  -> 大手町パークビルディング');
  }
}

async function seedAuthUsers() {
  console.log('\nCreating auth users...');

  for (const user of seedUsers) {
    // Supabase Auth にユーザー作成
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    let authId: string;

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log(`  [SKIP] ${user.email} - already exists in Auth`);
        const { data: listData } = await admin.auth.admin.listUsers();
        const existing = listData?.users.find((u) => u.email === user.email);
        if (!existing) continue;
        authId = existing.id;
      } else {
        console.error(`  [ERROR] ${user.email}:`, authError.message);
        continue;
      }
    } else {
      authId = authData.user.id;
      console.log(`  [OK] Auth: ${user.email}`);
    }

    // users テーブルに同期
    const { error } = await admin.from('users').upsert(
      {
        id: authId,
        property_id: PROPERTY_ID,
        email: user.email,
        password_hash: 'managed_by_supabase_auth',
        role: user.role,
        name: user.name,
      },
      { onConflict: 'email' }
    );

    if (error) {
      console.error(`  [ERROR] users table: ${user.email} - ${error.message}`);
    } else {
      console.log(`  [OK] Users table: ${user.email} (${user.role})`);
    }
  }
}

async function seedFaqs() {
  console.log('\nSeeding FAQs...');

  const faqs = [
    {
      property_id: PROPERTY_ID,
      category: 'ゴミ出し',
      question: 'ゴミの分別ルールを教えてください',
      answer:
        '可燃ゴミは月・水・金、不燃ゴミは火曜日、資源ゴミは木曜日です。ゴミ置き場はB1階にあります。',
    },
    {
      property_id: PROPERTY_ID,
      category: '空調',
      question: '空調の操作方法を教えてください',
      answer:
        '各フロアの空調リモコンで温度設定が可能です。営業時間外の空調利用は防災センターへ事前申請が必要です。',
    },
    {
      property_id: PROPERTY_ID,
      category: '入退館',
      question: '休日入館の申請方法を教えてください',
      answer:
        '休日入館には「休日入退館届」の提出が必要です。防災センターへ3日前までに提出してください。',
    },
    {
      property_id: PROPERTY_ID,
      category: '駐車場',
      question: '駐車場の利用方法を教えてください',
      answer:
        '地下駐車場は事前契約制です。来客用駐車場は1階受付で入庫証を発行します。利用時間は7:00〜22:00です。',
    },
    {
      property_id: PROPERTY_ID,
      category: '防災',
      question: '避難経路を教えてください',
      answer:
        '各フロアの非常口は東西2箇所にあります。避難階段を使用し、1階ロビーに集合してください。エレベーターは使用しないでください。',
    },
  ];

  const { error } = await admin.from('faqs').insert(faqs);
  if (error) {
    console.error('  Error:', error.message);
  } else {
    console.log(`  -> ${faqs.length} FAQs created`);
  }
}

async function seedAnnouncements() {
  console.log('\nSeeding announcements...');

  const announcements = [
    {
      property_id: PROPERTY_ID,
      title: 'テナント入居者ポータルを開設しました',
      body: 'ビルに関するご質問は、本ポータルのAIチャットをご利用ください。マニュアルの内容をもとにAIが回答いたします。',
      published_at: '2026-02-10T09:00:00+09:00',
    },
    {
      property_id: PROPERTY_ID,
      title: 'ゴミ出しルール変更のお知らせ',
      body: '2026年3月1日より、可燃ゴミの回収日が月・水・金から月・木に変更となります。詳細はマニュアルをご確認ください。',
      published_at: '2026-02-08T09:00:00+09:00',
    },
  ];

  const { error } = await admin.from('announcements').insert(announcements);
  if (error) {
    console.error('  Error:', error.message);
  } else {
    console.log(`  -> ${announcements.length} announcements created`);
  }
}

async function main() {
  console.log('=== Database Seeding ===\n');

  await clearData();
  await seedProperty();
  await seedAuthUsers();
  await seedFaqs();
  await seedAnnouncements();

  console.log('\n=== Seeding completed! ===');
}

main().catch(console.error);
