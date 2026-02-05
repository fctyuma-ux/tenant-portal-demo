# AY. リレーショナルデータベース

## 概要

リレーショナルデータベースはデータ一貫性とクエリ柔軟性に優れています。正規化による冗長性排除、制約による整合性保証、JOINによる複雑なクエリが可能になります。

---

## 1. 正規化（Normalization）

**第1正規形（1NF）:** すべての属性が単一値（原子値）を持つ

```sql
/* 悪い例：複数値が1つのカラムに */
CREATE TABLE books (
  id INT,
  title VARCHAR(100),
  authors VARCHAR(100)  -- 「著者A, 著者B」という複数値
);

/* 良い例：正規化 */
CREATE TABLE books (
  id INT PRIMARY KEY,
  title VARCHAR(100)
);

CREATE TABLE authors (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE book_authors (
  book_id INT,
  author_id INT,
  FOREIGN KEY (book_id) REFERENCES books(id),
  FOREIGN KEY (author_id) REFERENCES authors(id)
);
```

**第2正規形（2NF）:** 第1正規形を満たし、非キー属性が主キー全体に依存

```sql
/* 悪い例：部分関数従属 */
CREATE TABLE orders (
  order_id INT PRIMARY KEY,
  product_id INT,
  product_name VARCHAR(100),  -- product_id だけで決定
  customer_id INT,
  customer_name VARCHAR(100)
);

/* 良い例：テーブル分割 */
CREATE TABLE orders (
  order_id INT PRIMARY KEY,
  product_id INT,
  customer_id INT,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);
```

**第3正規形（3NF）:** 第2正規形を満たし、非キー属性が主キーに推移関数従属しない

```sql
/* 悪い例：推移関数従属 */
CREATE TABLE employees (
  emp_id INT PRIMARY KEY,
  name VARCHAR(100),
  dept_id INT,
  dept_name VARCHAR(100)  -- dept_id → dept_name
);

/* 良い例：テーブル分割 */
CREATE TABLE employees (
  emp_id INT PRIMARY KEY,
  name VARCHAR(100),
  dept_id INT,
  FOREIGN KEY (dept_id) REFERENCES departments(id)
);

CREATE TABLE departments (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);
```

---

## 2. 非正規化（Denormalization）

パフォーマンス向上のため、あえて冗長性を導入することもあります：

```sql
/* クエリの高速化のため、集計データを事前計算 */
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  total_posts INT,  -- 非正規化：posts テーブルとの関連から計算
  last_login TIMESTAMP
);

/* 更新時には両方を更新 */
INSERT INTO posts (user_id, title) VALUES (1, '新しい投稿');
UPDATE users SET total_posts = total_posts + 1 WHERE id = 1;
```

---

## 3. 制約と整合性

**主キー（Primary Key）:**

```sql
CREATE TABLE users (
  id INT PRIMARY KEY,
  email VARCHAR(100)
);
```

**外部キー（Foreign Key）:**

```sql
CREATE TABLE posts (
  id INT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200),
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE CASCADE  -- ユーザー削除時にポストも削除
);
```

**UNIQUE 制約:**

```sql
CREATE TABLE users (
  id INT PRIMARY KEY,
  email VARCHAR(100) UNIQUE,  -- 重複不可
  username VARCHAR(100) UNIQUE
);
```

**CHECK 制約:**

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY,
  quantity INT CHECK (quantity > 0),
  status VARCHAR(20) CHECK (status IN ('pending', 'shipped', 'delivered'))
);
```

---

## 4. JOIN の種類

**INNER JOIN:**

```sql
/* ユーザーと投稿の一致するレコードのみ */
SELECT u.name, p.title
FROM users u
INNER JOIN posts p ON u.id = p.user_id;
```

**LEFT JOIN:**

```sql
/* すべてのユーザーを表示（投稿がなくても） */
SELECT u.name, p.title
FROM users u
LEFT JOIN posts p ON u.id = p.user_id;
```

**FULL OUTER JOIN:**

```sql
/* マッチしないレコードもすべて表示 */
SELECT u.name, p.title
FROM users u
FULL OUTER JOIN posts p ON u.id = p.user_id;
```

---

## 5. サブクエリ（副問合せ）

```sql
/* 投稿が2件以上あるユーザーを取得 */
SELECT u.id, u.name
FROM users u
WHERE u.id IN (
  SELECT user_id
  FROM posts
  GROUP BY user_id
  HAVING COUNT(*) >= 2
);

/* スカラーサブクエリ */
SELECT
  u.name,
  (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count
FROM users u;
```

---

## 6. 複雑なクエリ例

**複数テーブルのJOINと集計:**

```sql
/* ユーザーごとの投稿数とコメント総数 */
SELECT
  u.id,
  u.name,
  COUNT(DISTINCT p.id) as post_count,
  COUNT(DISTINCT c.id) as comment_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY u.id, u.name
ORDER BY post_count DESC;
```

**ウィンドウ関数：**

```sql
/* ユーザーごとの投稿の累積カウント */
SELECT
  u.name,
  p.title,
  p.created_at,
  ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY p.created_at) as post_number
FROM users u
JOIN posts p ON u.id = p.user_id
ORDER BY u.id, post_number;
```

---

## 7. 大量データの更新

```sql
/* バッチ更新：1000件ずつ */
UPDATE posts
SET status = 'archived'
WHERE created_at < NOW() - INTERVAL 1 YEAR
LIMIT 1000;

/* トランザクション内での複数操作 */
BEGIN TRANSACTION;
  UPDATE users SET total_posts = total_posts + 1 WHERE id = 1;
  INSERT INTO posts (user_id, title) VALUES (1, '新しい投稿');
COMMIT;
```

---

## 8. パフォーマンス最適化

**インデックス設計:**

```sql
/* 検索キーにインデックス */
CREATE INDEX idx_user_email ON users(email);

/* 複合インデックス */
CREATE INDEX idx_posts_user_date ON posts(user_id, created_at);

/* EXPLAIN で実行計画を確認 */
EXPLAIN SELECT * FROM posts WHERE user_id = 1 AND created_at > '2024-01-01';
```
