# BX. リリース管理

## 概要

リリース管理は、本番環境に導入されるソフトウェアのバージョン、品質、タイミングを統制するプロセスです。セマンティックバージョニング、リリースノート、ロールバック機構により、ユーザーへの影響を最小化しながら安定した更新を実現します。

---

## バージョニング戦略

バージョン番号は、ソフトウェアの変更内容と互換性を明確に伝えるためのシステムです。セマンティックバージョニング（SemVer）が業界標準として広く採用されています。

### セマンティックバージョニング（MAJOR.MINOR.PATCH）

```plaintext
バージョン: 2.5.3
           ↓ ↓ ↓
           │ │ └─ PATCH: バグ修正（互換性あり）
           │ └─── MINOR: 機能追加（下位互換性あり）
           └───── MAJOR: 破壊的変更（互換性なし）

例）
1.0.0 → 1.0.1 : バグ修正
1.0.1 → 1.1.0 : 新機能追加（後方互換性あり）
1.1.0 → 2.0.0 : API 変更など（後方互換性なし）
```

### プリリリースとメタデータ

```plaintext
2.0.0-alpha.1      : アルファ版（機能未完成）
2.0.0-beta.1       : ベータ版（バグ修正フェーズ）
2.0.0-rc.1         : リリース候補版
2.0.0               : 正式リリース
2.0.0+build.123    : ビルドメタデータ
```

### バージョニングの実装例

```javascript
// package.json でのバージョン定義
{
  "name": "myapp",
  "version": "2.5.3",
  "description": "My awesome application"
}

// Git タグでの管理
// タグ作成
git tag -a v2.5.3 -m "Release version 2.5.3: Security patches"
git push origin v2.5.3

// タグからのリリース作成
git log v2.5.2..v2.5.3 --oneline > CHANGELOG.md
```

---

## リリースノート

リリースノートは、ユーザーや開発者に向けた変更内容の説明書です。機能、修正、既知の問題、移行ガイドなどを明確に記載することで、アップグレードの判断と実施をサポートします。

### リリースノートのテンプレート

```markdown
# Version 2.5.3 - 2024-02-04

## 🎉 New Features
- Multi-language support for dashboard
- Dark mode toggle in user settings
- Improved search performance (50% faster)

## 🐛 Bug Fixes
- Fixed crash when uploading large files (> 1GB)
- Corrected timezone handling in scheduling
- Resolved memory leak in background worker

## ⚠️ Breaking Changes
- Removed deprecated `getLegacyData()` API endpoint
- Changed authentication header format from `Bearer` to `X-API-Key`
- Database schema migration required (automatic on startup)

## 📋 Migration Guide
```bash
# Automatic migration
npm start  # Runs migrations automatically

# Manual migration (if needed)
npm run migrate:latest

# Rollback to previous version
npm run migrate:rollback
```

## 📊 Performance Improvements
- Reduced bundle size by 15% (2.3MB → 1.95MB)
- Database query optimization reduced avg response time from 450ms to 280ms
- Caching improvements reduced API calls by 35%

## 🔒 Security Updates
- Updated vulnerable dependency: lodash (CVE-2023-12345)
- Implemented stricter CORS policy
- Added rate limiting to prevent brute force attacks

## 📝 Known Issues
- Dark mode not yet supported on IE11
- Real-time notifications may delay up to 30 seconds on slow connections
- File upload preview not working in Safari < 14

## 🙏 Contributors
Thanks to @alice, @bob, and @charlie for contributions!

## 📚 Documentation
[Full changelog](https://docs.example.com/changelog)
[Migration guide](https://docs.example.com/migration-v2.5.3)
```

### 自動リリースノート生成

```javascript
// scripts/generate-release-notes.js
const { execSync } = require('child_process');
const fs = require('fs');

function generateReleaseNotes(fromTag, toTag) {
  const commits = execSync(
    `git log ${fromTag}..${toTag} --pretty=format:"%H %s"`
  ).toString().split('\n');

  const organized = {
    features: [],
    bugfixes: [],
    breaking: [],
    other: []
  };

  commits.forEach(commit => {
    if (commit.includes('feat:')) organized.features.push(commit);
    else if (commit.includes('fix:')) organized.bugfixes.push(commit);
    else if (commit.includes('BREAKING')) organized.breaking.push(commit);
    else organized.other.push(commit);
  });

  const notes = `
# Release Notes - ${toTag}

## New Features
${organized.features.map(c => `- ${c}`).join('\n')}

## Bug Fixes
${organized.bugfixes.map(c => `- ${c}`).join('\n')}

## Breaking Changes
${organized.breaking.map(c => `- ${c}`).join('\n')}
`;

  return notes;
}

const notes = generateReleaseNotes('v2.5.2', 'v2.5.3');
fs.writeFileSync('RELEASE_NOTES.md', notes);
```

---

## ロールバック戦略

本番環境で問題が発生した場合、迅速に前のバージョンに戻す能力は最も重要な要件です。複数のロールバック戦略を組み合わせることで、様々なシナリオに対応します。

### ロールバック方式の比較

**インスタンスベースのロールバック（最速）**
- 前バージョンのコンテナイメージに切り替え
- 実行時間: 数秒～数分
- 前提: 前バージョンのイメージ保持

```bash
# Kubernetes でのロールバック
kubectl rollout undo deployment/app

# または特定リビジョンに戻す
kubectl rollout history deployment/app
kubectl rollout undo deployment/app --to-revision=3
```

**データベースロールバック（複雑）**
- スキーマ変更がある場合のロールバック計画
- 新旧スキーマの互換性維持が鍵
- ダウンタイムを最小化する設計

```sql
-- マイグレーション（新カラム追加、旧カラムは削除しない）
ALTER TABLE users ADD COLUMN last_login_v2 TIMESTAMP;

-- ロールバック対応
ALTER TABLE users DROP COLUMN last_login_v2;
-- または旧カラムを使用し続ける
UPDATE app_config SET active_version = '2.5.2';
```

**ブルーグリーンでのロールバック**
```
本番切り替え
  ↓
Blue（旧版）を即座に停止せず保持
  ↓
Green（新版）で問題発生
  ↓
ロードバランサー → Blue へ切り替え
  ↓
数分以内に復帰
```

### ロールバック実行スクリプト例

```bash
#!/bin/bash
# scripts/rollback.sh

set -e

TARGET_VERSION=$1
CURRENT_VERSION=$(kubectl get deployment app \
  -o jsonpath='{.spec.template.spec.containers[0].image}' | \
  cut -d: -f2)

echo "Current version: $CURRENT_VERSION"
echo "Rolling back to: $TARGET_VERSION"

# ロールバック前のヘルスチェック
echo "Running pre-rollback checks..."
curl -f https://prod.example.com/health || exit 1

# ロールバック実行
echo "Executing rollback..."
kubectl set image deployment/app app=myapp:$TARGET_VERSION

# ロールアウト完了待機
echo "Waiting for rollback to complete..."
kubectl rollout status deployment/app --timeout=5m

# ロールバック後の検証
echo "Verifying rollback..."
sleep 30
curl -f https://prod.example.com/health || exit 1
npm run test:smoke || exit 1

echo "Rollback successful!"

# インシデント記録
echo "Rollback from $CURRENT_VERSION to $TARGET_VERSION" | \
  tee -a logs/incidents.log
```

---

## リリースパイプラインの統合

### 自動リリース実行例

```yaml
# .github/workflows/release.yml
name: Automated Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body_path: RELEASE_NOTES.md
          draft: false
          prerelease: false

      - name: Deploy to production
        run: |
          VERSION=${GITHUB_REF#refs/tags/}
          kubectl set image deployment/app app=myapp:$VERSION
          kubectl rollout status deployment/app --timeout=10m

      - name: Smoke tests
        run: npm run test:smoke

      - name: Notify stakeholders
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Release deployed successfully!'
            })
```

---

## ベストプラクティス

- **セマンティックバージョニング採用**: 変更の意味を明確に
- **詳細なリリースノート**: ユーザーの判断をサポート
- **ロールバック計画**: 必ず事前に検証
- **段階的ロールアウト**: カナリア・ブルーグリーン活用
- **前バージョン保持**: 緊急時の復帰用に複数バージョン保有

---

## 次のステップ

- 監視・オブザーバビリティによるリリース後の品質確保
- インシデント対応と障害管理
- パフォーマンス監視とアラート設定
