#!/bin/bash
# check-nodejs.sh - Node.js系（Prettier, ESLint, TypeScript）のチェック・実行

set -e

ERRORS=0

# Prettier - formatter
echo "▶ Prettier（TypeScript/JavaScript formatter）"
if command -v npx &> /dev/null && npx prettier --version &> /dev/null; then
  npx prettier --write src/**/*.{ts,tsx,js,jsx} pages/**/*.{ts,tsx} app/**/*.{ts,tsx} 2>/dev/null || true
  echo "  ✅ Prettier実行完了"
else
  echo "  ⚠️  Prettier未インストール: npm install --save-dev prettier"
fi

# ESLint - linter
echo "▶ ESLint（linter）"
if command -v npx &> /dev/null && npx eslint --version &> /dev/null; then
  if npx eslint src/**/*.{ts,tsx} pages/**/*.ts 2>/dev/null; then
    echo "  ✅ ESLint合格"
  else
    echo "  ❌ ESLintエラー：上記を修正してください"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ⚠️  ESLint未インストール: npm install --save-dev eslint"
fi

# TypeScript type check
echo "▶ TypeScript（type check）"
if command -v npx &> /dev/null && npx tsc --version &> /dev/null; then
  if npx tsc --noEmit 2>/dev/null; then
    echo "  ✅ TypeScript合格"
  else
    echo "  ❌ TypeScriptエラー：上記を修正してください"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ⚠️  TypeScript未インストール: npm install --save-dev typescript"
fi

exit $ERRORS
