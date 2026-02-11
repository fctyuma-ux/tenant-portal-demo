'use client';

import { useState } from 'react';

interface Source {
  document_name: string;
  page_number: number;
  page_image_url: string | null;
  publish_status?: string;
}

interface PreviewResult {
  content: string;
  sources: Source[];
}

export function TestPreview() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = question.trim();
    if (!text || loading) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/admin/documents/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const data = await res.json();
        setError(data.error?.message ?? 'プレビューの生成に失敗しました');
      }
    } catch {
      setError('通信エラーが発生しました');
    }

    setLoading(false);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">テストプレビュー</h3>
      <p className="text-sm text-gray-500 mb-4">未公開ドキュメントを含めてAI回答をテストできます</p>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="テスト質問を入力..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? '生成中...' : 'テスト送信'}
        </button>
      </form>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              AI回答
            </span>
          </div>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{result.content}</p>

          {result.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">参考元:</p>
              <div className="flex flex-wrap gap-2">
                {result.sources.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                  >
                    <svg className="h-3 w-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 18h12a2 2 0 002-2V6.414A2 2 0 0017.414 5L14 1.586A2 2 0 0012.586 1H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
                    </svg>
                    {s.document_name} p.{s.page_number}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
