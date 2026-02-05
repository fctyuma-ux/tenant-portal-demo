# AR. UIフレームワーク

## 概要

UIフレームワーク（React、Vue、Angular等）の役割は、コンポーネント管理と状態管理を通じて、複雑な UI ロジックを保守性高く実装することです。レンダリング最適化は、パフォーマンス向上の要です。

---

## 1. レンダリングの最適化

**React における最適化：**

**1. 不必要な再レンダリング回避**

仮想 DOM の差分検出が重い場合、`React.memo` で同じ Props なら再レンダリング無視。

```javascript
const UserCard = React.memo(({ userId, userName }) => {
  console.log('render UserCard:', userId);
  return <div>{userName}</div>;
});

// Props 変更なければ再レンダリング無し
```

**2. Keys の正確な設定**

リストレンダリングで、インデックスではなく一意キー（ID）を使用。DOM 再利用性向上。

```javascript
// 悪い：インデックスをキーに
{items.map((item, index) => <Item key={index} {...item} />)}

// 良い：ID をキーに
{items.map((item) => <Item key={item.id} {...item} />)}
```

**3. 状態更新の最適化**

状態が深い場合、部分的な再レンダリング。`useCallback` で関数メモ化。

```javascript
const [count, setCount] = useState(0);
const [text, setText] = useState('');

// 入力変更時、count 依存のコンポーネント不要なら再レンダリング無し
const handleChange = useCallback((e) => {
  setText(e.target.value);
}, []); // 依存配列は空
```

---

## 2. フレームワーク別アプローチ

**React：** Virtual DOM で自動最適化。`useCallback`、`useMemo` で手動チューニング。

**Vue 3 Composition API：** リアクティブシステム。テンプレートの最適化に特化。

**Angular：** Change Detection Strategy による制御。OnPush 戦略で再レンダリング抑止。

```typescript
// Angular OnPush 戦略
@Component({
  selector: 'app-user-card',
  template: '<div>{{ userName }}</div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCardComponent {
  @Input() userId: string;
  @Input() userName: string;
}
```

---

## 3. パフォーマンス計測

**Chrome DevTools Lighthouse：**
- パフォーマンススコア（100点満点）
- First Contentful Paint（FCP）
- Largest Contentful Paint（LCP）
- Cumulative Layout Shift（CLS）

**プロファイリング：** React DevTools / Vue DevTools で再レンダリング原因特定。

---

## 4. コード分割と遅延ロード

**Route-based Code Splitting：** ページごと、ルートごとにバンドル分割。

```javascript
// React Router + React.lazy
const Home = React.lazy(() => import('./Home'));
const Profile = React.lazy(() => import('./Profile'));

<Routes>
  <Route path="/" element={<Suspense fallback={<div>Loading...</div>}><Home /></Suspense>} />
</Routes>
```

---

## 要件カバレッジ

本セクションは以下のitemsをカバーしています：レンダリングの最適化
