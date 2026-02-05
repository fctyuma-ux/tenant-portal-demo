# AW. 非同期処理・ジョブ

## 概要

時間がかかる処理（メール送信、画像処理、外部API呼び出し）は非同期で実行するべきです。ユーザーがそれらの完了を待つ必要がなくなり、UXが大幅に改善されます。BullMQなどのジョブキューを使用して、信頼性の高い非同期処理を実装します。

---

## 1. 同期 vs 非同期

**同期処理（避けるべき）:**

```typescript
// リクエストハンドラー内でメール送信
export async function POST(request: Request) {
  const body = await request.json();

  // ユーザー作成
  const user = await db.users.create(body);

  // メール送信（ユーザーを待たせる）
  await sendEmail(user.email, 'ウェルカムメール');

  return Response.json({ user }, { status: 201 });
  // メール送信に失敗したらレスポンス全体が失敗
}
```

**非同期処理（推奨）:**

```typescript
export async function POST(request: Request) {
  const body = await request.json();

  // ユーザー作成
  const user = await db.users.create(body);

  // メール送信をジョブキューに追加（すぐにリターン）
  await emailQueue.add('welcome', { userId: user.id });

  return Response.json({ user }, { status: 201 });
  // ユーザー作成の成功を返す
}
```

---

## 2. ジョブキューの仕組み

**概要:**
1. リクエストハンドラーが「ジョブ」（処理予約）をキューに追加
2. キュー内のジョブを順番に実行
3. 失敗時は自動リトライ
4. 処理状況をモニタリング可能

```
リクエスト → キューに追加 → すぐにレスポンス
             ↓
         ジョブワーカー が処理
             ↓
         完了・失敗・リトライ
```

---

## 3. BullMQ 導入

**インストール:**

```bash
npm install bullmq redis
```

**キューの定義:**

```typescript
// lib/queues.ts
import { Queue, Worker } from 'bullmq';

const redis = {
  host: 'localhost',
  port: 6379,
};

// メール送信キュー
export const emailQueue = new Queue('email', { connection: redis });

// 画像処理キュー
export const imageQueue = new Queue('image', { connection: redis });

// ジョブの型定義
export interface EmailJob {
  userId: string;
  email: string;
  type: 'welcome' | 'reset-password' | 'notification';
}
```

---

## 4. メール送信の実装（非同期）

**ジョブをキューに追加:**

```typescript
// app/api/users/route.ts
import { emailQueue } from '@/lib/queues';

export async function POST(request: Request) {
  const body = await request.json();

  // ユーザー作成
  const user = await db.users.create({
    email: body.email,
    name: body.name,
  });

  // メール送信ジョブを追加
  await emailQueue.add(
    'welcome',
    {
      userId: user.id,
      email: user.email,
      type: 'welcome',
    },
    {
      attempts: 3,        // 3回までリトライ
      backoff: {
        type: 'exponential',
        delay: 2000,      // 初回失敗後2秒、次は4秒、その次は8秒...
      },
      removeOnComplete: true, // 完了時はジョブを削除
    }
  );

  return Response.json({ user }, { status: 201 });
}
```

**ワーカー（ジョブ処理）の実装:**

```typescript
// workers/emailWorker.ts
import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { emailQueue, EmailJob } from '@/lib/queues';

const redis = { host: 'localhost', port: 6379 };

// メーラー設定
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ワーカー定義
const emailWorker = new Worker(
  'email',
  async (job) => {
    const { email, type }: EmailJob = job.data;

    console.log(`処理中: ${type} メール送信 to ${email}`);

    try {
      if (type === 'welcome') {
        await transporter.sendMail({
          to: email,
          subject: 'ようこそ！',
          html: '<h1>ウェルカムメール</h1>',
        });
      } else if (type === 'reset-password') {
        await transporter.sendMail({
          to: email,
          subject: 'パスワードリセット',
          html: '<a href="...">リセットリンク</a>',
        });
      }

      console.log(`完了: ${type} メール送信`);
      return { success: true };
    } catch (error) {
      console.error(`失敗: ${error}`);
      throw error; // リトライをトリガー
    }
  },
  { connection: redis }
);

// ジョブ成功時
emailWorker.on('completed', (job) => {
  console.log(`${job.id} 完了`);
});

// ジョブ失敗時
emailWorker.on('failed', (job, error) => {
  console.error(`${job?.id} 失敗: ${error.message}`);
});
```

---

## 5. 自動リトライの設定

```typescript
// 指数バックオフ：2秒 → 4秒 → 8秒 → 16秒
await emailQueue.add(
  'welcome',
  { /* data */ },
  {
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  }
);

// 固定間隔：毎回3秒待機
await emailQueue.add(
  'welcome',
  { /* data */ },
  {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 3000,
    },
  }
);
```

---

## 6. ジョブのモニタリング

```typescript
// api/jobs/status/[jobId]/route.ts
import { emailQueue } from '@/lib/queues';

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const job = await emailQueue.getJob(params.jobId);

  if (!job) {
    return Response.json({ error: 'ジョブが見つかりません' }, { status: 404 });
  }

  const state = await job.getState();
  const progress = job.progress();
  const attempts = job.attemptsMade;

  return Response.json({
    id: job.id,
    state,
    progress,
    attempts,
    data: job.data,
  });
}
```

---

## 7. 遅延ジョブ

```typescript
// 10分後に実行
await emailQueue.add(
  'reminder',
  { userId: user.id },
  {
    delay: 600000, // 600,000ms = 10分
  }
);

// 指定時刻に実行
const executeAt = new Date();
executeAt.setHours(9, 0, 0); // 翌日の9時

await emailQueue.add(
  'daily-digest',
  { /* data */ },
  {
    timestamp: executeAt.getTime(),
  }
);
```

---

## 8. Dead Letter Queue（DLQ）

最大リトライ回数を超えたジョブを別のキューに移す：

```typescript
// リトライ失敗時の処理
emailWorker.on('failed', async (job, error) => {
  if (job && job.attemptsMade >= job.opts.attempts!) {
    // DLQ に移す
    await deadLetterQueue.add('failed-email', job.data);
    console.log(`DLQ に移動: ${job.id}`);
  }
});

// DLQ ワーカー（手動対応用）
const dlqWorker = new Worker(
  'dead-letter',
  async (job) => {
    // アラート送信、ログ記録など
    console.error(`DLQ: ${job.id}`);
    return { handled: true };
  },
  { connection: redis }
);
```
