# BW. CI/CD

## 概要

CI/CD（継続的インテグレーション・継続的デリバリー）は、コードの変更から本番デプロイまでを自動化するプラクティスです。

手動でテストしたり、デプロイスクリプトを手で実行する代わりに、パイプラインが自動で実行し、品質とリリース速度を両立させます。

GitHub Actions / GitLab CI / Jenkins などのツールを用い、Lint・テスト・脆弱性スキャン・ビルド・デプロイを自動化します。

---

## 1. CI/CD の本質

**CI（継続的インテグレーション）:**

```
1. 開発者がコードをプッシュ
   ↓
2. 自動的にテスト実行
   ├─ ユニットテスト
   ├─ 統合テスト
   └─ Lint / 型チェック
   ↓
3. テスト失敗 → 開発者にフィードバック（早期発見）
4. テスト成功 → 次段階へ
```

→ 開発サイクルの短縮、バグ早期発見

**CD（継続的デリバリー）:**

```
テスト完了 ✓
   ↓
1. ビルド（実行可能形式を作成）
   ↓
2. ステージング環境にデプロイ
   ↓
3. スモークテスト（重要機能の確認）
   ↓
4. 本番環境へのデプロイ承認
   ↓
5. 本番環境にデプロイ
```

→ テスト済みコードをいつでも本番リリースできる状態

---

## 2. パイプラインの構成

**一般的な パイプラインステップ:**

```yaml
stages:
  - lint          # コード品質チェック
  - test          # テスト実行
  - build         # ビルド
  - security      # セキュリティスキャン
  - deploy-stage  # ステージング環境デプロイ
  - smoke-test    # 本番相当テスト
  - deploy-prod   # 本番デプロイ
```

**トリガー:**

```
Git イベント → パイプライン起動

- push to main ブランチ → 本番デプロイパイプライン
- push to develop ブランチ → ステージングデプロイパイプライン
- Pull Request 作成 → テスト・Lint パイプライン
```

**ブランチ保護:**

テストに失敗したコードが本番にマージされるのを防止。

```
GitHub ブランチ保護設定:
- Status checks must pass before merging
  ├─ tests / lint
  ├─ coverage / 80% 以上
  └─ security-scan
- Require pull request reviews (2人の承認)
```

---

## 3. Lint / フォーマット自動化

**コード品質チェック:**

```yaml
name: Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm run lint    # ESLint
      - run: npm run format  # Prettier

      - name: Check formatting
        run: npm run format:check
```

**自動修正:**

Lint ツールが自動修正可能な問題は、パイプラインで直す。

```bash
# ESLint 自動修正
npx eslint . --fix

# Prettier 自動フォーマット
npx prettier . --write
```

---

## 4. テスト自動化

**テスト種別ごとのCI実行:**

```javascript
// package.json
{
  "scripts": {
    "test": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:a11y": "axe-core..."
  }
}
```

```yaml
# GitHub Actions ワークフロー
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
```

**カバレッジ管理:**

テストカバレッジが低下するのをブロック。

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
    fail_ci_if_error: true

- name: Check coverage threshold
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage too low: $COVERAGE%"
      exit 1
    fi
```

---

## 5. セキュリティスキャン自動化

**依存関係の脆弱性チェック:**

```yaml
- name: npm audit
  run: npm audit --audit-level=moderate

- name: Dependabot
  # GitHub が自動で脆弱性検出 → PR 自動作成
  # 開発者がレビューしてマージ

- name: Snyk スキャン
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

**SAST（静的解析）:**

ソースコードをスキャンし、セキュリティ脆弱性を検出。

```yaml
- name: SonarQube スキャン
  uses: SonarSource/sonarcloud-github-action@master
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

- name: CodeQL 分析（GitHub 提供）
  uses: github/codeql-action/analyze@v2
```

---

## 6. ビルド・デプロイパイプライン

**自動デプロイ（本番環境）:**

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Push to ECR
        run: |
          aws ecr get-login-password --region ap-northeast-1 | \
            docker login --username AWS --password-stdin $ECR_REGISTRY
          docker push $ECR_REGISTRY/myapp:${{ github.sha }}

      - name: Update ECS task definition
        run: |
          aws ecs update-service \
            --cluster production \
            --service myapp \
            --force-new-deployment

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Deploy to production complete",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Deployed to prod\nCommit: ${{ github.sha }}"
                  }
                }
              ]
            }
```

**デプロイ通知:**

Slack / メール / PagerDuty など、チームに通知。

```javascript
// デプロイ成功時の通知内容
{
  "status": "SUCCESS",
  "service": "API",
  "version": "v1.2.3",
  "deployed_at": "2024-02-01T10:30:00Z",
  "deployed_by": "github-actions",
  "changes": [
    "feat: キャッシュ戦略改善",
    "fix: データベースクエリ最適化"
  ]
}
```

---

## 7. デプロイ戦略

**Blue-Green デプロイ:**

古いバージョン（Blue）と新バージョン（Green）を同時に実行。テスト後に切り替え。

```
Before:
Load Balancer → Blue（v1.0）

Deploy:
Load Balancer → Blue（v1.0）
             → Green（v1.1） ← 準備中

Verify:
Green（v1.1）で動作確認

Switch:
Load Balancer → Green（v1.1）← 本番
Blue（v1.0） ← 削除

Rollback:
何か問題があれば、すぐ Blue に戻す
```

メリット: ダウンタイムなし、即座にロールバック可能

**Canary デプロイ:**

新バージョンを少数のユーザーに段階的に公開。

```
Load Balancer
├─ v1.0: 90%（既存ユーザー 9割）
└─ v1.1: 10%（テストユーザー 1割）

監視で エラー率・レイテンシ 異常なし
    → v1.1 の割合を増やす（20% → 50% → 100%）

エラー検出 → v1.1 を停止、v1.0 に戻す
```

---

## 8. OICD 認証設定（AWS の例）

```yaml
# GitHub Actions → AWS への認証
# （従来: AWS アクセスキーを secret に保存 ← セキュリティリスク）
# （新: OICD トークンで認証 ← 鍵レスで安全）

name: Deploy

on: [push]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions
          aws-region: ap-northeast-1

      - name: Deploy
        run: aws s3 sync . s3://my-bucket --delete
```
