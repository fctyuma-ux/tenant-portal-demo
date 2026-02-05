# BY. 監視・オブザーバビリティ

## 概要

監視・オブザーバビリティは、本番システムの健全性を継続的に把握し、問題を早期に検出・対応するための基盤です。メトリクス、ログ、トレースの3本柱により、システム全体の可視化を実現し、信頼性の高い運用を支えます。

---

## メトリクス（数値監視）

メトリクスは、システムの健全性を数値で表現したデータです。リアルタイムで収集・分析され、異常検知やアラートトリガーに活用されます。

### 主要なメトリクスカテゴリ

**ビジネスメトリクス**
- ユーザーアクティブ数
- トランザクション成功率
- 収益
- コンバージョン率

```plaintext
時系列グラフ
MAU (Monthly Active Users)
  ↓
  |     ▁▂▃▄▅▆▇█
  |   ▂▅
  |▁▃▆
  └──────────────→
    Jan  Feb  Mar  Apr
```

**システムメトリクス**
- CPU 使用率
- メモリ使用率
- ディスク I/O
- ネットワーク帯域幅

**アプリケーションメトリクス**
- リクエストレート
- レスポンスタイム
- エラーレート
- キャッシュヒット率

```javascript
// メトリクス収集コード例
const prometheus = require('prom-client');

// カウンター: 増加のみ
const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// ゲージ: 増減可
const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// ヒストグラム: 値の分布
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// 使用例
app.get('/users', (req, res) => {
  const start = Date.now();
  httpRequestsTotal.inc({ method: 'GET', route: '/users', status: 200 });
  activeConnections.inc();

  // 処理...

  const duration = (Date.now() - start) / 1000;
  httpRequestDuration.observe(duration);
  activeConnections.dec();

  res.json({ users: [] });
});
```

### ダッシュボード設計例

```plaintext
┌─────────────────────────────────────────────┐
│  Production Dashboard - System Health       │
├─────────────────────────────────────────────┤
│ CPU Usage: 45%        │ Memory: 72%         │
│ ▮▮▮▮▮░░░░░░░░░░░░  │ ▮▮▮▮▮▮▮▮░░░░░░░  │
├──────────┬──────────┬──────────┬──────────┤
│ Requests │ Errors   │ Latency  │ Uptime   │
│ 2.5K/s   │ 0.1%     │ 145ms    │ 99.99%   │
├──────────┴──────────┴──────────┴──────────┤
│ Response Time Trend                       │
│ ▁▂▂▃▂▃▄▃▂▁▂▂▁▂▁▂▁▂▂▂▃▂▁▂▁▂▁▂▃▂ ms       │
│ ├─────────────────────────────────┤       │
│ 30 min ago              Now               │
└─────────────────────────────────────────────┘
```

---

## ログ（イベント記録）

ログは、アプリケーション・システムで発生したイベントの詳細な記録です。トレーサビリティと診断に不可欠な情報源となります。

### ログレベルの設計

```plaintext
レベル     用途                    例
────────────────────────────────────────────
ERROR      重大なエラー            データベース接続失敗
WARN       警告・注意              メモリ使用量が80%超
INFO       情報・イベント          ユーザーログイン
DEBUG      詳細情報・開発用        関数開始・終了
TRACE      最詳細情報              変数値の変化
```

### 構造化ログの実装例

```javascript
// logger.js - 構造化ログの実装
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'combined.log'
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// ログ出力例
logger.info('User login', {
  userId: 'user123',
  email: 'user@example.com',
  timestamp: new Date(),
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});

logger.error('Payment processing failed', {
  orderId: 'order456',
  amount: 99.99,
  errorCode: 'PAYMENT_TIMEOUT',
  retryCount: 3,
  stack: error.stack
});
```

### ログ集約と分析

```plaintext
アプリケーション
    ↓
ログ生成（STDOUT）
    ↓
Filebeat/Fluentd（ログ収集）
    ↓
Elasticsearch（検索可能な保存）
    ↓
Kibana（可視化・分析）

クエリ例:
GET /logs/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "level": "ERROR" } },
        { "range": { "timestamp": { "gte": "now-1h" } } }
      ]
    }
  }
}
```

---

## トレース（分散トレーシング）

トレースは、リクエストがマイクロサービス全体を通じてどのように処理されるかを追跡するデータです。複雑なシステムの問題診断に不可欠です。

### 分散トレースの構造

```plaintext
クライアントリクエスト
│
├─ Span 1: API Gateway（50ms）
│  ├─ Span 2: 認証サービス（10ms）
│  └─ Span 3: ビジネスロジック（35ms）
│     ├─ Span 4: DB クエリ（20ms）
│     └─ Span 5: キャッシュ検索（5ms）
│
└─ Span 6: ログ記録（5ms）

合計: 50ms
ボトルネック: DB クエリ（20ms = 40%）
```

### 分散トレーシング実装例

```javascript
// jaeger トレーシング
const opentelemetry = require('@opentelemetry/api');
const { BasicTracerProvider } = require('@opentelemetry/tracing');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const jaegerExporter = new JaegerExporter({
  serviceName: 'api-service',
});

const tracerProvider = new BasicTracerProvider();
tracerProvider.addSpanProcessor(
  new opentelemetry.BatchSpanProcessor(jaegerExporter)
);

const tracer = opentelemetry.trace.getTracer('api-tracer');

// トレース使用例
async function processOrder(orderId) {
  const span = tracer.startSpan('processOrder');

  try {
    span.addEvent('order_started', { orderId });

    // 認証スパン
    const authSpan = tracer.startSpan('validateAuth', { parent: span });
    await validateAuth();
    authSpan.end();

    // 支払い処理スパン
    const paymentSpan = tracer.startSpan('processPayment', { parent: span });
    const result = await processPayment(orderId);
    paymentSpan.addEvent('payment_completed', {
      amount: result.amount,
      transactionId: result.txnId
    });
    paymentSpan.end();

    span.setStatus({ code: opentelemetry.SpanStatusCode.OK });
    return result;

  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: opentelemetry.SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

---

## アラート設定

アラートは、メトリクスが閾値を超えたとき自動的に通知を送ります。効果的なアラートは、オンコール対応の効率性を大きく左右します。

### アラートルール設計

```yaml
# Prometheus アラートルール
groups:
  - name: application
    rules:
      # CPU 使用率が80%を超えた場合
      - alert: HighCPUUsage
        expr: node_cpu_usage > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected ({{ $value | humanize }}%)"

      # エラーレートが5%を超えた場合
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate ({{ $value | humanizePercentage }})"
          runbook: "https://wiki.example.com/high-error-rate"

      # サービスが利用不可の場合
      - alert: ServiceDown
        expr: up == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
```

### アラート通知先の設定

```javascript
// Alertmanager 設定
{
  "routes": [
    {
      "match": { "severity": "critical" },
      "receiver": "pagerduty",
      "repeat_interval": "5m"
    },
    {
      "match": { "severity": "warning" },
      "receiver": "slack",
      "repeat_interval": "1h"
    }
  ],
  "receivers": [
    {
      "name": "pagerduty",
      "pagerduty_configs": [{
        "service_key": "xxxxx",
        "description": "{{ .GroupLabels.alertname }}"
      }]
    },
    {
      "name": "slack",
      "slack_configs": [{
        "api_url": "https://hooks.slack.com/...",
        "channel": "#alerts"
      }]
    }
  ]
}
```

---

## ベストプラクティス

- **適切な粒度**: すべてを監視するのではなく、ビジネスに影響するメトリクスを優先
- **ログの構造化**: JSON形式で機械可読性を確保
- **トレーシングの活用**: マイクロサービス環境での問題診断に必須
- **アラートの調整**: アラート疲れを避けるため、閾値と通知先を慎重に設定
- **保持期間の計画**: ログ・メトリクスの保存コストと分析可能期間のバランス

---

## 次のステップ

- SLO・SLIの設定と監視
- インシデント対応プロセスの構築
- パフォーマンス最適化
