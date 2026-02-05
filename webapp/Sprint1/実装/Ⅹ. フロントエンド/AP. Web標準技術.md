# AP. Web標準技術

## 概要

ブラウザで動作するアプリケーションの基盤となるHTML・CSS・JavaScriptの3本柱、DOM操作、イベント処理、ブラウザAPIの理解が必須です。

---

## HTMLとセマンティクス

HTMLは単なるマークアップではなく、**文書の意味構造**を伝えます。セマンティックなHTML（`<header>`、`<nav>`、`<main>`、`<article>`、`<footer>`など）により、スクリーンリーダーや検索エンジンが正しく内容を理解できます。ボタンとリンクを使い分けるのが重要：アクション実行は`<button>`、ページ遷移は`<a>`を使用。`<div onclick>`のような方法は、キーボード操作やアクセシビリティを損ないます。

---

## CSSの基礎概念

### ボックスモデルと box-sizing

すべての要素は「margin→border→padding→content」からなる箱として扱われます。デフォルトでは`width`はcontentのみを含みますが、**`box-sizing: border-box`を使うと、`width`にpadding/borderが含まれるため、レイアウト計算が簡単**になります。

```css
* {
  box-sizing: border-box;  /* すべての要素に適用 */
}
```

### GPUアクセラレーション

アニメーション最適化には、**GPU活用プロパティ（`transform`、`opacity`）を選ぶ**ことが重要。`left`や`top`の変更はレイアウト再計算を起こしパフォーマンスが低下します。

```css
/* 良い例：transform でGPU処理 */
.move {
  animation: slide 1s;
}
@keyframes slide {
  to { transform: translateX(100px); }
}
```

---

## DOM操作

`document.querySelector()`で単一要素、`querySelectorAll()`で複数要素を取得。要素は`createElement()`で作成し、`appendChild()`でDOMに追加。

---

## イベント処理

イベントは「キャプチャリング→ターゲット→バブリング」の順で伝播。多くの子要素にイベント設定する場合は、**親要素で一括処理するイベントデリゲーション**が効率的：

```javascript
document.querySelector('.list').addEventListener('click', (e) => {
  if (e.target.classList.contains('item')) {
    handleClick(e);
  }
});
```

---

## ブラウザ互換性とトランスパイル

新しいAPIやCSSプロパティを使う前に、[Can I Use](https://caniuse.com/)でサポート状況を確認。古いブラウザ対応が必要な場合は、**Babel（JavaScript構文）**と**Polyfill（新API）**で対応。

---

## ECMAScriptの進化

JavaScriptの仕様はTC39のプロセスで進化：Stage 0（アイデア）→ Stage 1（提案）→ Stage 2（ドラフト）→ Stage 3（実装開始可）→ Stage 4（正式採用）。Stage 3以降は最新ブラウザで先行実装されることが多い。

---

## 参考資源

公式情報源：[MDN Web Docs](https://developer.mozilla.org/)（HTML/CSS/JSリファレンス）、[W3C](https://www.w3.org/)（Web標準仕様書）、[WHATWG](https://whatwg.org/)（HTML Living Standard）、[TC39](https://tc39.es/)（ECMAScript提案状況）。

---

## 重要なポイント

1. セマンティクスを意識したHTML
2. `box-sizing: border-box`でレイアウト簡潔化
3. `transform`/`opacity`でアニメーション最適化
4. イベントデリゲーション活用
5. 互換性を事前チェック
