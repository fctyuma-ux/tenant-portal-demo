#!/bin/bash
# detect-sprint-tech.sh - Sprint番号と技術スタックを自動検出

set -e

SPRINT_NUMBER=""
TECH_STACK=""

# Method 1: training-sprintNディレクトリ名から検出
if [[ $(pwd) =~ training-sprint([0-9]+) ]]; then
  SPRINT_NUMBER="${BASH_REMATCH[1]}"
fi

# Method 2: detail-plan.mdから検出
if [ -z "$SPRINT_NUMBER" ] && [ -f "docs/detail-plan.md" ]; then
  SPRINT_NUMBER=$(grep -oE "Sprint [0-9]+" docs/detail-plan.md | grep -oE "[0-9]+" | head -1)
fi

# デフォルト値（不明な場合）
if [ -z "$SPRINT_NUMBER" ]; then
  SPRINT_NUMBER="1"
fi

# Project.mdから技術スタックを検出
if [ -f "docs/requirements/project.md" ]; then
  # フロントエンド
  if grep -q "Next.js" docs/requirements/project.md; then
    TECH_STACK="$TECH_STACK Next.js"
  fi

  # バックエンド
  if grep -q "FastAPI" docs/requirements/project.md; then
    TECH_STACK="$TECH_STACK FastAPI"
  fi

  # IaC
  if grep -q "Terraform" docs/requirements/project.md; then
    TECH_STACK="$TECH_STACK Terraform"
  fi
fi

echo "SPRINT=$SPRINT_NUMBER"
echo "TECH_STACK=$TECH_STACK"
