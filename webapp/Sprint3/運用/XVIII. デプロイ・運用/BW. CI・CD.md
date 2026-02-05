# CI・CD

## 概要

CI（継続的インテグレーション）・CD（継続的デリバリー）パイプラインは、コード変更から本番デプロイまで、品質を保ちながら自動化します。本セクションではビルドキャッシュ、共通ワークフローテンプレート、デプロイ戦略をカバーします。

効率的なパイプラインにより、デプロイ頻度を上げながら品質と安定性を維持できます。

---

## 1. CI・CD の段階

**ステージの流れ**
```
Source (GitHub)
    ↓ (コミット)
Build & Test (テスト実行)
    ↓ (成功時のみ)
Staging Deploy (ステージング環境)
    ↓ (手動承認)
Production Deploy (本番環境)
    ↓
Monitoring (監視・ログ)
```

**各ステージの役割**
- **Build**：コンパイル、依存関係の解決
- **Test**：ユニットテスト、統合テスト、セキュリティスキャン
- **Deploy**：コンテナ化、本番環境へのデプロイ
- **Monitor**：エラーレート、レスポンス時間の監視

---

## 2. ビルドパフォーマンス最適化

**キャッシュの設定**
```yaml
# GitHub Actions での Docker キャッシュ
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Build with cache
        uses: docker/build-push-action@v4
        with:
          context: .
          cache-from: type=gha
          cache-to: type=gha,mode=max
          push: true
          tags: myrepo:latest
```

**キャッシュの効果**
```
キャッシュなし：
  Docker ビルド：3分 30秒

キャッシュあり：
  Docker ビルド：45秒 （約 78% 削減）
```

**npm / pip キャッシュ**
```yaml
- uses: actions/setup-node@v3
  with:
    node-version: '18'
    cache: 'npm'  # package-lock.json をハッシュに

- name: Install dependencies
  run: npm ci  # ci は cache を活用
```

---

## 3. ビルドの信頼性

**再現可能なビルド**
```dockerfile
# ✗ 非決定的（バージョン指定なし）
FROM node:latest
RUN npm install

# ○ 決定的（バージョン固定）
FROM node:18.17.1-alpine
COPY package-lock.json .
RUN npm ci
```

**Linting・型チェックの統合**
```yaml
- name: Lint code
  run: npm run lint

- name: Type check (TypeScript)
  run: npx tsc --noEmit

- name: Security scan
  run: npm audit --audit-level=moderate
```

---

## 4. テスト戦略

**テストレベルと時間**
```
ユニットテスト：
  - 実行時間：30秒
  - カバレッジ：80% 以上

統合テスト：
  - 実行時間：2分
  - 実際の DB/API 連携確認

E2E テスト（選抜）：
  - 実行時間：5分
  - クリティカルパスのみ
```

**テスト実行の最適化**
```yaml
- name: Run tests in parallel
  run: npm run test -- --parallel --maxWorkers=4

- name: Coverage report
  run: npm run test:coverage

- name: Upload to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

---

## 5. 共通ワークフローテンプレート

**複数リポジトリで再利用可能なワークフロー**
```yaml
# .github/workflows/reusable-deploy.yml
name: Reusable Deploy Workflow

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      image-tag:
        required: true
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - name: Deploy to ${{ inputs.environment }}
        run: |
          aws ecs update-service \
            --service my-service \
            --force-new-deployment \
            --region ap-northeast-1
```

**親ワークフローから呼び出し**
```yaml
# .github/workflows/main.yml
jobs:
  deploy-dev:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: dev
      image-tag: ${{ github.sha }}

  deploy-prod:
    needs: deploy-dev
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: prod
      image-tag: ${{ github.sha }}
```

共通化により、異なるリポジトリでも同じデプロイロジックを実行でき、メンテナンス負荷を大幅削減できます。

---

## 6. デプロイ戦略

**ブルーグリーンデプロイ**
```
① 現在の環境（Blue）が本番稼働
② 新バージョンを別環境（Green）に構築・テスト
③ ロードバランサーを Green へ切り替え
④ 旧環境 Blue は即座にロールバック可能
```

**カナリアデプロイ**
```
トラフィック配分：
新版：10% → 1日 → 25% → 1日 → 50% → 1日 → 100%

メトリクス監視：
- エラー率、レイテンシー
- 閾値を超えたら自動ロールバック
```

---

## 7. デプロイ後のモニタリング

**本番環境への即座なフィードバック**
```yaml
- name: Deploy to production
  run: kubectl set image deployment/app app=myapp:${{ github.sha }}

- name: Monitor health
  run: |
    sleep 30  # デプロイ完了待機
    curl -f https://api.example.com/health || exit 1

    # メトリクス確認
    ERROR_RATE=$(aws cloudwatch get-metric-statistics \
      --namespace Application \
      --metric-name ErrorRate \
      --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
      --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
      --period 300 \
      --statistics Average \
      --query 'Datapoints[0].Average' \
      --output text)

    if (( $(echo "$ERROR_RATE > 5" | bc -l) )); then
      echo "Error rate too high. Triggering rollback."
      exit 1
    fi
```

---

## 8. 継続的改善

**デプロイ頻度と Mean Time to Recovery (MTTR)**
```
理想的な状態：
- デプロイ頻度：1日複数回
- MTTR（回復時間）：1時間以内
- 変更失敗率：15% 以下
```

**メトリクスの監視**
```bash
# 過去 1ヶ月のデプロイ統計
git log --oneline --since='1 month ago' | wc -l

# マージ PR 数
gh pr list --state merged --created=">last month" --limit 999
```

効率的な CI・CD パイプラインは、品質と速度の両立を実現する基盤です。
