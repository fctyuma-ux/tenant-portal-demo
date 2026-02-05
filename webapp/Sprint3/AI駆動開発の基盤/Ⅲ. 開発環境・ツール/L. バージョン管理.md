# L. バージョン管理

## 概要

バージョン管理は履歴記録と恢復を可能にします。タグとリリース管理、ブランチ戦略、高度なコミット操作（amend/rebase/cherry-pick）により、チーム協力を効率化し本番トラブルを最小化します。

---

## 1. タグ（軽量/注釈付き）

| タグ | メタデータ | 署名 | 用途 |
|---|---|---|---|
| **軽量** | なし | 不可 | 内部、仮 |
| **注釈付き** | あり | 可能 | リリース、公式 |

```bash
git tag v1.0.0              # 軽量
git tag -a v1.0.0 -m "..."  # 注釈付き
```

---

## 2. リリースノート

ユーザー向けに変更内容を説明

- 新機能、バグ修正、非推奨化
- アップグレード手順
- 既知の問題

GitHub Releaseでタグとリリースノートを紐付け

---

## 3. SemVer（バージョン付け）

```
v1.2.3
 │ │ └─ PATCH: バグ修正（互換）
 │ └─── MINOR: 新機能（互換）
 └───── MAJOR: 破壊的変更
```

---

## 4. ブランチ戦略

**Git Flow:** main/develop + feature/release/hotfix

**GitHub Flow:** main + feature PR

**Trunk-based:** メインに短命ブランチ高頻度マージ

---

## 5. ブランチ保護・必須チェック

mainへの直接pushを禁止

- PR必須
- レビュー必須
- CI成功必須
- 署名コミット必須

---

## 6. 高度なコミット操作

**amend:** 直前コミット修正
```bash
git commit --amend -m "新メッセージ"
```

**rebase:** 履歴を整える
```bash
git rebase main
```

**cherry-pick:** 必要なコミットだけ摘む
```bash
git cherry-pick abc1234
```

**復旧:** reflog/restore/reset
```bash
git reflog
git reset abc1234
```

---

## 7. 実践スキル

- タグとリリース作成
- PR履歴整理（rebase活用）
- 運用ルール整備（README）
- ミス復旧（reset/restore）

