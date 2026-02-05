# L. バージョン管理

## 概要

バージョン管理（Git）とCI/CD パイプラインは、開発の品質・信頼性・スピードを支える基盤です。CI失敗の切り分けから PR 運用、ブランチ戦略まで、段階的に習得することで、チーム開発をスムーズに進められます。

---

## 1. CI/CD の基本

**CI（Continuous Integration）:** 変更をメインブランチに継続的に統合

- 自動テスト実行
- コードの品質チェック（lint、型チェック）
- ビルド成功確認

**CD（Continuous Delivery/Deployment）:** 自動的にリリース/デプロイ

- ステージング環境への自動デプロイ
- 本番環境への自動デプロイ（Continuous Deployment）
- または手動承認（Continuous Delivery）

---

## 2. トリガーとブランチ保護

**CI トリガー:**

```yaml
# .github/workflows/ci.yml
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
```

**ブランチ保護ルール:**

- PR をマージする前に CI が成功していることを確認（要求）
- コードレビューを必須化
- 一度の commit で主要ブランチへの直接 push を禁止

---

## 3. Git Hooks（pre-commit 等）

**Git Hooks:** ローカル開発で自動検査を実行

```bash
# .husky/pre-commit
npm run lint
npm run type-check
```

**メリット:**
- コミット前に問題を発見
- CI 不要な変更での時間浪費を減らす
- チーム全体で品質基準を統一

**ツール:**
- `husky`: Git Hooks 管理
- `lint-staged`: 変更ファイルのみ検査

---

## 4. CI 失敗時の切り分け

**確認手順:**

```bash
# 1. CI ログを詳しく確認
# GitHub Actions の Logs タブを開く

# 2. 問題の種類を特定
# - test 失敗
# - lint エラー
# - build 失敗
# - 環境問題

# 3. ローカルで再現
npm run test
npm run lint
npm run build

# 4. 原因を特定して修正
git add .
git commit -m "Fix CI failure: ..."
git push
```

**よくある失敗:**
- **テスト失敗:** 新しい機能でテスト未実装
- **Lint エラー:** 空白やインデント不一致
- **型エラー:** TypeScript 型不適合
- **ビルド失敗:** パッケージバージョン競合

---

## 5. PR の目的と説明

**PR の役割:**

1. **レビュー可能な単位:** 機能1つ = 1PR（大きすぎず）
2. **変更履歴の記録:** なぜその変更を加えたか？
3. **チーム学習:** 他の開発者の実装パターンを学ぶ

**良い PR 説明の要素:**

```markdown
## 変更内容
ユーザー登録時の入力検証を強化

## なぜ？
password が 8 文字未満の場合、セキュリティ上の懸念

## テスト
- [ ] ユニットテスト（validator.test.ts）
- [ ] 統合テスト（auth.integration.test.ts）
```

---

## 6. レビューコメントへの対応

**対応の流れ:**

1. コメントを読み、要求内容を理解
2. 必要な修正を実装
3. コミットを追加
4. コメントに「完了」と記載
5. レビュアーの確認を待つ

**コミットメッセージ:**

```bash
# 最初のコミット
git commit -m "feat: Add password validation"

# レビュー対応
git commit -m "refactor: Simplify password regex as per review"
```

---

## 7. マージ方法の違い（merge / squash / rebase）

**Merge:** PR の全コミットを保持

```
main: A - B - M (merge commit)
feature: A - B - C - D
```

**利点:** 機能の開発過程を追跡可能  
**欠点:** マージコミットが履歴を複雑化

**Squash:** PR の全コミットを1つに統合

```
main: A - B - S (squashed commit)
feature: A - B - C - D
```

**利点:** 履歴がシンプル  
**欠点:** 開発過程が失われる

**Rebase:** PR のコミットを main の最新に付け替え

```
main: A - B - C' - D' (rebased)
feature: A - B - C - D
```

**利点:** 直線的な履歴  
**欠点:** force-push 後の取り扱いに注意

**推奨:** Squash + Merge（履歴がシンプル）

---

## 8. 小さな PR を作る

**PR のサイズ:**

- **300 行未満:** 推奨（10分で レビュー可能）
- **500 行以上:** 避ける（レビュー漏れのリスク）

**分割の工夫:**

```bash
# 大きな機能を複数 PR に分割
1. PR: Database schema migration
2. PR: API endpoint implementation
3. PR: Frontend UI component
4. PR: Integration tests
```

---

## 9. レビュー指摘に対応

**指摘の種類:**

- **Must Fix:** セキュリティ、パフォーマンス上の問題
- **Should Fix:** コードの可読性・保守性
- **Nice to Have:** 提案レベルの改善

**対応方法:**

```bash
# 修正を実装
git add .
git commit -m "refactor: Improve readability"

# レビュアーに通知
# コメント欄で「修正完了」と記載
```

---

## 10. ブランチ戦略

**GitHub Flow:**

1. `main` から機能ブランチを作成
2. 開発・テスト・PR作成
3. レビュー・マージ
4. `main` へのマージ後、自動デプロイ

**シンプルで、主流の戦略**

---

## 11. 実装のポイント

- CI を厳格に：PR マージ前に必須チェック
- ブランチ保護：`main` への直接 push を禁止
- PR は小さく：レビュー負荷を軽減
- コミットメッセージは明確：`feat:`, `fix:`, `refactor:` のプレフィックスを使用
- Git Hooks で ローカル品質を確保
