'use client';

import { useState } from 'react';
import { createFaq, updateFaq, deleteFaq } from './actions';
import type { FAQ } from '@/lib/types/database';

const CATEGORIES = ['ゴミ出し', '空調', '駐車場', '入退館', '防災', '申請手続き', 'その他'];

function FaqForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: { category: string; question: string; answer: string };
  onSubmit: (data: { category: string; question: string; answer: string }) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [question, setQuestion] = useState(initial?.question ?? '');
  const [answer, setAnswer] = useState(initial?.answer ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    await onSubmit({ category, question: question.trim(), answer: answer.trim() });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">質問</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">回答</label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={saving || !question.trim() || !answer.trim()}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function FaqRow({ faq, onEdit }: { faq: FAQ; onEdit: (faq: FAQ) => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await deleteFaq(faq.id);
    setDeleting(false);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 mb-2">
            {faq.category}
          </span>
          <p className="text-sm font-medium text-gray-900 mb-1">Q: {faq.question}</p>
          <p className="text-sm text-gray-600">A: {faq.answer}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => onEdit(faq)} className="text-sm text-blue-600 hover:text-blue-800">
            編集
          </button>
          {showConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-white bg-red-600 px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '...' : '削除'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FaqManager({ faqs: initialFaqs }: { faqs: FAQ[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = initialFaqs.filter((faq) => {
    if (filterCategory && faq.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q);
    }
    return true;
  });

  async function handleCreate(data: { category: string; question: string; answer: string }) {
    await createFaq(data);
    setShowForm(false);
  }

  async function handleUpdate(data: { category: string; question: string; answer: string }) {
    if (!editingFaq) return;
    await updateFaq(editingFaq.id, data);
    setEditingFaq(null);
  }

  return (
    <div>
      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
        >
          <option value="">全カテゴリ</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="キーワード検索..."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 flex-1 min-w-[200px]"
        />
        <button
          onClick={() => {
            setShowForm(true);
            setEditingFaq(null);
          }}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 shrink-0"
        >
          + FAQ追加
        </button>
      </div>

      {/* 新規作成 / 編集フォーム */}
      {(showForm || editingFaq) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-800 mb-3">
            {editingFaq ? 'FAQ編集' : '新規FAQ追加'}
          </h4>
          <FaqForm
            initial={
              editingFaq
                ? {
                    category: editingFaq.category,
                    question: editingFaq.question,
                    answer: editingFaq.answer,
                  }
                : undefined
            }
            onSubmit={editingFaq ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingFaq(null);
            }}
            submitLabel={editingFaq ? '更新' : '追加'}
          />
        </div>
      )}

      {/* FAQ一覧 */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">
              {initialFaqs.length === 0
                ? 'FAQがまだ登録されていません。'
                : '条件に一致するFAQがありません。'}
            </p>
          </div>
        ) : (
          filtered.map((faq) => <FaqRow key={faq.id} faq={faq} onEdit={setEditingFaq} />)
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        {filtered.length} / {initialFaqs.length} 件表示
      </p>
    </div>
  );
}
