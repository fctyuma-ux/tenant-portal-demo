# BA. データモデリング

## 概要

効果的なデータモデリングは、データの正確性、保全性、パフォーマンスを確保する基盤です。ドメイン制約の実装、削除戦略、トランザクション制御、スキーママイグレーションについて学習します。

---

## ドメイン制約の実装

**ドメイン制約** とは、データの有効性を定義する規則です。データベース層で強制することで、不正なデータの挿入を防ぎます。

**実装レベル:**
- **アプリケーション層：** 最初の防線だが、言語・フレームワークに依存
- **データベース層：** 言語非依存、すべてのアプリケーションに適用
- **複合制約：** CHECK制約、トリガーで複雑なルールを実装

```sql
-- 基本的な制約
CREATE TABLE users (
  id INT PRIMARY KEY,
  age INT CHECK (age >= 0 AND age <= 150),
  email VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'suspended'))
);
```

**競合状態（Race Condition）** は、複数スレッド・プロセスが同時にデータにアクセスし、期待と異なる結果になる状況です。ドメイン制約ではなく、トランザクション制御で対処します。

---

## 削除戦略

**論理削除のメリット・デメリット:**

メリット：
- 削除履歴が残る（監査対応）
- 誤削除の復旧が簡単
- 関連データの参照が保たれる

デメリット：
- 削除フラグの管理が必要
- クエリが複雑化（常に削除フラグをチェック）
- ディスク容量が増加

```sql
-- 論理削除の実装
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;

SELECT * FROM users WHERE deleted_at IS NULL;  -- 有効なレコード

-- 削除する際
UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = 123;
```

**アーカイブ戦略** は、古いデータを別テーブル・別ストレージに移動する手法です。パフォーマンス低下を防ぎながら、履歴を保持できます。

---

## トランザクション制御

**Unit of Work** パターンでは、複数のデータベース操作をまとめて1つのトランザクションとして実行します。

```javascript
// Unit of Work の例
async function transferMoney(fromId, toId, amount) {
  const transaction = await db.transaction();

  try {
    await transaction.update('accounts',
      { id: fromId },
      { balance: db.raw('balance - ?', [amount]) }
    );
    await transaction.update('accounts',
      { id: toId },
      { balance: db.raw('balance + ?', [amount]) }
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

**外部API呼び出しを含むトランザクション:**
外部API呼び出しはネットワーク遅延・失敗のリスクがあります。トランザクション内に組み込むことは避け、API呼び出し→トランザクション実行の順序にします。

---

## スキーママイグレーション

**マイグレーションツール** は、スキーマ変更をバージョン管理します。

一般的なツール：
- **Flyway：** Java生態系、SQL中心
- **Liquibase：** XML/YAML定義、複数DB対応
- **Alembic：** Python/SQLAlchemy、DynamicSQL
- **Knex.js：** Node.js、マイグレーション＋クエリビルダ

**後方互換性の維持:**
```sql
-- 新しいカラムを追加（旧コードが動作継続）
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) DEFAULT NULL;

-- 古いカラムは一定期間保持
-- その後、削除する（別のマイグレーションで）
```

**カラム分割マイグレーション:**
```sql
-- Phase 1: 新しいカラムを追加
ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);

-- Phase 2: 既存データをマイグレーション
UPDATE users SET
  first_name = SPLIT_STR(full_name, ' ', 1),
  last_name = SPLIT_STR(full_name, ' ', 2);

-- Phase 3: 旧カラムを削除（十分な期間後）
ALTER TABLE users DROP COLUMN full_name;
```

---

## ベストプラクティス

- **マイグレーション時の計画：** ダウンタイムなし、段階的実施
- **監視：** スキーマ変更前後のパフォーマンス測定
- **ロールバック計画：** すべてのマイグレーションにロールバック手段を用意
