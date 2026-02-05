# AP. Web標準技術

## 概要

Web ブラウザのレンダリング最適化を理解することで、高速で応答性の高い Web アプリケーションを構築できます。標準化団体の役割、クリティカルレンダリングパス（CRP）、リフロー・リペイント の仕組みを把握し、パフォーマンスボトルネックを特定・改善します。

---

## 1. 標準化団体と役割

**W3C（World Wide Web Consortium）：** HTML、CSS、Webコンポーネント標準化。

**WHATWG（Web Hypertext Application Technology Working Group）：** HTML リビングスタンダード管理。ブラウザベンダー中心。

**TC39：** JavaScript（ECMAScript）標準化。毎年メジャーリリース。

**公開プロセス：** 提案 → ドラフト → 候補 → 勧告。段階的に実装され、ブラウザ互換性向上。

---

## 2. クリティカルレンダリングパス（CRP）

**5段階のプロセス：**

1. **DOM 構築：** HTML パースで DOM ツリー
2. **CSSOM 構築：** CSS パースで CSSOM ツリー
3. **レイアウトツリー構築：** DOM + CSSOM の統合
4. **ペイント：** ピクセルを描画
5. **コンポジット：** レイヤーを合成

**ブロッキング要因：**
- CSS は CSSOM 完成まで JS 実行遅延
- Inline スクリプトは DOM パース停止
- リソース（画像、フォント）の読み込み遅延

**最適化：**
- CSS は `<head>` で早期読み込み
- JS は `<body>` 末尾か `defer` / `async` 属性使用
- 画像は Lazy Loading

```html
<!-- 推奨：CSSは<head>で読み込み -->
<link rel="stylesheet" href="style.css">

<!-- 推奨：JSは<body>末尾 or defer -->
<script src="app.js" defer></script>
```

---

## 3. リフローとリペイント

**リフロー（Layout Recalculation）：** DOM/CSSOM 変更時、レイアウト再計算。重い処理（ブラウザ全体の再計算）。

**例：** `element.offsetHeight` アクセス、`width` 変更

**リペイント（Repaint）：** 視覚的変更（色、背景）で再描画。リフローより軽い。

**例：** `background-color` 変更

**最適化：**
- リフロー誘発処理を避ける（バッチ処理）
- `requestAnimationFrame` で最適なタイミング実行

```javascript
// 非効率：リフロー 5回
elem.style.left = '10px';   // リフロー 1
console.log(elem.offsetLeft); // リフロー 2
elem.style.top = '20px';      // リフロー 3
console.log(elem.offsetTop);  // リフロー 4
elem.style.width = '100px';   // リフロー 5

// 最適化：リフロー 1回
elem.style.left = '10px';
elem.style.top = '20px';
elem.style.width = '100px';
// 最後にまとめて読み取り
console.log(elem.offsetLeft, elem.offsetTop);
```

---

## 4. レンダリングブロックリソース

**CSS は常にレンダリングブロック：** CSSOM 構築まで JS 実行・ページ表示が停止。

**JS はレンダリングブロック：** インライン・外部スクリプト共に、パースから実行まで停止。

**画像はレンダリングブロック非該当：** 非同期読み込み、ページ表示に影響なし。

---

## 5. ブロッキング排除戦略

**CSS の最適化：**
- 不要な CSS 削除（PurgeCSS / Tailwind CSS）
- Media Query で条件付きロード
- Critical CSS をインライン化

```html
<!-- Critical CSS をインライン化 -->
<style>
  /* Above the fold に必要な CSS のみ */
  body { margin: 0; font-family: sans-serif; }
  .header { background: blue; }
</style>

<!-- 非クリティカル CSS は defer -->
<link rel="stylesheet" href="non-critical.css" media="print">
```

**JS の最適化：**
- `async` / `defer` 属性
- コード分割（Webpack / Next.js）
- バンドル最適化（Tree-shaking）

---

## 要件カバレッジ

本セクションは以下のitemsをカバーしています：標準化団体と役割、クリティカルレンダリングパス、リフローとリペイント、レンダリングブロックリソース、レンダリングブロックの排除
