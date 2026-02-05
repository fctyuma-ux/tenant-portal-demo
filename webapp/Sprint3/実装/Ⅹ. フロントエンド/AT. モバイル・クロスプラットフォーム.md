# AT. モバイル・クロスプラットフォーム

## 概要

モバイルとWebアプリケーション間でリアルタイム通信を実現する必要があります。このセクションでは、WebSocket、Server-Sent Events (SSE)、ポーリングの3つの手法を比較し、各々の実装方法と接続管理について学習します。

---

## WebSocket vs SSE vs ポーリング

**WebSocket** は双方向リアルタイム通信に適した手法です。クライアント・サーバー間で永続的な接続を確立し、低遅延でのデータ交換が可能です。ただし、サーバーリソースを常時消費するため、スケーリング時の注意が必要です。

**Server-Sent Events (SSE)** はサーバー→クライアント の単方向リアルタイム通信です。HTTP上で動作し、自動再接続機能を備えています。WebSocketほど低遅延ではありませんが、実装がシンプルです。

**ポーリング** はクライアントが定期的にサーバーをチェックする手法です。リアルタイム性は低く、ネットワーク負荷が高くなりますが、実装が最もシンプルで、すべてのブラウザで動作します。

**選択基準:**
- リアルタイムチャット・通知 → WebSocket
- データストリーム配信 → SSE
- 定期的なステータス確認 → ポーリング

---

## コネクション確立と切断

**WebSocket接続の構築:**
```javascript
const ws = new WebSocket('wss://api.example.com/ws');

ws.addEventListener('open', () => {
  console.log('Connection established');
  ws.send(JSON.stringify({ type: 'SUBSCRIBE', channel: 'notifications' }));
});

ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
});

ws.addEventListener('close', () => {
  console.log('Connection closed');
});
```

**切断・再接続ハンドリング:**
```javascript
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function reconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Max reconnection attempts reached');
    return;
  }

  const delay = Math.pow(2, reconnectAttempts) * 1000;
  setTimeout(() => {
    reconnectAttempts++;
    connectWebSocket();
  }, delay);
}

ws.addEventListener('close', () => {
  reconnect();
});
```

**クリーンアップと接続管理:**
- 接続タイムアウト（例：30秒無通信でアラート）
- ページ離脱時の接続クローズ
- バックグラウンド時の一時停止
- ネットワーク復旧時の自動再接続

---

## SSEの活用

SSEはHTTP上で動作し、`EventSource` APIで簡潔に実装できます。特にサーバーが定期的にデータを配信する場合に有効です。自動再接続機能があるため、切断・再接続の手動管理が不要です。

---

## 実装のベストプラクティス

- **ハートビート送信：** 定期的なkeep-alive送信でプロキシ・ファイアウォール対策
- **メッセージ型の統一：** リクエスト・レスポンスに統一されたスキーマを使用
- **エラー可視化：** 接続状態をUIで明確に表示
- **メモリリーク対策：** アンマウント時にリスナーを確実に削除
