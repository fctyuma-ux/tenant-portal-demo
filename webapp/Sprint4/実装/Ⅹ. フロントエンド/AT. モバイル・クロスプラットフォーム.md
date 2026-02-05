# AT. モバイル・クロスプラットフォーム

## 概要

モダンなアプリケーション開発では、デスクトップ、タブレット、スマートフォンなど複数のデバイスやプラットフォーム対応が必須です。ネットワークが不安定な環境、オフライン状態でも機能するアプリケーション設計、キャッシング戦略、PWA（Progressive Web Application）、ネイティブアプリ開発フレームワークなどの技術が求められます。

本セクションでは、キャッシュ制御、オフライン対応、PWA、React Native/Capacitor などの主要技術を説明します。

## HTTP キャッシュヘッダーと Stale-While-Revalidate

HTTP キャッシュは、ブラウザとサーバー間の通信を最小化し、応答時間を短縮します。`Cache-Control` ヘッダーは、キャッシュの有効期限（max-age）や再検証方法を制御します。

```
Cache-Control: public, max-age=3600
```

**Stale-While-Revalidate (SWR)** は、キャッシュの有効期限が切れた場合でも、古いコンテンツを即座に返しながら、バックグラウンドで新鮮なデータを取得する戦略です。ユーザー体験を損なわず、最新データへの更新を実現します。

```
Cache-Control: max-age=3600, stale-while-revalidate=86400
```

## Offline First アーキテクチャ

Offline First は、ネットワークなしでも基本機能が動作するアーキテクチャパターンです。Service Worker とローカルストレージ（IndexedDB）を組み合わせ、ユーザーがオフライン中に行った操作をバッファリング、ネットワーク復帰時に同期させます。

### IndexedDB vs LocalStorage

- **LocalStorage**: キー・バリューペア、容量 5-10MB、同期 API
- **IndexedDB**: 大規模構造化データ、容量 GB 単位、非同期 API、インデックス機能

大規模データやクエリ機能が必要な場合は IndexedDB を選択します。

## PWA の3要素

Progressive Web Application（PWA）は以下の3要素から構成されます：

1. **Manifest**: `manifest.json` でアプリメタデータを定義
2. **Service Worker**: オフライン機能、バックグラウンド同期
3. **HTTPS**: セキュアな通信

PWA により、アプリストア経由でなくブラウザから直接インストール可能で、オフライン動作、プッシュ通知などのネイティブアプリ並み機能が実現できます。

## Service Worker のライフサイクル

Service Worker は登録→インストール→アクティベーション→実行というライフサイクルを持ちます。キャッシング戦略（キャッシュファースト、ネットワークファースト、ステイル・ホワイル・リバリデート）はこのライフサイクル内で実装されます。

## React Native vs Capacitor

**React Native** は JavaScript でネイティブアプリを開発します。iOS/Android に最適化された UI コンポーネント、ネイティブ API へのアクセスが特徴です。一方 **Capacitor** は Web 技術（HTML/CSS/JavaScript）でクロスプラットフォームアプリを開発し、ネイティブ機能は Capacitor プラグイン経由でアクセスします。

- React Native: パフォーマンス重視、ネイティブルックアンドフィール
- Capacitor: Web 開発の知見を活かし、ネイティブ機能補完

## PWA 化の実装例

```javascript
// manifest.json
{
  "name": "My App",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}

// Service Worker 登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW registered'))
    .catch(err => console.error('SW registration failed'));
}
```

## オフライン機能の確認

ブラウザの DevTools でオフラインモードを有効化し、アプリの動作を検証します。Service Worker が正常に動作し、キャッシュされたリソースが提供されることを確認します。

```javascript
// オフライン検知
window.addEventListener('online', () => {
  console.log('Network restored');
  syncPendingData();
});

window.addEventListener('offline', () => {
  console.log('Network lost');
});
```

## Capacitor によるネイティブ機能アクセス

```javascript
import { Camera } from '@capacitor/camera';

async function takePhoto() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Uri
  });
  console.log(image.webPath);
}
```

