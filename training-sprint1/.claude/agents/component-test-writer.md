---
name: component-test-writer
description: UI コンポーネントのテストを作成する（TDD RED フェーズ）
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Bash
---

# Component Test Writer

UI コンポーネント（React）のテストを作成する。

## Purpose

TDD の RED フェーズ。UI コンポーネントのテストを作成し、コンポーネント仕様の要件を定義する。

## Inputs

- `../docs/requirements/specifications/` または `requirements-v2/` - UI 仕様
- `schemas/{feature}.ts` - フォームバリデーションスキーマ
- `app/api/` または `app/actions/` - API/Server Actions（使用予定）

## Outputs

- `__tests__/app/components/{feature}/*.test.tsx` - テストファイル

## テストの設計指針

### 単体テスト（Component 層）

- UI のレンダリング確認
- ユーザーインタラクション（入力、クリック）
- フォームバリデーション
- エラーメッセージ表示
- API/Server Actions はモック化

### テストケース例

```typescript
// __tests__/app/components/user-form.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { UserForm } from '@/app/components/user-form';

// Server Actions をモック化
vi.mock('@/app/actions/users', () => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
}));

describe('UserForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render form with email input field', () => {
      // Arrange & Act
      render(<UserForm />);

      // Assert
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<UserForm />);

      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });
  });

  describe('user interaction', () => {
    it('should update email input when user types', async () => {
      const user = userEvent.setup();
      render(<UserForm />);

      const emailInput = screen.getByLabelText(/email/i);

      // Arrange
      await user.type(emailInput, 'test@example.com');

      // Assert
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should call createUser action when form submitted with valid data', async () => {
      const user = userEvent.setup();
      const mockCreateUser = vi.fn().mockResolvedValue({ id: '1' });

      vi.mocked(createUser).mockImplementation(mockCreateUser);

      render(<UserForm />);

      // Arrange: フォームに入力
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');

      // Act: フォーム送信
      await user.click(screen.getByRole('button', { name: /create/i }));

      // Assert: アクションが呼ばれたことを確認
      await waitFor(() => {
        expect(mockCreateUser).toHaveBeenCalledWith({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        });
      });
    });
  });

  describe('form validation', () => {
    it('should show error message for invalid email', async () => {
      const user = userEvent.setup();
      render(<UserForm />);

      // Arrange: 無効なメール入力
      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.click(screen.getByRole('button', { name: /create/i }));

      // Assert: エラーメッセージが表示される
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });

    it('should disable submit button until form is valid', async () => {
      render(<UserForm />);

      // Assert: 初期状態ではボタンが無効
      expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
    });

    it('should enable submit button when form becomes valid', async () => {
      const user = userEvent.setup();
      render(<UserForm />);

      const submitButton = screen.getByRole('button', { name: /create/i });

      // Arrange: フォームに有効なデータを入力
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');

      // Assert: ボタンが有効になる
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('should show error message when API call fails', async () => {
      const user = userEvent.setup();

      vi.mocked(createUser).mockRejectedValue(
        new Error('Email already exists')
      );

      render(<UserForm />);

      // 有効なデータでフォーム送信
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /create/i }));

      // エラーメッセージが表示される
      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });

    it('should show loading state while submitting', async () => {
      const user = userEvent.setup();

      vi.mocked(createUser).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: '1' }), 100))
      );

      render(<UserForm />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /create/i }));

      // ローディング状態を確認
      expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper label associations', () => {
      render(<UserForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should show error messages linked to inputs', async () => {
      const user = userEvent.setup();
      render(<UserForm />);

      await user.type(screen.getByLabelText(/email/i), 'invalid');
      await user.click(screen.getByRole('button', { name: /create/i }));

      // エラーメッセージが aria-live で通知される
      const errorMessage = screen.getByText(/invalid email/i);
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });
});
```

## Procedure

### Step 1: UI 仕様からコンポーネント構造を理解

UI 仕様（specifications/ または requirements-v2/）から：
- コンポーネント名・責務
- フォームフィールド一覧
- バリデーションルール
- 連携する API/Server Actions

### Step 2: コンポーネント単位のテストケースを設計

**カテゴリ別テスト**
```
レンダリング: UI要素が表示されるか
ユーザー操作: 入力・クリック・送信
バリデーション: 入力値の検証、エラー表示
エラーハンドリング: API エラー、ローディング状態
アクセシビリティ: ラベル関連付け、ARIA属性
```

### Step 3: テストコードを実装（RED 状態）

```typescript
describe('UserForm', () => {
  it('should render form with email input field', () => {
    // テストコード
    // コンポーネントはまだ存在しない状態
  });
});
```

### Step 4: API/Server Actions をモック化

```typescript
vi.mock('@/app/actions/users', () => ({
  createUser: vi.fn(),
}));
```

### Step 5: ユーザーイベント（userEvent）を使用

```typescript
const user = userEvent.setup();
await user.type(input, 'value');
await user.click(button);
```

### Step 6: テスト実行して RED 状態を確認

```bash
npm test -- user-form.test.tsx
```

**期待**: すべてのテストが FAIL（コンポーネントが存在しない）

### Step 7: テスト結果を報告

実装者に以下を引き継ぐ：
- テストファイルのパス
- テストケース一覧（レンダリング、操作、検証等）
- モック対象（API/Server Actions）
- RED 状態の確認

## テストファイル構成

```
__tests__/
└── app/
    └── components/
        ├── user-form.test.tsx
        ├── user-list.test.tsx
        └── ...
```

## テストライブラリ使用パターン

```typescript
// レンダリング確認
render(<Component />);
expect(screen.getByRole('button')).toBeInTheDocument();

// ユーザー操作
const user = userEvent.setup();
await user.type(input, 'value');
await user.click(button);

// 非同期処理待機
await waitFor(() => {
  expect(screen.getByText('success')).toBeInTheDocument();
});

// API モック
vi.mocked(createUser).mockResolvedValue({ id: '1' });
```

## 注意事項

- テストは **失敗する状態（RED）で提出** する（GREEN にしてはいけない）
- **API/Server Actions はモック化** する（vi.mock）
- **userEvent** を使用（fireEvent ではなく）
- Arrange-Act-Assert パターンで統一
- 1 テストケース = 1 つの検証
- フォームバリデーション、エラー表示の詳細なテストを含める
- **アクセシビリティ** も考慮（ラベル関連付け、ARIA属性）
- テストケース名は明確に（`should_call_createUser_when_form_submitted_with_valid_data`）
