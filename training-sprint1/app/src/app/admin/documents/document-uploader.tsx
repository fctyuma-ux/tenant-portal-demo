'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { uploadDocument } from './actions';

type UploadState = 'idle' | 'uploading' | 'analyzing';

export function DocumentUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<UploadState>('idle');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleUpload = useCallback(
    async (file: File) => {
      setState('uploading');
      setMessage(null);

      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadDocument(formData);

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        setState('idle');
        return;
      }

      // アップロード成功 → 自動解析開始
      if (result.documentId) {
        setState('analyzing');
        setMessage({
          type: 'success',
          text: `${file.name} をアップロードしました。AI解析を実行中...`,
        });

        try {
          const analyzeRes = await fetch(`/api/admin/documents/${result.documentId}/analyze`, {
            method: 'POST',
          });

          if (analyzeRes.ok) {
            setMessage({
              type: 'success',
              text: `${file.name} の解析が完了しました`,
            });
          } else {
            const body = await analyzeRes.json();
            setMessage({
              type: 'error',
              text: `解析エラー: ${body.error?.message ?? '不明なエラー'}`,
            });
          }
        } catch {
          setMessage({
            type: 'error',
            text: '解析リクエストに失敗しました',
          });
        }

        router.refresh();
      }

      setState('idle');
    },
    [router]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      e.target.value = '';
    },
    [handleUpload]
  );

  const busy = state !== 'idle';

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !busy && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        } ${busy ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        {state === 'uploading' && <p className="text-sm text-gray-500">アップロード中...</p>}
        {state === 'analyzing' && (
          <div>
            <p className="text-sm text-blue-600 font-medium">AI解析中...</p>
            <div className="mt-2 mx-auto w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}
        {state === 'idle' && (
          <>
            <p className="text-sm text-gray-600 font-medium">PDFファイルをドラッグ＆ドロップ</p>
            <p className="text-xs text-gray-400 mt-1">またはクリックしてファイルを選択</p>
          </>
        )}
      </div>

      {message && (
        <div
          className={`mt-3 p-3 text-sm rounded-md ${
            message.type === 'success'
              ? 'text-green-700 bg-green-50 border border-green-200'
              : 'text-red-700 bg-red-50 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
