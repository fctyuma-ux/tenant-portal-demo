# BO. 特殊テスト

## 概要

特殊テストは、通常のユニット・統合テストでは検証できない障害復旧・アクセシビリティ・パフォーマンス・セキュリティの側面をカバーします。フェイルオーバー試験・負荷テスト・セキュリティスキャン・ファジングにより、本番環境での信頼性を確認します。

---

## 1. 障害対応テスト（フェイルオーバー試験）

**役割:** システム障害時の自動フェイルオーバーが機能するか検証

### データベース障害時の対応

```typescript
// リトライ + フェイルオーバー実装
class DatabaseConnection {
  private primaryConn: Connection;
  private replicaConn: Connection;

  async query(sql: string, params: any[]) {
    try {
      return await this.primaryConn.query(sql, params);
    } catch (error) {
      console.warn('Primary DB failed, switching to replica');
      return await this.replicaConn.query(sql, params);
    }
  }
}

// テスト: プライマリ DB を無効化してレプリカに切り替わるか確認
test('should failover to replica on primary DB failure', async () => {
  const mockPrimary = {
    query: jest.fn().mockRejectedValue(new Error('Connection failed'))
  };
  const mockReplica = {
    query: jest.fn().mockResolvedValue([{ id: 1 }])
  };

  const conn = new DatabaseConnection();
  conn.primaryConn = mockPrimary;
  conn.replicaConn = mockReplica;

  const result = await conn.query('SELECT * FROM users', []);

  expect(mockReplica.query).toHaveBeenCalled();
  expect(result).toEqual([{ id: 1 }]);
});
```

### Circuit Breaker パターン

```typescript
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private failureThreshold = 5;
  private resetTimeout = 60000;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      setTimeout(() => {
        this.state = 'half-open';
      }, this.resetTimeout);
    }
  }
}

// テスト
test('should open circuit after threshold failures', async () => {
  const breaker = new CircuitBreaker();
  const failingFn = jest.fn().mockRejectedValue(new Error('Fail'));

  for (let i = 0; i < 5; i++) {
    try {
      await breaker.execute(failingFn);
    } catch {}
  }

  await expect(breaker.execute(() => Promise.resolve())).rejects.toThrow(
    'Circuit breaker is open'
  );
});
```

---

## 2. バックアップからのリストア訓練

**役割:** 実際にバックアップからデータを復元できるか定期検証

```bash
#!/bin/bash
# backup-restoration-test.sh

set -e

BACKUP_FILE="backup-$(date +%Y%m%d).sql"
TEST_DB="test_restore_db"

echo "📦 Creating backup..."
mysqldump -u root production_db > "$BACKUP_FILE"

echo "📋 Creating test database..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS $TEST_DB;"

echo "🔄 Restoring from backup..."
mysql -u root "$TEST_DB" < "$BACKUP_FILE"

echo "✅ Validating restored data..."
RESTORED_COUNT=$(mysql -u root -s "$TEST_DB" -e "SELECT COUNT(*) FROM users;")
PROD_COUNT=$(mysql -u root -s production_db -e "SELECT COUNT(*) FROM users;")

if [ "$RESTORED_COUNT" -eq "$PROD_COUNT" ]; then
  echo "✓ Restore successful: $RESTORED_COUNT records"
  mysql -u root -e "DROP DATABASE $TEST_DB;"
else
  echo "✗ Restore failed: expected $PROD_COUNT but got $RESTORED_COUNT"
  exit 1
fi
```

**CI での定期実施:**
```yaml
name: Backup Restoration Test

on:
  schedule:
    - cron: '0 2 * * 0'  # 毎週日曜日 2:00

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: bash ./scripts/backup-restoration-test.sh
```

---

## 3. アクセシビリティテスト

**役割:** 障害を持つユーザーがサイトを利用できるか検証

### 自動チェックツール

```bash
# axe DevTools
npm install --save-dev @axe-core/webdriverio

# ESLint プラグイン
npm install --save-dev eslint-plugin-jsx-a11y
```

### キーボードナビゲーション検証

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('should navigate with Tab key', async () => {
  const user = userEvent.setup();
  render(
    <>
      <button>First</button>
      <button>Second</button>
      <button>Third</button>
    </>
  );

  const first = screen.getByRole('button', { name: 'First' });
  first.focus();
  expect(first).toHaveFocus();

  // Tab で次のボタンに移動
  await user.tab();
  expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus();

  // Shift+Tab で前に戻る
  await user.tab({ shift: true });
  expect(first).toHaveFocus();
});
```

### スクリーンリーダー対応テスト

```typescript
test('should be accessible with screen reader', () => {
  const { container } = render(
    <form>
      <label htmlFor="name">Name</label>
      <input id="name" />
      <button type="submit">Submit</button>
    </form>
  );

  // アクセシビリティツリーを検証
  const input = container.querySelector('#name');
  expect(input).toHaveAttribute('aria-labelledby');
});
```

### 自動スキャン

```javascript
// jest-axe を使用
import { axe, toHaveNoViolations } from 'jest-axe';

test('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 4. パフォーマンステスト（負荷テスト）

**役割:** 複数の同時ユーザーでシステムが機能するか検証

### k6 による負荷テスト

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,        // 仮想ユーザー数
  duration: '30s'  // テスト実行時間
};

export default function () {
  const res = http.get('https://api.example.com/users');

  check(res, {
    'status 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'body has id': (r) => r.body.includes('id')
  });

  sleep(1);
}
```

**実行:**
```bash
k6 run load-test.js

# 結果例
     http_req_duration..........: avg=245ms, p(95)=410ms, p(99)=620ms
     checks.................: 95.2% passed
     vus...................: 100
```

### ボトルネック分析

```javascript
// レスポンス時間の詳細分析
const res = http.get('https://api.example.com/users');
console.log(`DNS: ${res.timings.connecting}ms`);
console.log(`TLS: ${res.timings.tls}ms`);
console.log(`Wait: ${res.timings.waiting}ms`);
console.log(`Receive: ${res.timings.receiving}ms`);
```

---

## 5. 障害注入実験（Chaos Mesh）

**役割:** 本番環境で実際に障害を起こし、システムの耐性をテスト

### Kubernetes での障害注入

```yaml
# Chaos Mesh によるネットワーク遅延注入
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: api-latency-chaos
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      app: api-server
  delay:
    latency: '500ms'
    jitter: '100ms'
  duration: '5m'
```

```yaml
# Pod をランダムに kill
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: kill-random-pod
spec:
  action: pod-kill
  mode: fixed
  value: 1
  selector:
    namespaces:
      - default
    labelSelectors:
      app: api-server
  duration: '10s'
```

---

## 6. セキュリティスキャンの自動化

**役割:** 脆弱性を自動検出

### OWASP ZAP での動的スキャン

```yaml
name: Security Scan

on: [push]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run ZAP scan
        uses: zaproxy/action-full-scan@v0.7.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
```

### Trivy による脆弱性スキャン

```bash
# Docker イメージのスキャン
trivy image myapp:latest

# ファイルシステムのスキャン
trivy fs --severity HIGH,CRITICAL ./src
```

---

## 7. ファジング（Fuzzing）

**役割:** ランダムな入力を与えて予期しない動作を検出

```typescript
import fc from 'fast-check';

test('parseJSON should handle arbitrary inputs', () => {
  fc.assert(
    fc.property(fc.json(), (json: any) => {
      try {
        JSON.stringify(json);
        return true;
      } catch {
        return false;
      }
    })
  );
});

// API エンドポイントのファジング
test('should handle arbitrary query parameters', () => {
  fc.assert(
    fc.property(
      fc.record({
        email: fc.emailAddress(),
        age: fc.nat(200),
        name: fc.string()
      }),
      (queryParams) => {
        const response = request.get('/api/users', { query: queryParams });
        return response.status !== 500;  // 500エラーが出ないこと
      }
    )
  );
});
```

---

## 8. Game Day（避難訓練）

**役割:** 実際の障害シナリオをシミュレーション

```markdown
## Game Day シナリオ例

### 時間: 2024-02-15 10:00 ~ 11:00

#### シナリオ: データベース障害

1. **09:55** 参加者集合、役割分担
   - Incident Commander: Alice
   - Communications: Bob
   - Technical Lead: Charlie

2. **10:00** 障害を発生させる
   - `kubectl delete pod -l app=postgres`
   - DB が完全に止まる

3. **10:00 ~ 10:20** 障害対応
   - サーバーログを調査
   - フェイルオーバー手順を実行
   - レプリカ DB に切り替え
   - ステータスページを更新

4. **10:20 ~ 10:50** サービス復旧
   - トラフィックを段階的に増加
   - エラー率を監視
   - 完全復旧を確認

5. **10:50 ~ 11:00** ふり返り
   - 対応時間: 20分
   - 改善点: レプリカ切り替えが自動化されていなかった
   - アクション: 自動フェイルオーバーの実装
```
