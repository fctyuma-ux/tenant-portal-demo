# BB. トランザクション・整合性

## 概要

データベースの整合性を維持するため、トランザクション管理と分離レベルの理解が重要です。悲観的ロック、楽観的ロック、デッドロック対策を学習することで、並行処理の多いシステムで堅牢性を確保できます。

---

## 悲観的ロック

**悲観的ロック** は、データへのアクセス時にロックを取得し、他のプロセスによる競合を予防する手法です。

```sql
-- ロック取得
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;

-- この間、他のトランザクションはアクセス待ち
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;  -- ロック解放
```

**メリット：**
- 競合が頻繁な場合、パフォーマンスが良い
- 実装が直感的

**デメリット：**
- ロック時間が長いと他プロセスが待機
- デッドロックのリスク

---

## デッドロック

**デッドロック** は、複数トランザクションが相互にロックを待つ状況です。

```
Transaction A: ロック A → ロック B待ち
Transaction B: ロック B → ロック A待ち
                    ↓
                デッドロック
```

**予防策：**
- ロック取得順序を統一
- ロック保持時間を最小化
- タイムアウト設定

**検出・復旧：**
```sql
-- デッドロック時は自動ロールバック
-- アプリケーション側で再試行
try {
  await db.transaction(async (trx) => {
    await updateAccount(trx);
  });
} catch (error) {
  if (error.code === 'DEADLOCK_DETECTED') {
    // 指数バックオフで再試行
    await retryWithBackoff();
  }
}
```

---

## 悲観的ロックの実装

```javascript
// Node.js + Knex.js の例
async function transferMoney(fromId, toId, amount) {
  return await db.transaction(async (trx) => {
    // ロック取得
    const fromAccount = await trx('accounts')
      .where({ id: fromId })
      .forUpdate()
      .first();

    const toAccount = await trx('accounts')
      .where({ id: toId })
      .forUpdate()
      .first();

    if (fromAccount.balance < amount) {
      throw new Error('Insufficient funds');
    }

    // 更新
    await trx('accounts')
      .where({ id: fromId })
      .update({ balance: fromAccount.balance - amount });

    await trx('accounts')
      .where({ id: toId })
      .update({ balance: toAccount.balance + amount });
  });
}
```

---

## 分離レベル

**異常現象の種類：**
- **Dirty Read：** コミット前のデータを読み取り
- **Non-repeatable Read：** 同一クエリが異なる結果を返す
- **Phantom Read：** トランザクション中に新規レコードが挿入される

**分離レベル（低い順）:**

1. **Read Uncommitted：** すべての異常が発生可能（実用的でない）
2. **Read Committed：** Dirty Readのみ回避（多くのDBのデフォルト）
3. **Repeatable Read：** Dirty Read + Non-repeatable Readを回避
4. **Serializable：** すべての異常を回避（パフォーマンス低下）

**デフォルト分離レベル:**
- PostgreSQL：Read Committed
- MySQL：Repeatable Read
- Oracle：Serializable

**分離レベルの挙動確認:**
```sql
-- 現在の分離レベルを確認
SHOW TRANSACTION ISOLATION LEVEL;

-- 分離レベルを変更
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

---

## トランザクション制御の留意点

- **トランザクション時間：** 短く保つ（長いとロック競合増加）
- **ロック範囲：** 必要最小限に限定
- **エラーハンドリング：** デッドロック時の自動リトライ
- **監視：** アクティブなロック数、デッドロック発生頻度の監視

---

## ベストプラクティス

- **楽観的ロック推奨：** 競合が低い場合は楽観的ロック（Version Column）
- **適切な分離レベル選択：** 要件に応じて最小限のレベルに
- **テスト：** 並行処理シナリオのテストケース実装
