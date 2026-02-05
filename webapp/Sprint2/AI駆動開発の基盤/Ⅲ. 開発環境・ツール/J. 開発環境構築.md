# J. 開発環境構築

## 概要

Shシェルスクリプトは、開発環境のセットアップ・自動化・運用に不可欠なツールです。PATH管理、変数とクォーティング、安全な引数処理、エラーハンドリングなどのベストプラクティスを習得することで、保守性と信頼性の高い自動化スクリプトを実装できます。

---

## 1. シバンと実行権限

**シバン（Shebang）:** スクリプトの最初の行で、実行時に使用するインタプリタを指定

```bash
#!/usr/bin/env bash
# bash を PATH から検索して実行
```

**メリット:** 異なるマシン構成でも汎用的に動作

**実行権限の付与:**
```bash
chmod +x script.sh
./script.sh
```

---

## 2. 環境変数と優先順位

**優先順位:** ローカル変数 > 環境変数 > デフォルト値

```bash
#!/usr/bin/env bash

# デフォルト値
: ${LOG_LEVEL:=INFO}
: ${MAX_RETRIES:=3}

# ユーザーが設定できる
LOG_LEVEL=DEBUG ./script.sh
```

**変数と引用符の使い分け:**

```bash
# ダブルクォート：変数展開あり
echo "Hello $NAME"  # 出力: Hello John

# シングルクォート：変数展開なし
echo 'Hello $NAME'  # 出力: Hello $NAME
```

---

## 3. 終了コードとエラーハンドリング

**終了コード:** 0 = 成功、1～255 = エラー

```bash
#!/usr/bin/env bash
set -euo pipefail  # エラーで停止、未定義変数も止める

# エラーで即座に終了
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: Config file not found" >&2
  exit 1
fi
```

**trap で異常終了時の処理を指定:**

```bash
cleanup() {
  rm -f "$TEMP_FILE"
  echo "Cleanup completed" >&2
}
trap cleanup EXIT
```

---

## 4. 引数処理とヘルプ

**Usage（ヘルプメッセージ）の提供:**

```bash
#!/usr/bin/env bash

usage() {
  cat << 'HELP'
Usage: deploy.sh [OPTIONS]

Options:
  -e, --env ENV      Environment: dev | staging | prod (required)
  -v, --version VER  Version to deploy (required)
  -h, --help         Show this help

Example: deploy.sh --env prod --version v1.0.0
HELP
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--env) ENV="$2"; shift 2 ;;
    -v|--version) VERSION="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; usage 1 ;;
  esac
done

# 必須引数の確認
if [[ -z "${ENV:-}" ]] || [[ -z "${VERSION:-}" ]]; then
  echo "Error: Missing required arguments" >&2
  usage 1
fi
```

---

## 5. 条件分岐とループの基本

**if-elif-else:**

```bash
if [[ $1 == "start" ]]; then
  systemctl start myapp
elif [[ $1 == "stop" ]]; then
  systemctl stop myapp
else
  echo "Usage: $0 {start|stop}"
  exit 1
fi
```

**for ループ:**

```bash
for file in *.log; do
  grep ERROR "$file" >> errors.txt
done

# または
for i in {1..5}; do
  echo "Retry $i"
  sleep 1
done
```

**while ループ:**

```bash
while IFS= read -r line; do
  process_line "$line"
done < input.txt
```

---

## 6. 定型作業を1本のスクリプトにまとめる

**例：本番環境へのデプロイスクリプト**

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. テストの実行
echo "Running tests..."
npm test

# 2. ビルド
echo "Building application..."
npm run build

# 3. デプロイ前の確認
echo "Ready to deploy to production. Continue? (y/n)"
read -r response
if [[ "$response" != "y" ]]; then
  exit 1
fi

# 4. デプロイ
echo "Deploying to production..."
npm run deploy:prod

echo "Deployment completed successfully"
```

---

## 7. 安全な引数検証とエラーメッセージ

**バリデーション:**

```bash
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required but not installed" >&2
  exit 1
fi

if [[ ! -d "$WORK_DIR" ]]; then
  echo "Error: Work directory does not exist: $WORK_DIR" >&2
  exit 1
fi

if [[ ! "$ENV" =~ ^(dev|staging|prod)$ ]]; then
  echo "Error: Invalid environment: $ENV (must be dev|staging|prod)" >&2
  exit 1
fi
```

---

## 8. パイプ処理でログ・出力を加工

**パイプで複数コマンドを組み合わせ:**

```bash
# ログから ERROR を抽出して集計
grep ERROR application.log \
  | cut -d':' -f2 \
  | sort | uniq -c \
  | sort -rn
```

**出力のフィルタリング:**

```bash
find . -name "*.js" | grep -E "test|spec" | head -10
```

---

## 9. PATH不一致の切り分けと修正

**PATH 不一致の原因確認:**

```bash
# コマンドがどこにあるか確認
which node        # /usr/bin/node か /usr/local/bin/node か
command -v npm    # コマンドの実際のパス

# 環境変数の内容確認
echo $PATH

# シェル固有の設定を確認
cat ~/.bashrc
cat ~/.zshrc
```

**修正方法:**

```bash
# .bashrc / .zshrc に追加
export PATH="/usr/local/bin:$PATH"

# またはスクリプト内で直接設定
export PATH="/opt/node/bin:${PATH}"
node --version
```

---

## 10. 実装のポイント

- `set -euo pipefail` で安全なスクリプトを実装
- 外部コマンド呼び出しは `command -v` で存在確認
- 変数はダブルクォートで囲み、予期しない分割を防止
- エラーメッセージは stderr（>&2）に出力
- ヘルプメッセージで引数と使用例を明記
- 複雑な処理はPython/JavaScriptで実装も検討
