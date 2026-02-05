# BU. Infrastructure as Code

## 概要

Infrastructure as Code (IaC) はインフラストラクチャを「コード」として定義・管理します。Terraform、CloudFormation などのツールにより、環境の再現性、バージョン管理、自動化が実現でき、手作業ミスを削減します。

本セクションでは Terraform の基本から、複数環境での運用、ドリフト検出までカバーします。

---

## 1. IaC の利点

**従来（手作業）の問題点**
```
AWS Console から手動作成
  ↓
ドキュメント作成（更新忘れ）
  ↓
環境 A と B で設定が異なる
  ↓
障害発生時に原因追跡困難
```

**IaC のメリット**
- **再現性**：同じコードで同じ環境を確実に構築
- **バージョン管理**：Git で変更履歴・承認プロセス
- **自動化**：環境構築時間を大幅短縮
- **テスト**：本番前に環境検証可能

---

## 2. Terraform の基本

**Terraform の構成**
```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  tags = {
    Name = "web-server"
  }
}
```

**三つのコマンド**
```bash
# 実行計画を確認
terraform plan

# 実際に適用
terraform apply

# 削除
terraform destroy
```

---

## 3. モジュール化による再利用

**Webサーバーモジュールの作成**
```hcl
# modules/webserver/main.tf
variable "instance_type" {
  default = "t2.micro"
}

variable "environment" {
  type = string
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_type

  tags = {
    Name        = "web-server"
    Environment = var.environment
  }
}

output "instance_id" {
  value = aws_instance.web.id
}
```

**モジュールの呼び出し（複数環境）**
```hcl
# main.tf
module "dev_web" {
  source = "./modules/webserver"

  instance_type = "t2.micro"
  environment   = "dev"
}

module "prod_web" {
  source = "./modules/webserver"

  instance_type = "t2.large"  # 本番はスペック UP
  environment   = "prod"
}
```

同じモジュールを異なるパラメータで呼び出すことで、環境ごとの差分を最小化します。

---

## 4. Terraform State 管理

**State ファイルの役割**
```json
{
  "resources": [
    {
      "type": "aws_instance",
      "name": "web",
      "instances": [
        {
          "attributes": {
            "id": "i-1234567890abcdef0",
            "instance_type": "t2.micro"
          }
        }
      ]
    }
  ]
}
```

State ファイルは現在のリソース状態を記録し、Terraform は Plan 時にこれと実際の AWS リソースを比較して差分を検出します。

**リモート State ストレージ**
```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "terraform-lock"
    encrypt        = true
  }
}
```

チーム開発では、S3 + DynamoDB をバックエンドに使用して State を共有し、ロック機能で競合を防ぎます。

---

## 5. CloudFormation の基本

**シンプルスタックの作成**
```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Simple web server stack'

Resources:
  WebServer:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0c55b159cbfafe1f0
      InstanceType: t2.micro
      Tags:
        - Key: Name
          Value: MyWebServer

Outputs:
  InstanceId:
    Value: !Ref WebServer
    Description: EC2 Instance ID
```

**スタック操作**
```bash
# スタック作成
aws cloudformation create-stack \
  --stack-name my-stack \
  --template-body file://template.yaml

# スタック削除
aws cloudformation delete-stack \
  --stack-name my-stack
```

---

## 6. ドリフト検出と管理

**手動変更によるドリフト発生シナリオ**
```
1. Terraform でスタック作成
   instance_type: t2.micro

2. 誰かが AWS Console から直接変更
   instance_type: t2.large

3. Terraform plan を実行
   Plan: 差分を検出
   aws_instance.web: must be destroyed and recreated
   - instance_type: "t2.large" → "t2.micro"

4. 対応
   a. Terraform で状態を更新
   b. Console での手動変更を認める
   c. Terraform State をリフレッシュ
```

**ドリフト検出コマンド**
```bash
# 詳細なドリフト検出
terraform refresh

# State と実際のリソース差分を確認
terraform plan
```

---

## 7. ベストプラクティス

**命名規則と構成管理**
```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       └── terraform.tfvars
├── modules/
│   ├── webserver/
│   ├── database/
│   └── network/
└── shared/
    └── variables.tf
```

**安全な運用**
- 本番環境の Terraform 実行は事前承認フロー
- Plan 結果をレビュー後に Apply
- State ファイルは暗号化＆バックアップ
- 重要リソースには Destroy 保護を設定

IaC は インフラストラクチャの「Living Documentation」です。コードの変更 = ドキュメント更新となり、常に最新の状態を保証します。
