# AZ. NoSQL・その他データストア

## 概要

NoSQLデータストアはスキーマの柔軟性、スケーラビリティ、高速読み書きを実現します。MongoDBやFirestore等のドキュメント志向DBと、Redisなどのキー値ストアは、RDBと異なる設計思想を持ちます。

---

## 1. RDB との違い

| 特性 | RDB | NoSQL |
|-----|-----|-------|
| スキーマ | 固定・厳格 | 柔軟・自由 |
| 正規化 | 推奨・強制 | 非正規化（埋め込み） |
| トランザクション | ACID | BASE（最終一貫性） |
| JOIN | 柔軟 | 非推奨（非正規化で対応） |
| スケール | 垂直（Scale Up） | 水平（Scale Out） |

---

## 2. 非正規化戦略（MongoDB/Firestore）

**埋め込みドキュメント：関連データを1つのドキュメントに含める**

```typescript
// MongoDB / Firestore
// ユーザーと住所を1つのドキュメントに
const user = {
  _id: ObjectId('...'),
  name: '太郎',
  email: 'taro@example.com',
  address: {
    street: '〇〇県〇〇市',
    postalCode: '123-4567',
    country: '日本'
  },
  createdAt: new Date()
};

// 参照：別のコレクションから参照
const post = {
  _id: ObjectId('...'),
  title: 'My Post',
  userId: ObjectId('...'),  // ユーザーへの参照
  createdAt: new Date()
};
```

**利点:**
- JOINが不要→クエリが高速
- スキーマが自由→段階的な変更が容易

**欠点:**
- データ重複→更新時に複数箇所を修正
- ドキュメントサイズが大きい

---

## 3. CRUD 操作

**MongoDB（Mongoose ORM例）:**

```typescript
import mongoose from 'mongoose';

// スキーマ定義（任意）
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
});

const User = mongoose.model('User', userSchema);

// CREATE
const user = await User.create({
  name: '太郎',
  email: 'taro@example.com'
});

// READ
const found = await User.findById(user._id);
const list = await User.find({ email: /.*@example\.com/ });

// UPDATE
await User.updateOne({ _id: user._id }, { name: '太郎2' });

// DELETE
await User.deleteOne({ _id: user._id });
```

**Firestore（Firebase SDK例）:**

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// CREATE
const docRef = await addDoc(collection(db, 'users'), {
  name: '太郎',
  email: 'taro@example.com'
});

// READ
const snapshot = await getDocs(collection(db, 'users'));
snapshot.forEach(doc => console.log(doc.data()));

// UPDATE
await updateDoc(docRef, { name: '太郎2' });

// DELETE
await deleteDoc(docRef);
```

---

## 4. 埋め込みドキュメント設計

**ユーザープロフィール + プリファレンス（埋め込み）:**

```typescript
const user = {
  _id: ObjectId(),
  name: '太郎',
  email: 'taro@example.com',
  preferences: {
    theme: 'dark',
    language: 'ja',
    notifications: {
      email: true,
      push: false,
      sms: false
    }
  },
  billing: {
    plan: 'premium',
    expiresAt: new Date('2025-12-31')
  }
};

// 更新
db.users.updateOne(
  { _id: user._id },
  { $set: { 'preferences.theme': 'light' } }
);
```

---

## 5. Redis（キー値ストア）

**データ型:**

```typescript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// String（文字列）
await client.set('username', 'taro');
const username = await client.get('username');

// List（リスト）
await client.lPush('queue', 'job1', 'job2', 'job3');
const next = await client.lPop('queue');  // 'job3'

// Hash（ハッシュ）
await client.hSet('user:1', {
  name: 'taro',
  email: 'taro@example.com',
  age: 30
});
const user = await client.hGetAll('user:1');

// Set（集合）
await client.sAdd('tags', 'react', 'nodejs', 'typescript');
const tags = await client.sMembers('tags');

// Sorted Set（スコア付きセット）
await client.zAdd('leaderboard', [
  { score: 100, member: 'user1' },
  { score: 85, member: 'user2' },
  { score: 70, member: 'user3' }
]);
const topThree = await client.zRangeByScore('leaderboard', 0, Infinity, {
  limit: { offset: 0, count: 3 },
  REV: true
});
```

---

## 6. Redis の永続化モデル

**RDB（スナップショット）:** 定期的にディスクに保存

```
利点：コンパクト、復旧が高速
欠点：定期的なため最新データが失われる可能性
```

**AOF（Append-Only File）:** すべてのコマンドをファイルに追記

```
利点：完全な復旧
欠点：ファイルが大きい
```

```bash
# redis.conf 設定例
save 900 1        # 15分ごと、1個以上変更で保存
save 300 10       # 5分ごと、10個以上変更で保存
appendonly yes    # AOF有効化
```

---

## 7. Redis によるシンプルキャッシュ実装

```typescript
async function getCachedUser(userId: string) {
  const cacheKey = `user:${userId}`;

  // キャッシュから取得
  const cached = await client.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // DBから取得
  const user = await db.users.findById(userId);

  // キャッシュに保存（1時間）
  await client.setEx(cacheKey, 3600, JSON.stringify(user));

  return user;
}

// ユーザー更新時にキャッシュをクリア
async function updateUser(userId: string, data: any) {
  const user = await db.users.findByIdAndUpdate(userId, data);

  // キャッシュを削除
  await client.del(`user:${userId}`);

  return user;
}
```

---

## 8. ランキング機能（Sorted Set）

```typescript
// スコアを更新
async function updateScore(userId: string, score: number) {
  await client.zAdd('leaderboard', { score, member: userId });
}

// TOP 10を取得
async function getTopPlayers(limit = 10) {
  const players = await client.zRangeByScore(
    'leaderboard',
    0,
    Infinity,
    {
      limit: { offset: 0, count: limit },
      REV: true  // 降順
    }
  );

  return players;
}

// ユーザーのランク位置を取得
async function getUserRank(userId: string) {
  const rank = await client.zRevRank('leaderboard', userId);
  return rank ? rank + 1 : null;  // ランクは1から始まる
}

// スコアを増加
async function incrementScore(userId: string, points: number) {
  await client.zIncrBy('leaderboard', points, userId);
}
```

---

## 9. トレードオフ

**MongoDB/Firestore を選ぶケース:**
- スキーマが頻繁に変わる
- 埋め込みドキュメントが自然
- トランザクション不要

**RDB を選ぶケース:**
- 厳格なスキーマが必要
- 複雑な JOIN が必要
- ACID トランザクションが必須

**Redis を選ぶケース:**
- 超高速読み書き
- セッション・キャッシュ
- ランキング等の集計
