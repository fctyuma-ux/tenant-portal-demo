# CC. スケーラビリティ

## 概要

スケーラビリティとは、ユーザー数やデータ量の増加に応じて、システムが継続して期待通りのパフォーマンスを提供できる能力です。

垂直スケール（Scale Up: サーバーを高性能化）と水平スケール（Scale Out: サーバー台数を増やす）、データベースのシャーディング、オートスケーリング設定など、段階的にシステムを成長させる手法を習得します。

---

## 1. ロードバランシング

**L4（トランスポート層）vs L7（アプリケーション層）:**

| 層 | 判定方法 | 特徴 | 用途 |
|----|--------|------|------|
| L4 | IP/ポート | 高速、低オーバーヘッド | 単純な分散 |
| L7 | HTTP ヘッダ・パス | 柔軟な分散、オーバーヘッドあり | パス別ルーティング |

```
L4 ロードバランサー:
ユーザー → LB （IP:Port で分散）
           ├─ サーバーA:80
           ├─ サーバーB:80
           └─ サーバーC:80

L7 ロードバランサー:
ユーザー → LB （HTTP パス/ホストで分散）
           ├─ api.example.com → API サーバー群
           ├─ web.example.com → Web サーバー群
           └─ admin.example.com → Admin サーバー群
```

**Nginx による負荷分散:**

```nginx
upstream api_backend {
  server api1.example.com:3000;
  server api2.example.com:3000;
  server api3.example.com:3000;
}

server {
  listen 80;
  server_name api.example.com;

  location / {
    proxy_pass http://api_backend;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

**分散アルゴリズム:**

- **Round Robin:** 順番に分散（デフォルト）
- **Least Connections:** 接続数が少ないサーバーに優先
- **IP Hash:** 同じ IP は同じサーバーに（セッション保持）

```nginx
upstream api_backend {
  least_conn;  # または ip_hash;
  server api1.example.com:3000;
  server api2.example.com:3000;
}
```

**セッション・スティッキネス（Sticky Session）:**

セッション情報を保持するサーバーを固定することで、シングルサインオンを保証します。

```
❌ ラウンドロビンの問題:
リクエスト1: API1 にログイン → セッションA
リクエスト2: API2 にアクセス → セッション情報なし！

✓ スティッキー:
ユーザーA → 常に API1
ユーザーB → 常に API2
```

---

## 2. SSLオフロード

**SSL Termination:**

TLS/SSL の暗号化・復号化を ロードバランサーで行い、内部サーバーは平文で通信します。

```
ユーザー ─(HTTPS)─→ ロードバランサー
                    ↓（TLS終了）
                   内部─(HTTP)─→ サーバーA
                        ─(HTTP)─→ サーバーB
```

**メリット:**
- サーバーの CPU 負荷を削減
- 証明書管理が一箇所に集約

---

## 3. トラフィック予測とスケーリング計画

**トレンドライン分析:**

過去のトラフィックデータから、将来の需要を予測します。

```
例: 毎月 20% のユーザー増加
現在: 10,000 DAU
3ヶ月後: 17,280 DAU
→ サーバー台数を今から増やす準備が必要
```

**季節性（Seasonality）:**

時期によりトラフィックが変動する傾向。

```
EC サイト:
- 通常: 10万 DAU
- 年末商戦: 50万 DAU（5倍）
→ 事前に容量を準備しておく
```

**非線形な成長（Viral Growth）:**

SNS シェアやメディア露出により、指数関数的にトラフィックが増加する場合。

```
通常成長: 1日 +1%
バイラル: 1日 +100% or more
→ オートスケーリングがないと対応不可
```

**AWS Forecast 機能:**

CloudWatch のメトリクスから、機械学習により将来のトラフィックを自動予測。

---

## 4. データベースのスケーリング

**シャーディング vs パーティショニング:**

| 手法 | 分割単位 | 管理 | 用途 |
|------|--------|------|------|
| シャーディング | 複数の DB インスタンス | アプリで管理 | 水平スケール |
| パーティショニング | 同一 DB 内の複数テーブル | DB で管理 | 単一 DB の最適化 |

**シャードキーの選択:**

ユーザー ID でシャーディングする場合:

```
ユーザーID % シャード数 = シャード番号

例:
ユーザー 101 % 4 = 1 → DB-1 に保存
ユーザー 205 % 4 = 1 → DB-1 に保存
ユーザー 308 % 4 = 0 → DB-0 に保存
```

**Hotspot 問題:**

特定のシャードに集中的にアクセスが偏る問題。

```
❌ 悪い例: 国別シャーディング
日本シャード ← アクセス集中（人口多い）
その他シャード ← スカスカ

✓ 良い例: ユーザーID ハッシュ
均等に分散
```

**クロスシャードクエリのコスト:**

複数シャード間でのクエリは高くつきます。

```sql
❌ 複数シャード巡回（遅い）
SELECT * FROM orders
WHERE user_id BETWEEN 1 AND 1000000;
-- 4 つのシャード全部に問い合わせが必要

✓ 特定シャード（速い）
SELECT * FROM orders
WHERE user_id = 123;
-- シャード 0 だけに問い合わせ
```

**Vitess / Citus などのシャーディングツール:**

アプリケーション側の複雑性を隠蔽し、透過的にシャーディングを管理します。

---

## 5. スケール戦略

**垂直スケール（Scale Up）vs 水平スケール（Scale Out）:**

| 観点 | 垂直 | 水平 |
|------|------|------|
| サーバー性能 | 高性能 1台 | 普通性能 複数台 |
| コスト | 高い | 相対的に安い |
| 複雑さ | シンプル | 複雑（負荷分散、シャーディング） |
| 限界 | あり（最大スペック） | 理論上無制限 |

**ステートレスの重要性:**

水平スケールするには、各サーバーが独立して動作する必要があります。

```javascript
❌ ステートフル（スケール困難）
// メモリ内にセッション保持
const sessions = {};
app.post('/login', (req, res) => {
  sessions[req.body.id] = req.body.token;
  // サーバー A でセッション作成
  // リクエスト 2 がサーバー B に来たら、セッション情報なし
});

✓ ステートレス
// セッションは Redis に保持
app.post('/login', async (req, res) => {
  await redis.set(`session:${req.body.id}`, req.body.token);
  // 全サーバーが Redis にアクセス可能
});
```

**データベースのスケーリング:**

```
ユーザー増加に応じた段階:

1. インスタンスタイプ変更（垂直）
   t3.small → t3.xlarge

2. 読みレプリカ追加（読取特化）
   メイン DB ← 読みレプリカ群

3. シャーディング（水平）
   DB-0 / DB-1 / DB-2 ...
```

---

## 6. オートスケーリング

**Reactive Scaling:**

現在の負荷に応じてリソースを自動調整します。

```yaml
# Kubernetes HPA（Horizontal Pod Autoscaler）
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

→ CPU 使用率が 70% を超えたら、自動的にポッド数を増やす

**Predictive Scaling:**

将来の需要を予測し、事前にリソースを準備します。

```
今から 30分後は午前 8時（出社時間） → 通勤ラッシュ予想
事前に サーバー台数を増やしておく
→ トラフィック増加に即座に対応
```

**Queue Depth Scaling:**

キュー内のメッセージ数に応じてワーカーを自動スケール。

```
KEDA（Kubernetes Event Driven Autoscaling）
AWS SQS のキューの深さを監視
キュー内メッセージ 100 個/pod → pod 数を調整
```

**スケールダウン・スタビライゼーション:**

サーバーを急に削除すると、進行中のリクエストが失われる可能性。

```
スケールダウン前:
1. 新規リクエスト受け入れ停止（GracefulShutdown）
2. 進行中のリクエスト完了を待つ（最大30秒）
3. その後にサーバー停止
```

---

## 7. コストモデルと容量計画

**ヘッドルーム（Headroom）:**

ピーク負荷時に余裕を持たせることで、予期しないトラフィック増加に対応。

```
計算式: 必要容量 = ピーク負荷 × ヘッドルーム係数

例:
ピーク時 800 DAU
ヘッドルーム 1.3 （30%余裕）
→ 必要容量 = 800 × 1.3 = 1,040 DAU

逆算して サーバー台数決定
```

**On-Demand vs Reserved:**

```
On-Demand （従量制）
- 時間単位で課金
- 柔軟だが、単価が高い

Reserved Instances （長期割引）
- 1年/3年契約で割引
- コミットメント必須

組み合わせ: ベースは Reserved, スパイク対応に On-Demand
```

**AWS Pricing Calculator:**

様々なシナリオのコスト試算。

```
例: 月 100万 リクエスト
- サーバー: t3.large × 2 = 月 $150
- DB: RDS db.t3.medium = 月 $100
- ストレージ: 100GB = 月 $30
- データ転送: 月 $20
合計: 月 $300
```
