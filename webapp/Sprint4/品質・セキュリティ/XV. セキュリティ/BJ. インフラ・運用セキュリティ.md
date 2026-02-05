# BJ. インフラ・運用セキュリティ

## 概要

インフラストラクチャレベルのセキュリティは、ネットワーク層、ホスト層、アプリケーション層を多層防御する「ディフェンス・イン・デプス」アプローチが基本です。従来の「境界防御」（ファイアウォール外部と内部の区分）から、ゼロトラスト原則に基づく「マイクロセグメンテーション」へのシフトが進んでいます。

本セクションでは、ゼロトラストの原則、多層防御戦略、WAF、VPN、セキュリティグループ設計、踏み台サーバー、DDoS 対策について説明します。

## ゼロトラストの基本原則

ゼロトラストは、「何も信頼しない」という原則に基づきます。従来モデルでは、境界内のユーザー・デバイスを信頼していましたが、ゼロトラストはすべてのアクセスを検証します。

7 つの柱：
1. **全ユーザー認証**: ローカルネットワーク接続でも認証必須
2. **デバイスセキュリティ**: デバイスのセキュリティポスチャを確認
3. **最小権限の原則**: 必要最小限のアクセス権のみ付与
4. **ネットワークセグメンテーション**: マイクロセグメンテーション
5. **暗号化**: すべての通信を暗号化
6. **継続的監視**: リアルタイム脅威検出
7. **ログ・監査**: 全アクセスを記録・監査

## 境界型防御の限界

従来の境界防御：

```
[Internet] --- [Firewall] --- [Corporate Network]
              └─ Blocked
```

内部ユーザーはすべて信頼される前提で、内部から外部への攻撃、特権昇格、横展開が起こりやすいです。

## マイクロセグメンテーション

ネットワークを複数のセグメントに分割し、セグメント間のアクセスを厳密に制御します。侵害されたセグメントからの横展開を防止できます。

```
+-----------+      +-----------+      +-----------+
| Web Tier  | ===  | App Tier  | ===  | DB Tier   |
| 192.0.2.0 |      | 192.0.3.0 |      | 192.0.4.0 |
+-----------+      +-----------+      +-----------+
    ↓                  ↓                  ↓
  (Auth)            (Auth)             (Auth)
    ↓                  ↓                  ↓
  (TLS)              (mTLS)            (TLS)
```

## WAF (Web Application Firewall)

WAF は、L7（アプリケーション層）で HTTP リクエストを検査し、SQL インジェクション、クロスサイトスクリプティング（XSS）などの攻撃を防止します。

```
HTTP Request
    ↓
[WAF Rules Check]
├─ SQL Injection パターン
├─ XSS パターン
├─ CSRF トークン検証
├─ レート制限
└─ IP ホワイトリスト
    ↓
Allowed / Blocked
```

## セキュリティグループ/NACL の設計

セキュリティグループはステートフル（戻りのトラフィック自動許可）、NACL はステートレス（明示的なルール記述）です。

```javascript
// AWS セキュリティグループの設定例（Terraform）
resource "aws_security_group" "web_tier" {
  name = "web-tier-sg"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  // HTTPS のみ許可
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  // HTTP → HTTPS redirect
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]  // 全て許可
  }
}

resource "aws_security_group" "app_tier" {
  name = "app-tier-sg"

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.web_tier.id]  // Web Tier からのみ
  }
}

resource "aws_security_group" "db_tier" {
  name = "db-tier-sg"

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app_tier.id]  // App Tier からのみ
  }
}
```

## 踏み台サーバー (Bastion) の運用

踏み台サーバーは、プライベートネットワークへのアクセス入口になるサーバーです。セキュアな運用が重要です。

```bash
# 踏み台サーバーへのアクセス（公開鍵認証）
ssh -i ~/.ssh/bastion_key ec2-user@bastion.example.com

# 踏み台経由でプライベートサーバーへアクセス
ssh -i ~/.ssh/app_key -J ec2-user@bastion.example.com ec2-user@app-server-internal.local

# ローカルポートフォワード（踏み台経由でデータベースアクセス）
ssh -i ~/.ssh/bastion_key -L 3306:db.internal:3306 ec2-user@bastion.example.com
# ローカルから localhost:3306 でデータベースに接続可能
```

踏み台サーバーのセキュリティ設定：
- SSH キーベース認証のみ（パスワード認証禁止）
- 操作ログ記録（CloudTrail、auditd など）
- 定期パッチ適用
- セッションタイムアウト短縮

## DDoS 対策の構成

```
[攻撃トラフィック]
        ↓
[CDN / WAF層]
    ├─ レート制限
    ├─ 地理的フィルタ
    ├─ Bot 検知・ブロック
    └─ キャッシング
        ↓
[オリジンサーバー]
```

実装例（CloudFlare）：
- DDoS Protection: 自動有効
- Rate Limiting: 特定 IP からの過度なリクエスト制限
- Bot Management: Bot トラフィック検知・ブロック
- IP Reputation: 既知の悪質 IP をブロック

## サービス間認証の実装

マイクロサービス間通信は mTLS（相互 TLS 認証）で保護：

```javascript
// Node.js での mTLS サーバー
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem'),
  ca: fs.readFileSync('ca-cert.pem'),
  requestCert: true,
  rejectUnauthorized: true
};

https.createServer(options, (req, res) => {
  const cn = req.socket.getPeerCertificate().subject.CN;
  console.log(`Request from: ${cn}`);
  res.end('OK');
}).listen(8443);
```

