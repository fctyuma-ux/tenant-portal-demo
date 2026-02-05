# CA. パフォーマンス原理

## 概要

パフォーマンスは測定に始まります。本セクションでは、CPU・メモリ・ディスク・ネットワークの各層での計測方法、ボトルネック特定、改善効果の検証までをカバーします。

「推測」ではなく「計測」に基づいた改善により、実際のユーザー体験を劇的に向上させます。

---

## 1. サーバーリソース監視

**CPU・メモリ・ディスクの計測**
```bash
# top コマンド：実時間プロセスモニタリング
top

# htop：カラー表示でより見やすい
htop

# iostat：ディスク I/O を監視
iostat -x 1

# 出力例
Disk: sda
  r/s     w/s    rMB/s   wMB/s
  150     50     12.3     8.7
```

**計測項目**
- **CPU 使用率**：ユーザー空間 (us)、カーネル空間 (sy)、I/O待機 (wa)
- **メモリ使用率**：RSS（物理メモリ）、VSZ（仮想メモリ）
- **ディスク I/O**：読み込み・書き込みスループット、I/O 待機時間

---

## 2. パフォーマンス計測の原則

**推測の排除**
```python
# ✗ 推測：「この処理が遅い気がする」
for i in range(1000000):
    result = slow_function(i)  # 実際どのくらい遅い？

# ○ 計測：実際の処理時間を測定
import time
start = time.time()
for i in range(1000000):
    result = slow_function(i)
elapsed = time.time() - start
print(f"処理時間：{elapsed:.2f} 秒")
```

**計測の三原則**
1. **冷スタートを避ける**：キャッシュウォーム後に計測
2. **複数回試行**：平均値と標準偏差を取得
3. **単一変数の変更**：「何が性能に影響するか」を明確化

---

## 3. 負荷試験と同時実行数

**負荷試験レポートの解読**
```
結果サマリー：
- 平均応答時間：150ms
- P95 応答時間：450ms
- P99 応答時間：1200ms
- スループット：6,667 req/sec（最大時）
- エラー率：0.2%
```

**同時実行数の計算**
```
必要なスループット = 1日のリクエスト数 / 秒数

例：1日 86,400,000 リクエスト
  = 86,400,000 / (24 * 3600) = 1,000 req/sec

平均応答時間が 200ms の場合、
必要な同時接続数 ≈ 1,000 × 0.2 = 200 接続
```

---

## 4. Web フロントエンド計測

**Lighthouse による計測と改善**
```bash
# CLI で Lighthouse 実行
lighthouse https://example.com --view

# 出力指標
Performance: 85/100
  ├─ First Contentful Paint (FCP): 1.2s
  ├─ Largest Contentful Paint (LCP): 2.5s
  ├─ Cumulative Layout Shift (CLS): 0.05
  └─ Time to Interactive (TTI): 3.1s
```

**主要指標**
- **FCP**：ページ最初の要素が表示される時間
- **LCP**：メイン画像・テキストが表示される時間
- **TTI**：ページがユーザーインタラクションに応答可能な時間

**ウォーターフォール分析（Network タブ）**
```
DNS Lookup: 50ms
TCP Connection: 100ms
Request: 20ms
Waiting (TTFB): 300ms  ← サーバー処理時間
Response: 150ms
Rendering: 200ms

→ ボトルネック：サーバー応答時間（TTFB）
```

---

## 5. JavaScript メモリリーク検出

**ヒープダンプの取得と解析**
```javascript
// Chrome DevTools > Memory タブ
// 1. Take Heap Snapshot
// 2. アクション実施
// 3. Take another snapshot
// 4. 比較：増加したメモリを分析

// ヒープの肥大化を検出
console.memory.usedJSHeapSize  // 実時間監視
```

**リークコードの修正**
```javascript
// ✗ リーク：イベントリスナーが削除されない
document.querySelector('#button').addEventListener('click', handler);
// ページ遷移後もリスナーが残り、メモリを消費

// ○ 修正：削除可能な設計
const button = document.querySelector('#button');
const handler = () => console.log('clicked');
button.addEventListener('click', handler);

// クリーンアップ時に削除
button.removeEventListener('click', handler);
```

---

## 6. バックエンド性能分析

**ホットスポットの特定**
```bash
# Go言語の pprof
go tool pprof https://example.com/debug/pprof/profile

# 出力例
    1000ms   main.expensiveFunction
     500ms   database.Query
     300ms   json.Marshal

# 改善策：expensiveFunction の最適化が最大効果
```

**Chrome DevTools Performance**
```javascript
// JS 実行時間をプロファイリング
performance.mark('start');
// 処理...
performance.mark('end');
performance.measure('my-measurement', 'start', 'end');

// DevTools > Performance タブで可視化
```

---

## 7. ロードテストとCI統合

**k6 によるロードテスト**
```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 100,      // 仮想ユーザー数
  duration: '5m' // テスト時間
};

export default function () {
  let res = http.get('https://example.com');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
}
```

**CIへの組み込み（Performance Regression Testing）**
```yaml
# GitHub Actions
- name: Run performance test
  run: k6 run test.js --threshold="http_req_duration<500ms"
```

---

## 8. データベース最適化

**スロークエリの特定と改善**
```sql
-- MySQL スロークエリログ有効化
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- 1秒以上のクエリをログ

-- EXPLAIN で実行計画を確認
EXPLAIN SELECT * FROM users WHERE age > 30 AND city = 'Tokyo';

# 出力
id | type  | key  | rows | Extra
1  | index | idx_city | 50000 | Using where

# インデックス追加で改善
CREATE INDEX idx_age_city ON users(age, city);
```

**N+1 問題のクエリ確認**
```python
# ✗ N+1：user 取得 1回 + comment 取得 N回
users = db.query(User).all()
for user in users:
    comments = db.query(Comment).filter(user_id=user.id).all()

# ○ 修正：JOIN で 1回のクエリに統一
users = db.query(User).outerjoin(Comment).all()
```

パフォーマンス改善は継続的なプロセスです。定期的な計測と改善のサイクルを回すことが重要です。
