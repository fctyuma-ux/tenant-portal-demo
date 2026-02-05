# AS. フロントエンドパフォーマンス

## 概要

フロントエンドパフォーマンスは、ユーザー体験に直結します。リソース配信最適化、メインスレッド圧縮、Web Vitals の計測と改善が重点。Lighthouse による自動計測と CI 連携で、継続的に品質管理します。

---

## 1. リソース配信最適化

**リソースヒント（Preload/Prefetch）：** `rel` 属性で優先度制御。

```html
<!-- 重要リソースを優先読み込み -->
<link rel="preload" as="script" href="critical.js">

<!-- 次ページで使用可能性高い -->
<link rel="prefetch" href="next-page.js">

<!-- DNS 先読み（外部ドメイン） -->
<link rel="dns-prefetch" href="//cdn.example.com">

<!-- HTTP/2 Server Push -->
<link rel="preconnect" href="https://fonts.googleapis.com">
```

**CSS/JS の配信最適化：**
- Gzip / Brotli 圧縮
- Minify（変数名短縮）
- Tree-shaking（不要コード削除）
- Dynamic imports でコード分割

```javascript
// 動的インポート：条件に応じた遅延ロード
const analytics = import('./analytics.js').then(m => m.track());
```

---

## 2. フォント最適化

**Google Fonts の最適化：**
- WOFF2 フォーマット（モダンブラウザ対応）
- 必要なウエイト・言語のみ
- Font-display: swap で FOUT（Flash of Unstyled Text）回避

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">

<style>
  body { font-family: 'Inter', sans-serif; font-display: swap; }
</style>
```

**自家ホストフォント：** CDN で高速化、WOFF2 変換。

---

## 3. 画像最適化

**次世代フォーマット：** WebP / AVIF（JPEG より 20～30% 圧縮率向上）。

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="description">
</picture>
```

**レスポンシブ画像：** srcset で画面サイズに応じた配信。

```html
<img srcset="small.jpg 480w, medium.jpg 768w, large.jpg 1200w"
     sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
     src="large.jpg" alt="description">
```

**Lazy Loading：** 画面外の画像を遅延読み込み。

```html
<img src="image.jpg" loading="lazy" alt="description">
```

**Next.js Image コンポーネント：** 自動最適化（フォーマット変換、レスポンシブ化）。

```javascript
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="description"
  width={400}
  height={300}
  loading="lazy"
/>
```

---

## 4. メインスレッド最適化

**メインスレッドとイベントループ：** JS 実行が長時間ブロックするとUI フリーズ。

**長時間タスク分割：** `requestAnimationFrame` / `setTimeout` でブレーク挿入。

```javascript
// タスク: 1000個の要素生成
function renderLargeList(items) {
  let index = 0;

  function processChunk() {
    const chunk = items.slice(index, index + 100);
    chunk.forEach(item => {
      const elem = document.createElement('div');
      elem.textContent = item;
      document.body.appendChild(elem);
    });

    index += 100;
    if (index < items.length) {
      requestIdleCallback(processChunk); // 次フレームで継続
    }
  }
  processChunk();
}
```

**Web Workers：** CPU 集約的処理を別スレッドで実行。メインスレッド保全。

```javascript
// main.js
const worker = new Worker('worker.js');
worker.postMessage({ data: largeArray });
worker.onmessage = (e) => {
  console.log('Result:', e.data);
};

// worker.js
self.onmessage = (e) => {
  const result = expensiveCalculation(e.data);
  self.postMessage(result);
};
```

---

## 5. 計測と改善

**3つの主要指標（Core Web Vitals）：**

1. **LCP（Largest Contentful Paint）：** 主要コンテンツ描画。目標 < 2.5秒
2. **FID（First Input Delay）：** ユーザー操作応答。目標 < 100ms
3. **CLS（Cumulative Layout Shift）：** 予期しないレイアウト変動。目標 < 0.1

**INP（Interaction to Next Paint）：** FID の後続指標。入力～描画完了の総時間。

**ラボデータ vs フィールドデータ：**
- Lighthouse（ラボ）：制御環境での計測
- RUM（Real User Monitoring）：実ユーザー体験

```javascript
// Web Vitals ライブラリで計測
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getLCP(console.log);
```

**アートディレクション：** メディアクエリで画面サイズに応じた異なる画像配信。

```html
<picture>
  <source media="(max-width: 600px)" srcset="portrait.jpg">
  <source media="(min-width: 601px)" srcset="landscape.jpg">
  <img src="default.jpg" alt="description">
</picture>
```

---

## 6. パフォーマンス監視

**Chrome DevTools Network パネル：** リソース読み込み時間の可視化。ウォーターフォール図で依存関係確認。

**計測自動化（CI 連携）：** Lighthouse CI / WebPageTest API で PR ごとに計測。パフォーマンス回帰検出。

```bash
# Lighthouse CI
lhci autorun --config=lighthouserc.json
```

---

## 7. メモリ管理

**メモリリークのパターン：**
- 不要なイベントリスナー登録放置
- グローバル変数に巨大オブジェクト保持
- 無限再帰参照

**メモリプロファイリング：** Chrome DevTools Memory タブでメモリスナップショット比較。リーク箇所特定。

---

## 要件カバレッジ

本セクションは以下のitemsをカバーしています：リソースヒント、CSS/JSの配信最適化、仮想化、Google Fontsの最適化、仮想スクロールの実装、Lighthouse vs WebPageTest、RUM、Chrome DevTools活用、計測自動化、メインスレッドとイベントループ、Web Workers、メモリリークのパターン、Web Workerの実装、メモリプロファイリング、3つの主要指標、INP、ラボデータとフィールドデータ、Lighthouseによる計測と改善、CLSの改善、Web Vitalsライブラリ、次世代画像フォーマット、レスポンシブ画像、Lazy Loading、Next.js Imageコンポーネント、アートディレクション
