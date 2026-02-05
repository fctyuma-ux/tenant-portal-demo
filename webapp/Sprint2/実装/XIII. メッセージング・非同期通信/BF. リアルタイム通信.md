# BF. リアルタイム通信

## 概要

リアルタイム通信は、サーバーとクライアント間で即座にデータを交換する仕組みです。HTTP ベースのストリーミング、WebSocket、ポーリングなどの手法を用いて、リアルタイム通知、ライブ更新、双方向通信を実現します。

---

## 1. HTTP ベースのストリーミング

HTTP を使用しながら、サーバーからクライアントへ継続的にデータを送信する手法。

**Server-Sent Events（SSE）:**
サーバーが一方的にクライアントにイベントを送信します。

```javascript
// サーバー側（Express）
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // 定期的にイベントを送信
  const interval = setInterval(() => {
    const data = { timestamp: new Date() };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 1000);

  req.on('close', () => clearInterval(interval));
});

// クライアント側
const eventSource = new EventSource('/events');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('受信:', data);
};
```

**メリット:**
- HTTP 標準機能
- 単方向で十分な用途に適している
- 自動再接続機能あり

**デメリット:**
- サーバー → クライアント のみ
- 高頻度な通信には向かない

---

## 2. 自動再接続

接続が切れた際の再接続ロジック。

**SSE の自動再接続:**
```javascript
const eventSource = new EventSource('/events');

eventSource.onerror = () => {
  if (eventSource.readyState === EventSource.CLOSED) {
    console.log('接続が閉じられました');
    eventSource.close();
  }
};
```

**WebSocket の自動再接続:**
```typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 初期遅延：1秒

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('接続成功');
      this.reconnectAttempts = 0;
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        console.log(`${delay}ms 後に再接続`);
        setTimeout(() => this.connect(url), delay);
        this.reconnectAttempts++;
      }
    };
  }
}
```

---

## 3. リアルタイム通知の実装

ユーザーアクション後、全クライアントに即座に通知する例。

**例：チャットアプリケーション**
```typescript
// サーバー側（WebSocket）
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const message = JSON.parse(data);

    // 全クライアントにメッセージをブロードキャスト
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify(message));
      }
    });
  });
});

// クライアント側
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  displayMessage(message); // チャットウィンドウに追加
};

function sendMessage(text) {
  ws.send(JSON.stringify({ type: 'message', text }));
}
```

---

## 4. ショートポーリング と ロングポーリング

HTTP ベースのポーリング手法。

**ショートポーリング（定期ポーリング）:**
定期的（例：2秒ごと）にサーバーに問い合わせ。

```javascript
setInterval(async () => {
  const response = await fetch('/api/messages');
  const messages = await response.json();
  displayMessages(messages);
}, 2000);
```

**欠点:**
- 更新がなくても頻繁にリクエスト（無駄が多い）
- リアルタイム性が低い（ポーリング間隔に依存）

**ロングポーリング（Comet）:**
サーバーが応答を遅延させ、更新があるまで接続を保持。

```javascript
// クライアント側
async function longPoll() {
  const response = await fetch('/api/messages', {
    timeout: 30000, // 30秒でタイムアウト
  });
  const messages = await response.json();
  displayMessages(messages);

  // すぐに次のリクエストを開始
  longPoll();
}

longPoll();

// サーバー側（Express）
app.get('/api/messages', (req, res) => {
  const checkForUpdate = setInterval(() => {
    const newMessages = getNewMessages(req.query.lastId);
    if (newMessages.length > 0) {
      clearInterval(checkForUpdate);
      res.json(newMessages);
    }
  }, 1000);

  // 30秒でタイムアウト
  setTimeout(() => {
    clearInterval(checkForUpdate);
    res.json([]);
  }, 30000);
});
```

**メリット:**
- HTTP 標準で動作
- 不要なリクエストが減る

**デメリット:**
- サーバー負荷が高い（接続保持）
- ネットワーク遅延が大きい

---

## 5. SWR / React Query でのポーリング

React での効率的なポーリング実装。

**SWR（Stale-While-Revalidate）:**
```typescript
import useSWR from 'swr';

function useMessages() {
  const { data, error } = useSWR('/api/messages', fetcher, {
    refreshInterval: 2000, // 2秒ごとに再取得
    dedupingInterval: 1000, // 1秒以内の重複リクエスト除外
  });

  return { messages: data, isLoading: !error && !data, error };
}

// コンポーネントで使用
function ChatApp() {
  const { messages, isLoading } = useMessages();
  return (
    <div>
      {messages?.map((msg) => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  );
}
```

**React Query：**
```typescript
import { useQuery } from '@tanstack/react-query';

function useMessages() {
  return useQuery({
    queryKey: ['messages'],
    queryFn: () => fetch('/api/messages').then((r) => r.json()),
    refetchInterval: 2000, // 2秒ごとに再取得
  });
}
```

---

## 6. 定期更新 UI の実装

ダッシュボード、リアルタイム統計の表示例。

```typescript
// ダッシュボードコンポーネント
function Dashboard() {
  const [stats, setStats] = useState(null);

  // マウント時にポーリング開始
  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch('/api/stats');
      setStats(await response.json());
    };

    fetchStats(); // 初回取得
    const interval = setInterval(fetchStats, 5000); // 5秒ごと

    return () => clearInterval(interval); // クリーンアップ
  }, []);

  if (!stats) return <div>読み込み中...</div>;

  return (
    <div>
      <h1>ダッシュボード</h1>
      <div>アクティブユーザー: {stats.activeUsers}</div>
      <div>今日の売上: {stats.dailyRevenue}</div>
      <div>最終更新: {new Date().toLocaleTimeString()}</div>
    </div>
  );
}
```

---

## 7. WebSocket の活用

より高度なリアルタイム通信（双方向）。

```typescript
// チャットサーバー（Socket.IO）
import { Server } from 'socket.io';

const io = new Server(httpServer);

io.on('connection', (socket) => {
  console.log('ユーザーが接続:', socket.id);

  // クライアントからのメッセージを受信
  socket.on('message', (data) => {
    console.log('メッセージ:', data);

    // 全クライアントにブロードキャスト
    io.emit('message', {
      userId: socket.id,
      text: data.text,
      timestamp: new Date(),
    });
  });

  socket.on('disconnect', () => {
    console.log('ユーザーが切断:', socket.id);
  });
});

// クライアント（Socket.IO）
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('サーバーに接続');
});

socket.on('message', (message) => {
  console.log('メッセージ受信:', message);
  displayMessage(message);
});

function sendMessage(text) {
  socket.emit('message', { text });
}
```

---

## 8. パフォーマンス最適化

**バッチ処理:**
複数の更新をまとめて送信。

```typescript
// 更新を 100ms まで遅延
const batchUpdates = (callback) => {
  let timeoutId = null;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), 100);
  };
};
```

**圧縮:**
大量のデータを送信する場合、JSON を圧縮。

**キャッシング:**
変更がないデータは再送信しない。

---

## 9. エラーハンドリング

```typescript
function ReliableWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8080');

    ws.current.onopen = () => setIsConnected(true);
    ws.current.onerror = (error) => {
      console.error('WebSocket エラー:', error);
      setIsConnected(false);
    };
    ws.current.onclose = () => setIsConnected(false);

    return () => ws.current?.close();
  }, []);

  return (
    <div>
      <status color={isConnected ? 'green' : 'red'}>
        {isConnected ? '接続中' : '未接続'}
      </status>
    </div>
  );
}
```

---

## 10. 手法の選定

| 手法 | リアルタイム性 | ブラウザ対応 | サーバー負荷 | 複雑度 |
|-----|--------------|-----------|----------|------|
| ショートポーリング | 低 | 最良 | 高 | 低 |
| ロングポーリング | 中 | 最良 | 中 | 中 |
| SSE | 中-高 | 良 | 低 | 低 |
| WebSocket | 高 | 良 | 低 | 高 |
