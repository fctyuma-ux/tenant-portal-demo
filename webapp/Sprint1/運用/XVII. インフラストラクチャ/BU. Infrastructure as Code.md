# BU. Infrastructure as Code - Sprint 1

## 概要

Infrastructure as Code（IaC）は、インフラストラクチャを手動操作ではなく、コードで定義・管理する近代的な運用手法です。Sprint 1では、IaC の基本概念、主要ツール（Terraform、CloudFormation）、宣言型設計を習得します。

---

## 1. IaC の基本概念

### 手動構築の課題

AWS マネジメントコンソールでインフラを手動構築する方法には多くの問題があります。

**問題点：**
- **再現性がない：** 各リージョンで構成にズレが発生（CIDR ブロック誤設定、セキュリティグループ漏れ等）
- **スケーリングが困難：** 100 リージョンの展開は実質不可能
- **監査追跡がない：** 「誰が何を変更したか」の履歴がない
- **テストができない：** 本番環境投入まで不確実性が高い
- **ロールバックが困難：** 失敗時の巻き戻しに多大な労力

---

### IaC による解決

IaC では、インフラストラクチャをコード化（Terraform、CloudFormation等）してバージョン管理します。

```terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "main" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}
```

**メリット：**
- **完全な再現性：** 同じコードなら全く同じ環境が実現
- **スケーラビリティ：** リージョン追加は変数変更のみ
- **バージョン管理：** Git で全変更履歴を記録
- **テスト：** terraform plan で本番投入前に確認
- **自動化：** CI/CD パイプラインで自動デプロイ
- **監査性：** 変更者・変更日時・内容を完全記録
- **ロールバック：** Git 復旧で簡単に巻き戻し

---

## 2. 主要なIaCツール

### Terraform vs CloudFormation

| 特性 | Terraform | CloudFormation |
|------|----------|-----------------|
| **対応クラウド** | AWS、GCP、Azure等（マルチクラウド） | AWS のみ |
| **言語** | HCL（カスタム） | JSON / YAML |
| **学習曲線** | やや急 | 緩い |
| **柔軟性** | 高い（モジュール化容易） | 中（テンプレート） |
| **AWS 統合** | 中程度 | 深い（ネイティブ） |
| **複数クラウド管理** | 可能（1つのコード） | 不可 |

**選択基準：** マルチクラウド環境→Terraform、AWS 限定・ネイティブ統合重視→CloudFormation。

---

### Terraform の基本概念

**構成要素：**
- **HCL コード（Desired State）：** あるべき状態を宣言
- **Provider：** AWS、GCP 等クラウドを指定
- **State ファイル：** Terraform が自動管理。デプロイ後のリソース情報を記録

**処理フロー：**
1. **terraform init：** Provider ダウンロード、初期化
2. **terraform validate：** 構文チェック
3. **terraform plan：** Desired State と Current State を比較、変更内容を表示
4. **terraform apply：** 計画を実行、AWS API を呼び出してリソース作成・更新・削除
5. **出力値の表示：** outputs セクション結果を表示

---

### CloudFormation の基本概念

AWS ネイティブな IaC ツール。JSON/YAML でテンプレート定義。

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
  MySubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MyVPC
      CidrBlock: 10.0.1.0/24
```

**Stack のライフサイクル：** create-stack（作成）→CREATE_IN_PROGRESS→CREATE_COMPLETE。update-stack でテンプレート編集→差分検出・実行。delete-stack で削除。

---

## 3. 宣言型 vs 命令型

### 宣言型設計（Declarative）

「最終的にこうなってほしい」という望ましい状態をコードで表現。ツールが現在状態を認識し、到達手段を自動判定。

```terraform
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-xxxx"
  instance_type = "t3.micro"
}
```

**利点：**
- **冪等性：** terraform apply を何度実行しても同じ結果（初回で作成、2回目以降は何もしない）
- **状態を自動管理：** Terraform が State ファイルで追跡
- **修正が簡単：** count = 5 に変更→terraform apply で自動スケーリング、1個が削除されても自動復旧

---

### 命令型設計（Imperative）との比較

命令型（Bash スクリプト）では「まず VPC を作り、次にサブネット、その次に EC2」というステップを逐一指定します。

**問題点：**
- **冪等性がない：** 2回実行すると同じリソースが2倍作成される
- **状態管理が複雑：** 手動で変数追跡が必要
- **修正が困難：** 依存関係を手動で管理

**宣言型の優位性：** 冪等性あり、状態を自動管理、修正が簡単（依存関係を自動判定）。

---

## チェックポイント

- [ ] 手動構築の課題（再現性、スケーリング、監査性）を説明できる
- [ ] IaC がもたらすメリットを説明できる
- [ ] Terraform と CloudFormation の違いを説明できる
- [ ] Terraform の処理フロー（init→validate→plan→apply）を説明できる
- [ ] State ファイルの役割を説明できる
- [ ] 宣言型設計の利点を説明できる
- [ ] 宣言型と命令型の比較ができる
