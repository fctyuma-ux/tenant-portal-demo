#!/bin/bash
# check-terraform.sh - Terraformのチェック・実行

set -e

ERRORS=0

# terraform fmt - formatter
echo "▶ Terraform fmt（formatter）"
if command -v terraform &> /dev/null; then
  if [ -d "infrastructure" ] || [ -d "terraform" ] || [ -f "*.tf" ]; then
    terraform fmt -recursive . 2>/dev/null || true
    echo "  ✅ terraform fmt実行完了"
  else
    echo "  ⚠️  Terraformファイルが見つかりません"
  fi
else
  echo "  ⚠️  Terraform未インストール: https://www.terraform.io/downloads.html"
fi

# terraform validate
echo "▶ terraform validate"
if command -v terraform &> /dev/null; then
  if [ -f "*.tf" ] || [ -d "infrastructure" ] || [ -d "terraform" ]; then
    if terraform validate 2>/dev/null; then
      echo "  ✅ terraform validate合格"
    else
      echo "  ❌ terraform validateエラー：上記を修正してください"
      ERRORS=$((ERRORS + 1))
    fi
  fi
else
  echo "  ⚠️  Terraform未インストール"
fi

exit $ERRORS
