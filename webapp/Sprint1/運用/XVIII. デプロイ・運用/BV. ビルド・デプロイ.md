# BV. ビルド・デプロイ

## 概要

ビルド・デプロイは、ソースコードを本番環境で動作可能な形に変換し、ユーザーの手元に届けるプロセスです。ビルドツールやバンドラーを使用して効率的に管理し、デプロイ戦略に基づいて段階的にリリースします。このセクションでは、モダンな開発ワークフローに必須のツール選定とプロセス設計について学びます。

---

## ビルドツール

ビルドツールは、ソースコードをコンパイル・トランスパイルし、成果物を生成します。プロジェクト規模や言語に応じて適切なツールを選択することが重要です。

### ビルドプロセスの基本フロー

```plaintext
ソースコード
    ↓
クリーンアップ（前回の成果物削除）
    ↓
トランスパイル/コンパイル
    ↓
バンドル・最適化
    ↓
テスト実行
    ↓
成果物（dist/build）
```

### 主要なビルドツールの特徴

**JavaScript/TypeScript 環境**
- Webpack: 複雑な依存関係管理、細かいカスタマイズが必要な場合
- Vite: 高速開発環境、モダンなプロジェクト向け
- esbuild: 超高速バンドル、シンプルな用途向け

**Backend 環境**
- Maven（Java）: エンタープライズ規模の依存管理
- Gradle（Java）: 柔軟な定義とビルドキャッシュ
- cargo（Rust）: 言語統合された効率的なビルド

### ビルド設定の実装例

```javascript
// webpack.config.js の基本構造
module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      }
    ]
  },
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: 'all'
    }
  }
};
```

---

## バンドラー

バンドラーは複数のモジュールを単一（または複数）のバンドルに統合します。コード分割、ツリーシェイキング、遅延ロードなどの最適化手法により、ユーザー体験を向上させます。

### バンドル最適化の役割

```plaintext
個別モジュール群
  ├── util.js
  ├── api.js
  ├── ui.js
  └── styles.css
      ↓
    バンドラー処理
      ├── 不要コード削除（Tree Shaking）
      ├── 重複削除
      ├── コード分割（Dynamic Imports）
      └── 圧縮・最小化
      ↓
配布用バンドル
  ├── main.[hash].js（ メインバンドル）
  ├── vendor.[hash].js（外部ライブラリ）
  └── styles.[hash].css
```

### コード分割戦略

```javascript
// 動的インポートによる遅延ロード
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

// ルートベースのコード分割
const routes = [
  { path: '/', component: Home },
  { path: '/dashboard', component: Dashboard }  // 別バンドル
];

// ベンダーコードの分離
optimization: {
  splitChunks: {
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10
      }
    }
  }
}
```

---

## デプロイ戦略

デプロイ戦略は、新バージョンのアプリケーションを本番環境に段階的に導入し、リスクを最小化するアプローチです。戦略の選択により、ダウンタイムやロールバック性が大きく変わります。

### 主要なデプロイ戦略の比較

**ブルーグリーンデプロイ**
- 現在のシステム（Blue）と新システム（Green）を並行運用
- ロードバランサーの切り替えで即座に旧版に戻せる
- インフラコストが増加

```plaintext
ロードバランサー
        ↓
    ┌───┴───┐
    ↓       ↓
  Blue    Green
 (旧版)   (新版)

ユーザーアクセス → Blue（安定）
テスト完了 → ロードバランサー切り替え → Green
問題発生 → 即座に戻す
```

**カナリアデプロイ**
- 新バージョンを段階的にユーザーに配信（5% → 25% → 100%）
- 問題を早期に検出できる
- ロールバック機構が必要

```plaintext
トラフィック分散
    ├─ 旧版: 95%
    └─ 新版: 5%
        ↓
    メトリクス監視
        ↓
    正常 → 新版: 25%
        ↓
    問題検出時 → ロールバック
```

**ローリングデプロイ**
- インスタンスを1つずつ順番に更新
- サーバーリソースを効率的に利用
- ダウンタイムなし

```plaintext
時刻 1   時刻 2   時刻 3
┌─────┐ ┌─────┐ ┌─────┐
│旧①  │ │新①  │ │新①  │
│旧②  │ │旧②  │ │新②  │
│旧③  │ │旧③  │ │旧③  │
└─────┘ └─────┘ └─────┘
  ↓       ↓       ↓
全て旧版  部分更新  全て新版
```

### デプロイスクリプトの実装例

```bash
#!/bin/bash

# ビルド
npm run build

# 成果物の検証
if [ ! -d "dist" ]; then
  echo "Build failed"
  exit 1
fi

# 本番環境へのデプロイ
DEPLOYMENT_ENV=${1:-staging}

case $DEPLOYMENT_ENV in
  staging)
    aws s3 sync dist/ s3://staging-bucket/ --delete
    ;;
  production)
    # カナリアデプロイ: 10% のトラフィック
    kubectl set image deployment/app-canary app=myapp:$VERSION
    sleep 300

    # メトリクス確認後、全体ロールアウト
    kubectl set image deployment/app app=myapp:$VERSION
    ;;
esac

echo "Deploy complete: $DEPLOYMENT_ENV"
```

---

## ベストプラクティス

- **ビルド時間の短縮**: キャッシュの活用、インクリメンタルビルド
- **成果物の検証**: 自動テスト、サイズ監視、セキュリティスキャン
- **デプロイ自動化**: CI/CDパイプラインの統合
- **ロールバック計画**: 問題発生時の即座の対応体制
- **環境の分離**: dev/staging/production で異なるデプロイ戦略

---

## 次のステップ

- CI/CD パイプラインでのビルド自動化
- リリース管理とバージョニング戦略
- 監視・オブザーバビリティ機構の構築
