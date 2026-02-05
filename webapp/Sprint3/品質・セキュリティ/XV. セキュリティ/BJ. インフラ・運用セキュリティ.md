# BJ. インフラ・運用セキュリティ

## 概要

インフラ・運用セキュリティは、クラウド環境やオンプレミス基盤における監査・監視です。本セクションではログの種類、取得方法、保護戦略に焦点を当てます。

適切なログ管理により、セキュリティインシデント発生時に原因を追跡でき、コンプライアンス要件を満たすことができます。

---

## 1. 監査ログの種類

**操作監査ログ (Audit Trails)**
- **内容**：誰が、いつ、何をしたか（ユーザー操作・API呼び出し）
- **記録項目**：ユーザー ID、タイムスタンプ、操作内容、リソース、結果（成功/失敗）
- **保持期間**：一般的に 90 日～ 1 年以上

**例：AWS CloudTrail**
```json
{
  "eventTime": "2024-02-04T10:23:45Z",
  "eventSource": "ec2.amazonaws.com",
  "eventName": "RunInstances",
  "userIdentity": {
    "principalId": "AIDAC3NQEXAMPLE"
  },
  "sourceIPAddress": "192.0.2.1",
  "requestParameters": {
    "instanceType": "t2.micro"
  }
}
```

---

## 2. ネットワークフローログ

**ネットワークフローログの役割**
- VPC/ネットワーク通信の記録（IP、ポート、プロトコル）
- 不正通信パターンの検知
- DDoS 攻撃の追跡

**記録項目**
- 送信元/宛先 IP アドレス
- 送信元/宛先ポート
- プロトコル（TCP/UDP）
- 送受信バイト数、パケット数
- Accept/Reject ステータス

**分析例**
```
192.168.1.100 → 10.0.0.50:443  [TCP] ACCEPT
192.168.1.100 → 10.0.0.50:22   [TCP] REJECT
192.168.1.101 → 10.0.0.50:3389 [TCP] REJECT  # 異常検知
```

不正なポートへのアクセス試行を即座に検知できます。

---

## 3. ログの保護とライフサイクル

**ログの保護対策**
- **アクセス制御**：特定の管理者のみアクセス許可
- **改ざん防止**：Write Once Read Many (WORM) 設定
- **暗号化**：保存時 (at rest) と転送時 (in transit) の暗号化
- **削除防止**：ログの削除・編集を禁止

**ライフサイクル管理**
```
1. ホットストレージ（1～7日）：すぐにアクセス可能
2. クールストレージ（30日～1年）：アーカイブへ移動
3. 削除または長期保管：法的要件に基づいて判断
```

---

## 4. CloudTrail の有効化と確認

**CloudTrail の設定**
```bash
aws cloudtrail create-trail \
  --name my-trail \
  --s3-bucket-name my-logs-bucket \
  --is-multi-region-trail

aws cloudtrail start-logging --trail-name my-trail
```

**ログの確認**
```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=my-instance
```

---

## 5. アクセスログの S3 集約

**複数ソースのログを一元管理**
- EC2 インスタンスログ → CloudWatch Logs
- ALB / ELB アクセスログ → S3
- API Gateway ログ → CloudWatch Logs または S3

**S3 への集約設定**
```python
import boto3

s3_client = boto3.client('s3')

# ELB アクセスログを S3 に配信
response = s3_client.put_bucket_logging(
    Bucket='my-logs-bucket',
    BucketLoggingStatus={
        'LoggingEnabled': {
            'TargetBucket': 'my-logs-bucket',
            'TargetPrefix': 'alb-logs/'
        }
    }
)
```

---

## 6. ログ監視とアラート

**CloudWatch アラートの設定**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "High-failed-login-attempts" \
  --alarm-description "Alert when failed logins exceed 5 in 5 minutes" \
  --metric-name FailedLoginAttempts \
  --namespace CustomLogs \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

**検知対象イベント**
- ルートアカウントでの操作
- 権限変更（IAM ポリシー更新）
- セキュリティグループ変更
- KMS キーの無効化
- 短時間での API 呼び出し急増

定期的な監視により、セキュリティインシデントの発生を最小化します。
