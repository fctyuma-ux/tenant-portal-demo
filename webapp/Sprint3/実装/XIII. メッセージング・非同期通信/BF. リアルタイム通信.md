# BF. リアルタイム通信

## 概要

リアルタイム通信は、サーバーとクライアント間の低遅延な双方向通信を実現します。HTTPアップグレード（WebSocket）、ポーリング、サーバー送信イベント（SSE）など複数の手法があり、ユースケースに応じた選択が重要です。スケーリング課題への対応も必須。

---

## 1. HTTPアップグレード（WebSocket）

**HTTP/1.1 接続を WebSocket に昇格。** 初期 HTTP ハンドシェイク後、TCP 接続を双方向通信に切り替え。

**メリット：**
- 低遅延（10～100ms）
- 双方向通信（サーバー→クライアント主動も可）
- 低オーバーヘッド

**デメリット：**
- ステートフル（ロードバランサー設定複雑）
- ファイアウォール・プロキシの設定が必要な場合あり
- サーバーメモリ使用量増加

```javascript
// WebSocket クライアント
const ws = new WebSocket('wss://example.com/chat');
ws.onmessage = (event) => {
  console.log('Message:', event.data);
};
ws.send(JSON.stringify({ type: 'message', content: 'Hello' }));
```

---

## 2. スケーリングの課題

**接続保持の複雑性：** 単一サーバーは数千～数万接続が限界。複数サーバー環境では、同じクライアントが異なるサーバーに接続可能。

**Redis Pub/Sub による解決：** 複数サーバー間でメッセージ中継。

```javascript
// Node.js + Socket.io + Redis Adapter
const io = require('socket.io')(server);
const { createAdapter } = require('@socket.io/redis-adapter');

io.adapter(createAdapter(redis, redis.duplicate()));
```

**ロードバランシング：** スティッキーセッション（sticky session）で同じクライアントを同一サーバーにルーティング。

---

## 3. 代替手法

**Server-Sent Events (SSE)：** HTTP でサーバー→クライアント単方向。ブラウザ自動再接続。リアルタイム通知向け。

```javascript
const eventSource = new EventSource('/api/notifications');
eventSource.onmessage = (event) => {
  console.log(event.data);
};
```

**ロング・ポーリング：** クライアントが定期的にサーバーに問い合わせ。実装は簡単だが、オーバーヘッド大。

---

## 4. チャットアプリの実装

**アーキテクチャ：**

```
Client ← WebSocket → Server
           (broadcast)
              ↓
         Redis Pub/Sub
              ↓
        All Connected Servers
```

**メッセージ永続化：** MongoDB / PostgreSQL にメッセージ保存。オフラインユーザーへのキャッチアップ対応。

**ユーザー状態管理：** Redis に「オンライン状態」を保持。心跳（Heartbeat）で接続監視。

```python
# メッセージ保存（Django + Channels）
class ChatConsumer(AsyncWebsocketConsumer):
    async def receive(self, text_data):
        data = json.loads(text_data)

        # メッセージ保存
        await Message.objects.acreate(
            room=self.room,
            user=self.user,
            content=data['message']
        )

        # ブロードキャスト
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'chat.message', 'message': data['message']}
        )
```

---

## 5. 監視とチューニング

**監視項目：**
- 接続数（メモリ使用量との相関）
- メッセージレート（スループット）
- 遅延（P99 レイテンシ）
- エラーレート（接続失敗・切断）

---

## 要件カバレッジ

本セクションは以下のitemsをカバーしています：HTTPアップグレード、スケーリングの課題、チャットアプリの実装
