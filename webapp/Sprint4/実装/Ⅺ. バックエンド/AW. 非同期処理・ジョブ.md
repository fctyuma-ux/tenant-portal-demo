# AW. 非同期処理・ジョブ

## 概要

バックエンドアプリケーションでは、時間がかかる処理（メール送信、ファイル変換、データ集計など）を非同期で実行する必要があります。リクエスト・レスポンス処理とは独立して長時間実行される処理をジョブとして扱い、キューイング、スケジューリング、分散実行を実現します。

本セクションでは、分散ジョブの調整、スケジュールジョブとイベント駆動の切り分け、cron ジョブの設定について説明します。

## 分散ジョブの調整

マイクロサービス環境では、複数のワーカーが同一ジョブキューから処理を取得し、並列実行します。この際、以下の課題が発生します：

- **重複実行**: 複数ワーカーが同じジョブを処理
- **順序保証**: 依存関係のあるジョブの順序付け
- **リトライ**: 失敗時の自動リトライとバックオフ
- **モニタリング**: ジョブ進捗の可視化

Redis、RabbitMQ、SQS などのメッセージキューは、これらの課題に対する解決策を提供します。キュー側で一意性を保証し、ワーカー側では冪等処理を実装することで、重複実行を防止します。

## スケジュールジョブ vs イベント駆動

### スケジュールジョブ（定期実行）

Cron 形式で指定された時刻に自動実行される処理です。日次レポート生成、キャッシュ更新、定期的なデータクリーンアップなど、時刻依存の処理に適します。

利点：
- 実行タイミングが明確で予測可能
- 外部イベント発生を待たず自動実行

### イベント駆動

ビジネスイベント（ユーザー登録、支払い完了など）発生時に非同期処理をトリガーします。

利点：
- リアルタイム性の高い応答
- ビジネスロジックとの結合度が高い

両者の使い分けは、**時刻に基づいた定期処理はスケジュール、ビジネスイベント発生時の処理はイベント駆動**が原則です。

## Cron ジョブの設定

Cron 式は、ジョブの実行時刻を指定します。形式は以下の通りです：

```
* * * * *
│ │ │ │ └─ 曜日 (0-6, 0=日)
│ │ │ └─── 月 (1-12)
│ │ └───── 日 (1-31)
│ └─────── 時 (0-23)
└───────── 分 (0-59)
```

例：毎日午前3時に実行

```
0 3 * * *
```

Node.js では、`node-cron` ライブラリで Cron ジョブを実装できます：

```javascript
const cron = require('node-cron');

// 毎日午前3時にバックアップ実行
cron.schedule('0 3 * * *', async () => {
  console.log('Starting daily backup...');
  await performBackup();
});

// 毎時00分に集計処理
cron.schedule('0 * * * *', async () => {
  await aggregateMetrics();
});
```

## ジョブキューの実装例

```javascript
const Queue = require('bull');
const redis = require('redis');

// ジョブキューの作成
const emailQueue = new Queue('email', {
  redis: {
    host: 'localhost',
    port: 6379
  }
});

// ジョブ処理の定義
emailQueue.process(async (job) => {
  const { to, subject, body } = job.data;
  await sendEmail(to, subject, body);
  return { success: true };
});

// ジョブのエンキュー
async function queueEmail(to, subject, body) {
  await emailQueue.add(
    { to, subject, body },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true
    }
  );
}

// イベントハンドリング
emailQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed: ${err.message}`);
});
```

## ジョブの冪等性

ジョブが複数回実行されても同じ結果になることが重要です。データベース操作では、`INSERT ... ON DUPLICATE KEY UPDATE` や `UPSERT` を活用します。

```javascript
async function processPayment(paymentId) {
  const payment = await Payment.findById(paymentId);

  if (payment.status === 'COMPLETED') {
    // 既に処理済み、何もしない
    return;
  }

  // 支払い処理実行
  await chargeCard(payment.cardId, payment.amount);

  // ステータス更新
  await Payment.updateOne(
    { _id: paymentId },
    { status: 'COMPLETED', processedAt: new Date() }
  );
}
```

