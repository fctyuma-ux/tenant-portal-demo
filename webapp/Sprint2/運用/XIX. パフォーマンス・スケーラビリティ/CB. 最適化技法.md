# CB. 最適化技法

## 概要

アプリケーションのパフォーマンス最適化は、ユーザー体験向上とインフラコスト削減の両面で重要です。コネクションプーリング、キャッシング、データベースインデックス最適化など、実装レベルでできる最適化手法を習得します。

最適化は測定なしに語れません。ボトルネックを正確に特定し、改善効果を定量的に評価することが原則です。

---

## 1. コネクション・通信最適化

**コネクションプーリング:**

毎回新しい接続を張るのではなく、複数の接続を事前に確保し、再利用することで オーバーヘッドを削減します。

```javascript
// Node.js の pg ライブラリ例
const { Pool } = require('pg');

const pool = new Pool({
  max: 20,              // 最大接続数
  idleTimeoutMillis: 30000,  // 未使用時のタイムアウト
  connectionTimeoutMillis: 2000, // 接続確立のタイムアウト
});

// クエリ実行
const result = await pool.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);
```

**最適化ポイント:**
- `max`: サーバーのメモリと DB の接続上限から決定
- `idleTimeoutMillis`: 長い値なら接続は残るが、メモリを消費
- `connectionTimeoutMillis`: 短すぎるとタイムアウト多発

**HTTP Keep-Alive / Persistent Connection:**

ブラウザと サーバー間の TCP 接続を再利用し、毎回の 3-Way Handshake を回避します。

```
❌ Keep-Alive なし:
リクエスト1 → TCP接続 → 送受信 → 接続切断
リクエスト2 → TCP接続 → 送受信 → 接続切断
...（接続のオーバーヘッドが累積）

✓ Keep-Alive あり:
リクエスト1 → TCP接続 → 送受信
リクエスト2 → （同接続）送受信
リクエスト3 → （同接続）送受信
...（接続は保持されたまま）
```

HTTP/1.1 ではデフォルトで Keep-Alive が有効です。

---

## 2. 圧縮・転送量削減

**Brotli 圧縮:**

テキストベースのレスポンス（HTML/CSS/JS/JSON）を圧縮し、転送量を削減します。

```javascript
// Express.js で Brotli 有効化
const compression = require('compression');

app.use(compression({
  filter: (req, res) => {
    // 画像など既に圧縮されたファイルは除外
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 4, // Brotli 圧縮レベル（デフォルト）
}));
```

**効果:**
- JavaScript: 約40% 削減
- CSS: 約50% 削減
- JSON: 約60% 削減

**データ転送量の削減:**
- 不要なフィールドを API レスポンスから除外
- 画像を WebP 形式に変換（JPEG比で25～35% 小さい）
- ページネーション で一度に取得する件数を制限

---

## 3. キャッシュアーキテクチャ

**多層キャッシュ:**

複数のキャッシュレイヤーを組み合わせることで、最適な パフォーマンスを実現します。

```
ユーザー（ブラウザキャッシュ）
   ↓
   ├─ CDN （エッジキャッシュ）
   ├─ API サーバー（アプリケーションキャッシュ）
   └─ データベース（クエリキャッシュ）
```

| レイヤー | TTL | 用途 | 例 |
|---------|-----|------|-----|
| ブラウザ | 数日～数月 | 静的資源 | JS/CSS/画像 |
| CDN | 1時間～24時間 | 変更頻度の低いコンテンツ | HTML / JSON |
| アプリ | 数分～1時間 | DB クエリ結果 | ユーザープロフィール |
| DB | 秒単位 | 頻繁にアクセスされる行 | ホットデータ |

**Cache-Aside パターン:**

アプリケーションが キャッシュの管理をコントロールします。

```javascript
async function getUserProfile(userId) {
  // 1. キャッシュをチェック
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);

  // 2. キャッシュ未ヒット → DB から取得
  const user = await db.users.findById(userId);

  // 3. キャッシュに保存（有効期限 1時間）
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));

  return user;
}
```

**キャッシュ・スタンピード（Thundering Herd）:**

キャッシュ有効期限切れの直後、複数のリクエストが同時に DB にアクセスする問題。

```
❌ 問題:
キャッシュ期限切れ
  ↓
100 個の同時リクエストが DB に殺到
  ↓
DB 負荷 スパイク

✓ 解決策: Probabilistic early expiration
キャッシュ期限の 90% まで来たら、確率的に再生成
→ 突然の負荷スパイクを避ける
```

---

## 4. メモリリーク検出

**Node.js のヒープ分析:**

アプリケーションが意図せずメモリを保持し続ける問題を特定します。

```javascript
// 悪い例（メモリリーク）
const cache = {}; // グローバル
setInterval(() => {
  cache[Math.random()] = new Array(1000000).fill('data');
  // 一度キャッシュに入ると、削除されない
}, 100);

// 良い例（TTL付きキャッシュ）
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10分で自動削除
```

メモリ使用量の監視:

```bash
node --inspect app.js
# Chrome DevTools で chrome://inspect にアクセス
# Memory タブでヒープスナップショットを取得
```

---

## 5. データベース最適化

**カバリングインデックス:**

WHERE と SELECT で必要なカラムすべてを インデックスに含めることで、テーブル行アクセスを省略します。

```sql
-- ❌ 非効率: インデックスはあるが、テーブルアクセスが発生
SELECT id, name FROM users WHERE status = 'active';
CREATE INDEX idx_status ON users(status);

-- ✓ 効率: インデックスだけで結果が得られる（Index-Only Scan）
CREATE INDEX idx_status_covering ON users(status) INCLUDE (id, name);
SELECT id, name FROM users WHERE status = 'active';
```

**OFFSETページネーションの問題:**

`OFFSET 10000` は、最初の 10,000 行を読み込んでから破棄するため、遅い。

```sql
❌ 遅い:
SELECT * FROM posts LIMIT 20 OFFSET 10000;
-- 10,020 行を読み込んでから、10,000 行を捨てる

✓ 高速（カーソルページネーション）:
SELECT * FROM posts WHERE id > ? LIMIT 20;
-- 特定行以降の 20 行だけを取得
```

**非正規化のリスク:**

冗長なデータを保持することで、更新時に整合性がズレるリスク。メリットとデメリットを吟味します。

```sql
-- 非正規化の例: user テーブルに最後の購入日を保持
UPDATE users
SET last_purchase_date = ?
WHERE id = ?;

-- リスク: 購入テーブルと日付がズレる可能性
-- ✓ 解決: 購入時に user テーブルも更新（トランザクション）
```

---

## 6. 非同期・バックグラウンド処理

**同期 vs 非同期:**

```javascript
❌ 同期（ブロッキング）
// メール送信に 5秒待つ
const result = await sendEmail(user);
response.json({ success: true }); // 5秒後に返却

✓ 非同期
// メール送信をキューに追加し、すぐ返却
queue.add('send-email', { userId });
response.json({ success: true }); // 即座に返却
// （メール送信はバックグラウンドで進行）
```

**バックグラウンドジョブ（BullMQ）:**

```javascript
const Queue = require('bullmq').Queue;

const emailQueue = new Queue('emails', { connection });

// タスク追加
await emailQueue.add('send-welcome', {
  userId: 123,
  email: 'user@example.com'
});

// ワーカー（別プロセス）
emailQueue.process('send-welcome', async (job) => {
  await sendEmail(job.data);
  return { sent: true };
});
```

**バックプレッシャー（Backpressure）:**

キューが処理しきれないほど溜まる場合、新規タスク受け入れを一時停止します。

```javascript
if (queue.isPaused()) {
  return response.status(503).json({
    error: 'Service temporarily unavailable'
  });
}
```

---

## 7. 負荷テストと最適化

**負荷テストの実行:**

実装したアプリが、想定 トラフィック下で どの程度 パフォーマンスが低下するか、事前に把握します。

```bash
# k6 を使った負荷テスト
k6 run --vus 100 --duration 30s load-test.js
# 100 個の仮想ユーザーで 30秒間テスト
```

**ボトルネック分析:**

```
テスト結果:
- API レスポンス: 平均 800ms
  └─ DB クエリ: 700ms ← ボトルネック
  └─ ビジネスロジック: 50ms
  └─ ネットワーク: 50ms

→ DB インデックス追加で改善
```
