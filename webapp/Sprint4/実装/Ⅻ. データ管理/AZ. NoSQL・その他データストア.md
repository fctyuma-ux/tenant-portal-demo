# AZ. NoSQL・その他データストア

## 概要

NoSQL は、関連リレーショナルモデル以外のデータ管理システムの総称です。ドキュメント型（MongoDB）、キー・バリュー型（Redis）、グラフ型（Neo4j）、時系列型（InfluxDB）など、データの特性に応じた多様なストレージが選択できます。

本セクションでは、時系列データの特徴とリテンションポリシー、グラフデータベースとクエリ言語、マルチモデルデータベースについて説明します。

## 時系列データの特徴

時系列データは、時刻をキーとして並べられたメトリクス（温度、CPU 使用率、サーバーレスポンス時間など）です。以下の特徴があります：

- **大量の書き込み**: センサーやログから継続的にデータ生成
- **時刻ベースアクセス**: 特定期間のデータ集計クエリが大多数
- **イミュータブル**: 過去データは変更されず、追記のみ
- **圧縮性**: 同じメトリクスの連続値は圧縮可能

時系列データベース（InfluxDB、TimescaleDB）は、これらの特性に最適化されており、書き込みパフォーマンスと圧縮率が優れています。

## リテンションポリシー

時系列データは急速に容量を消費するため、古いデータを自動削除するリテンションポリシーが必須です。

```javascript
// InfluxDB でのリテンションポリシー設定
const influx = new InfluxDB({
  host: 'localhost',
  database: 'mydb'
});

// 90日以上前のデータを削除
await influx.createRetentionPolicy('90days', {
  database: 'mydb',
  duration: '90d',
  replication: 1,
  isDefault: true
});

// 古いデータ削除タスク（定期実行）
setInterval(async () => {
  await influx.query(`DROP RETENTION POLICY old_data ON mydb`);
}, 24 * 60 * 60 * 1000); // 毎日実行
```

## メトリクス記録の実装

```javascript
const InfluxDB = require('influxdb-client');

const client = new InfluxDB.InfluxDB({
  url: 'http://localhost:8086',
  token: process.env.INFLUX_TOKEN,
  org: 'myorg',
  bucket: 'mybucket'
});

async function recordMetric(metricName, value, tags = {}) {
  const writeApi = client.getWriteApi('myorg', 'mybucket');

  writeApi.writePoint(
    new InfluxDB.Point(metricName)
      .floatField('value', value)
      .tag('host', os.hostname())
      .tag(...Object.entries(tags))
      .timestamp(new Date())
  );

  await writeApi.close();
}

// 使用例
await recordMetric('cpu_usage', 45.5, { service: 'web-api' });
await recordMetric('response_time_ms', 234, { endpoint: '/api/users' });
```

## グラフモデル

グラフデータベース（Neo4j）は、ノード（頂点）とエッジ（関連性）を用いてデータを表現します。ソーシャルネットワーク、推奨エンジン、知識グラフなど、関連性を中心にしたデータに適しています。

## Cypher Query Language (CQL)

Neo4j の標準クエリ言語 Cypher を用いて、グラフ探索を記述します。

```cypher
// 友達の友達を検索（2段階の関連）
MATCH (user:User {name: 'Alice'})
      -[:FRIEND]->(friend1:User)
      -[:FRIEND]->(friend2:User)
WHERE friend2.name <> 'Alice'
RETURN DISTINCT friend2.name;

// 推奨ユーザーの検索（共通の友達が多い順）
MATCH (me:User {name: 'Alice'})-[:FRIEND]-(mutual)-[:FRIEND]-(candidate)
WHERE candidate.name <> 'Alice'
WITH candidate, COUNT(mutual) AS commonFriends
RETURN candidate.name, commonFriends
ORDER BY commonFriends DESC
LIMIT 10;
```

### 友達の友達検索の実装例

```javascript
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

async function findFriendsOfFriends(userName) {
  const session = driver.session();

  const result = await session.run(
    `MATCH (user:User {name: $name})
           -[:FRIEND]->(friend1:User)
           -[:FRIEND]->(friend2:User)
     WHERE friend2.name <> $name
     RETURN DISTINCT friend2.name AS friendName`,
    { name: userName }
  );

  session.close();
  return result.records.map(record => record.get('friendName'));
}

// 使用例
const friendsOfFriends = await findFriendsOfFriends('Alice');
console.log(friendsOfFriends); // ['Charlie', 'Diana', ...]
```

## マルチモデルデータベース

マルチモデルデータベースは、複数のデータモデル（ドキュメント、グラフ、キー・バリュー）を単一システム内で統合管理します。例として ArangoDB、Couchbase などがあります。

メリット：
- **データモデル の柔軟性**: プロジェクトの進化に応じてモデル変更
- **統一されたクエリ言語**: 異なるモデル間の複雑なクエリ実行
- **トランザクション**: マルチモデル間での ACID 保証

### マルチモデルDB の試用例

```javascript
const aql = require('arangojs').aql;
const Database = require('arangojs').Database;

const db = new Database('http://localhost:8529');
db.useBasicAuth('root', 'password');

// ドキュメント + グラフの混合クエリ
const results = await db.query(aql`
  FOR user IN users
    FILTER user.active == true
    FOR comment IN 1..2 INBOUND user graph 'social_graph'
      RETURN {
        user: user.name,
        comments: comment.text
      }
`);
```

