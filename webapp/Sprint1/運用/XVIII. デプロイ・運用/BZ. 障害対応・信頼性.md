# BZ. 障害対応・信頼性

## 概要

障害対応・信頼性は、本番システムで予期しない問題が発生した際の迅速な復旧、および継続的な可用性改善の枠組みです。インシデント対応プロセス、SLO・SLI、障害の根本原因分析により、組織全体の信頼性文化を醸成します。

---

## インシデント対応プロセス

インシデント対応は、問題発生からの時間を最小化し、影響を制限するための手順化されたプロセスです。迅速性と正確さのバランスが成功の鍵です。

### インシデント対応の段階

```plaintext
問題検知
    ↓
インシデント宣言
    │
    ├─ 重大度判定（Critical/High/Medium/Low）
    └─ オンコール者に通知
    ↓
初動対応
    ├─ インシデント指揮官（IC）の配置
    ├─ 影響範囲の確認
    └─ 状況のドキュメント化
    ↓
問題解析
    ├─ ログ・メトリクス・トレース確認
    ├─ 最近の変更の特定
    └─ 仮説の立案
    ↓
復旧実行
    ├─ 緊急パッチ適用 / ロールバック
    ├─ 手動介入（DB操作など）
    └─ 進捗状況の継続発表
    ↓
検証・クローズ
    ├─ サービス正常性の確認
    ├─ 2段階目の改善計画立案
    └─ インシデントクローズ
    ↓
事後分析（Post Mortem）
    ├─ 根本原因分析（RCA）
    ├─ 再発防止策の立案
    └─ 組織学習の共有
```

### インシデント対応テンプレート

```markdown
# インシデント #2024-0204-001

## 基本情報
- **重大度**: Critical
- **開始時刻**: 2024-02-04 14:30 UTC
- **終了時刻**: 2024-02-04 15:15 UTC
- **影響時間**: 45分
- **影響範囲**: 全ユーザー（約100万）

## 症状
- ログインページが502 Bad Gateway を返す
- API レスポンスが 30秒以上遅延
- データベースコネクション数が上限に達している

## タイムライン

| 時刻 | 出来事 | アクション |
|------|--------|-----------|
| 14:30 | アラート: Error rate > 50% | On-call engineer notified |
| 14:32 | IC assigned: alice@company.com | War room opened in Slack |
| 14:35 | DB slow query identified | Slow queries killed |
| 14:40 | Memory leak detected in v2.5.2 | Rollback decision made |
| 14:50 | Rollback to v2.5.1 in progress | Kubernetes deployment rolling |
| 15:10 | Service recovery confirmed | All tests passed |
| 15:15 | Incident closed | Post-mortem scheduled |

## 根本原因
メモリリークがバージョン 2.5.2 の新機能（リアルタイム通知）に導入された。
負荷テストで発見されず、本番環境で高負荷時に顕在化。

## 再発防止策
1. **短期** (1週間以内)
   - リアルタイム通知機能をロールバック
   - メモリプロファイリングの強化

2. **中期** (1ヶ月以内)
   - 本番環境同等の負荷テスト環境構築
   - E2E パフォーマンステスト自動化

3. **長期** (3ヶ月以内)
   - リアルタイム通知機能の完全リファクタリング
   - メモリ使用量の継続監視アラート
```

### インシデント対応シミュレーション

```bash
#!/bin/bash
# scripts/incident-simulation.sh

# インシデント宣言
INCIDENT_ID="INC-$(date +%s)"
SLACK_CHANNEL="#incidents"

# Slack 通知
curl -X POST $SLACK_WEBHOOK_URL \
  -d "{\"text\": \"🚨 INCIDENT $INCIDENT_ID - Critical service degradation\"}"

# ロギングディレクトリ作成
mkdir -p "incidents/$INCIDENT_ID"

# 現在の状態をダンプ
kubectl describe nodes > "incidents/$INCIDENT_ID/nodes.txt"
kubectl top pods > "incidents/$INCIDENT_ID/pod-resources.txt"
kubectl logs -l app=api --tail=1000 > "incidents/$INCIDENT_ID/app-logs.txt"

# メトリクスエクスポート（過去1時間）
prometheus_query \
  'increase(http_requests_total{status=~"5.."}[1h])' \
  > "incidents/$INCIDENT_ID/error-metrics.json"

# 復旧オプション表示
echo "=== Recovery Options ==="
echo "1. Rollback: kubectl rollout undo deployment/app"
echo "2. Scale down: kubectl scale deployment api --replicas=0"
echo "3. Restart: kubectl rollout restart deployment/app"

echo "Incident documentation: incidents/$INCIDENT_ID/"
```

---

## SLO（Service Level Objective）と SLI（Service Level Indicator）

SLO・SLI は、ユーザーに対する約束（サービス品質）を数値で定義し、実際の達成状況を測定するメカニズムです。

### SLO・SLI の定義例

```plaintext
SLI（測定指標）
  ↓ ────────────────────────────────────
  │
  ├─ 可用性（Availability）
  │  = 正常なレスポンスを返したリクエスト数 / 総リクエスト数
  │
  ├─ レイテンシ（Latency）
  │  = 100ms以内で応答したリクエスト数 / 総リクエスト数
  │
  └─ 正確性（Correctness）
     = 正しい結果を返したリクエスト数 / 総リクエスト数

SLO（目標値）
  ↓
  ├─ 可用性: 99.9%（月1時間強のダウン許容）
  ├─ レイテンシ: 99%のリクエストが200ms以内
  └─ 正確性: 99.99%
```

### SLO のエラーバジェット計算

```plaintext
月間のダウンタイム許容量（エラーバジェット）
= (1 - SLO) × 月間総時間
= (1 - 0.999) × 730時間
= 0.43時間 = 26分

⇒ 月26分までダウンタイムが許容される

※ エラーバジェット使い切り時は、
   リスクを減らすため新規リリースを一時停止
```

### SLI・SLO の監視実装例

```yaml
# Prometheus + Grafana での SLO 監視
groups:
  - name: slos
    rules:
      # 可用性 SLI
      - record: sli:availability:success_rate
        expr: |
          sum(rate(http_requests_total{status=~"2.."}[5m])) /
          sum(rate(http_requests_total[5m]))

      # 可用性 SLO アラート（99.9% 目標）
      - alert: SLO_Availability_Warning
        expr: sli:availability:success_rate < 0.999
        for: 5m
        annotations:
          summary: "Availability SLO at risk"

      # レイテンシ SLI
      - record: sli:latency:p99
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m]))
          )

      # レイテンシ SLO アラート（200ms 目標）
      - alert: SLO_Latency_Warning
        expr: sli:latency:p99 > 0.2
        for: 5m
        annotations:
          summary: "Latency SLO at risk"
```

---

## 根本原因分析（RCA）

根本原因分析は、インシデント発生の深層的な原因を特定し、再発防止策を立案するプロセスです。表面的な原因ではなく、根本原因を追求することが重要です。

### RCA のフレームワーク（5 Why）

```plaintext
インシデント: ログインサービスが 45分間ダウン
    ↓ Why 1
原因 1: データベースコネクション数が上限に達した
    ↓ Why 2
原因 2: バージョン 2.5.2 でメモリリークが発生
    ↓ Why 3
原因 3: リアルタイム通知機能で WebSocket コネクションを保持し続けた
    ↓ Why 4
原因 4: メモリプロファイリングテストが本番環境レベルの負荷で実施されていない
    ↓ Why 5
根本原因: 本番環境同等の負荷テスト環境が存在せず、
          リリース前の性能検証が不十分だった

再発防止策:
  → 本番環境同等の負荷テスト環境の構築
  → E2E性能テストの自動化と CI 統合
  → メモリ使用量の継続監視アラート
```

### RCA ドキュメント構造

```markdown
# RCA Report: 2024-02-04 Database Connection Exhaustion

## インシデント概要
- 期間: 14:30 - 15:15 UTC (45分)
- 影響: ログインサービス完全ダウン
- ユーザー数: 約100万

## イベントタイムライン
[詳細なタイムラインを記載]

## 根本原因
メモリリークによるゾンビコネクション蓄積

## 貢献要因（Contributing Factors）
1. 本番環境同等の負荷テストが実施されていない
2. メモリプロファイリングツールが CI に統合されていない
3. リアルタイム通知機能のコード レビュー で見落とし

## 再発防止策

### すぐに実施（1週間）
- [ ] リアルタイム通知機能をロールバック
- [ ] メモリリーク箇所を修正し、v2.5.3 リリース
- [ ] 緊急パッチの適用検証

### 短期（1ヶ月）
- [ ] 本番環境同等の負荷テスト環境構築
- [ ] E2E パフォーマンステスト自動化
- [ ] コード レビュー チェックリストにメモリ効率を追加

### 中期（3ヶ月）
- [ ] メモリ使用量の継続監視アラート実装
- [ ] リアルタイム通知機能の完全リファクタリング
- [ ] チーム全体への パフォーマンス改善ガイダンス実施
```

---

## 可用性と信頼性の向上

### 信頼性パターン

```plaintext
冗長化（Redundancy）
  同じ機能を複数インスタンスで実行
  → 1つ障害でも他がカバー

フェイルオーバー（Failover）
  A が障害時、自動的に B に切り替え
  → ダウンタイム最小化

サーキットブレーカー（Circuit Breaker）
  外部サービス障害時、リクエストを中断
  → カスケード障害を防止

タイムアウト（Timeout）
  遅いリクエストを打ち切る
  → リソーム枯渇を防止
```

### 高可用性実装例

```javascript
// サーキットブレーカーパターン
const CircuitBreaker = require('circuit-breaker');

const dbCircuitBreaker = new CircuitBreaker({
  name: 'database',
  threshold: 5,  // 5回失敗で開く
  timeout: 10000  // 10秒でタイムアウト
});

async function queryDatabase(sql) {
  try {
    return await dbCircuitBreaker.execute(() =>
      db.query(sql)
    );
  } catch (error) {
    if (error.name === 'CIRCUIT_BREAKER_OPEN') {
      // キャッシュから返す
      return getCachedResult(sql);
    }
    throw error;
  }
}

// リトライロジック
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, { timeout: 5000 });
    } catch (error) {
      const delay = Math.pow(2, i) * 1000;  // 指数バックオフ
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

---

## ベストプラクティス

- **迅速な検知**: 監視・アラートの充実
- **明確な指揮体制**: インシデント指揮官の配置
- **短いMTTR（平均復旧時間）**: 復旧手順の自動化
- **事後分析の文化**: 責任追及ではなく、学習重視
- **継続的改善**: RCA 結果の実行と追跡

---

## 次のステップ

- パフォーマンス最適化とボトルネック分析
- 信頼性向上のための継続的改善
