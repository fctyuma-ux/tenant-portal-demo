'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Announcement {
  id: string;
  title: string;
  body: string;
  published_at: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  ゴミ出し: '🗑️',
  空調: '❄️',
  駐車場: '🅿️',
  入退館: '🚪',
  防災: '🔥',
  申請手続き: '📝',
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
  });
}

export function HomeClient({
  userName,
  propertyName,
  categories,
  announcements,
}: {
  userName: string;
  propertyName: string;
  categories: string[];
  announcements: Announcement[];
}) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push('/chat');
    }
  }

  function handleCategoryClick() {
    router.push('/chat');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-blue-600 text-white px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">テナント入居者ポータル</h1>
              <p className="text-blue-200 text-sm">{propertyName}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-100">{userName}</span>
              <form action="/api/auth/signout" method="post">
                <button type="submit" className="text-sm text-blue-200 hover:text-white">
                  ログアウト
                </button>
              </form>
            </div>
          </div>

          {/* 質問入力バー */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ビルの設備やルールについて質問..."
              className="w-full rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              質問する
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6">
        {/* カテゴリカード */}
        {categories.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">カテゴリから探す</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={handleCategoryClick}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <span className="text-2xl block mb-1">{CATEGORY_ICONS[cat] ?? '📋'}</span>
                  <span className="text-sm font-medium text-gray-700">{cat}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* お知らせ */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">お知らせ</h2>
          {announcements.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <p className="text-gray-500 text-sm">お知らせはありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">{formatDate(a.published_at)}</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">{a.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
