# BC. キャッシュ

## 概要

キャッシュは、頻繁にアクセスされるデータを高速ストレージに保持し、データベース負荷を削減するために重要です。キャッシュの有効期限管理とキャッシュ無効化戦略により、データ鮮度とパフォーマンスのバランスを取ります。

---

## TTL（Time To Live）

**TTL** はキャッシュの有効期限を指定する仕組みです。TTL経過後、キャッシュは自動削除されます。

```javascript
// Redis でのTTL設定
const redis = require('redis').createClient();

// キャッシュを設定（60秒後に自動削除）
redis.setex('user:123:profile', 60, JSON.stringify(userData));

// TTLを確認
redis.ttl('user:123:profile', (err, ttl) => {
  console.log(`Expires in ${ttl} seconds`);
});
```

**TTL設定のポイント:**
- **頻繁に更新されるデータ：** TTLを短く（例：1分）
- **静的データ：** TTLを長く（例：1時間以上）
- **ビジネス要件：** 「1分以内に更新を反映」など明確な要件に基づく

---

## イベントベースの無効化

**イベントベース無効化** は、データ更新時にキャッシュを即座に無効化する手法です。

```javascript
// ユーザー情報更新時にキャッシュを削除
async function updateUserProfile(userId, newData) {
  // データベース更新
  await db.users.update({ id: userId }, newData);

  // キャッシュ削除（イベント駆動）
  await redis.del(`user:${userId}:profile`);

  // イベント発行
  eventBus.emit('user.updated', { userId, newData });
}

// リスナー
eventBus.on('user.updated', ({ userId }) => {
  // 関連する他のキャッシュも削除
  redis.del(`user:${userId}:posts`);
  redis.del(`user:${userId}:notifications`);
});
```

**メリット：**
- データが常に最新（キャッシュヒット時）
- TTL期限切れによる不要な再計算がない

**デメリット：**
- 実装複雑度が増加
- キャッシュ削除漏れのリスク

---

## タグベースの無効化（Next.js）

Next.js の `revalidateTag` を使用することで、関連するキャッシュをまとめて無効化できます。

```typescript
// app/api/users/[id]/route.ts
import { revalidateTag } from 'next/cache';

export async function PUT(request: Request, { params }: any) {
  const { id } = params;
  const userData = await request.json();

  // データベース更新
  await db.users.update({ id }, userData);

  // タグ付きキャッシュを無効化
  revalidateTag(`user-${id}`);
  revalidateTag('user-list');  // リスト表示も再キャッシュ

  return Response.json({ success: true });
}
```

キャッシュ取得時にタグを付与：
```typescript
async function getUser(id: string) {
  const response = await fetch(`/api/users/${id}`, {
    next: { tags: [`user-${id}`] }
  });
  return response.json();
}
```

**メリット：**
- タグの範囲内で一括無効化
- 関連キャッシュの漏れ防止

---

## キャッシュ戦略

**キャッシュベストプラクティス:**
- **キーの一貫性：** `user:123:profile` のように階層的・統一的なフォーマット
- **有効性チェック：** null チェック、型チェック
- **キャッシュスタンピード対策：** TTL切れ時にアクセスが集中する場合、再計算をロック
- **キャッシュミス対策：** 不在データもキャッシュ（TTLを短く）

```javascript
// キャッシュスタンピード対策
async function getUserProfile(userId) {
  const cached = await redis.get(`user:${userId}:profile`);
  if (cached) return JSON.parse(cached);

  // キャッシュミス時のロック
  const lockKey = `user:${userId}:profile:lock`;
  const acquired = await redis.set(lockKey, 'processing', 'NX', 'EX', 5);

  if (acquired) {
    const profile = await db.users.findById(userId);
    await redis.setex(`user:${userId}:profile`, 300, JSON.stringify(profile));
    await redis.del(lockKey);
    return profile;
  } else {
    // 他プロセスの再計算待機
    await new Promise(r => setTimeout(r, 100));
    return getUserProfile(userId);  // 再試行
  }
}
```

---

## ベストプラクティス

- **段階的なTTL設定：** 静的 > 低更新 > 高更新 の順に長さを調整
- **キャッシュレイヤーの監視：** ヒット率、ミス率の測定
- **キャッシュウォーミング：** アプリ起動時に頻繁なクエリをプリロード
