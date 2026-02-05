# BG. 外部API・サービス連携

## 概要

モダンなアプリケーション開発では、複数の外部 API やサービスと連携することが一般的です。決済サービス、 SNS、クラウドストレージなど、様々な外部システムとのインテグレーションを安全かつ効率的に行うことが求められます。

本セクションでは、モックサーバーや契約テスト（Contract Testing）によるテスト戦略、データ同期・イベント駆動の連携パターン、そして実装例を説明します。

## モックサーバーの活用

外部 API に依存するコードをテストする際、実際の API を呼び出すことは問題があります。ネットワーク遅延、料金発生、テスト環境の不安定性などが懸念されます。モックサーバーは、API の振る舞いを完全に模擬した開発用サーバーで、信頼性高いテスト環境を実現します。

一般的には JSON Server、MSW（Mock Service Worker）、json-server、Prism などのツールが用いられます。モックサーバーはレスポンスのフォーマット、ステータスコード、エラー動作を正確に定義でき、複雑なテストシナリオを設計・実行できます。

## 契約テスト (Contract Testing)

契約テストは、API クライアントとサーバーが「契約」（相互の期待するインターフェース定義）に基づいているかを検証する方式です。これにより、API 仕様変更時に双方の実装が同期されず、予期しない破損（breaking changes）が発生することを防ぎます。

Pact、Spring Cloud Contract などのフレームワークが一般的に使用されます。契約テストの利点：

- **早期発見**: インテグレーションテスト前に不適合を検出
- **ドキュメント化**: 契約がコード化された仕様として機能
- **独立テスト**: 両側が独立してテストでき、開発の並行化が可能

## 外部データの同期パターン

外部システムとのデータ同期には、複数のパターンがあります：

### CDC (Change Data Capture)

ソースシステムのデータベースに対して、変更が発生した時点で自動的にそれをキャプチャし、ターゲットシステムに反映させるアプローチです。Debezium などのツールが CDC を実装し、リアルタイムに近い同期を実現します。

### ETL (Extract, Transform, Load)

バッチ処理でソースシステムからデータを抽出（Extract）し、形式を変換（Transform）して、ターゲットシステムに読み込む（Load）方式です。大量データの定期同期に適しています。

### イベント駆動同期

ドメインイベントや Domain Event を活用し、ビジネスロジック変化を検知して他システムにリアルタイムに同期させます。疎結合で拡張性に優れています。

## 実装例

### MSW によるテスト実装

```javascript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('https://api.example.com/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'John Doe',
      email: 'john@example.com'
    });
  }),
  http.post('https://api.example.com/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: 1, ...body },
      { status: 201 }
    );
  })
);

// テスト前後の setup/teardown
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// テストの実施
test('should fetch user data', async () => {
  const response = await fetch('https://api.example.com/users/1');
  const data = await response.json();
  expect(data.name).toBe('John Doe');
});
```

### イベントフックの実装

```javascript
class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

const eventEmitter = new EventEmitter();

// 外部システム連携用のイベント
eventEmitter.on('user.created', async (user) => {
  // Slack、メール通知など
  await notifyExternalSystem(user);
});

eventEmitter.on('payment.completed', async (payment) => {
  // 会計システムへ連携
  await syncToAccountingSystem(payment);
});
```

## 日次同期バッチの設計

定期的なデータ同期が必要な場合、バッチ処理を設計します。タイムスタンプベースの増分更新を用いることで、毎回全件処理ではなく変更分のみを同期でき、効率性が向上します。

```javascript
async function syncBatch() {
  const lastSync = await getLastSyncTime();
  const changes = await fetchChangedData(lastSync);

  for (const record of changes) {
    await updateRemoteSystem(record);
  }

  await updateLastSyncTime(new Date());
}
```

## API エラーハンドリング

外部 API との連携では、ネットワークエラー、タイムアウト、レート制限、認可エラーなど様々なエラーが発生します。リトライロジック、サーキットブレーカーパターン、指数バックオフなどの戦略が重要です。

