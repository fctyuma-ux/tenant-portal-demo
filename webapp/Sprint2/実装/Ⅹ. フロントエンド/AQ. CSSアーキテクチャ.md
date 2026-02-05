# AQ. CSSアーキテクチャ

## 概要

CSSアーキテクチャは、スケーラブルで保守性の高いスタイル設計の手法です。グローバル汚染を避け、コンポーネント単位で独立したスタイルを管理することで、大規模プロジェクトでの修正やリファクタリングのコストを削減します。

---

## 1. BEM（Block, Element, Modifier）

**概要:** クラス命名規則に基づいた設計手法

BEMは、以下の3層から構成されます：
- **Block:** 独立した再利用可能なコンポーネント
- **Element:** Blockの子要素（アンダースコア2つで表記）
- **Modifier:** 状態やバリエーション（ハイフン2つで表記）

```css
/* Block */
.button { ... }

/* Element */
.button__text { ... }
.button__icon { ... }

/* Modifier */
.button--primary { ... }
.button--disabled { ... }
.button__icon--large { ... }
```

**利点:**
- 命名が予測可能で一貫性を保ちやすい
- クラス名から構造が推測できる
- 単一責任の原則に従いやすい

---

## 2. OOCSS（Object Oriented CSS）

**概要:** 再利用可能なオブジェクトを基本単位とする設計

OOCSSでは、スタイルを「構造」と「スキン」に分離します：
- **構造:** 幅、高さ、マージンなど
- **スキン:** 色、背景、フォントなど

```css
/* 構造 - 再利用可能 */
.media {
  display: flex;
  gap: 16px;
}

/* スキン - 組み合わせ可能 */
.media--blue-bg {
  background-color: #007bff;
}

.media--dark-bg {
  background-color: #333;
}

/* 使用例 */
/* <div class="media media--blue-bg">...</div> */
```

---

## 3. CSS Modules

**概要:** スコープを自動的に生成し、グローバル汚染を防止

CSS Modulesはビルドツール（webpack、Vite）により、クラス名を一意の名前に変換します：

```css
/* styles.module.css */
.container {
  max-width: 1200px;
  margin: 0 auto;
}

.button {
  padding: 8px 16px;
  background-color: #007bff;
  border: none;
  border-radius: 4px;
  color: white;
}

.button:hover {
  background-color: #0056b3;
}
```

ReactでのCSS Modules導入：

```jsx
import styles from './Button.module.css';

export function Button({ children }) {
  return (
    <button className={styles.button}>
      {children}
    </button>
  );
}

// 出力：<button class="Button_button__a1b2c">...</button>
```

**メリット:**
- グローバル汚染なし
- 名前衝突の心配がない
- コンポーネントとスタイルが密結合しているため、削除時に自動で不要なスタイルも削除される

---

## 4. Tailwind CSS（ユーティリティファースト）

**概要:** あらかじめ定義されたユーティリティクラスを組み合わせる手法

従来のCSS設計と異なり、HTMLにクラスを直接記述してスタイリングします：

```html
<button class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">
  Click me
</button>
```

**設定ファイルのカスタマイズ:**

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#007bff',
      },
      spacing: {
        '128': '32rem',
      },
    },
  },
};
```

**Tailwindの効果:**
- JIT（Just-in-Time）モードで未使用クラスを自動削除
- 疑似クラス対応：`hover:`, `focus:`, `dark:` など
- レスポンシブプレフィックス：`md:`, `lg:`, `xl:` など

---

## 5. CSS-in-JS

**概要:** JavaScriptでスタイルを動的に生成・管理

Styled Componentsなどのライブラリを使用します：

```jsx
import styled from 'styled-components';

const StyledButton = styled.button`
  padding: 8px 16px;
  background-color: ${props => props.primary ? '#007bff' : '#6c757d'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

export function Button({ primary, disabled, children }) {
  return <StyledButton primary={primary} disabled={disabled}>{children}</StyledButton>;
}
```

**Zero-runtime CSS-in-JS（Vanilla Extract等）:**
- ビルド時にCSSを生成
- ランタイムオーバーヘッドなし

---

## 6. レスポンシブ設計

**モバイルファースト:** まずモバイル（小さい画面）のスタイルを定義し、ブレークポイントで徐々に拡張

```css
.card {
  padding: 16px;
  font-size: 14px;
}

/* タブレット以上 */
@media (min-width: 768px) {
  .card {
    padding: 24px;
    font-size: 16px;
  }
}

/* デスクトップ以上 */
@media (min-width: 1024px) {
  .card {
    padding: 32px;
    column-count: 2;
  }
}
```

**相対単位の活用:**
- `rem`：ルート要素（html）のフォントサイズを基準
- `em`：親要素のフォントサイズを基準
- `%`：親要素のサイズを基準

画像のレスポンシブ対応：

```html
<picture>
  <source media="(min-width: 1024px)" srcset="large.jpg">
  <source media="(min-width: 768px)" srcset="medium.jpg">
  <img src="small.jpg" alt="Responsive image">
</picture>
```

---

## 7. ツール活用

**Sassu等プリプロセッサ:**
- 変数、ネスト、ミックスイン
- 本体のアーキテクチャはBEM/OOCSSの上で実装

**PostCSS:**
- ベンダープレフィックスの自動付加
- 最新CSS文法から従来のブラウザ対応への変換
