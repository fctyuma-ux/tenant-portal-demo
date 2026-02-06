# AY. リレーショナルデータベース

## 概要

テーブル設計（主キー、外部キー）、SQL基本操作（SELECT/INSERT/UPDATE/DELETE）、正規化（1NF/2NF/3NF）、JOIN、制約によるデータ整合性確保を習得します。

---

## テーブル設計

テーブルは行（Row）と列（Column）で構成。各カラムはデータ型を持ち、保存可能な値が制限されます（INT、VARCHAR、TIMESTAMP など）。

**主キー（Primary Key）**：各行を一意に識別。一意性・非NULL性・不変性を満たす必要があります。`AUTO_INCREMENT`で新規レコード挿入時に自動インクリメント。

**外部キー（Foreign Key）**：別テーブルの主キーを参照し、テーブル間の関連性を表現。参照整合性により、存在しないキーの参照を防止。

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## SQL基礎

**SELECT**：WHERE条件、LIKE部分一致、ORDER BY並べ替え、LIMIT件数制限で柔軟に検索。

**INSERT**：複数行同時挿入対応。

**UPDATE**：WHERE句を必ず指定してから更新。

**DELETE**：WHERE句なしは全行削除され危険。

---

## 正規化

**第1正規形（1NF）**：一つのセルに複数の値が入らない。複数値はテーブル分割で対応。

**第2正規形（2NF）**：主キーの一部だけに依存するカラムが存在しない。複合主キーテーブルで特に重要。

**第3正規形（3NF）**：主キー以外のカラムに依存するカラムが存在しない。テーブル分割で段階的に正規化。

```sql
/* 3NF 違反：dept_head が department に依存 */
SELECT id, name, department, dept_head FROM users;

/* 3NF 満たす：テーブル分割 */
CREATE TABLE departments (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  head_id INT
);
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  department_id INT REFERENCES departments(id)
);
```

---

## JOIN

**INNER JOIN**：両テーブルの共通データのみ。

**LEFT JOIN**：左テーブル全行＋右テーブルマッチ行。右にない場合はNULL埋め。

---

## 制約

| 制約 | 役割 |
|------|------|
| **PRIMARY KEY** | 行の一意識別 |
| **UNIQUE** | カラム値の一意性確保 |
| **NOT NULL** | NULL値禁止 |
| **FOREIGN KEY** | 参照整合性確保 |
| **CHECK** | 条件付き制約（例：age >= 0 AND age <= 150） |
| **DEFAULT** | デフォルト値設定 |

外部キー削除時の挙動：**CASCADE**（子も削除）、**SET NULL**（子FK＝NULL）、**RESTRICT**（削除禁止）を選択。

---

## 重要なポイント

1. 主キー・外部キーで関連性を表現
2. 適切なデータ型選択
3. 正規化により重複排除・更新異常防止
4. 制約によるDB側の整合性確保
5. NULLの取り扱いに注意
