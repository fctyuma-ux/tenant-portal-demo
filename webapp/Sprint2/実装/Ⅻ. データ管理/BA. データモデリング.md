# BA. データモデリング

## 概要

データモデリングは、システムが扱うデータ構造を論理的・物理的に設計するプロセスです。ID設計から多対多リレーション、自己参照まで、実装を見据えた堅牢なモデル定義が品質に直結します。設計ツールを活用し、実装チェックリストとDDLで検証します。

---

## 1. ID設計の戦略

**役割:** 一意性の確保と検索性の両立

ID設計は単純に見えて奥が深く、スケーリング・運用効率に大きく影響します。

**主要なID戦略:**
- **シーケンシャルID:** 1, 2, 3...（自動採番）
  - メリット：実装が簡単、昇順でのクエリが高速
  - デメリット：生成ID の予測性、分散環境では採番に同期が必要
- **UUID:** ランダムな128ビット識別子
  - メリット：分散生成可能、衝突の危険が低い
  - デメリット：ストレージ効率が悪い（16バイト）、インデックス性能が低下
- **ナノID / ULID:** 短く、分散対応
  - メリット：UUID より短く、ソート可能（ULID）
  - デメリット：ライブラリ依存、標準的でない

**選択基準：**
- 単一DB → シーケンシャルID で十分
- 分散システム → UUIDまたはULID
- ハイボリューム → ナノID（ストレージ効率重視）

---

## 2. NULL許容設計

**役割:** データの有無を正確に表現

NULL の扱いはバグの温床。「何もない」と「不明」を区別し、適切に設計します。

**設計原則:**
- 必須項目は `NOT NULL` で制約
- オプション項目のみ `NULL` を許可
- NULL の意味を説明コメントに記載

**アンチパターン:**
```sql
-- 避けるべき設計
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100),        -- 実は必須なのにNULL許可
  middle_name VARCHAR(100), -- NULLなのに空文字を使う
  phone VARCHAR(20)         -- 「未登録」なのか「不明」なのか曖昧
);

-- 改善案
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  phone VARCHAR(20) NULL,
  phone_verification_status ENUM('unverified', 'verified') NOT NULL DEFAULT 'unverified'
);
```

---

## 3. リレーション設計と多対多解決

**役割:** エンティティ間の関係を正確に表現

**1対多（一般的）:**
```sql
CREATE TABLE categories (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE products (
  id INT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

**多対多（中間テーブルが必須）:**
```sql
CREATE TABLE students (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE courses (
  id INT PRIMARY KEY,
  title VARCHAR(100) NOT NULL
);

-- 中間テーブル
CREATE TABLE enrollments (
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  enrolled_at TIMESTAMP NOT NULL,
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);
```

---

## 4. 自己参照リレーション

**役割:** 階層構造（カテゴリツリー、組織図）を表現

```sql
CREATE TABLE categories (
  id INT PRIMARY KEY,
  parent_id INT NULL,  -- NULL = ルート
  name VARCHAR(100) NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES categories(id),
  CHECK (parent_id != id)  -- 自分自身を親にできない
);

-- 例: 小売カテゴリ
-- id=1: 電子機器（親=NULL）
--   id=2: スマートフォン（親=1）
--   id=3: ノートパソコン（親=1）
```

**クエリ例：全パスを取得**
```sql
WITH RECURSIVE path AS (
  SELECT id, parent_id, name, CAST(name AS CHAR(500)) AS full_path
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  SELECT c.id, c.parent_id, c.name,
         CONCAT(p.full_path, ' > ', c.name)
  FROM categories c
  JOIN path p ON c.parent_id = p.id
)
SELECT * FROM path ORDER BY full_path;
```

---

## 5. タグ付け機能の実装

**役割:** 柔軟な分類（商品が複数カテゴリに属する）

```sql
CREATE TABLE articles (
  id INT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL
);

CREATE TABLE tags (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE article_tags (
  article_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- 記事に複数のタグを付与
INSERT INTO article_tags (article_id, tag_id) VALUES (1, 1), (1, 2), (1, 3);

-- タグで検索
SELECT DISTINCT a.* FROM articles a
JOIN article_tags at ON a.id = at.article_id
WHERE at.tag_id IN (1, 2)
GROUP BY a.id
HAVING COUNT(*) = 2;  -- 両タグを持つ記事
```

---

## 6. モデリングツールの活用

**役割:** ビジュアル化による設計の共有・検証

主要なツール：
- **Lucidchart / Draw.io:** ER図を簡単に作成
- **ERDPlus:** ER図からDDL自動生成
- **Power Designer / Erwin:** エンタープライズ向け

**ER図の標準記法（IE記法 / Crow's Foot Notation）:**
```
┌─────────────┐         ┌──────────────┐
│  Category   │ 1 -|< M │   Product    │
├─────────────┤         ├──────────────┤
│ id (PK)     │         │ id (PK)      │
│ name        │         │ category_id  │
└─────────────┘         │ name         │
                        └──────────────┘

1 = 1対多の"1"側（親）
M = 1対多の"多"側（子）
```

---

## 7. 論理モデルと物理モデル

**論理モデル:**
- ビジネス概念に基づく設計
- テーブル、カラム、制約を定義
- DBMSに独立

**物理モデル:**
- 特定DBMSの仕様に合わせた設計
- インデックス、パーティション、ストレージ最適化を考慮
- パフォーマンス重視

**例：**
| 観点 | 論理モデル | 物理モデル |
|------|-----------|-----------|
| データ型 | 「日時」 | DATETIME(6) または TIMESTAMP |
| インデックス | 不要 | category_id に複合インデックス |
| パーティション | 不要 | date でパーティション（テーブル分割） |

---

## 8. IE記法によるER図作成手順

**Step 1:** エンティティ（テーブル）を列挙
```
- users（ユーザー）
- orders（注文）
- order_items（注文明細）
- products（商品）
```

**Step 2:** リレーション（1対多など）を矢印で表現
```
users 1 --< M orders（1ユーザーは複数注文可能）
orders 1 --< M order_items
products 1 --< M order_items
```

**Step 3:** 属性（カラム）と制約を記載
```
users { id, name, email, created_at }
orders { id, user_id, total_amount, order_date }
```

---

## 9. 設計時のチェックリスト

- [ ] 主キー（PK）は各テーブルで一意か
- [ ] 外部キー（FK）で参照整合性を確保しているか
- [ ] 必須項目は `NOT NULL` で制約しているか
- [ ] 多対多リレーションは中間テーブルで解決しているか
- [ ] 自己参照がある場合、無限ループを防ぐ制約（CHECK）があるか
- [ ] DDL と ER図が対応しているか
- [ ] テーブル名・カラム名は命名規則に従っているか（snake_case等）
- [ ] スケーリングを見据えた設計か（シャーディング対応など）

---

## まとめ

堅牢なデータモデリングは、後々の保守・拡張・パフォーマンスの基盤です。
ツールを使ってビジュアル化し、チーム内で設計を共有・検証することが重要です。
