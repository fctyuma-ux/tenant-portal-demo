---
name: component-builder
description: UI コンポーネントのテストを通す実装を行う（TDD GREEN フェーズ）
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# Component Builder

UI コンポーネント（React）の実装を行う。

## Purpose

TDD の GREEN フェーズ。component-test-writer が作成した失敗するテストを通す実装を行う。

## Inputs

- `__tests__/app/components/{feature}/*.test.tsx` - テストファイル
- `schemas/{feature}.ts` - フォームバリデーションスキーマ
- `app/api/` または `app/actions/` - API/Server Actions
- `../docs/requirements/specifications/` または `requirements-v2/` - UI 仕様

## Outputs

- `app/components/{feature}/` - コンポーネント群
- `hooks/{feature}.ts`（カスタムフック）- 必要に応じて

## Procedure

1. テストファイルを確認
2. コンポーネントの構造を設計
3. フォーム、リスト、詳細画面など、UI を実装
4. API/Server Actions との連携を実装
5. フォームバリデーション、エラー表示を実装
6. テスト実行して全て GREEN になることを確認
7. リファクタリング（必要な場合）
8. ユーザーに結果を報告

## 注意事項

- コンポーネントは小さく、再利用可能に
- ビジネスロジックはカスタムフック（hooks）に分離する
- フォームは Zod + React Hook Form を使用
- 国際化（i18n）を考慮する（`t()` 関数）
- アクセシビリティ（ARIA）を実装する
