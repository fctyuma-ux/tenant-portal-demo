# BB. トランザクション・整合性

## 概要

ACID特性（原子性、一貫性、分離性、永続性）、トランザクション境界、分離レベル、デッドロック対策、楽観的/悲観的ロックを習得します。複数操作を原子的に実行し、データの信頼性を確保する機構を理解します。

---

## ACID特性

**Atomicity（原子性）**：トランザクション内のすべての操作は、全成功または全失敗。部分的な成功は存在しない。銀行送金など、複数操作の整合性が必須な場合に重要。

**Consistency（一貫性）**：トランザクション完了後、定義されたルール（制約）をすべて満たす状態になります。CHECK制約など無効データの挿入を防止。

**Isolation（分離性）**：複数トランザクション同時実行時も、各々が独立して動作。一つのトランザクション内での読み取り値が保証される。

**Durability（永続性）**：コミット（確定）後、サーバークラッシュ時も失われない。ディスク上に永続保存。

---

## トランザクション境界

複数操作をまとめてトランザクション化：

```javascript
return await db.transaction(async (tx) => {
  const user = await tx.users.create({ email, name });
  await tx.emails.create({
    userId: user.id,
    email: user.email,
    status: 'pending'
  });
  return user;
  // commit or rollback automatically
});
```

トランザクション内で失敗すると、すべての操作がロールバック（開始前状態に戻す）。**セーブポイント**により、一部操作のみロールバック可能。

---

## 分離レベル

複数トランザクションが同時実行される際の可視性制御：

| レベル | ダーティリード | 非反復可能読取 | 幻読 |
|--------|--------------|--------------|-----|
| READ UNCOMMITTED | ○ | ○ | ○ |
| READ COMMITTED | × | ○ | ○ |
| REPEATABLE READ | × | × | ○ |
| SERIALIZABLE | × | × | × |

**READ COMMITTED**（最一般的）：コミット済みデータのみ読み取り。同トランザクション内での読み取り結果が変わる可能性（非反復可能読取）。

**REPEATABLE READ**（MySQLデフォルト）：同トランザクション内での読み取り結果が常に同じ。幻読の可能性あり。

**SERIALIZABLE**：完全な独立実行。パフォーマンス影響が大きく避けられることが多い。

---

## デッドロック

複数トランザクションがお互いのロック解放を待つ状況。**対策**：ロック順序を固定、リトライロジックを実装。

```javascript
// 対策：ID の小さい順でロック
const [smallerId, largerId] = [fromId, toId].sort();
const acc1 = await tx.accounts.findByIdForUpdate(smallerId);
const acc2 = await tx.accounts.findByIdForUpdate(largerId);
```

---

## ロック戦略

**楽観的ロック**：バージョン番号で競合判定。読み取り時のバージョンと更新時のバージョンが一致する場合のみ更新許可。競合少ない場面に適している。

```sql
UPDATE posts SET title = ?, version = version + 1
WHERE id = ? AND version = ?
```

**悲観的ロック**：読み取り時点でロック取得。他トランザクションをブロック。競合多い場面や確実な更新が必要な場合に適している。

---

## 重要なポイント

1. 複数操作を原子的にトランザクション化
2. ACID特性の正確な理解
3. 分離レベル選択による競合とパフォーマンスのバランス
4. デッドロック防止のロック順序統一
5. 楽観的/悲観的ロックの使い分け
