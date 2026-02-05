# BO. 特殊テスト

## 概要

通常のユニット・統合テストでは検出できない品質属性に焦点を当てたテスト手法を学びます。性能テスト、負荷テスト、セキュリティテストにより、本番環境での実運用を想定した多面的な品質確認を実現します。

---

## 性能テスト（Performance Testing）

### レスポンスタイムの測定

アプリケーションのレスポンスタイムを測定し、ユーザー体験に支障がないかを確認します。`performance.now()`で実行時間を計測。小データセット（1ms以下）と大データセット（100ms以下）の両者をテスト。

### メモリ使用量の監視

Node.jsの`process.memoryUsage()`でヒープサイズを監視。大量データ処理時のメモリリーク検出。メモリ増加が閾値（例：50MB）以下に収まることを検証。

```javascript
function measurePerformance(fn, label) {
  const startTime = performance.now();
  const result = fn();
  const duration = performance.now() - startTime;
  console.log(`${label}: ${duration.toFixed(2)}ms`);
  return result;
}

test('search performance with large dataset', () => {
  const users = Array(100000).fill(null).map((_, i) => ({
    id: i, name: `User${i}`
  }));
  const duration = measurePerformance(
    () => searchUsers('User50000', users),
    'Large search'
  );
  expect(duration).toBeLessThan(100);  // 100ms以下
});
```

---

## 負荷テスト（Load Testing）

### 同時リクエスト処理の検証

複数の同時リクエストをサーバーに送信し、応答性能を測定。成功率（95%以上）、平均レスポンスタイム（200ms以下）、最大レスポンスタイム（500ms以下）を検証。`Promise.all()`で複数リクエストを並行実行。

### ストレステスト

サーバーの最大容量を超える負荷を段階的に増加。並行リクエスト数を10 → 20 → ... と増やし、サーバーの破綻ポイントを特定。応答不可能になるまでの並行リクエスト数を記録。

---

## セキュリティテスト（Security Testing）

### SQL インジェクション対策の検証

ユーザー入力を含むデータベースクエリで、攻撃パターン（`'; DROP TABLE users; --`など）が安全に処理されることを確認。プリペアドステートメントを使用し、入力をパラメータとして分離。

### XSS（クロスサイトスクリプティング）対策の検証

ユーザー入力（`<script>alert("XSS")</script>`など）をHTML出力する際、エスケープされて実行されないこと確認。HTMLエスケープ関数で`<`→ `&lt;`のように変換。

```javascript
class UserProfile {
  renderProfileSafe(user) {
    const escapeHtml = (text) => {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;',
                    '"': '&quot;', "'": '&#x27;' };
      return text.replace(/[&<>"']/g, char => map[char]);
    };
    return `<div>${escapeHtml(user.bio)}</div>`;
  }
}

test('should escape user input to prevent XSS', () => {
  const profile = new UserProfile();
  const user = { bio: '<script>alert("XSS")</script>' };
  const output = profile.renderProfileSafe(user);
  expect(output).toContain('&lt;script&gt;');
  expect(output).not.toContain('<script>');
});
```

### CSRF（クロスサイトリクエストフォージェリ）対策の検証

フォーム送信時、セッションに保存されたCSRFトークンがリクエストに含まれ、サーバー側で検証することを確認。トークンの生成・検証・比較プロセス。

### 認証・認可テスト

ロール別のアクセス制御確認。管理者のみが管理パネルにアクセス可能、ビューアーは削除不可などのルールを検証。

---

## エンドツーエンドテスト（E2E）の実装

### ブラウザ自動化テスト

Puppeteerを使用し、ブラウザを自動操作してユーザーフローを検証。登録 → 確認メール → ログイン → ダッシュボード表示といった実際のユーザー動作を再現。

ページ遷移、フォーム入力、ボタンクリック、エラーメッセージ表示を検証。非同期処理の完了を待つ`waitForNavigation()`など。

---

## テストの自動化とCI/CD統合

### テスト実行の自動化

package.jsonで異なるテストスクリプトを定義：
- `npm run test`: 全テスト
- `npm run test:unit`: 単体テストのみ
- `npm run test:coverage`: カバレッジレポート
- `npm run test:performance`: パフォーマンステスト
- `npm run test:security`: セキュリティテスト

### CI/CDパイプライン

GitHub Actionsで自動実行。複数Node.jsバージョン（14.x, 16.x, 18.x）での互換性確認。Unit → Integration → E2E → Performance → Security の順序で段階的に実行。
