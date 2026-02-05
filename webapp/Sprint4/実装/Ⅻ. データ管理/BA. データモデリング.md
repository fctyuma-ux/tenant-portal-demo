# BA. データモデリング

## 概要

データモデリングは、ビジネス要件を満たすデータ構造を設計するプロセスです。適切なモデリングにより、データの整合性確保、クエリパフォーマンス向上、将来の要件変化への対応が容易になります。

本セクションでは、バイテンポラルデータモデル（時間軸を2つ持つモデル）とスナップショット戦略を説明します。これらは、監査ログ、履歴追跡、データ復旧などが必要なアプリケーションで有効です。

## バイテンポラルデータモデル

バイテンポラルモデルは、2つの時間軸を持つデータモデルです：

- **トランザクション時間** (Transaction Time): データベースに記録された時刻
- **ビジネス時間** (Valid Time): ビジネス上の変化が実際に起きた時刻

例：商品価格の変更

```
商品 ID: 001
商品名: ノートPC
旧価格: 100,000 円
新価格: 95,000 円

ビジネス時間: 2024-02-15（セール開始日）
トランザクション時間: 2024-02-10（システム入力日）
```

この構造により、「特定日付時点での商品価格」を正確に照会できます。また、誤入力をシステムが検知してから修正する場合、正確な履歴追跡が可能です。

## スナップショット

データの変更歴を全て保存することは容量効率が悪い場合があります。スナップショットは、定期的に現在の完全なデータ状態を記録し、それ以降の変更のみを保存する方法です。

メリット：
- **容量効率**: 大規模データで履歴追跡時の効率性
- **高速復旧**: スナップショット時点への迅速な復旧
- **検索性**: スナップショット以後の変更のみスキャン

## 履歴テーブルの実装

### テーブル設計

```sql
-- 現在データテーブル
CREATE TABLE products (
  product_id INT PRIMARY KEY,
  name VARCHAR(255),
  price DECIMAL(10, 2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 履歴テーブル（バイテンポラル）
CREATE TABLE products_history (
  history_id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT,
  name VARCHAR(255),
  price DECIMAL(10, 2),
  valid_from TIMESTAMP,       -- ビジネス時間開始
  valid_until TIMESTAMP,      -- ビジネス時間終了
  transaction_at TIMESTAMP,   -- トランザクション時間
  operation VARCHAR(10),      -- INSERT, UPDATE, DELETE
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  INDEX idx_product_valid (product_id, valid_from, valid_until)
);
```

### 履歴の記録

```javascript
async function updateProduct(productId, newPrice, effectiveDate) {
  const connection = await db.getConnection();

  try {
    // 1. 現在の価格を履歴テーブルに移動
    await connection.query(`
      INSERT INTO products_history
      (product_id, name, price, valid_from, valid_until, transaction_at, operation)
      SELECT product_id, name, price,
             COALESCE(valid_from, DATE_SUB(NOW(), INTERVAL 100 YEAR)),
             DATE_SUB(?, INTERVAL 1 DAY),
             NOW(),
             'UPDATE'
      FROM products
      WHERE product_id = ?
    `, [effectiveDate, productId]);

    // 2. 新しい価格で更新
    await connection.query(`
      UPDATE products
      SET price = ?, updated_at = NOW()
      WHERE product_id = ?
    `, [newPrice, productId]);

    // 3. 新しい価格を履歴に記録
    await connection.query(`
      INSERT INTO products_history
      (product_id, name, price, valid_from, valid_until, transaction_at, operation)
      SELECT product_id, name, price, ?, NULL, NOW(), 'UPDATE'
      FROM products
      WHERE product_id = ?
    `, [effectiveDate, productId]);

  } finally {
    connection.release();
  }
}
```

### 履歴の照会

```sql
-- 特定日付での商品価格照会
SELECT product_id, name, price
FROM products_history
WHERE product_id = 001
  AND valid_from <= '2024-02-15'
  AND (valid_until IS NULL OR valid_until > '2024-02-15')
LIMIT 1;

-- 価格変更履歴の取得
SELECT valid_from, valid_until, price
FROM products_history
WHERE product_id = 001
  AND operation = 'UPDATE'
ORDER BY valid_from DESC;

-- ビジネス時間と記録時間のギャップ確認（監査）
SELECT
  product_id,
  valid_from,
  transaction_at,
  DATEDIFF(transaction_at, valid_from) AS days_gap
FROM products_history
WHERE DATEDIFF(transaction_at, valid_from) > 7;
```

## ソフトデリート

物理削除（DELETE）ではなく、削除フラグを設定する方式です。データ復旧が容易で、参照整合性も保持できます。

```sql
-- テーブルに deleted_at カラムを追加
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMP NULL;

-- ソフトデリート
UPDATE products SET deleted_at = NOW() WHERE product_id = 001;

-- 削除されていない行のみ取得
SELECT * FROM products WHERE deleted_at IS NULL;
```

