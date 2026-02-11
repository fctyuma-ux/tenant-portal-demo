/**
 * Supabase Auth にシードユーザーを作成するスクリプト
 * 実行: npx tsx scripts/create-auth-users.ts
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PROPERTY_ID = "a0000000-0000-0000-0000-000000000001";

const seedUsers = [
  {
    email: "tanaka@example.com",
    password: "password123",
    name: "田中 美咲",
    role: "tenant" as const,
  },
  {
    email: "sato@example.com",
    password: "password123",
    name: "佐藤 健太",
    role: "tenant" as const,
  },
  {
    email: "suzuki@example.com",
    password: "password123",
    name: "鈴木 誠一",
    role: "admin" as const,
  },
];

async function main() {
  console.log("Creating auth users...\n");

  for (const user of seedUsers) {
    // Supabase Auth にユーザー作成
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        console.log(`[SKIP] ${user.email} - already exists`);
        // 既存ユーザーのIDを取得
        const { data: listData } = await admin.auth.admin.listUsers();
        const existing = listData?.users.find((u) => u.email === user.email);
        if (existing) {
          await upsertUserRecord(existing.id, user);
        }
        continue;
      }
      console.error(`[ERROR] ${user.email}:`, authError.message);
      continue;
    }

    console.log(`[OK] Auth user created: ${user.email} (${authData.user.id})`);

    // カスタム users テーブルにレコード作成
    await upsertUserRecord(authData.user.id, user);
  }

  console.log("\nDone!");
}

async function upsertUserRecord(
  authId: string,
  user: { email: string; name: string; role: string }
) {
  const { error } = await admin.from("users").upsert(
    {
      id: authId,
      property_id: PROPERTY_ID,
      email: user.email,
      password_hash: "managed_by_supabase_auth",
      role: user.role,
      name: user.name,
    },
    { onConflict: "email" }
  );

  if (error) {
    console.error(`[ERROR] users table for ${user.email}:`, error.message);
  } else {
    console.log(`[OK] Users table synced: ${user.email} (${user.role})`);
  }
}

main();
