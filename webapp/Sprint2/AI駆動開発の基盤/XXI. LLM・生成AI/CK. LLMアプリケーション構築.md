# CK. LLMアプリケーション構築

## 概要

LLMを組み込んだプロダクトの開発には、単なるAPIの呼び出しを超えた設計が必要です。このセクションではドキュメント処理、構造化出力、会話履歴管理、ストリーミングレスポンス、マルチモーダル対応、エラーハンドリング、そしてUIコンポーネント実装まで、実用的なアプリケーション構築のパターンと実装テクニックを網羅します。

---

## 1. ドキュメント処理

**テキスト抽出の手法:**
- PDFテキスト抽出：pdfplumber、PyPDF2
- OCR処理：Tesseract、AWS Textract（スキャンPDF向け）
- Word/Excel：python-docx、openpyxl

**長文ドキュメントのチャンキング:**
- 固定長チャンク：最大N文字で分割（単純だが文脈切断リスク）
- スライディングウィンドウ：重複を持たせて文脈保持
- セマンティック分割：段落・見出し単位で分割

**実装例:**

```python
def chunk_text(text, chunk_size=1000, overlap=200):
    """オーバーラップ付きテキストチャンキング"""
    chunks = []
    for i in range(0, len(text), chunk_size - overlap):
        chunk = text[i:i + chunk_size]
        chunks.append(chunk)
    return chunks

# ドキュメント処理フロー
text = extract_pdf_text("document.pdf")
chunks = chunk_text(text)
for i, chunk in enumerate(chunks):
    # 各チャンクをLLMで処理
    summary = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=500,
        messages=[{"role": "user", "content": f"要約してください:\n{chunk}"}]
    )
    print(f"チャンク{i}: {summary.content[0].text}")
```

---

## 2. Structured Output（構造化出力）

**メリット:**
- 解析が確実（JSONパースエラー減少）
- 型安全なアプリケーション統合
- AIの出力が予測可能に

**JSON Schemaの定義:**

```json
{
  "type": "object",
  "properties": {
    "title": {"type": "string"},
    "sentiment": {"enum": ["positive", "negative", "neutral"]},
    "keywords": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["title", "sentiment"]
}
```

**Anthropic Structured Outputの実装:**

```python
import anthropic
import json

client = anthropic.Anthropic()

# スキーマ定義
schema = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "sentiment": {"enum": ["positive", "negative", "neutral"]}
    },
    "required": ["title", "summary", "sentiment"]
}

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "この記事を分析してください: ..."}
    ],
    # Structured Output（Claude APIで対応する場合）
)

# 注：実装方法はAPI仕様により異なる
```

---

## 3. 会話履歴の管理

**データ構造:**
```python
conversation = [
    {"role": "user", "content": "こんにちは"},
    {"role": "assistant", "content": "こんにちは！何かお手伝いできることはありますか？"},
    {"role": "user", "content": "翻訳を手伝ってください"}
]
```

**インメモリ vs 永続化:**
- インメモリ：単一セッション、サーバー再起動で喪失
- データベース：永続的、セッション復帰可能、ただしコスト増加

**コンテキストウィンドウ超過時の対策:**
- 古いメッセージを削除（最新N件保持）
- 会話を要約して圧縮
- ウィンドウサイズの大きいモデルへの切り替え

**実装例:**

```python
class ConversationManager:
    def __init__(self, max_messages=20):
        self.messages = []
        self.max_messages = max_messages

    def add_user_message(self, content):
        self.messages.append({"role": "user", "content": content})
        self._trim_messages()

    def add_assistant_message(self, content):
        self.messages.append({"role": "assistant", "content": content})
        self._trim_messages()

    def _trim_messages(self):
        """古いメッセージを削除"""
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages:]

    def get_messages(self):
        return self.messages
```

---

## 4. ストリーミングレスポンス

**メリット:**
- ユーザーが最初の単語をすぐ見られる（UX向上）
- 長文生成時にタイムアウト回避

**Server-Sent Events（SSE）の仕組み:**
- サーバーがテキストチャンク単位でクライアントに送信
- クライアント側はイベントリスナーで受け取る

**Python実装例（FastAPI）:**

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import anthropic

app = FastAPI()

@app.post("/chat/stream")
async def chat_stream(user_message: str):
    client = anthropic.Anthropic()

    def generate():
        with client.messages.stream(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": user_message}]
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {text}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

**JavaScript側の受信:**

```javascript
const eventSource = new EventSource('/chat/stream?message=hello');
eventSource.onmessage = (e) => {
    const text = e.data.replace('data: ', '');
    document.getElementById('response').textContent += text;
};
```

---

## 5. マルチモーダル対応（Vision）

**画像入力形式:**
- Base64エンコード：小～中規模画像
- URL指定：外部ホスト画像（ただしアクセス制限注意）

**ユースケース:**
- OCR：スキャンドキュメント、手書きノート
- 図表解析：グラフ、表の読取り
- スクリーンショット処理：UI自動テスト、ユーザーサポート

**実装例:**

```python
import anthropic
import base64
from pathlib import Path

client = anthropic.Anthropic()

def analyze_image(image_path: str) -> str:
    """画像ファイルを分析"""
    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_data
                        }
                    },
                    {
                        "type": "text",
                        "text": "この画像について詳しく説明してください。"
                    }
                ]
            }
        ]
    )
    return message.content[0].text
```

---

## 6. エラーハンドリング

**主なエラータイプ:**
- Rate Limit（429）：リトライ、バックオフ
- Authentication（401）：キーの確認・更新
- Invalid Request（400）：入力形式チェック
- Server Error（500）：リトライ、フォールバック

**リトライ戦略：**

```python
import time
from anthropic import RateLimitError

def call_with_retry(prompt, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            return response
        except RateLimitError:
            wait_time = 2 ** attempt  # 指数バックオフ
            print(f"レート制限。{wait_time}秒待機...")
            time.sleep(wait_time)
        except Exception as e:
            print(f"エラー: {e}")
            raise
```

---

## 7. チャットUIの基本構成

**必須要素:**
- メッセージ表示：ユーザーメッセージ vs AIメッセージの区別
- スクロール管理：新規メッセージ時に自動スクロール
- 入力フォーム：Enterキー送信、複数行対応
- ローディング状態：送信中の視覚的フィードバック
- Markdown/コード強調表示

**React実装例:**

```jsx
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ChatUI() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // 新規メッセージで自動スクロール
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input })
            });
            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-container">
            <div className="messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                ))}
                {loading && <div className="loading">入力中...</div>}
                <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="メッセージを入力..."
                />
                <button onClick={handleSend} disabled={loading}>送信</button>
            </div>
        </div>
    );
}
```

---

## 8. Markdown レンダリングとコードハイライト

**ライブラリ:**
- React Markdown：React向け
- Marked：JavaScript通用
- Highlight.js/Prism：シンタックスハイライト

**設定例（React + Highlight.js）:**

```jsx
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MarkdownRenderer = ({ content }) => (
    <ReactMarkdown
        components={{
            code({ inline, className, children }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline ? (
                    <SyntaxHighlighter
                        style={dracula}
                        language={match?.[1] || 'text'}
                    >
                        {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                ) : (
                    <code>{children}</code>
                );
            }
        }}
    >
        {content}
    </ReactMarkdown>
);
```

---

## ポイント

- ドキュメント処理は抽出 → チャンキング → 処理のパイプライン設計
- Structured Output で JSONパース確実性向上
- 会話履歴はコンテキスト超過に備えた圧縮・削減戦略が必須
- ストリーミングで UX と タイムアウト回避を両立
- マルチモーダルは Base64 vs URL の使い分けが重要
- エラーハンドリングは指数バックオフ + フォールバック戦略
- チャット UI は Markdown レンダリングとコード強調表示で UX 向上
