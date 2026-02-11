'use client';

import { useState } from 'react';
import { togglePublishStatus, deleteDocument } from './actions';
import type { Document } from '@/lib/types/database';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: {
    label: '待機中',
    className: 'bg-gray-100 text-gray-600',
  },
  processing: {
    label: '解析中',
    className: 'bg-yellow-100 text-yellow-700',
  },
  completed: {
    label: '解析完了',
    className: 'bg-green-100 text-green-700',
  },
  error: {
    label: 'エラー',
    className: 'bg-red-100 text-red-700',
  },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function PublishToggle({ document }: { document: Document }) {
  const [loading, setLoading] = useState(false);
  const isPublished = document.publish_status === 'published';
  const isReady = document.analysis_status === 'completed';

  async function handleToggle() {
    if (!isReady) return;
    setLoading(true);
    const newStatus = isPublished ? 'unpublished' : 'published';
    await togglePublishStatus(document.id, newStatus);
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading || !isReady}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isPublished ? 'bg-blue-600' : 'bg-gray-300'
      } ${!isReady || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={
        !isReady
          ? '解析完了後に公開できます'
          : isPublished
            ? 'クリックで非公開にする'
            : 'クリックで公開する'
      }
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isPublished ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function DeleteButton({ documentId }: { documentId: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await deleteDocument(documentId);
    setDeleting(false);
    setShowConfirm(false);
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">削除しますか？</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? '...' : 'はい'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
        >
          いいえ
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="text-sm text-red-500 hover:text-red-700"
    >
      削除
    </button>
  );
}

export function DocumentTable({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <p className="text-gray-500">ドキュメントがまだ登録されていません。</p>
        <p className="text-sm text-gray-400 mt-1">上のエリアからPDFをアップロードしてください。</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              ファイル名
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              登録日
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              ページ数
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              解析状態
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              公開
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {documents.map((doc) => {
            const status = STATUS_LABELS[doc.analysis_status] ?? STATUS_LABELS.pending;
            return (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5 text-red-500 shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M4 18h12a2 2 0 002-2V6.414A2 2 0 0017.414 5L14 1.586A2 2 0 0012.586 1H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-900 truncate max-w-xs">{doc.file_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(doc.created_at)}</td>
                <td className="px-4 py-3 text-center text-sm text-gray-500">
                  {doc.page_count > 0 ? doc.page_count : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full ${status.className}`}
                  >
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <PublishToggle document={doc} />
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteButton documentId={doc.id} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
