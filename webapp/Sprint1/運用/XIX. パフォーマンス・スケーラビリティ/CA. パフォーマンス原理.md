# CA. パフォーマンス原理

## 概要

パフォーマンス原理は、システムが要件を満たす速度と効率で動作するための基盤となる概念です。レイテンシ、スループット、リソース効率を最適化することで、ユーザー体験を向上させ、インフラコストを削減します。本セクションでは、パフォーマンスの測定方法と改善アプローチを学びます。

---

## パフォーマンスの3つの主要指標

### 1. レイテンシ（応答時間）

レイテンシは、リクエスト受信からレスポンス返却までの時間です。ユーザー体験に直結する最も重要なメトリクスです。

```plaintext
レイテンシの内訳

クライアント
    ↓ ネットワーク遅延（10-50ms）
    ↓
サーバー処理開始
    ├─ リクエストパースと検証（1-5ms）
    ├─ 認証・認可（5-20ms）
    ├─ ビジネスロジック（50-200ms）
    │  ├─ DB クエリ（20-100ms）
    │  ├─ キャッシュ検索（1-5ms）
    │  └─ 外部API呼び出し（100-500ms）
    └─ レスポンス生成（5-20ms）
    ↓ ネットワーク遅延（10-50ms）
    ↓
クライアント受信

合計: 200-700ms
```

### レイテンシの測定と目標値

```plaintext
ユースケース           P50    P99   P99.9
────────────────────────────────────────
Webページ読み込み      100ms  500ms 1000ms
API 呼び出し           50ms   200ms  500ms
リアルタイムチャット   10ms    50ms  100ms
バッチ処理           10000ms以上許容
```

### レイテンシ改善の実装例

```javascript
// パフォーマンス計測コード
class PerformanceMonitor {
  constructor() {
    this.measurements = {};
  }

  mark(name) {
    this.measurements[name] = {
      start: performance.now(),
      end: null
    };
  }

  measure(name) {
    if (!this.measurements[name]) {
      console.warn(`Mark ${name} not found`);
      return;
    }
    this.measurements[name].end = performance.now();
    const duration = this.measurements[name].end - this.measurements[name].start;
    console.log(`${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }
}

// 使用例
const monitor = new PerformanceMonitor();

async function getUserData(userId) {
  monitor.mark('getUserData');

  monitor.mark('dbQuery');
  const user = await db.users.findById(userId);
  monitor.measure('dbQuery');  // Output: dbQuery: 45.23ms

  monitor.mark('cacheWrite');
  await cache.set(`user:${userId}`, user);
  monitor.measure('cacheWrite');  // Output: cacheWrite: 2.15ms

  monitor.measure('getUserData');  // Output: getUserData: 50.12ms

  return user;
}
```

---

### 2. スループット（処理能力）

スループットは、単位時間あたりに処理できるリクエスト数です。システムの処理能力を示す指標です。

```plaintext
スループットの構成要素

リクエスト到着率
    ↓
キュー
    ↓
CPU処理
    ↓
I/O待機（DBクエリ、API呼び出し）
    ↓
レスポンス送信

スループット = min(CPU処理能力, I/O処理能力)
```

### スループット最適化の実装例

```javascript
// 並列処理によるスループット向上
async function processOrdersBatch(orders) {
  // 順序処理（遅い）
  // total: 100 orders × 50ms = 5000ms
  const sequential = orders.map(async (order) => {
    return await processOrder(order);  // 50ms
  });

  // 並列処理（速い）
  // total: 5000ms / 10(並列度) ≈ 500ms
  const concurrent = await Promise.all(
    orders.map(order => processOrder(order))
  );

  // 制御された並列処理（メモリ効率）
  const batchSize = 10;
  const results = [];
  for (let i = 0; i < orders.length; i += batchSize) {
    const batch = orders.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(order => processOrder(order))
    );
    results.push(...batchResults);
  }

  return results;
}

// コネクションプーリング
const pool = mysql.createPool({
  connectionLimit: 10,  // 最大接続数
  waitForConnections: true,
  queueLimit: 0
});

// ストリーミング（大量データ処理）
async function exportLargeDataset() {
  return new Promise((resolve, reject) => {
    const stream = db.stream('SELECT * FROM users');
    stream.on('data', (row) => {
      output.write(JSON.stringify(row) + '\n');
    });
    stream.on('end', resolve);
    stream.on('error', reject);
  });
}
```

---

### 3. リソース効率

リソース効率は、与えられたリソース（CPU、メモリ、ディスク）をどれだけ効率的に活用するかを示します。

```plaintext
リソース効率の指標

CPU 効率
  = 実際の処理時間 / 割り当てられたCPU時間
  目標: 60-80%（高すぎるとスケーラビリティ低下）

メモリ効率
  = 実際に使用されているメモリ / 割り当てられたメモリ
  目標: 70-85%

ディスク I/O 効率
  = キャッシュヒット率
  目標: 80%以上

ネットワーク効率
  = 有効データ量 / 総転送量
  目標: 圧縮により 50%以上削減
```

### リソース効率改善の実装例

```javascript
// メモリリーク防止
class CacheManager {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccessed = Date.now();  // LRU用
    }
    return entry?.value;
  }

  set(key, value) {
    // メモリ上限チェック
    if (this.cache.size >= this.maxSize) {
      const lru = [...this.cache.entries()]
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)[0];
      this.cache.delete(lru[0]);  // 最も使われていないエントリを削除
    }

    this.cache.set(key, {
      value,
      lastAccessed: Date.now(),
      createdAt: Date.now()
    });
  }
}

// CPU効率: 複雑な計算の遅延実行
class ComputeTask {
  constructor(computeFn) {
    this.computeFn = computeFn;
    this.result = null;
    this.computed = false;
  }

  // 必要になるまで計算を遅延
  getValue() {
    if (!this.computed) {
      this.result = this.computeFn();
      this.computed = true;
    }
    return this.result;
  }
}

// ネットワーク効率: 圧縮
const compression = require('compression');
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6  // 1-9, 高いほど圧縮率高い（CPUコスト増加）
}));
```

---

## ボトルネック分析

ボトルネックは、システムの処理速度を制限している箇所です。効果的な最適化には、ボトルネックの正確な特定が必須です。

### ボトルネック分析のプロセス

```plaintext
システムの現在のレイテンシを計測
    ↓ 200ms
    ├─ DB クエリ: 100ms（50%）⚠️ ボトルネック
    ├─ API呼び出し: 50ms（25%）
    └─ キャッシュ: 20ms（10%）
    └─ その他: 30ms（15%）
    ↓
DB クエリを最適化
    ├─ インデックス追加
    ├─ クエリ書き換え
    └─ キャッシング導入
    ↓ 新レイテンシ: 130ms（35%削減）
    ↓
次のボトルネック特定: API呼び出し（38%）
    ↓
API呼び出し最適化
    ├─ 並列呼び出し
    ├─ バッチAPI利用
    └─ キャッシング
    ↓ 最終レイテンシ: 80ms（60%削減）
```

### ボトルネック検出ツール

```javascript
// プロファイリング（パフォーマンス計測）
const profiler = require('v8-profiler');

// CPU プロファイリング開始
profiler.startProfiling('api-call');

// 本体処理
async function handleRequest(req, res) {
  const user = await db.users.findById(req.params.id);
  const orders = await db.orders.findByUserId(user.id);
  return res.json({ user, orders });
}

// CPU プロファイリング終了
const profile = profiler.stopProfiling('api-call');

// 結果を分析
profile.export((error, result) => {
  fs.writeFile('profile.cpuprofile', result, (err) => {
    // Chrome DevTools で開いて分析可能
  });
});

// メモリリーク検出
const memwatch = require('memwatch-next');
memwatch.on('leak', (info) => {
  console.log('Potential memory leak detected:', info);
});

// ヒープスナップショット
const heapdump = require('heapdump');
heapdump.writeSnapshot(
  `./heap-${Date.now()}.heapsnapshot`
);
```

---

## パフォーマンス最適化チェックリスト

### フロントエンド
- [ ] バンドルサイズの削減（Tree Shaking、コード分割）
- [ ] 画像最適化（WebP形式、遅延ロード）
- [ ] JavaScript の非同期ロード
- [ ] CSS の最小化
- [ ] ブラウザキャッシュ活用

### バックエンド
- [ ] データベースインデックスの最適化
- [ ] クエリ最適化（N+1 解決、結合最適化）
- [ ] キャッシング戦略（Redis、メモリキャッシュ）
- [ ] コネクションプーリング
- [ ] 非同期処理の活用

### インフラ
- [ ] CDN による静的コンテンツ配信
- [ ] 圧縮（Gzip、Brotli）
- [ ] Load Balancing による負荷分散
- [ ] オートスケーリング設定
- [ ] リージョン最適化

---

## パフォーマンス目標設定（SMART 原則）

```plaintext
Specific（具体的）
  → "API レスポンスタイムを改善" ❌
  → "API の P99 レイテンシを 200ms 以下に" ✓

Measurable（測定可能）
  → Prometheus で継続計測
  → 日次レポートで追跡

Achievable（達成可能）
  → 現在の 500ms から 200ms へ（60%改善）は現実的
  → 10ms への削減は困難（ネットワーク遅延で限界）

Relevant（関連性）
  → ビジネスKPI（コンバージョン率向上）と連動
  → ユーザー体験の改善に直結

Time-bound（期限付き）
  → 3ヶ月以内に達成
  → マイルストーン: 1ヶ月目 -20%、2ヶ月目 -40%
```

---

## ベストプラクティス

- **計測ファースト**: 最適化前に必ず基準値を計測
- **段階的改善**: 最大効果を持つボトルネックから着手
- **継続監視**: パフォーマンス退化を検知する仕組み
- **ユーザー中心**: テクニカルメトリクスではなく、UXへの影響を重視
- **トレードオフ認識**: 圧縮率 vs CPU コスト、メモリ使用量 vs アクセス速度など

---

## 次のステップ

- 具体的なボトルネック分析と最適化実装
- スケーラビリティの設計（水平・垂直スケーリング）
- 費用対効果を考慮したリソース最適化
