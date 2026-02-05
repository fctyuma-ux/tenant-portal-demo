# AT. モバイル・クロスプラットフォーム

## 概要

モバイルとデスクトップのUIやインタラクションは大きく異なります。タッチ操作、画面サイズ、ネットワーク状況、入力方式に対応することで、すべてのプラットフォームで一貫した使いやすさを実現します。

---

## 1. タッチターゲットサイズ

**推奨サイズ:** 最小44×44ピクセル（iOSのHuman Interface Guidelines推奨）

ボタンやリンクが小さすぎると、ユーザーが誤クリックしやすくなります：

```html
<!-- 悪い例：小さすぎる -->
<button style="width: 30px; height: 30px;">×</button>

<!-- 良い例：44×44px以上 -->
<button style="width: 44px; height: 44px;">×</button>

<!-- パディングで対応 -->
<button style="padding: 12px 16px;">削除</button>
```

**間隔:** ボタン間は最低8ピクセル以上の余白を確保

---

## 2. セーフエリア（Safe Area）

iPhoneのノッチやホームインジケーターが邪魔にならないよう、コンテンツを配置します：

```css
/* CSS Safe Area による対応 */
body {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

```jsx
// Reactでの実装例
<div style={{
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
}}>
  コンテンツ
</div>
```

---

## 3. ホバー状態の扱い

デスクトップではホバー状態が存在しますが、タッチデバイスには存在しません：

```css
/* 古い方法（避ける） */
button:hover {
  background-color: blue;  /* タッチ環境で反応してしまう */
}

/* 推奨：メディアクエリで分別 */
@media (hover: hover) and (pointer: fine) {
  /* マウス対応デバイス */
  button:hover {
    background-color: blue;
  }
}

@media (hover: none) and (pointer: coarse) {
  /* タッチデバイス */
  button:active {
    background-color: blue;
  }
}
```

---

## 4. ボトムナビゲーション

モバイルアプリはボトムナビゲーションが標準です：

```jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  const items = [
    { href: '/', label: 'ホーム', icon: '🏠' },
    { href: '/search', label: '検索', icon: '🔍' },
    { href: '/profile', label: 'プロフィール', icon: '👤' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-around',
      paddingBottom: 'env(safe-area-inset-bottom)',
      borderTop: '1px solid #eee',
      backgroundColor: 'white',
    }}>
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            flex: 1,
            padding: '8px',
            textAlign: 'center',
            opacity: pathname === item.href ? 1 : 0.6,
          }}
        >
          {item.icon} {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

---

## 5. スワイプ操作

タッチイベントを検出してスワイプを実装します：

```jsx
'use client';

import { useState, useRef } from 'react';

export function SwipeCarousel() {
  const [current, setCurrent] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);

  const slides = ['スライド1', 'スライド2', 'スライド3'];

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = startX.current - endX;
    const diffY = startY.current - endY;

    // 水平スワイプが垂直スワイプより大きい場合のみ反応
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // 右スワイプ：次のスライド
        setCurrent((current + 1) % slides.length);
      } else {
        // 左スワイプ：前のスライド
        setCurrent((current - 1 + slides.length) % slides.length);
      }
    }
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {slides[current]}
    </div>
  );
}
```

---

## 6. 仮想キーボード対策

モバイルでソフトウェアキーボードが表示されると、コンテンツが隠れます：

```jsx
'use client';

import { useEffect, useRef } from 'react';

export function InputWithKeyboardAdjust() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => {
      // キーボード表示時に入力欄を見える位置にスクロール
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    };

    input.addEventListener('focus', handleFocus);
    return () => input.removeEventListener('focus', handleFocus);
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="入力してください"
      style={{
        width: '100%',
        padding: '12px',
        marginBottom: 'env(safe-area-inset-bottom)',
      }}
    />
  );
}
```

---

## 7. レスポンシブメタタグ

```html
<head>
  <!-- viewport 設定：ズーム・幅の固定 -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

  <!-- ダークモード対応 -->
  <meta name="color-scheme" content="light dark">

  <!-- ステータスバーの色（モバイルSafari） -->
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

  <!-- ホーム画面アイコン -->
  <link rel="apple-touch-icon" href="/icon-180.png">
</head>
```

---

## 8. OS差分への対応

```jsx
'use client';

export function OSAwareComponent() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  if (isIOS) {
    return <div>iOS用のUIを表示</div>;
  }

  if (isAndroid) {
    return <div>Android用のUIを表示</div>;
  }

  return <div>デスクトップ用のUIを表示</div>;
}
```
