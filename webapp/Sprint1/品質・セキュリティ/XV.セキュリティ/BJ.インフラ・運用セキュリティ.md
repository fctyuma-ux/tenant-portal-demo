# BJ. インフラ・運用セキュリティ

## 概要

ファイアウォール、TLS/SSL暗号化、鍵管理、監査ログ、アクセス制御、DDoS対策、パッチ管理により、多層防御を実現します。

## ファイアウォール

**ステートフルファイアウォール**: 接続状態を追跡し、許可した接続の返信は自動許可
**デフォルト拒否の原則**: 明示的に許可したもののみ通信可能

インバウンドルール例:
- TCP 80, 443 (0.0.0.0/0) → ALLOW
- TCP 22 (10.0.0.0/8) → ALLOW（管理者ネット限定）
- TCP 3306 (0.0.0.0/0) → DENY（DBは内部のみ）
- その他 → DENY

**WAF（Web Application Firewall）**: アプリケーション層での防御。SQLインジェクション、XSS、パストトラバーサル、レート制限違反を検出・遮断。

## 暗号化

**転送中（TLS/SSL）**: TLS 1.2以上を使用、HTTP → HTTPS自動リダイレクト、HSTS設定。Nginx設定で強力な暗号スイート指定。

**保存時**: AES-256-GCMでアプリケーション層で暗号化、IV（初期化ベクトル）と認証タグも保存

```javascript
// AES-256-GCMでの暗号化実装例
const crypto = require('crypto');
function encrypt(plaintext, masterKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}
```

## 鍵管理

**KMS（Key Management Service）** またはHashiCorp Vault使用。マスターキー（クラウドプロバイダが管理）→データ暗号化キー（各インスタンスに配置）

**鍵の保管**: KMS/HSM/Vault/Secret Manager使用。コード・リポジトリ・平文メールは厳禁。開発環境のみ.env（.gitignoreに追加）

**鍵ローテーション**: 90日～1年の定期ローテーション。古い鍵は復号のみに使用。

## 監査ログ

**ログすべき内容**:
- 認証: ログイン成功/失敗、パスワード変更、MFA設定、セッション生成/破棄
- 認可: リソースアクセス（特に機密リソース）、権限変更、API呼び出し
- データ操作: 重要データの作成/更新/削除、個人情報アクセス
- システム: 設定変更、ユーザー作成/削除、エラー

**ログ保護**: HMAC署名で改ざん防止、外部ストレージ（CloudWatch、ELK、Splunk）送信で削除困難化

```javascript
// ロギングミドルウェア例
const auditLogger = (req, res, next) => {
  res.on('finish', () => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: req.user?.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    auditLog.write(JSON.stringify(logEntry));
  });
  next();
};
```

**ログ保持ポリシー**: アクセスログ 30日、セキュリティログ 1年、コンプライアンス 7年

## アクセス制御

**IAM（Identity and Access Management）**: ポリシーに基づく権限管理。最小権限の原則を徹底（必要なアクションのみ許可）

**SSH**: キーベース認証必須（パスワード認証無効化）、Bastion（踏み台）経由で多段認証、ルートログイン禁止

## DDoS対策

**L3/L4層**: Cloudflare、AWS Shield等の専門サービスでトラフィック分散・異常検知

**L7層**: レート制限、キャプチャ、JS チャレンジ、ボット検知

## パッチ・脆弱性管理

**脆弱性管理フロー**:
1. 脆弱性検出（CVEデータベース、npm audit、OWASP ZAP）
2. リスク評価（CVSSスコア、環境への影響）
3. パッチ適用計画（優先度に応じて段階的）
4. テスト環境で検証後、本番環境に適用
5. ロールバック計画を用意

```
npm audit       # 脆弱性検出
npm audit fix   # 自動修正
npm update      # 最新版に更新
```

## ベストプラクティス

- **最小権限の原則**: ユーザー・プロセスに必要最小限の権限のみ
- **デフォルト拒否**: ファイアウォール・API共に明示的に許可したもののみ
- **分離とセグメンテーション**: DMZでWebサーバー、内部ネットワークのみDBアクセス
- **監視と検知**: SIEM（Security Information and Event Management）導入、リアルタイムアラート
- **定期的なテスト**: ペネトレーション、脆弱性スキャン、災害復旧テスト

## チェックリスト

- [ ] TLS 1.2以上を使用
- [ ] HSTS ヘッダーを設定
- [ ] ファイアウォール: インバウンド・アウトバウンドルール設定
- [ ] WAF: SQLインジェクション、XSS検出ルール有効化
- [ ] 重要データの暗号化（転送中・保存時）
- [ ] 鍵管理: KMS/Vault使用、定期ローテーション
- [ ] 監査ログ: 詳細記録、署名検証、長期保存
- [ ] アクセス制御: IAM ポリシー設定、SSH キーベース認証
- [ ] DDoS対策: 専門サービス導入、レート制限
- [ ] パッチ管理: 脆弱性スキャン、定期更新
- [ ] 外部ストレージへのログ送信設定

## 概要

アプリケーションセキュリティのみでは不十分です。インフラストラクチャレベルでのネットワーク保護、通信暗号化、アクセス制御、そして監査ログの整備により、多層防御を実現します。これにより、侵入検知から事後対応までの一連のセキュリティ運用が可能になります。

---

## ファイアウォール

ネットワーク境界で不正なトラフィックを遮断します。

### ステートフルファイアウォール

```
インバウンドルール（外部→内部）:
┌─────────────────────────────────┐
│ プロトコル │ ポート │ 送信元      │ アクション
├─────────────────────────────────┤
│ TCP       │ 80     │ 0.0.0.0/0   │ ALLOW
│ TCP       │ 443    │ 0.0.0.0/0   │ ALLOW
│ TCP       │ 22     │ 10.0.0.0/8  │ ALLOW（管理者ネット限定）
│ TCP       │ 3306   │ 0.0.0.0/0   │ DENY（内部ネット限定）
│ すべて    │ すべて │ すべて      │ DENY（デフォルト）
└─────────────────────────────────┘

接続状態追跡:
クライアント → サーバー（SYN）
      ↓
サーバー → クライアント（SYN-ACK）← ファイアウォール: この接続は許可
      ↓
クライアント → サーバー（ACK）← ファイアウォール: 追跡済み接続

リバースも自動的に許可（ステートフル）
```

### WAF（Web Application Firewall）

```
アプリケーション層での防御:

HTTPリクエスト
  ↓
WAF検査
  ├─ SQLインジェクション検出
  ├─ XSSパターン検出
  ├─ パストトラバーサル検出
  ├─ ディレクトリ列挙検出
  ├─ レート制限チェック
  └─ 地域ベースの制限チェック
  ↓
許可 / ブロック / ログ記録

AWS WAFルール例:
{
  "Name": "BlockSQLInjection",
  "Priority": 1,
  "Statement": {
    "SqliMatchStatement": {
      "FieldToMatch": {
        "QueryString": {}
      },
      "TextTransformations": [
        { "Priority": 0, "Type": "URL_DECODE" },
        { "Priority": 1, "Type": "HTML_ENTITY_DECODE" }
      ]
    }
  },
  "Action": { "Block": {} }
}
```

---

## 暗号化

データの機密性を保証します。

### 転送中の暗号化（TLS/SSL）

```
通信フロー（HTTPS）:
クライアント
  ↓ ClientHello（TLSバージョン、暗号スイート等）
サーバー
  ↓ ServerHello + 証明書
クライアント
  ↓ ハンドシェイク完了 → 暗号化通信開始
  ↓ 各リクエストは暗号化
  ↓ 各レスポンスは暗号化
サーバー

TLSバージョン:
❌ SSLv2, SSLv3, TLS 1.0, 1.1（脆弱）
✓ TLS 1.2, 1.3（推奨）

Nginxの設定例:
server {
  listen 443 ssl;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  # HSTS: ブラウザに常時HTTPS使用を指示
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
}

# HTTP → HTTPS 自動リダイレクト
server {
  listen 80;
  server_name example.com;
  return 301 https://$server_name$request_uri;
}
```

### 保存時の暗号化

```
ユーザー入力（平文）
  ↓
アプリケーション層で暗号化
  ↓
暗号化されたデータをDB保存
  ↓
DB層での暗号化（二重保護）

実装例（Node.js）:
const crypto = require('crypto');

function encrypt(plaintext, masterKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  // iv + authTag + encryptedData を保存
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData, masterKey) {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## 鍵管理

暗号化キーの安全な管理は最重要です。

```
鍵生成・配置フロー:

KMS（Key Management Service）
  ↓ Master Key（クラウドプロバイダが管理）
  ↓ Data Encryption Key（DMS, データ暗号化用）
  ↓ 各アプリケーションインスタンスに配置

AWS KMS例:
const AWS = require('aws-sdk');
const kms = new AWS.KMS();

async function encryptWithKMS(plaintext) {
  const params = {
    KeyId: 'arn:aws:kms:...',
    Plaintext: plaintext
  };
  const result = await kms.encrypt(params).promise();
  return result.CiphertextBlob;
}

async function decryptWithKMS(ciphertext) {
  const params = {
    CiphertextBlob: ciphertext
  };
  const result = await kms.decrypt(params).promise();
  return result.Plaintext.toString();
}

鍵ローテーション:
┌─────────────────────────────────┐
│ 鍵バージョン │ 使用期間        │ ステータス
├─────────────────────────────────┤
│ v1         │ 2023/1-2023/6  │ 完全停止（古いデータのみ復号）
│ v2         │ 2023/6-2024/1  │ 完全停止
│ v3         │ 2024/1-2024/6  │ 現在の暗号化鍵
│ v4         │ 2024/6-2025/1  │ 次回鍵（導入準備中）
└─────────────────────────────────┘

定期的なローテーション（90日～1年）
```

### 鍵の保管

```
❌ コードに含める
❌ リポジトリにコミット
❌ ローカルファイルに保存
❌ 平文でメール送信

✓ KMS / HSM に保管
✓ 環境変数（開発環境のみ）
✓ Vault（HashiCorp）
✓ Secret Manager（AWS/GCP/Azure）

.env ファイル（開発環境のみ）:
DATABASE_PASSWORD=securepassword123
API_KEY=sk_live_abcdef...
ENCRYPTION_MASTER_KEY=...

注: .gitignore に追加して、リポジトリに含めない
本番: Secret Managerから動的に取得
```

---

## 監査ログ

セキュリティイベントの記録と監視です。

### ログすべき内容

```
認証関連:
- ログイン成功 / 失敗（失敗理由: パスワード不正、アカウント無し等）
- ログアウト
- パスワード変更
- MFA設定 / 無効化
- セッション生成 / 破棄

認可関連:
- リソースアクセス（特に機密リソース）
- 権限変更（ユーザーA に admin ロール付与）
- API呼び出し（API キー使用）

データ操作:
- 重要データの作成 / 更新 / 削除
- 個人情報アクセス
- 大量データエクスポート

システム:
- 設定変更
- ユーザー作成 / 削除
- エラーとエラーコード
```

### ログ実装例

```
// ロギングミドルウェア
const auditLogger = (req, res, next) => {
  const startTime = Date.now();

  // レスポンス完了時にログ記録
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: req.user?.id,
      method: req.method,
      path: req.path,
      query: req.query,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // セキュリティイベント判定
    if (req.method !== 'GET' || res.statusCode >= 400) {
      logEntry.severity = res.statusCode >= 500 ? 'ERROR' : 'WARN';
    } else {
      logEntry.severity = 'INFO';
    }

    // 別プロセスでログ記録（非同期で本処理をブロックしない）
    auditLog.write(JSON.stringify(logEntry));
  });

  next();
};

// セキュリティイベント明示的ロギング
function logSecurityEvent(event, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    severity: 'CRITICAL'
  };
  securityLog.write(JSON.stringify(entry));
}

// 使用例
app.post('/api/users/:id/permissions', (req, res) => {
  const targetUserId = req.params.id;
  const newPermissions = req.body.permissions;

  logSecurityEvent('PERMISSION_CHANGE', {
    performedBy: req.user.id,
    targetUser: targetUserId,
    oldPermissions: oldPerms,
    newPermissions: newPermissions
  });

  // 権限変更処理...
});
```

### ログ保護

```
ログの改ざん防止:

1. ログ生成 → 署名 → 保存
   const signature = crypto.createHmac('sha256', SECRET_KEY)
     .update(JSON.stringify(logEntry))
     .digest('hex');
   logEntry.signature = signature;

2. ログ読み取り時に署名検証
   const computedSignature = crypto.createHmac('sha256', SECRET_KEY)
     .update(JSON.stringify(logEntry))
     .digest('hex');
   if (computedSignature !== logEntry.signature) {
     throw new Error('Log entry tampered');
   }

3. ログを外部ストレージに送信（削除困難）
   - CloudWatch Logs
   - ELK Stack
   - Splunk
   - 改ざん検知: ハッシュチェーン

ログ保持ポリシー:
- アクセスログ: 30日
- セキュリティログ: 1年
- コンプライアンス: 7年
```

---

## アクセス制御

インフラリソースへのアクセスを厳密に制御します。

### IAM（Identity and Access Management）

```
AWS IAM ポリシー例:

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::my-app-bucket/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": "10.0.0.0/8"
        },
        "StringEquals": {
          "aws:username": "developer"
        }
      }
    },
    {
      "Effect": "Deny",
      "Action": [
        "s3:DeleteObject",
        "s3:DeleteBucket"
      ],
      "Resource": "*"
    }
  ]
}
```

### SSH アクセス制御

```
// SSH キーベース認証（パスワードより安全）

# /etc/ssh/sshd_config

# パスワード認証無効化
PasswordAuthentication no
PubkeyAuthentication yes

# ルートログイン禁止
PermitRootLogin no

# ポート変更（デフォルト22から変更）
Port 2222

# 同時接続数制限
MaxAuthTries 3
MaxSessions 5

# リッスンアドレス制限
ListenAddress 10.0.0.1

SSH アクセスフロー:
1. Bastion ホスト（踏み台サーバー）経由
   ┌─────────────┐
   │ 管理者PC    │
   └──────┬──────┘
          │ SSH（鍵ベース、MFA）
   ┌──────▼──────┐
   │ Bastion     │ 許可: 10.0.0.0/8 からのアクセスのみ
   └──────┬──────┘
          │ SSH（内部ネット）
   ┌──────▼──────┐
   │ App Server  │
   └─────────────┘
```

---

## DDoS対策

大量トラフィックによる攻撃から保護します。

```
レイヤ別対策:

L3/L4 層（DDoS 専門サービス）:
  ┌─────────────────┐
  │ DDoS Mitigation │ Cloudflare, AWS Shield等
  │ Service         │ - トラフィック分散
  │                 │ - 異常検知
  └────────┬────────┘
           │ 正常トラフィック
  ┌────────▼────────┐
  │ Web Server      │
  └─────────────────┘

L7 層（アプリケーション層）:
  - レート制限
  - キャプチャ
  - JS チャレンジ
  - ボット検知

実装例（レート制限の強化）:
const slowDown = require('express-slow-down');

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: (hits) => hits * 100 // 遅延増加
});

app.use(speedLimiter);

効果: 100回目以降のリクエストは段階的に遅延
     - 101回目: 100ms遅延
     - 102回目: 200ms遅延
     - ...攻撃者の負荷増加
```

---

## パッチ・脆弱性管理

システムの脆弱性を継続的に解決します。

```
脆弱性管理プロセス:

1. 脆弱性検出
   - CVE データベース監視
   - 依存パッケージスキャン
   - 脆弱性スキャンツール（OWASP ZAP等）

2. リスク評価
   - CVSS スコア
   - 環境への影響
   - 対象システムの重要度

3. パッチ適用計画
   - 優先度に応じて段階的適用
   - テスト環境で事前検証
   - ロールバック計画

4. 適用・確認
   - 本番環境に適用
   - 正常動作確認
   - ログ監視

例（npm パッケージ脆弱性チェック）:
npm audit         # 脆弱性リスト表示
npm audit fix     # 自動修正
npm update        # 最新版に更新
```

---

## ベストプラクティス

1. **最小権限の原則**
   - ユーザーに必要最小限の権限
   - サーバープロセスは限定ユーザーで実行

2. **デフォルト拒否**
   - ファイアウォール: 明示的に許可したもののみ
   - API: 認可されたユーザーのみアクセス可能

3. **分離とセグメンテーション**
   - DMZ（非武装地帯）でWebサーバー配置
   - DB は内部ネットワークのみ

4. **監視と検知**
   - SIEM（Security Information and Event Management）
   - リアルタイムアラート
   - 定期的なログ分析

5. **定期的なテスト**
   - ペネトレーションテスト
   - 脆弱性スキャン
   - 災害復旧テスト

---

## チェックリスト

- [ ] TLS 1.2 以上を使用、設定確認
- [ ] HSTS ヘッダーを設定
- [ ] ファイアウォール: インバウンド・アウトバウンドルール設定
- [ ] WAF: SQLインジェクション、XSS検出ルール有効化
- [ ] 重要データの暗号化（転送中・保存時）
- [ ] 鍵管理: KMS/Vault使用、定期ローテーション
- [ ] 監査ログ: 詳細記録、署名検証、長期保存
- [ ] アクセス制御: IAM ポリシー設定、SSH キーベース認証
- [ ] DDoS対策: 専門サービス導入、レート制限
- [ ] パッチ管理: 脆弱性スキャン、定期更新
- [ ] 外部ストレージへのログ送信設定
