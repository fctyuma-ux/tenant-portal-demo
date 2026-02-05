# AS. フロントエンドパフォーマンス

## 概要

フロントエンドパフォーマンスは、ユーザーが感知する読み込み速度、操作感、ページの応答性を指します。初期ロード時間を短縮し、バンドルサイズを最小化することで、ユーザー体験（UX）が向上し、検索エンジン最適化（SEO）にも有利に働きます。

本セクションでは、Code Splitting によるバンドルの分割、Tree Shaking による不要なコード削除、Barrel File の落とし穴、および実装方法について説明します。

## Code Splitting (Lazy Loading)

Code Splitting は、アプリケーションバンドルを複数のチャンク（断片）に分割し、必要なタイミングで動的に読み込む技術です。初期ロード時には最小限のコードのみ送信し、ユーザーがページを操作する際に追加チャンクを読み込むことで、初期ロード時間を大幅に短縮できます。

React では `React.lazy()` と `Suspense` を用いて、ルートベースやコンポーネントベースの遅延ロードが実現できます。Webpack のような バンドラーは自動的に分割ポイントを認識し、チャンクを生成します。

## Tree Shaking

Tree Shaking は、使用されないコード（デッドコード）をバンドル時に自動的に削除する最適化技術です。ES6 modules の静的な構造を活用し、バンドラーがインポートされていないエクスポートを検出して除外します。

Tree Shaking を効果的にするには、**ESM（ES Modules）形式での記述が必須**です。CommonJS では動的なエクスポートが可能なため、バンドラーが確実に削除できるコードを判定しづらくなります。

## Barrel File の落とし穴

Barrel File（または Index Pattern）は、ディレクトリの `index.ts` で複数のモジュールを再エクスポートするパターンです。これにより、インポート時のパス記述が簡潔になる利点があります。

```typescript
// src/components/index.ts
export { Button } from './Button';
export { Card } from './Card';
export { Modal } from './Modal';
```

しかし、この方法は Tree Shaking を妨害します。Barrel File を通じてインポートすると、バンドラーはすべてのエクスポートが使用される可能性があると見なし、実際には使用されないモジュールも削除できなくなります。

**推奨**: 不要なモジュール再エクスポートを避け、明示的に必要なモジュールからのみインポートすることで、Tree Shaking の効果を最大化できます。

## Bundle Analyzer による分析

バンドルサイズを可視化し、最適化のボトルネックを特定することが重要です。Bundle Analyzer は、バンドルに含まれるモジュール群とその大きさをツリー構造で表示します。

`webpack-bundle-analyzer` や `esbuild` の `--metafile` を活用することで、バンドルの構成を詳細に分析できます。

## React.lazy によるコード分割実装例

```javascript
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
```

このパターンでは、ユーザーが `/dashboard` へナビゲートするまで、Dashboard コンポーネントのコードは読み込まれません。

## 最適化チェックリスト

- バンドルアナライザーでサイズを確認
- Barrel File を使用していないか確認
- Dynamic imports の活用
- 外部ライブラリの CDN 化検討
- Service Worker によるキャッシング戦略
- Gzip/Brotli 圧縮の有効化

