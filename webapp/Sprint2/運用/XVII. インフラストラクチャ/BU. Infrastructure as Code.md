# BU. Infrastructure as Code

## 概要

Infrastructure as Code（IaC）は、インフラストラクチャ構成を コードで定義し、版管理・テスト・自動デプロイの対象にする手法です。

マニュアルなサーバー構築（GUI ポチポチ）の課題を解決し、再現可能で信頼性の高い環境を構築できます。

Terraform や CloudFormation などのツールを使い、EC2、RDS、VPC などを宣言的に定義・管理します。

---

## 1. IaC の基礎

**手動構築の課題:**

```
❌ GUI で構築:
1. AWS コンソール → EC2 → インスタンス起動
2. セキュリティグループ設定
3. IAM ロール設定
4. ストレージ設定
...（多くの手作業）

問題:
- 手順が文書化されない
- 同じ構成を再現しづらい
- 間違える可能性
- スケーリング時に手作業増加
```

**IaC による解決:**

```hcl
# Terraform で定義
resource "aws_instance" "api" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.large"

  security_groups = [aws_security_group.api.name]
  iam_instance_profile = aws_iam_instance_profile.api.name

  tags = {
    Name = "api-server"
  }
}

resource "aws_security_group" "api" {
  name = "api-sg"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

メリット:
- 再現性が高い（同じ定義なら同じインスタンスが起動）
- 版管理可能（Git で変更履歴を追跡）
- 自動テスト・デプロイ可能
- ドキュメントとコードが一致

---

## 2. Terraform 基礎

**Provider（対象クラウド）:**

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"  # 東京リージョン
}
```

**Resource（リソース定義）:**

```hcl
# EC2 インスタンス
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# RDS データベース
resource "aws_db_instance" "main" {
  identifier     = "mydb"
  engine         = "mysql"
  instance_class = "db.t3.small"
  allocated_storage = 20
  username       = "admin"
  password       = "password123"
}

# S3 バケット
resource "aws_s3_bucket" "assets" {
  bucket = "my-assets-bucket"
}
```

**出力値（Output）:**

リソース情報を他のスクリプトやユーザーに返します。

```hcl
output "instance_public_ip" {
  value       = aws_instance.web.public_ip
  description = "Web サーバーのパブリック IP"
}

output "rds_endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "RDS エンドポイント"
}
```

実行後:
```
Outputs:

instance_public_ip = "203.0.113.45"
rds_endpoint = "mydb.c9akciq32.ap-northeast-1.rds.amazonaws.com"
```

---

## 3. Terraform の操作フロー

**基本コマンド:**

```bash
# 1. Terraform ファイルをダウンロード・初期化
terraform init

# 2. 構成を検証
terraform validate

# 3. 適用予定を確認（Dry-run）
terraform plan

# 4. リソースを実際に作成・変更
terraform apply

# 5. 状態確認
terraform show

# 6. リソース削除
terraform destroy
```

**Plan 確認（重要）:**

```
$ terraform plan

Terraform will perform the following actions:

  # aws_instance.web will be created
  + resource "aws_instance" "web" {
      + ami                    = "ami-0c55b159cbfafe1f0"
      + availability_zone      = (known after apply)
      + instance_type          = "t3.micro"
      + key_name               = (known after apply)
      + security_groups        = [
          + "default",
        ]
      + tags_all               = (known after apply)
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

→ 破壊的な変更がないか確認してから apply

---

## 4. リソース管理

**EC2 インスタンスプロビジョニング:**

```hcl
# Variables で再利用可能に
variable "instance_type" {
  description = "EC2 インスタンスタイプ"
  default     = "t3.micro"
}

resource "aws_instance" "api" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_type

  tags = {
    Name        = "api-${terraform.workspace}"  # 環境別タグ
    Environment = terraform.workspace
  }
}

# 開発環境と本番環境を分ける
# terraform workspace select dev
# terraform workspace select prod
```

**リソース変更の確認:**

```
❌ 危険な変更例
リソースの instance_type を変更
→ インスタンスが一度停止し、新しいタイプで再起動
→ ダウンタイムが発生

✓ 確認する
terraform plan で ~ (replace) と表示される場合、慎重に
```

**Import（既存リソースを Terraform で管理）:**

手動で作成済みのリソースを Terraform の管理下に移行。

```bash
# AWS コンソールで作成済みの EC2 インスタンス（ID: i-1234567890abcdef0）

# terraform.tf に定義を追加
resource "aws_instance" "existing" {
  # 中身は空（placeholder）
}

# 既存リソースをインポート
terraform import aws_instance.existing i-1234567890abcdef0

# 実際の構成を確認し、terraform.tf に追記
terraform show
```

---

## 5. State 管理

**Local State（開発環境）:**

```
terraform.tfstate（JSON ファイル）
├─ resource の現在の状態
├─ 属性値
└─ メタデータ
```

**Remote State（本番環境）:**

State ファイルを S3 に保存し、チーム全員で共有。

```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state-prod"
    key            = "prod/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"  # 同時実行防止
  }
}
```

**ロック機能の検証:**

複数人が同時に terraform apply すると、State が競合します。

```
User A:                User B:
terraform apply →      terraform apply
  ↓ (DB 作成中)          ↓ (待機中)
  ↓ (5秒)              DynamoDB のロック機構
  ↓ (完了)             「他のプロセスが実行中」
  ↓ (ロック解放)        → エラーで終了
                        (State 競合回避)
```

---

## 6. 実践的なプロジェクト構成

```
terraform/
├── prod/              # 本番環境
│   ├── main.tf        # リソース定義
│   ├── variables.tf   # 変数定義
│   ├── outputs.tf     # 出力値
│   └── terraform.tfvars # 本番環境の値
├── dev/               # 開発環境
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars
└── modules/           # 再利用可能モジュール
    ├── vpc/
    ├── security_group/
    ├── rds/
    └── ec2/
```

**モジュールの活用:**

```hcl
# modules/ec2/main.tf
variable "instance_type" {}
variable "security_group_id" {}

resource "aws_instance" "main" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = var.instance_type
  vpc_security_group_ids = [var.security_group_id]
}

output "instance_id" {
  value = aws_instance.main.id
}

---

# prod/main.tf
module "api_server" {
  source = "../modules/ec2"

  instance_type      = "t3.large"
  security_group_id  = aws_security_group.api.id
}

module "web_server" {
  source = "../modules/ec2"

  instance_type      = "t3.medium"
  security_group_id  = aws_security_group.web.id
}
```

→ 同じモジュールで複数リソースを簡潔に定義

---

## 7. IaC ツールの比較

| ツール | 主体 | 学習曲線 | マルチクラウド | 特徴 |
|-------|------|--------|-------------|------|
| Terraform | HashiCorp | 中 | ✓ | 宣言的、ポピュラー |
| CloudFormation | AWS | 中 | AWS のみ | AWS 深い統合 |
| Pulumi | Pulumi | 易 | ✓ | プログラム言語で記述 |
| Ansible | Red Hat | 易 | ✓ | 手続き的、設定管理向け |
