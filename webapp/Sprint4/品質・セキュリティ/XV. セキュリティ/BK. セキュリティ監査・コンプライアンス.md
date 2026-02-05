# BK. セキュリティ監査・コンプライアンス

## 概要

セキュリティ監査は、システムとアプリケーションの脆弱性を発見・評価するプロセスです。継続的な脆弱性管理、ペネトレーションテストによる実践的な検証、CVSS スコアリングによる優先度付けなどが、セキュアなシステム運用を実現します。

また、クラウドサービス利用時の責任共有モデル理解、SLA 確認、コンプライアンス要件（暗号化技術の輸出規制、GDPR など）への対応も重要です。

本セクションでは、脆弱性診断とペネトレーションテストの違い、CVSS、責任共有モデル、暗号化技術の規制について説明します。

## 脆弱性診断 vs ペネトレーションテスト

### 脆弱性診断 (Vulnerability Assessment)

自動スキャンツール（OWASP ZAP、Burp Suite など）を用いて、既知の脆弱性パターンをスキャンする技術的評価です。

特徴：
- 自動化スキャン
- 既知パターンの検出
- 実際の悪用は検証しない
- 低コスト、短時間

### ペネトレーションテスト (Penetration Testing)

セキュリティエキスパートが実際に攻撃を試みるシミュレーション。未知の脆弱性や複合的な欠陥（チェーン攻撃）を発見できます。

特徴：
- 手動による詳細な分析
- 実際の悪用検証
- ビジネスへの影響度を評価
- 高コスト、時間要

両者の関係：
```
脆弱性診断（自動） → 「何が」脆弱か特定
ペネトレーションテスト（手動） → 「どの程度」危険か評価
```

## ブラックボックス/ホワイトボックステスト

### ブラックボックステスト

テスター が内部情報（ソースコード、設計図）を持たない外部攻撃者の視点でテストします。現実的な攻撃シナリオをシミュレートできます。

### ホワイトボックステスト

テスターが完全なソースコード、設計文書、アーキテクチャ情報にアクセス可能です。深刻な論理的欠陥や API の不正使用を発見できます。

## CVSS (Common Vulnerability Scoring System)

CVSS は脆弱性の重大度を 0～10 のスコアで定量化します。

スコアリング要素：

| 要素 | 説明 | 値 |
|------|------|-----|
| Attack Vector | 攻撃経路 (Network/Adjacent/Local) | N/A/L |
| Attack Complexity | 攻撃の複雑さ (Low/High) | L/H |
| Privileges Required | 必要な権限 (None/Low/High) | N/L/H |
| User Interaction | ユーザー操作の必要性 (None/Required) | N/R |
| Scope | スコープ (Unchanged/Changed) | U/C |
| Confidentiality Impact | 機密性への影響 (None/Low/High) | N/L/H |
| Integrity Impact | 完全性への影響 (None/Low/High) | N/L/H |
| Availability Impact | 可用性への影響 (None/Low/High) | N/L/H |

**評価基準**：
- 9.0～10.0: Critical
- 7.0～8.9: High
- 4.0～6.9: Medium
- 0.1～3.9: Low
- 0.0: None

## 自動診断ツールの実行例

OWASP ZAP による Web アプリケーションスキャン：

```bash
# Docker コンテナで OWASP ZAP を実行
docker run --rm \
  -v /tmp/zap_reports:/root/reports \
  owasp/zap2docker-stable:latest \
  zap-baseline.py \
    -t https://target.example.com \
    -r /root/reports/scan-report.html \
    -x /root/reports/scan-report.xml

# 生成されたレポートを確認
cat /tmp/zap_reports/scan-report.html
```

## 脆弱性修正のプロセス

1. **検出**: 脆弱性スキャン、ペネトレーションテスト
2. **分析**: 影響範囲、CVSS スコア、ビジネスリスク評価
3. **優先度付け**: CVSS、ビジネス影響度で優先度決定
4. **修正**: パッチ適用、ワークアラウンド、アーキテクチャ改善
5. **検証**: 修正確認テスト、再スキャン
6. **展開**: ステージング環境で本番同等テスト後、本番デプロイ
7. **監視**: 修正後も継続的に監視

## 責任共有モデル

クラウドプロバイダ（AWS、Azure、GCP）では、セキュリティ責任が共有されます。

```
インフラセキュリティ
  └─ データセンター物理セキュリティ [Provider]
  └─ ネットワーク分離 [Provider]
  └─ OS パッチ [Provider または Shared]
アプリケーションセキュリティ
  └─ アプリケーション脆弱性 [Customer]
  └─ 認証・認可設定 [Customer]
  └─ データ暗号化 [Shared]
データセキュリティ
  └─ データアクセス制御 [Customer]
  └─ データ保護（暗号化） [Customer]
```

## SLA（サービス品質保証契約）

SLA は可用性、応答時間、復旧時間などを保証します。

例：AWS EC2 インスタンス SLA

```
月間可用性: 99.95%
最大停止時間: 約 21.6 分/月
```

## 暗号化技術の輸出規制

米国は強力な暗号化技術の輸出を規制しており、日本企業も対象です。特に：

- **256 ビット以上の暗号化**: 規制対象
- **EAR (Export Administration Regulations)**: 米国再輸出規制
- **該非判定**: 製品が規制対象か判定必須

ただし、オープンソース（例：OpenSSL）の公開は規制外です。

## アプリストアのコンプライアンス申告

iOS App Store や Google Play で暗号化機能を含むアプリ公開時、以下の申告が必須：

```
暗号化の有無: Yes
用途:
  ☐ 通信暗号化
  ☐ ローカルデータ暗号化
  ☐ 金融取引

規制対象か: Yes/No 判定
```

誤申告は審査却下や配信停止につながるため、正確な該非判定が重要です。

## オープンソース公開時の注意

強力な暗号化技術を含むオープンソースを公開する場合：

- GitHub リポジトリは公開前に該非判定
- 米国外向けダウンロード制限（geo-blocking）検討
- NOTICE ファイルに暗号化機能について明記

```
This software includes cryptographic functionality (AES-256-CBC)
which may be subject to export control regulations.
```

