'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Source {
  document_name: string;
  page_number: number;
  page_image_url: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  feedback?: 'positive' | 'negative' | null;
  sources?: Source[];
}

function FeedbackButtons({
  messageId,
  initialFeedback,
}: {
  messageId: string;
  initialFeedback: 'positive' | 'negative' | null;
}) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [sending, setSending] = useState(false);

  async function handleFeedback(value: 'positive' | 'negative') {
    setSending(true);
    const res = await fetch(`/api/messages/${messageId}/feedback`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: value }),
    });
    if (res.ok) {
      setFeedback(value);
    }
    setSending(false);
  }

  if (feedback) {
    return (
      <span className="text-xs text-gray-400">
        {feedback === 'positive' ? '役に立った' : '役に立たなかった'}
      </span>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleFeedback('positive')}
        disabled={sending}
        className="text-xs text-gray-400 hover:text-green-600 disabled:opacity-50"
      >
        👍 役に立った
      </button>
      <button
        onClick={() => handleFeedback('negative')}
        disabled={sending}
        className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
      >
        👎 役に立たなかった
      </button>
    </div>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <p className="text-xs text-gray-500 mb-2 font-medium">参考元:</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((s, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
          >
            <svg className="h-3 w-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 18h12a2 2 0 002-2V6.414A2 2 0 0017.414 5L14 1.586A2 2 0 0012.586 1H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
            </svg>
            {s.document_name} p.{s.page_number}
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-white text-gray-800 shadow-sm border border-gray-200 rounded-bl-md'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {!isUser && message.sources && <SourceList sources={message.sources} />}

        {!isUser && (
          <div className="mt-2">
            <FeedbackButtons messageId={message.id} initialFeedback={message.feedback ?? null} />
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white text-gray-800 shadow-sm border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          <span
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

export function ChatClient({ userName, propertyName }: { userName: string; propertyName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId;

    const res = await fetch('/api/conversations', { method: 'POST' });
    if (!res.ok) {
      throw new Error('会話の作成に失敗しました');
    }
    const data = await res.json();
    setConversationId(data.id);
    return data.id;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    // ユーザーメッセージを即座に表示
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const convId = await ensureConversation();

      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });

      if (res.ok) {
        const data = await res.json();

        // temp メッセージを正式なものに差し替え
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          {
            id: data.user_message.id,
            role: 'user',
            content: data.user_message.content,
          },
          {
            id: data.assistant_message.id,
            role: 'assistant',
            content: data.assistant_message.content,
            feedback: data.assistant_message.feedback,
            sources: data.assistant_message.sources,
          },
        ]);
      } else {
        let errorMessage = '回答の生成に失敗しました';
        try {
          const errData = await res.json();
          errorMessage = errData.error?.message ?? errorMessage;
        } catch {
          // 非JSONレスポンスの場合はデフォルトメッセージを使用
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `エラー: ${errorMessage}`,
          },
        ]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error && err.message !== 'Failed to fetch'
          ? err.message
          : '通信エラーが発生しました。再度お試しください。';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errorMessage,
        },
      ]);
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">テナント入居者ポータル</h1>
          <p className="text-sm text-gray-500">{propertyName}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{userName}</span>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      {/* チャットエリア */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <p className="text-lg font-medium text-gray-600 mb-2">
                ビルの設備やルールについて質問してください
              </p>
              <p className="text-sm text-gray-400">マニュアルの内容をもとにAIが回答します</p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {sending && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 入力バー */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="質問を入力..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
