# BD. メッセージキュー

## 概要

メッセージキューは、非同期処理の基盤となるシステムです。リアルタイムな応答が不要なタスク（メール送信、ログ記録、レポート生成）をキューに登録し、別プロセスで処理することで、メインアプリケーションの応答性を保ち、スケーラビリティを実現します。

---

## 1. 負荷平準化（Leveling）

リクエストの急増に対応し、システムを安定させるメカニズム。

**シナリオ:**
```
ピーク時：1秒あたり 100 リクエスト
├─ キューなし → サーバーに直接処理
│  └─ 処理能力の限界を超える → リクエスト落下
├─ キューあり → キューにバッファリング
│  └─ 処理能力の分だけ消費 → リクエスト保持
```

**結果:**
```
キューなし：
リクエスト流入 → サーバー処理 → 処理漏れ

キューあり：
リクエスト流入 → キュー保持 → サーバー処理（定速） → 完了
```

**実装例:**
```
ピーク時の受け入れ：100 req/sec
サーバーの処理能力：10 req/sec
キューの役割：90 req/sec をバッファリングし、順次処理
```

---

## 2. プロデューサーとコンシューマー

メッセージキューの二者による分離。

**プロデューサー（Producer）:**
メッセージをキューに投入する側。
- Web API のエンドポイント
- 定期実行スクリプト
- ユーザーアクション

```typescript
// キューに「メール送信」タスクを登録
await queue.enqueue({
  type: 'send-email',
  to: 'user@example.com',
  subject: '確認メール',
});
```

**コンシューマー（Consumer）:**
キューから取り出し、処理を実行する側。
- バックグラウンドワーカー
- マイクロサービス
- Lambda 関数

```typescript
// キューから「メール送信」タスクを取得・実行
await queue.consume(async (message) => {
  if (message.type === 'send-email') {
    await sendEmail(message.to, message.subject);
  }
});
```

**利点:**
- プロデューサーとコンシューマーが独立
- スケーリングが容易（コンシューマー数を増やすだけ）
- コンシューマー障害時、キューはリクエストを保持

---

## 3. 簡単なキューの実装

メモリ内の簡易キューの実装。

```typescript
class SimpleQueue {
  private queue: any[] = [];
  private processing = false;

  // タスクをキューに追加
  async enqueue(task: any): Promise<void> {
    this.queue.push(task);
    await this.process();
  }

  // キューを処理
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      try {
        await this.handleTask(task);
      } catch (error) {
        console.error('タスク処理エラー:', error);
        // リトライ戦略を実装
        this.queue.push(task);
      }
    }
    this.processing = false;
  }

  private async handleTask(task: any): Promise<void> {
    if (task.type === 'send-email') {
      await sendEmail(task.to, task.subject);
    } else if (task.type === 'generate-report') {
      await generateReport(task.data);
    }
  }
}
```

**問題点:**
- メモリに保存されるため、プロセス再起動でデータ喪失
- スケーリング困難（単一プロセスでの処理）

**改善:**
- Redis、RabbitMQ、AWS SQS等、永続的なメッセージキューサービスを使用

---

## 4. リトライ戦略

タスク処理失敗時の再試行方法。

**指数バックオフ:**
```
1回目の失敗 → 1秒待機後、リトライ
2回目の失敗 → 2秒待機後、リトライ
3回目の失敗 → 4秒待機後、リトライ
4回目の失敗 → 8秒待機後、リトライ
5回目以上 → Dead Letter Queue（DLQ）に移動
```

**実装例（Bull MQ）:**
```typescript
import Queue from 'bull';

const emailQueue = new Queue('email', {
  redis: { host: '127.0.0.1', port: 6379 },
});

emailQueue.process(async (job) => {
  try {
    await sendEmail(job.data.to, job.data.subject);
  } catch (error) {
    // リトライ設定：最大3回、指数バックオフ
    throw error;
  }
});

// タスク追加時にリトライ設定
emailQueue.add(
  { to: 'user@example.com', subject: '確認メール' },
  {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 初期待機時間 2秒
    },
  }
);
```

---

## 5. Dead Letter Queue（DLQ）

最大リトライ回数に達したタスクの格納先。

**用途:**
- 問題の分析
- 手動対応が必要なタスク
- アラート発火

```typescript
// DLQ からのタスク確認
const deadLetterJobs = await emailQueue.getJobData('dead-letter-email');
deadLetterJobs.forEach((job) => {
  console.log('失敗したタスク:', job.data);
  // ログ記録、アラート送信等
});
```

---

## 6. Priority キュー

重要度の高いタスクを優先処理。

```typescript
// 通常優先度
emailQueue.add(
  { to: 'user@example.com' },
  { priority: 5 }
);

// 高優先度（数値が小さいほど優先度が高い）
emailQueue.add(
  { to: 'vip@example.com' },
  { priority: 1 }
);
```

---

## 7. タスクスケジューリング

定期的なタスク実行。

```typescript
// 毎日午前3時にレポート生成
reportQueue.add(
  { type: 'daily-report' },
  { repeat: { cron: '0 3 * * *' } }
);

// 1時間後に処理
emailQueue.add(
  { to: 'user@example.com' },
  { delay: 3600000 } // 1時間（ミリ秒）
);
```

---

## 8. 監視とアラート

キューの健全性を監視。

**監視対象:**
- キューの長さ（バックログ）
- タスク処理時間
- 失敗率
- DLQ の増加

```typescript
// キュー長の監視
setInterval(async () => {
  const count = await emailQueue.count();
  if (count > 1000) {
    // アラート：キューが溜まっている
    sendAlert('Email queue backlog exceeds 1000');
  }
}, 60000); // 1分ごと
```

---

## 9. 実装パターン

**同期処理として扱う場合:**
```typescript
// クライアントがタスク完了を待つ
const result = await processTask(task);
return res.json(result);
```

**非同期処理として扱う場合:**
```typescript
// タスクをキューに登録して即座に応答
await queue.enqueue(task);
return res.json({ status: 'queued', taskId: task.id });

// 別プロセスで処理
queue.consume(async (task) => {
  // 重い処理...
});
```

---

## 10. メッセージキュー選定

**Redis（シンプル）:**
- 開発が簡単
- メモリベース
- 小～中規模に適している

**RabbitMQ（信頼性重視）:**
- メッセージの永続化
- 複雑なルーティング対応
- エンタープライズグレード

**AWS SQS（マネージド）:**
- インフラ管理不要
- スケーラビリティが高い
- AWS 環境での統合が容易

**選定基準:**
- 規模（小～大）
- 可用性要件
- チームのスキル
- コスト
