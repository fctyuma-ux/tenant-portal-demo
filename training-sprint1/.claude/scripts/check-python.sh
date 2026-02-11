#!/bin/bash
# check-python.sh - Python系（Black, Ruff, mypy）のチェック・実行

set -e

ERRORS=0

# Black - formatter
echo "▶ Black（Python formatter）"
if python3 -c "import black" 2>/dev/null; then
  if [ -d "backend" ] || [ -d "app" ]; then
    python3 -m black backend/ app/ 2>/dev/null || python3 -m black . 2>/dev/null || true
    echo "  ✅ Black実行完了"
  else
    echo "  ⚠️  バックエンドディレクトリが見つかりません"
  fi
else
  echo "  ⚠️  Black未インストール: pip install black"
fi

# Ruff - linter
echo "▶ Ruff（Python linter）"
if python3 -c "import ruff" 2>/dev/null; then
  if python3 -m ruff check . 2>/dev/null; then
    echo "  ✅ Ruff合格"
  else
    echo "  ❌ Ruffエラー：上記を修正してください"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ⚠️  Ruff未インストール: pip install ruff"
fi

# mypy - type check
echo "▶ mypy（Python type check）"
if python3 -c "import mypy" 2>/dev/null; then
  if python3 -m mypy . 2>/dev/null; then
    echo "  ✅ mypy合格"
  else
    echo "  ⚠️  mypy警告あり（参考情報）"
  fi
else
  echo "  ⚠️  mypy未インストール: pip install mypy"
fi

exit $ERRORS
