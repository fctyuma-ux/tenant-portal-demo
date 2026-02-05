# AX. サーバーレス・エッジ

## 概要

サーバーレスアーキテクチャは、インフラ管理を排除し、コード実行に注力できる開発モデルです。サーバー保守、スケーリング、パッチ適用などの煩雑さから解放され、ビジネスロジックに集中できます。エッジコンピューティングは、クラウドセンター側ではなく、エンドユーザーに近い地理的位置でコード実行を行い、レイテンシ低減と高速レスポンスを実現します。

本セクションでは、エッジの概念、コールドスタート、Edge Runtime の制約、および実装方法について説明します。

## エッジの概念

エッジコンピューティングは、Cloudflare Workers、Vercel Edge Functions、AWS Lambda@Edge などのプラットフォームで実現されます。ユーザーのリクエストが到達するエッジサーバーで即座に処理され、オリジンサーバーへのリクエストが削減されます。

メリット：
- **低レイテンシ**: ユーザーに地理的に近い場所で実行
- **キャッシュ活用**: 静的コンテンツのエッジでの配信
- **セキュリティ**: DDoS 対策、WAF 機能
- **スケーラビリティ**: オートスケーリング、無制限同時接続

## コールドスタートと起動時間

サーバーレス関数は、呼び出しがない時間が続くと「フリーズ」され、次のリクエスト時に初期化（コールドスタート）が発生します。言語ランタイムの起動、依存関係のロード、グローバルコード実行が発生するため、初回レスポンス時間が増加します。

**バンドルサイズの影響**：大きなバンドルは初期化時間を増加させます。必要な依存関係のみを選定し、ツリーシェイキング、ダイナミックインポートなどで最小化することが重要です。

コールドスタート時間の計測：

```javascript
// Vercel Edge Functions
export default async function handler(request) {
  const startTime = Date.now();

  // 処理...

  const duration = Date.now() - startTime;
  console.log(`Execution time: ${duration}ms`);

  return new Response(`Cold start: ${duration}ms`);
}
```

## Edge Runtime の制約

Edge Runtime 環境は、通常のランタイムと異なる制約があります：

- **メモリ制限**: 通常 128MB～1GB、関数により異なる
- **CPU 時間制限**: 実行時間が制限（30秒、50秒など）
- **ファイルシステム**: 読み取り専用、永続ストレージなし
- **標準 API**: Node.js API の一部が未対応（fs、net など）

グローバル分散データストア（Durable Objects、Redis）を活用し、状態管理を実装します。

## Edge Functions の実装例

```javascript
// Vercel Edge Functions
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge'
};

export default async function handler(request: NextRequest) {
  const { pathname } = new URL(request.url);

  // A/B テスト
  if (pathname === '/api/test') {
    const country = request.geo?.country || 'US';

    if (country === 'JP') {
      return NextResponse.redirect(new URL('/jp', request.url));
    }
  }

  // キャッシュ制御
  if (pathname.startsWith('/api/data')) {
    return fetch(new URL('/api/data', request.url), {
      headers: { 'Cache-Control': 'public, s-maxage=3600' }
    });
  }

  return NextResponse.next();
}
```

## サーバーレスアーキテクチャの構築

```javascript
// AWS Lambda + API Gateway
exports.handler = async (event) => {
  const { httpMethod, path, body } = event;

  if (httpMethod === 'POST' && path === '/users') {
    const user = JSON.parse(body);
    const result = await saveUser(user);
    return {
      statusCode: 201,
      body: JSON.stringify(result)
    };
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' })
  };
};

async function saveUser(user) {
  // DynamoDB、RDS、またはその他のデータストアに保存
  return { id: '123', ...user };
}
```

## ベストプラクティス

- **依存関係最小化**: バンドルサイズ削減によるコールドスタート改善
- **ステートレス設計**: グローバルな状態を避け、リクエスト毎に独立
- **タイムアウト対策**: 長時間実行が必要な場合はメッセージキュー利用
- **環境変数管理**: 機密情報は環境変数で安全に管理
- **監視・ログ**: CloudWatch、Datadog などで実行状況を監視

