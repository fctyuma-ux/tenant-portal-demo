# BC. キャッシュ

## 概要

キャッシュは、頻繁にアクセスされるデータを高速なストレージに保持し、応答時間と負荷を削減する手法です。単純なメモ化からRedis活用、HTTPキャッシュヘッダー制御まで、層別のキャッシュ戦略を組み合わせることで最適なパフォーマンスを実現します。

---

## 1. メモ化（Memoization）

**役割:** 関数の計算結果をキャッシュし、同じ引数での再計算を避ける

単一プロセス内で機能する軽量なキャッシュ。計算コストが高い場合に有効です。

**実装例：**
```javascript
// シンプルなメモ化
function fibonacci(n, cache = {}) {
  if (n in cache) return cache[n];
  if (n <= 1) return n;
  cache[n] = fibonacci(n - 1, cache) + fibonacci(n - 2, cache);
  return cache[n];
}

// Node.js での memoization ライブラリ: lru-cache
import LRU from 'lru-cache';

const cache = new LRU({
  max: 100,        // 最大100エントリ
  maxAge: 1000 * 60 * 5  // 5分後に自動削除
});

function expensiveCalculation(param) {
  const key = `calc:${param}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = heavyComputation(param);
  cache.set(key, result);
  return result;
}
```

**メリット:** 実装が簡単、外部依存なし
**デメリット:** プロセス内のみ有効、サーバー再起動で消失、分散環境で不効率

---

## 2. キャッシュパターン

**Role:** データベースとキャッシュの連携方式

### Cache-Aside パターン

最も一般的。アプリケーションがキャッシュを管理。

```javascript
async function getUserData(userId) {
  const cacheKey = `user:${userId}`;

  // 1. キャッシュから取得を試みる
  let user = await redis.get(cacheKey);
  if (user) {
    return JSON.parse(user);  // キャッシュヒット
  }

  // 2. キャッシュミス → DB から取得
  user = await db.user.findById(userId);

  // 3. キャッシュに保存
  await redis.setex(cacheKey, 3600, JSON.stringify(user));  // 1時間TTL

  return user;
}
```

**利点:** シンプル、キャッシュ削除が容易
**欠点:** キャッシュミス時は遅延、キャッシュ更新のタイミング制御が必要

### Read-Through / Write-Through パターン

キャッシュレイヤーが自動的にDB と同期。

```javascript
// Read-Through: キャッシュが DB 読み込みを代行
const user = await cacheLayer.get(userId, async () => {
  return await db.user.findById(userId);
});

// Write-Through: 書き込みがキャッシュとDB に同期
await cacheLayer.set(userId, userData, async () => {
  return await db.user.update(userId, userData);
});
```

**利点:** キャッシュ更新の一貫性が保証される
**欠点:** 実装が複雑、Write-Through は書き込みが遅くなる

---

## 3. Eviction Policy（追い出しポリシー）

**役割:** キャッシュ容量上限に達した時の削除戦略

| ポリシー | 説明 | 用途 |
|---------|------|------|
| **LRU** | Least Recently Used（最近使われていない） | 一般的 |
| **LFU** | Least Frequently Used（最も使われていない） | ホットスポット対策 |
| **FIFO** | First In First Out（古い順） | シンプル |
| **TTL** | Time To Live（有効期限切れ） | 時間ベース削除 |

**Redis での TTL 設定:**
```bash
redis> SET user:123 '{"name":"Alice"}' EX 3600
# 3600秒（1時間）後に自動削除

redis> TTL user:123
# (integer) 3599  # あと3599秒

redis> EXPIRE user:123 7200
# TTL を延長
```

---

## 4. キーの命名規則

**役割:** キャッシュキーの一貫性と可読性を確保

**推奨フォーマット:**
```
{domain}:{entity}:{id}:{version}

例:
user:profile:123         # ユーザー123のプロフィール
user:profile:123:v2      # バージョン付き
order:summary:456        # 注文456の概要
product:catalog:789:list # 商品リスト（複数キー）
```

**バージョン管理の活用:**
```javascript
// スキーマ変更時はバージョンを上げてキャッシュを無効化
const cacheKey = `user:profile:${userId}:v2`;

// バージョン1 のキャッシュを削除
await redis.del(`user:profile:${userId}:v1`);
```

---

## 5. キャッシュスタンピード対策

**問題:** 人気のあるキャッシュキーが同時に期限切れになると、全リクエストがDB にアクセス（Thundering Herd）

**解決策：** Probabilistic early expiration（確率的早期削除）

```javascript
async function getCachedData(key, ttl) {
  const data = await redis.get(key);
  if (!data) {
    return await fetchAndCache(key, ttl);
  }

  // TTL の80%経過時に確率的に再取得
  const ttlLeft = await redis.pttl(key);
  if (ttlLeft < ttl * 0.2) {
    if (Math.random() < 0.1) {  // 10% の確率で先読み再取得
      await fetchAndCache(key, ttl);  // 非同期で更新
    }
  }

  return data;
}
```

---

## 6. HTTPキャッシュヘッダー制御

**役割:** ブラウザとCDN のキャッシュを制御

**主要ヘッダー:**

```http
# 有効期限を指定（max-age: 秒数）
Cache-Control: public, max-age=3600

# プライベートキャッシュ（ブラウザのみ）
Cache-Control: private, max-age=3600

# キャッシュなし
Cache-Control: no-cache, no-store, must-revalidate

# ETag による条件付きキャッシュ
ETag: "abc123"
If-None-Match: "abc123"  # クライアントが送信
# → サーバー: 304 Not Modified（データは返さない）
```

**Next.js での設定:**
```javascript
export async function GET(request) {
  const response = new Response(JSON.stringify({ data: 'example' }));
  response.headers.set('Cache-Control', 'public, max-age=3600');
  response.headers.set('ETag', '"hash-value"');
  return response;
}

// 再検証時間付きキャッシュ
export const revalidate = 3600;  // 1時間後に再生成
```

---

## 7. Vercel キャッシュの設定

**役割:** CDN キャッシュの効率的な活用

```javascript
// Next.js App Router での設定
export async function GET(request) {
  // 静的生成 + ISR（Incremental Static Regeneration）
  return Response.json(
    { data: 'content' },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    }
  );
}

// s-maxage: CDN のキャッシュ有効期間（3600秒）
// stale-while-revalidate: キャッシュ期限後、古いデータを返す期間（24時間）
```

**キャッシュパージ:**
```bash
# 特定のパスをキャッシュから削除
curl -X POST https://api.vercel.com/v1/deployments/{deploymentId}/purge \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paths": ["/api/data"]}'
```

---

## 8. 分散環境でのキャッシュ課題

**Challenge 1: キャッシュ一貫性（Cache Coherence）**
```
Server A → user:123 = "Alice" (キャッシュ)
Server B → user:123 を更新 → DB 更新

問題: Server A はまだ古い "Alice" を返す
解決: Redis など共有キャッシュを使用
```

**Challenge 2: キャッシュ削除の伝播**
```javascript
// 全サーバーで同期的にキャッシュを削除
const servers = ['server-a', 'server-b', 'server-c'];
await Promise.all(
  servers.map(server =>
    redis.publish(`cache:purge:${server}`, 'user:123')
  )
);
```

---

## 9. パフォーマンス確認（LRU キャッシュの動作）

```javascript
import LRU from 'lru-cache';

const cache = new LRU({ max: 3 });

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);
console.log(cache.keys()); // ['a', 'b', 'c']

cache.set('d', 4);  // 'a' が削除される（最も古い）
console.log(cache.keys()); // ['b', 'c', 'd']

cache.get('b');     // 'b' のアクセス時刻を更新
cache.set('e', 5);  // 'c' が削除される
console.log(cache.keys()); // ['b', 'd', 'e']
```

---

## 10. 設計時のチェックリスト

- [ ] キャッシュの粒度（何をキャッシュするか）を決めているか
- [ ] TTL（有効期限）は適切か（古すぎたり長すぎたりしないか）
- [ ] キャッシュキーの命名規則を統一しているか
- [ ] キャッシュスタンピード対策が必要か検討したか
- [ ] HTTPキャッシュヘッダーを設定しているか
- [ ] キャッシュ削除（パージ）のタイミングを定義しているか
- [ ] 分散環境での一貫性を確保できているか
- [ ] キャッシュヒット率を監視する仕組みがあるか

---

## まとめ

キャッシュは使い方を誤るとデータ不一貫性やメモリリークを招きます。
パターン選択、TTL設定、削除戦略を組み合わせた総合的なキャッシュ戦略が重要です。
