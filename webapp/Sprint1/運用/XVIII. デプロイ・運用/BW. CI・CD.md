# BW. CI・CD

## 概要

継続的インテグレーション（CI）と継続的デリバリー/デプロイメント（CD）は、コード品質の維持と高速なリリースサイクルを実現するための基盤です。自動化されたパイプラインにより、開発チーム全体の効率性を向上させ、本番環境の安定性を保証します。

---

## 継続的インテグレーション（CI）

継続的インテグレーションは、開発者がコードを頻繁にメインリポジトリにマージする実践であり、各マージ時に自動テストやビルドが実行されます。

### CI パイプラインの構成

```plaintext
開発者のコミット
    ↓
GitHub/GitLab へのプッシュ
    ↓
Webhook トリガー
    ↓
CI/CD パイプライン開始
    ├─ チェックアウト
    ├─ 依存インストール
    ├─ ビルド
    ├─ 単体テスト
    ├─ 統合テスト
    ├─ コード品質分析
    └─ セキュリティスキャン
    ↓
✓ 全テスト成功 → デプロイ待機
✗ 失敗 → 開発者に通知
```

### ビルドとテスト自動化の実装例

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: npm run test:integration

      - name: Code coverage
        run: npm run coverage

      - name: SonarQube analysis
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### パイプラインの並列化と最適化

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci && npm run lint

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci && npm test

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit
      - run: npm run security-scan

  build:
    needs: [lint, test, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: build-artifact
          path: dist/
```

---

## 継続的デリバリー・デプロイメント（CD）

継続的デリバリーはテスト済みのコードを本番環境にデプロイ可能な状態に保つプロセスです。継続的デプロイメントはさらに自動的にリリースまで行います。

### CD パイプラインのフロー

```plaintext
CI パイプライン成功
    ↓
ステージング環境へのデプロイ
    ├─ データベースマイグレーション
    ├─ 環境変数の設定
    ├─ ヘルスチェック
    └─ スモークテスト
    ↓
手動承認（継続的デリバリー）
    または
自動プロモーション（継続的デプロイメント）
    ↓
本番環境へのデプロイ
    ├─ ブルーグリーン/カナリア戦略
    ├─ 段階的ロールアウト
    └─ メトリクス監視
    ↓
デプロイ完了 → 監視継続
```

### 本番デプロイの自動化例

```yaml
# .github/workflows/deploy.yml
name: Deploy Pipeline

on:
  push:
    branches: [main]
  workflow_run:
    workflows: ['CI Pipeline']
    types: [completed]

jobs:
  deploy-staging:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v3

      - name: Download build artifact
        uses: actions/download-artifact@v3
        with:
          name: build-artifact

      - name: Deploy to staging
        run: |
          aws s3 sync . s3://staging-bucket/ --delete
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.STAGING_DISTRIBUTION_ID }} \
            --paths "/*"

      - name: Run smoke tests
        run: |
          curl -f https://staging.example.com/health || exit 1
          npm run test:smoke:staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v3

      - name: Request approval
        if: github.ref == 'refs/heads/main'
        run: echo "Waiting for approval to deploy to production..."

      - name: Deploy to production (Canary)
        run: |
          kubectl set image deployment/app-canary \
            app=myapp:${{ github.sha }} \
            --record

      - name: Monitor canary (5 minutes)
        run: |
          sleep 300
          ./scripts/check-metrics.sh canary

      - name: Complete rollout
        run: |
          kubectl set image deployment/app \
            app=myapp:${{ github.sha }} \
            --record

      - name: Verify deployment
        run: |
          kubectl rollout status deployment/app
          npm run test:production
```

---

## 自動テストの設計

CI/CD パイプラインの効果は、テストの品質に大きく依存します。段階的なテスト戦略により、迅速で信頼性の高いパイプラインを実現します。

### テストピラミッド

```plaintext
             /\
            /  \
           / E2E \        少数・遅い
          /------\
         /   API  \
        /----------\     中程度
       / Unit Tests \
      /              \   多数・高速
     /________________\
```

### テスト実装例

```javascript
// Unit Test（ユニットテスト）
describe('calculateTotal', () => {
  it('should sum all prices', () => {
    const items = [{ price: 10 }, { price: 20 }];
    expect(calculateTotal(items)).toBe(30);
  });
});

// Integration Test（統合テスト）
describe('User Registration Flow', () => {
  it('should create user in database', async () => {
    const response = await api.post('/users', {
      email: 'test@example.com',
      password: 'secret'
    });
    expect(response.status).toBe(201);
    const user = await db.users.findByEmail('test@example.com');
    expect(user).toBeDefined();
  });
});

// E2E Test（エンドツーエンドテスト）
describe('Login E2E', () => {
  it('should allow user to log in', async () => {
    await page.goto('https://staging.example.com');
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="submit"]');
    await page.waitForNavigation();
    expect(page.url()).toContain('/dashboard');
  });
});
```

---

## パイプラインの監視と改善

### パイプラインメトリクス

- **ビルド成功率**: 目標 > 95%
- **テスト実行時間**: 短いほど良い（目標: 10分以内）
- **デプロイ頻度**: 高いほど良い（目標: 1日複数回）
- **リードタイム**: 承認から本番まで（目標: 1時間以内）

### トラブルシューティング例

```bash
# パイプライン失敗時の診断
- ビルド失敗 → ログ確認、依存関係チェック
- テスト失敗 → 単体テストから統合テストへ段階的デバッグ
- デプロイ失敗 → 環境変数、権限、ネットワーク接続を確認
- ロールバック → 前回のコミットをリバートして再デプロイ
```

---

## ベストプラクティス

- **頻繁なコミット**: 1日複数回、小さな単位でマージ
- **テストの充実**: ユニット・統合・E2E テストのバランス
- **パイプライン高速化**: キャッシュ、並列化、不要ステップ削除
- **通知と可視化**: チーム全体がパイプール状況を把握
- **段階的ロールアウト**: ステージング → 本番での検証フロー

---

## 次のステップ

- リリース管理とバージョニング
- 障害対応と信頼性の向上
- 監視・オブザーバビリティ機構の構築
