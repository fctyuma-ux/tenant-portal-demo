# BF. リアルタイム通信

## 概要

リアルタイム通信は、ユーザーがブラウザで Web アプリケーションを使用している際に、サーバーからクライアントへ即座にデータを送信する技術です。従来の HTTP リクエスト・レスポンス方式では実現困難な双方向通信を可能にし、チャットアプリケーション、通知システム、ライブデータ更新など多くの用途で活用されます。

本セクションでは、Web Push 通知を中心に、ブラウザと Service Worker の連携、VAPID 鍵による認証メカニズムについて説明します。

## VAPID 鍵の役割

Web Push API を利用する際、サーバーはメッセージを Push サービスプロバイダ（例：FCM、APNs）に送信する必要があります。VAPID（Voluntary Application Server Identification）鍵は、アプリケーションサーバーが自身のアイデンティティを証明するための認証情報です。

VAPID 鍵ペアは公開鍵と秘密鍵の両方を含みます。クライアント側は公開鍵を用いて購読登録（subscribe）時に使用し、サーバー側は秘密鍵を使って JWT トークンを生成します。これにより、Push サービスはメッセージが信頼できるアプリケーションサーバーから送信されていることを確認できます。

## Service Worker のライフサイクル

Service Worker は、ブラウザがバックグラウンドで実行する JavaScript ワーカーです。ウェブページが閉じている場合でも、Web Push 通知を受け取って処理することができます。

Service Worker のライフサイクルは以下のフェーズで構成されます：

1. **登録フェーズ**: メインスレッドから `navigator.serviceWorker.register()` で登録
2. **インストールフェーズ**: `install` イベント発火、キャッシュ初期化
3. **アクティベーションフェーズ**: `activate` イベント発火、古いキャッシュ削除
4. **実行フェーズ**: `fetch` イベント、`push` イベントなど各種イベントを処理

Push 通知受信時には `push` イベントが発火し、Service Worker は即座にそれを処理して通知を表示します。

## Web Push の実装例

以下は、VAPID 鍵を使用した基本的な Web Push の実装例です。

### サーバー側：Push 通知送信

```javascript
const webpush = require('web-push');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  'mailto:contact@example.com',
  vapidPublicKey,
  vapidPrivateKey
);

// クライアントから送信された subscription オブジェクト
async function sendNotification(subscription, payload) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'New Message',
        body: payload.message,
        icon: '/icon-192x192.png'
      })
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
}
```

### クライアント側：Service Worker 登録と購読

```javascript
// Service Worker の登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Push 通知を購読
async function subscribeToPushNotifications() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: new Uint8Array(
      // VAPID 公開鍵を Base64URL デコードしたバイト列
    )
  });

  // サーバーに subscription 情報を送信
  await fetch('/api/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription)
  });
}
```

### Service Worker 内の Push イベント処理

```javascript
// sw.js
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon,
    tag: 'notification'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
```

## 通知配信の信頼性確保

Web Push は**少なくとも一度**の配信保証（At-least-once）を提供します。ネットワーク遅延やデバイス未起動時も、可能な限り通知を届けようと試みます。ただし、配信の確実性はプラットフォーム実装に依存することを理解する必要があります。

## WebSocket による双方向リアルタイム通信

Web Push が一方向の通知に適している一方で、WebSocket はクライアント・サーバー間の双方向通信に使用されます。チャットやコラボレーティブエディタなど、リアルタイムな相互作用が必要なアプリケーションでは WebSocket が活用されます。

