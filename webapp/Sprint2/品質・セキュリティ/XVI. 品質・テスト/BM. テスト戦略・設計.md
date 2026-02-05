# BM. テスト戦略・設計

## 概要

テスト戦略は、自動テストの運用・カバレッジ管理・品質ゲート設定で信頼性を確保するアプローチです。テストしやすい設計（DIとしての依存性注入）、静的解析による事前検出、品質可視化ツールの導入により、バグを早期に発見・修正します。

---

## 1. CI での自動テスト運用

**役割:** すべてのコミット・PR でテストを実行し、品質を保証

### GitHub Actions での設定

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### テスト実行結果の通知

```yaml
      - name: Comment PR with test results
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json'));
            const lines = coverage.total.lines.pct;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Coverage: ${lines}%`
            });
```

---

## 2. カバレッジレポート生成・監視

**役割:** テスト対象コードの網羅率を計測・可視化

### カバレッジ計測

```bash
npm test -- --coverage

# 出力例
-------------|----------|----------|----------|----------|
File        | % Stmts  | % Branch | % Funcs  | % Lines  |
-------------|----------|----------|----------|----------|
All files   |    85.3  |    78.2  |    80.1  |    85.5  |
-auth.ts    |    95.0  |    90.0  |   100.0  |    95.0  |
-api.ts     |    72.0  |    60.0  |    70.0  |    72.0  |
-------------|----------|----------|----------|----------|
```

### カバレッジ低下をブロック

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
    statements: 85,
      functions: 85,
      lines: 85
    },
    './src/core/': {
      branches: 95,
      statements: 95,
      functions: 95,
      lines: 95
    }
  }
};

// テスト実行時にカバレッジが閾値未満ならテスト失敗
npm test  # カバレッジが85%未満 → FAIL
```

---

## 3. テストしやすい設計：依存性の注入（DI）

**役割:** テスト時に実装を差し替え可能にする

### 非テストしやすい設計（アンチパターン）

```typescript
// データベースに直接依存
class UserService {
  async getUser(id: string) {
    const db = new Database();  // 毎回 DB 接続を作成
    return db.query(`SELECT * FROM users WHERE id = '${id}'`);
  }
}

// テストが困難：実DB への接続が必須
```

### テストしやすい設計（DI）

```typescript
// インターフェース定義
interface IUserRepository {
  findById(id: string): Promise<User>;
}

// 実装
class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User> {
    return db.user.findUnique({ where: { id } });
  }
}

// サービスはインターフェースに依存
class UserService {
  constructor(private repo: IUserRepository) {}

  async getUser(id: string) {
    return this.repo.findById(id);
  }
}

// テスト時はモックを差し替え
const mockRepo = {
  findById: jest.fn(async (id) => ({ id, name: 'Test User' }))
};
const service = new UserService(mockRepo);

test('should fetch user', async () => {
  const user = await service.getUser('123');
  expect(user.name).toBe('Test User');
  expect(mockRepo.findById).toHaveBeenCalledWith('123');
});
```

---

## 4. 副作用の分離

**役割:** 計算ロジックとI/O操作を分ける

### 副作用が混在（テスト困難）

```typescript
class OrderService {
  async placeOrder(userId: string, items: Item[]) {
    const total = items.reduce((sum, i) => sum + i.price, 0);

    // 副作用1: DB 更新
    await db.order.create({
      userId,
      total,
      createdAt: new Date()
    });

    // 副作用2: メール送信
    await sendEmail(userId, `Order total: ${total}`);

    // 副作用3: 支払い処理
    await processPayment(userId, total);

    return { success: true };
  }
}

// テスト時に DB・メール・支払いが実行される（テスト困難）
```

### 副作用を分離（テスト容易）

```typescript
// 純粋な計算：副作用なし
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, i) => sum + i.price, 0);
}

// テスト容易
test('should calculate total correctly', () => {
  const total = calculateTotal([
    { price: 100 },
    { price: 200 }
  ]);
  expect(total).toBe(300);
});

// 副作用をまとめる
class OrderService {
  constructor(
    private db: IDatabase,
    private emailService: IEmailService,
    private paymentService: IPaymentService
  ) {}

  async placeOrder(userId: string, items: Item[]) {
    const total = calculateTotal(items);  // 計算（副作用なし）

    // 副作用をまとめて処理（モック可能）
    await this.db.order.create({ userId, total });
    await this.emailService.send(userId, `Order: ${total}`);
    await this.paymentService.process(userId, total);

    return { success: true };
  }
}
```

---

## 5. Quality Gates（品質ゲート）

**役割:** リリース前に品質基準を満たしているか自動チェック

### GitHub での品質ゲート設定

```yaml
name: Quality Gate

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run tests
        run: npm test -- --coverage

      - name: Check coverage
        run: |
          if [ $(npm test -- --coverage 2>&1 | grep -oP '\d+(?=%)' | head -1) -lt 80 ]; then
            echo "❌ Coverage below 80%"
            exit 1
          fi

      - name: Lint
        run: npm run lint -- --strict

      - name: Type check
        run: npm run type-check

      - name: Build
        run: npm run build
```

### PR マージ条件の設定

GitHub リポジトリ → Settings → Branches → Add rule:
- ✓ Require status checks to pass before merging
- ✓ Require branches to be up to date
- ✓ Require code reviews before merging
- ✓ Dismiss stale pull request approvals

---

## 6. 静的解析による品質ガード

**役割:** 実行前にコード品質問題を検出

### SonarQube / SonarCloud

```yaml
name: SonarCloud

on: [push, pull_request]

jobs:
  sonarcloud:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Run SonarCloud scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

**sonar-project.properties:**
```properties
sonar.projectKey=myapp
sonar.sources=src
sonar.tests=tests
sonar.coverage.exclusions=**/node_modules/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info

# 品質ゲート
sonar.qualitygate.wait=true
```

### ローカルでの検証

```bash
npm install -g sonarqube-scanner

sonar-scanner \
  -Dsonar.projectKey=myapp \
  -Dsonar.sources=src \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=your-token
```

---

## 7. リリース判定基準

**役割:** 本番環境への昇格を制御

```markdown
## リリース判定チェックリスト

### テスト
- [ ] ユニットテストカバレッジ >= 85%
- [ ] 統合テスト: すべてパス
- [ ] E2E テスト: 主要フローをカバー

### コード品質
- [ ] Linting エラー: 0個
- [ ] SonarQube セキュリティ: A 以上
- [ ] 依存関係の脆弱性: 0個

### パフォーマンス
- [ ] Core Web Vitals: 優（Green）
- [ ] API レスポンス時間: < 500ms

### セキュリティ
- [ ] OWASP トップ10 対策: 完了
- [ ] ペネトレーションテスト: 合格

### ドキュメント
- [ ] README 最新
- [ ] API ドキュメント最新
- [ ] リリースノート準備完了
```

---

## 8. 継続的改善

```javascript
// テスト実行時間の監視
test('should fetch user (should be < 100ms)', async () => {
  const start = performance.now();
  const user = await service.getUser('123');
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(100);
});

// カバレッジレポートのトレンド追跡
// npm test を実行し、coverage-summary.json をプロット
// → カバレッジが下がっていないか常にチェック
```
