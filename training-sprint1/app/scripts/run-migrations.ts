/**
 * Supabase にマイグレーション SQL を順番に実行するスクリプト
 * 実行: npx tsx scripts/run-migrations.ts
 */
import * as fs from 'fs';
import * as path from 'path';

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

async function executeSql(sql: string): Promise<void> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    // rpc endpoint may not work for raw SQL, fallback to pg-meta
    const pgResponse = await fetch(`${supabaseUrl}/pg/query`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'x-connection-encrypted': 'true',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!pgResponse.ok) {
      const text = await pgResponse.text();
      throw new Error(`SQL execution failed: ${text}`);
    }
  }
}

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files\n`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`Running: ${file}...`);

    try {
      await executeSql(sql);
      console.log(`  -> Done`);
    } catch (error) {
      console.error(`  -> Error in ${file}:`, error);
      console.log('\nTip: You can also run these SQL files directly in the Supabase SQL Editor.');
      console.log(`  URL: ${supabaseUrl.replace('.supabase.co', '')}/project/default/sql`);
      process.exit(1);
    }
  }

  console.log('\nAll migrations completed!');
}

runMigrations().catch(console.error);
