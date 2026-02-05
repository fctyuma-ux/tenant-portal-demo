# K. パッケージ・依存管理

## 概要

依存パッケージ管理は、脆弱性リスク・サプライチェーン攻撃対策・更新戦略の策定が必須の領域です。自動スキャン、ロックファイル管理、インシデント対応の仕組みを構築することで、セキュアで安定した開発環境を維持できます。

---

## 1. 脆弱性スキャンの目的と実行

**目的:** 導入パッケージの既知脆弱性を検出し、対応の優先度を決定する

**実行方法:**
```bash
npm audit                  # 脆弱性リストを表示
npm audit --json          # JSON形式で出力
npm audit fix             # 自動修復（ただし注意が必要）
```

**他のツール:**
- `Dependabot`（GitHub）: 自動PR生成
- `Snyk`: 継続的なスキャン
- `WhiteSource / Mend`: エンタープライズ向け

---

## 2. 結果の読み方（Severity / CVE / 影響範囲）

**脆弱性の重大度（Severity）:**

- **critical**: すぐに対応が必要（RCE、認証回避など）
- **high**: 早急な対応が推奨（データ漏洩の可能性）
- **moderate**: 中期的に対応（特定の条件下での悪用）
- **low**: 低優先度（情報漏洩の可能性は低い）

**CVE（Common Vulnerabilities and Exposures）:** 脆弱性の一意識別子

```json
{
  "vulnerabilities": {
    "express": {
      "severity": "high",
      "cve": "CVE-2022-12345",
      "description": "Regular expression denial of service",
      "affected_versions": "< 4.18.0"
    }
  }
}
```

**影響範囲の確認:**

```bash
npm audit --depth=0       # 直接依存のみ
npm ls vulnerable-package # 依存関係を追跡
```

---

## 3. 依存更新のトレードオフ

**定期更新のメリット:**
- 脆弱性の早期対応
- セキュリティパッチの取得
- バグ修正の恩恵

**定期更新のリスク:**
- breaking change による互換性問題
- メジャーバージョン更新の大規模テスト
- アプリケーションの不安定化

**戦略:**
- **セキュリティパッチ（patch）:** 即座に更新
- **マイナー更新（minor）:** 定期更新（1ヶ月ごと）
- **メジャー更新（major）:** 計画的に対応

---

## 4. ロックファイルの役割と管理

**ロックファイル（package-lock.json / yarn.lock）の役割:**

1. **依存解決を固定:** 依存グラフの状態を記録
2. **再現性を確保:** CI/CDで同じバージョンをインストール
3. **バージョン競合を防止:** 異なるマシンで一貫性を保つ

**いつロックが更新されるか:**

```bash
npm install package@1.0   # package-lock.json が更新される
npm ci                     # ロックファイルを厳密に使用（CI推奨）
npm install                # 新しいバージョンも考慮（開発時）
```

**ロックのコミット方針:**

- ✓ **コミットする:** 再現性を確保
- ✗ **コミットしない:** バージョン競合の原因に

**ベストプラクティス:**

```bash
# CI環境では npm ci を使用（ロックファイル優先）
npm ci

# 開発時は package.json を更新して検証
npm install package@latest
npm test
# 問題なければコミット
```

---

## 5. サプライチェーン攻撃の典型

**攻撃パターン:**

1. **タイポスクワッティング:** `lodash` に似た `lodash-typo` を公開
2. **メンテナー侵害:** 人気パッケージのメンテナー被害
3. **依存の依存の被害:** 直接使用していないパッケージが侵害される
4. **バージョンの置き換え:** npm レジストリから削除＆再公開

---

## 6. 導入前レビュー観点

**信頼できるソースの確認:**

```bash
npm view package_name     # メタデータ確認
npm view package_name downloads  # ダウンロード数
npm view package_name time      # 更新日時

# GitHub リポジトリの確認
# - Star 数、Issue、Contributors
# - 最後の更新日時
# - サポート体制
```

**導入前チェックリスト:**

- [ ] 官式のGitHubリポジトリか？
- [ ] メンテナンスが活発か（直近3ヶ月以内の更新）
- [ ] 既知の脆弱性がないか（npm audit）
- [ ] バンドルサイズは許容範囲か（bundlephobia.com）
- [ ] ドキュメントは充実しているか

---

## 7. 依存導入のチェックリスト

```bash
# 脆弱性スキャン
npm install package@latest
npm audit

# バンドルサイズを確認
npm run build
ls -lh dist/

# テストスイートが通るか確認
npm test

# 本番ビルドが成功するか
npm run build:prod

# PR で明確なコミットメッセージを記載
```

---

## 8. インシデント時の影響範囲特定

**脆弱性が発見された場合:**

```bash
# 1. 影響を受けるバージョン範囲を確認
npm audit fix --dry-run

# 2. 依存関係ツリーを確認
npm ls vulnerable-package

# 3. 本番への影響を評価
# - 脆弱性がアプリケーションで実際に悪用されるか
# - 緩和措置（入力検証など）があるか

# 4. 更新計画を立案
npm update vulnerable-package
npm test
```

---

## 9. 更新戦略の構築

**継続的更新（Continuous）:**
```yaml
# Dependabot 設定
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    allow:
      - dependency-type: "all"
```

**固定戦略（Lock）:**
- 社内で審査してから更新
- 定期レビュー（月1回など）

**ハイブリッド：**
- セキュリティパッチ：自動更新 + 自動マージ
- マイナー更新：Dependabot PR、手動レビュー
- メジャー更新：計画的に（Roadmap に含める）

---

## 10. 実装のポイント

- `npm audit` を CI に組み込み、脆弱性を検出
- ロックファイルは必ずコミット
- セキュリティパッチは即座に対応
- 本番デプロイ前に脆弱性スキャンを実施
- 依存関係の最小化（不要なパッケージを削除）
