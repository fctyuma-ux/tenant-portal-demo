# F. プログラミングパラダイム

## 概要

プログラミングパラダイムは問題解決の設計思想です。命令型、関数型、オブジェクト指向など各パラダイムは異なる利点を持ち、選択は保守性と効率性を左右します。このセクションではストリーム（Observable/Stream）と購読パターンに焦点を当てます。

---

## 1. ストリーム（Observable/Stream）とは

**ストリーム:** 時系列で発生する値の流れ

- 配列：値が確定している [1, 2, 3]
- ストリーム：値が時間軸で到着 1 → 2 → 3

マウスクリック、API応答などイベント駆動の処理に適しています。

```javascript
// ストリーム化：時間軸でイベントを流す
const clickStream = fromEvent(document, 'click');
```

---

## 2. 購読（Subscribe）パターン

**役割:** ストリームの値を受け取り、処理を実行

```javascript
clickStream.subscribe(
  (event) => console.log('クリック:', event),  // 次の値
  (error) => console.error('エラー', error),    // エラー
  () => console.log('完了')                      // 終了
);
```

---

## 3. Observable vs Promise

| 特徴 | Observable | Promise |
|---|---|---|
| 返す値数 | 複数 | 単一 |
| キャンセル | 可能（購読解除） | 不可 |
| 用途 | イベント、ストリーム | 非同期操作 |

---

## 4. RxJS の基本オペレータ

| オペレータ | 説明 |
|---|---|
| map | 値を変換 |
| filter | 条件で値を絞る |
| debounceTime | 指定時間待機後に発火 |
| takeUntil | 指定イベントで停止 |

```javascript
fromEvent(document, 'mousemove')
  .pipe(
    map(e => ({ x: e.clientX, y: e.clientY })),
    debounceTime(100),
    takeUntil(destroy$)
  )
  .subscribe(coords => console.log(coords));
```

---

## 5. メモリリーク対策：購読解除

ストリーム購読は必ず解除（特にコンポーネント破棄時）：

```javascript
// 明示的解除
const subscription = stream.subscribe(...);
subscription.unsubscribe();

// 自動解除：destroyで自動停止
stream.pipe(takeUntil(destroy$)).subscribe(...);
```

---

## 6. 実装時の注意点

- 購読は遅延実行（subscribe時点で開始）
- 複数購読で複数実行（共有したい場合は share()）
- バックプレッシャー対応（データ流入が速い場合のバッファリング）



