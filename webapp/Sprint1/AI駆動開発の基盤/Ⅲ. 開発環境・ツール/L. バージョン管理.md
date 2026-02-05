# L. バージョン管理

## 概要

Git は分散バージョン管理システム。「いつ、誰が、なぜ、何を変えたか」を記録することで、バグ発生時の原因究明と機能進化の理解が容易になります。Git の三層構造（作業ツリー → ステージング → コミット）を理解し、変更を選別してから履歴に記録。各コミットはスナップショット（その時点の全ファイル状態）として、任意の時点を復元可能。ブランチで並行開発、マージで統合。リモートとローカルを同期して複数人協働を実現。

### Git の基本フロー

三層構造と add・commit・push フロー。作業ツリーで編集 → git add でステージング → git commit で履歴記録 → git push でリモート送信。コミットメッセージは「何をしたか」だけでなく「なぜそうしたか」を記述。git status で変更確認、git diff で修正内容を詳細確認。

```bash
# 基本フロー
git checkout -b feature/new-api     # ブランチ作成・切り替え
git status                          # 変更ファイル確認
git diff                            # 修正内容詳細確認
git add app.js                      # ステージング（特定ファイル）
git commit -m "Add API initialization"  # 履歴記録
git push origin feature/new-api     # リモート送信
```

### ブランチ・マージ・リベース

ブランチはコミット履歴の分岐ポインタ。複数機能の並行開発が可能。マージ（統合コミット作成、履歴分岐維持、協働向き）とリベース（コミット順序変更、履歴一直線化、個人開発向き）で統合。コンフリクト（同じ行の異なる編集）は避けられず、手動で修正して再ステージング。

```bash
# ブランチ操作
git log --oneline --graph --all    # 分岐の可視化
git merge feature/other             # マージで統合
git rebase main                     # リベースで再構築
```

### リモート・Clone・Fork

Clone はリモート全複製（履歴含む）をローカルに取得。Fork は GitHub 上で個人用コピー作成。Fork 運用なら upstream（上流）を登録して最新取得、自身の origin にプッシュ。SSH 認証なら秘密鍵で認証入力を回避—git remote set-url で URL 変更。
