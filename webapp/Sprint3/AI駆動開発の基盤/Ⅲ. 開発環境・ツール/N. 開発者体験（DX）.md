# N. 開発者体験（DX）

## 概要

開発者体験は開発速度と品質を左右します。Dev Container による環境再現、Devbox のような宣言的依存管理、セキュアな secret 注入により、チーム全員が同じ環境で効率的に開発できる基盤を構築します。

---

## 1. Dev Container の狙い

**問題:** 開発環境の差異（OS、バージョン、ツール）

**解決:** 1つの devcontainer.json で全員同じ環境

```
MacBook, Windows, Linux
    ↓
   Dev Container
    ↓
  Ubuntu + Node 18 + PostgreSQL
```

---

## 2. devcontainer.json の基本要素

```json
{
  "image": "mcr.microsoft.com/devcontainers/node:20",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:latest": {}
  },
  "customizations": {
    "vscode": {
      "extensions": ["dbaeumer.vscode-eslint"]
    }
  },
  "forwardPorts": [3000],
  "postCreateCommand": "npm install"
}
```

| 項目 | 説明 |
|---|---|
| **image** | ベースイメージ |
| **Dockerfile** | カスタムイメージ |
| **features** | CLI、ツール追加 |
| **customizations** | エディタ設定 |
| **forwardPorts** | ポート公開 |
| **postCreateCommand** | 初期化コマンド |

---

## 3. 宣言的依存管理（Devbox/Nix）

**Devbox:** Nix ラッパー、シンプル

```bash
devbox add nodejs@20
devbox add postgresql@15
```

devbox.json に記録→ Git で追跡可能

**利点：**
- パッケージをテキスト管理
- バージョン完全指定
- 環境再現性 100%

---

## 4. キャッシュと更新戦略

**キャッシュ:** ベースイメージ層を再利用（速度）

```
Layer 1: npm install ← キャッシュ利用
Layer 2: COPY src    ← 再構築
```

**更新戦略：**
- 開発中は rebuild なし（高速）
- 定期的に rebuild でテスト
- CI でも rebuild 実行

---

## 5. Secret 注入と最小権限

**問題:** .env に API キー→ リポジトリに push

**解決：** local ~/.ssh/credentials から注入

```json
{
  "remoteEnv": {
    "DB_PASSWORD": "${localEnv:DB_PASSWORD}"
  }
}
```

.env.local（Git で無視）：
```
DB_PASSWORD=secret123
```

**最小権限:** コンテナユーザーは非root、ディレクトリ制限

---

## 6. 統合ワークフロー

```
1. リポジトリクローン
   ↓
2. VS Code「Dev Container で再度開く」
   ↓
3. ベースイメージプル & postCreateCommand
   ↓
4. 開発開始（全員同じ環境）
```

---

## 7. Devbox（同等ツール）

| ツール | 用途 |
|---|---|
| **Devbox** | Nix ラッパー、シンプル |
| **Nix** | 強力（学習曲線急） |
| **Mise** | Ruby/Python/Node |
| **asdf** | 複数言語バージョン管理 |

---

## 8. 実践スキル

- Dev Container 起動と開発環境確認
- 環境更新手順整備
- Devbox 設定と依存指定
- Secret 管理（CI と local .env.local 分離）

