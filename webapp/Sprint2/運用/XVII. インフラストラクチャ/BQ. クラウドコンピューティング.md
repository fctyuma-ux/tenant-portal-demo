# BQ. クラウドコンピューティング

## 概要

クラウドコンピューティングは、物理サーバーを購入・保守する代わりに、インターネット経由でコンピュートリソース（サーバー、ストレージ、データベース）をオンデマンドで利用するモデルです。

AWS / GCP / Azure などの主要クラウドプロバイダーの理解、Well-Architected フレームワーク、責任共有モデル、コスト管理、IAM（アクセス制御）などの実践的なスキルを習得します。

---

## 1. クラウドの基礎概念

**パブリッククラウド vs プライベートクラウド:**

| 特性 | パブリック | プライベート |
|------|----------|-----------|
| インフラ | 共有（複数企業） | 自社専有 |
| コスト | 安い（スケールメリット） | 高い（自社保守） |
| セキュリティ | 責任共有 | 自社でコントロール |
| スケーラビリティ | 無限に近い | 購入額に依存 |

**IaaS / PaaS / SaaS:**

```
IaaS （Infrastructure as a Service）
EC2 / GCE / Azure VM
→ サーバー OS・ミドルウェア・DB は自分で管理

PaaS （Platform as a Service）
App Engine / Cloud Run
→ ランタイム・DB・ロードバランサーはクラウド提供

SaaS （Software as a Service）
Google Workspace / Slack
→ アプリケーション全て クラウド提供
```

---

## 2. Well-Architected フレームワーク

**AWS Well-Architected の 5本柱:**

1. **運用の優秀性（Operational Excellence）**
   - IaC、監視、オートメーション
   - 目標: 変更を自動化し、インシデントを減らす

2. **セキュリティ（Security）**
   - 最小権限、暗号化、監査
   - 目標: アクセス制御、データ保護

3. **信頼性（Reliability）**
   - 冗長性、自動復旧、監視
   - 目標: サービス停止を最小化

4. **パフォーマンス効率（Performance Efficiency）**
   - リソース最適化、キャッシング
   - 目標: 適切なコストで高速提供

5. **コスト最適化（Cost Optimization）**
   - 不要なリソース削除、予約割引
   - 目標: 必要な機能を最小コストで実現

**Well-Architected レビュー:**

自社システムが 5本柱を満たしているか、クラウドベンダーのツールで診断。

```
結果例:
- 運用の優秀性: ⭐⭐⭐ （改善の余地あり）
- セキュリティ: ⭐⭐⭐⭐⭐ （良好）
- 信頼性: ⭐⭐⭐ （AZ 分散が必要）
- パフォーマンス: ⭐⭐⭐⭐ （ほぼ良好）
- コスト: ⭐⭐ （予約割引導入が必要）
```

---

## 3. 責任共有モデル

クラウドプロバイダーとユーザーの責任は明確に分かれています。

```
AWS（例）:

IaaS (EC2):
AWS 責任   │ ユーザー責任
-----------┼-----------
物理施設    │ サーバーセキュリティ
ネットワーク│ OS パッチ
ハイパーバイザ│ ファイアウォール
         │ アプリケーション

PaaS (RDS):
AWS 責任   │ ユーザー責任
-----------┼-----------
物理施設    │ データベース設定
ネットワーク│ 権限管理
ハイパーバイザ│ SQL チューニング
OS        │ アプリケーション
DB エンジン │ バックアップ戦略
```

→ **PaaS を使うほど、ユーザーの管理負荷が減る代わり、カスタマイズ性が下がる**

---

## 4. IAM（Identity and Access Management）

**最小権限の原則:**

ユーザーに必要最小限の権限だけを付与します。

```
❌ 悪い例
IAM User: "全権限"
→ 誰でも全リソース削除可能

✓ 良い例
IAM User: "EC2 インスタンス起動・停止のみ"
IAM User: "S3 Bucket-A の読取のみ"
```

**IAM ロール作成:**

```yaml
# EC2 インスタンスに付与する IAM ロール
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": "dynamodb:Query",
      "Resource": "arn:aws:dynamodb:*:*:table/Users"
    },
    {
      "Effect": "Deny",
      "Action": "iam:*",
      "Resource": "*"
    }
  ]
}
```

→ S3 と DynamoDB へのアクセスは許可、IAM 変更は禁止

---

## 5. ネットワーク設定

**セキュリティグループ（ファイアウォール）:**

EC2 インスタンスへのインバウンド・アウトバウンド通信を制御します。

```
セキュリティグループ（API Server）:

Inbound:
- HTTP:80 ← Load Balancer セキュリティグループから
- HTTPS:443 ← Load Balancer セキュリティグループから

Outbound:
- TCP:3306 → RDS セキュリティグループへ
- TCP:6379 → Redis セキュリティグループへ
```

**マルチ AZ（Availability Zone）構成:**

複数のデータセンターに展開し、1 つの AZ が障害を起こしても サービス継続。

```
リージョン（東京）
├─ AZ-A
│  ├─ EC2 インスタンス 1
│  └─ RDS マスター
├─ AZ-B
│  ├─ EC2 インスタンス 2
│  └─ RDS レプリカ
└─ AZ-C
   └─ EC2 インスタンス 3
```

→ AZ-A が停止 → AZ-B / AZ-C で継続動作

---

## 6. マネージドサービス vs 自己管理

| 観点 | マネージド（RDS等） | 自己管理（EC2+MySQL） |
|------|-----|-----|
| 操作性 | シンプル | 複雑 |
| スケーリング | 自動 | 手動 |
| バックアップ | 自動 | 自分で実装 |
| 料金 | やや高い | 安い |
| カスタマイズ | 限定的 | 自由 |

**サービスマッピング:**

プロジェクトの要件に合わせてサービスを選定します。

```
Web Application:
- Web Server → EC2 / App Engine / Cloud Run
- Static Files → S3 / Cloud Storage
- CDN → CloudFront / Cloud CDN

Database:
- リレーショナル → RDS / Cloud SQL
- NoSQL → DynamoDB / Firestore
- キャッシュ → ElastiCache / Memorystore

Queue:
- Message Queue → SQS / Pub/Sub
- Task Queue → SQS + Lambda / Cloud Tasks
```

---

## 7. コスト管理と予算

**コスト見積もり:**

事前に月額コストを試算し、予算を立てます。

```
構成: Web API + RDS

- EC2 t3.large × 2: $0.0832 / 時間 × 24h × 30日 = $60
- RDS db.t3.small: $0.165 / 時間 × 24h × 30日 = $120
- Load Balancer: $16.20 / 月
- データ転送: 月 500GB = $50
合計: 約 $250/月
```

**予算アラート（Budget Alert）:**

設定した予算を超える恐れがあれば、事前に通知。

```
Budget: $1,000/月
Alert: $800 （80%） に達したら E-mail
Alert: $950 （95%） に達したら Slack 通知
```

**コスト削減施策:**

1. **不要なリソース削除**: 実験済みの開発環境など
2. **スポットインスタンス**: 通常の 50～80% 割引（終了可能性あり）
3. **予約割引**: 1年/3年契約で割引
4. **自動シャットダウン**: 夜間・休日の停止スケジュール

```bash
# 開発環境を夜間に自動停止
AWS Lambda + CloudWatch Events
毎日 19:00 に EC2 停止、翌朝 8:00 に起動
→ 運用コスト 50% 削減
```

---

## 8. パフォーマンス検証

**レイテンシ比較:**

複数のリージョン・AZ を試して、最適配置を決定。

```
ユーザー地域: 東京
- Tokyo リージョン: 5ms ← 最小
- Osaka リージョン: 25ms
- Singapore リージョン: 45ms
```

→ 東京リージョン採用

**マルチリージョン検討:**

グローバル対応が必要な場合、複数リージョンに展開。

```
北米ユーザー → us-east-1 （バージニア）
欧州ユーザー → eu-west-1 （アイルランド）
アジアユーザー → ap-northeast-1 （東京）
```
