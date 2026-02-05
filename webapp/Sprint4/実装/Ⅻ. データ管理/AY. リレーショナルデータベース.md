# AY. リレーショナルデータベース

## 概要

リレーショナルデータベース（RDBMS）は、データを行と列の表構造で管理し、ACID 特性を提供する信頼性の高いシステムです。大規模で複雑なデータ処理、トランザクション要件、複数テーブル間の関連性が必要なアプリケーションに適しています。

本セクションでは、スケーラビリティを実現するレプリケーション技術、マスター・スレーブ構成、Read Replica の活用について説明します。

## レプリケーションの種類

データベースレプリケーションは、複数のサーバー間でデータの同期を保つ技術です。可用性向上、読み取り性能の拡張、バックアップ機能を提供します。

### バイナリログレプリケーション

マスターサーバーの全ての変更（INSERT、UPDATE、DELETE）をバイナリログに記録し、スレーブサーバーがそのログを再実行します。非常に信頼性高く、大規模データセットに対応できます。

### ロウベースレプリケーション

個別の行変更をスレーブに送信します。バイナリログ方式より詳細ですが、通信量が多くなります。

### ロジカルレプリケーション

スキーマ変更や DDL ステートメントも含めてレプリケーションします。異なるバージョンのデータベース間でもレプリケーション可能です。

## マスター・スレーブ構成

マスターサーバーは全ての書き込み操作を処理し、スレーブサーバー（Read Replica）は読み取り専用で動作します。

メリット：
- **スケーラビリティ**: 読み取り負荷を複数スレーブに分散
- **可用性**: マスター障害時のフェイルオーバー準備
- **バックアップ**: スレーブ上で影響なくバックアップ実施

デメリット：
- **レプリケーションラグ**: マスター・スレーブ間の同期遅延
- **複雑性**: フェイルオーバー、昇格時の処理が複雑

## Read Replica の利用

Read Replica は、マスターデータベースの読み取り専用コピーです。分析クエリ、レポート生成、検索インデックス更新など、重い読み取り操作を専用レプリカで実行し、本体サーバーへの負荷を軽減します。

### マスター・スレーブレプリケーション設定（MySQL）

```sql
-- マスター側の設定確認
SHOW MASTER STATUS;

-- スレーブ側での接続設定
CHANGE MASTER TO
  MASTER_HOST = 'master.example.com',
  MASTER_USER = 'repl_user',
  MASTER_PASSWORD = 'password',
  MASTER_LOG_FILE = 'mysql-bin.000001',
  MASTER_LOG_POS = 12345;

START SLAVE;

-- レプリケーション状態確認
SHOW SLAVE STATUS\G
```

### アプリケーション側での読み取り負荷分散

```javascript
const mysql = require('mysql2/promise');

// マスター接続（書き込み用）
const masterPool = mysql.createPool({
  host: 'master.example.com',
  user: 'app_user',
  password: 'password',
  database: 'myapp'
});

// スレーブ接続（読み取り用）
const slavePool = mysql.createPool({
  host: 'slave.example.com',
  user: 'app_user',
  password: 'password',
  database: 'myapp'
});

// 読み取りはスレーブを使用
async function getUserData(userId) {
  const connection = await slavePool.getConnection();
  const [rows] = await connection.query(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
  connection.release();
  return rows[0];
}

// 書き込みはマスターを使用
async function updateUser(userId, data) {
  const connection = await masterPool.getConnection();
  await connection.query(
    'UPDATE users SET ? WHERE id = ?',
    [data, userId]
  );
  connection.release();
}
```

## レプリケーションラグ対策

読み取り・書き込みが分離される場合、クライアント側で最新データが一時的に見えないレプリケーションラグが発生します。対策として：

- **マスターからの読み取り**: 重要な更新後のクエリはマスターから読み取る
- **遅延感知**: アプリケーション側で遅延を検知し、待機またはユーザーに通知
- **キャッシュ活用**: 一時的に不一致が許容できるデータはキャッシュから提供

## パフォーマンス最適化

- インデックス設計の最適化
- クエリ実行計画の分析（EXPLAIN）
- 接続プーリングによるコネクション効率化
- キャッシュ戦略（クエリキャッシュ、アプリ側キャッシュ）

