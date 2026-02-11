---
name: service-implementer
description: Service（Business Logic Layer）のテストを通す実装を行う（TDD GREEN フェーズ）
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# Service Implementer

Business Logic Layer（Service）の実装を行う。

## Purpose

TDD の GREEN フェーズ。service-test-writer が作成した失敗するテストを通す実装を行う。

## Inputs

- `__tests__/domain/services/{feature}.test.ts` - テストファイル
- `domain/repositories/{feature}-repository.ts` - Repository（インターフェース）
- `domain/models/{feature}.ts` - ドメインモデル型
- `../docs/requirements/requirements-v2/` - ビジネスロジック仕様

## Outputs

- `domain/services/{feature}-service.ts` - Service 実装

## TDD フロー

### 1. Format（コード整形）
```bash
npm run format
```

### 2. Lint（静的解析）
```bash
npm run lint
```

### 3. Test（テスト実行）
```bash
npm test -- {feature}.test.ts -v
```

**実行順序**: format → lint → test

## Procedure

### Step 1: テストファイルを確認

テストをしっかり読む：
- 各メソッドが何を期待しているか
- 返り値の型・形式
- バリデーション・エラーハンドリング
- 複数リポジトリの協調が必要か

### Step 2: Service クラスを定義

```typescript
// domain/services/user-service.ts
export class UserService {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  // メソッドを実装する
}
```

### Step 3: ビジネスロジックを実装

**基本パターン：ビジネスバリデーション付きの作成**
```typescript
async create(
  email: string,
  firstName: string,
  lastName: string,
  password: string,
): Promise<User> {
  // 1. ビジネスバリデーション
  const existing = await this.userRepository.getByEmail(email);
  if (existing) {
    throw new Error(`Email already exists: ${email}`);
  }

  // 2. ビジネスロジック（パスワード変換、データ準備等）
  const passwordHash = this._hashPassword(password);

  // 3. Repository に委譲（DB操作）
  return this.userRepository.create({
    email,
    firstName,
    lastName,
    passwordHash,
  });
}
```

**複数リポジトリの協調**
```typescript
export class OrderService {
  private orderRepository: IOrderRepository;
  private userRepository: IUserRepository;
  private productRepository: IProductRepository;

  constructor(
    orderRepository: IOrderRepository,
    userRepository: IUserRepository,
    productRepository: IProductRepository,
  ) {
    this.orderRepository = orderRepository;
    this.userRepository = userRepository;
    this.productRepository = productRepository;
  }

  async createOrder(
    userId: string,
    productIds: string[],
  ): Promise<Order> {
    // ユーザー存在確認
    const user = await this.userRepository.getById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // 商品確認
    const products = await this.productRepository.getByIds(productIds);
    if (products.length !== productIds.length) {
      throw new Error("Some products not found");
    }

    // 注文作成（Repository に委譲）
    return this.orderRepository.create({
      userId,
      productIds,
      totalPrice: this._calculateTotal(products),
    });
  }
}
```

**ビジネスルール検証**
```typescript
async updateEmail(userId: string, newEmail: string): Promise<User> {
  // ユーザー取得
  const user = await this.userRepository.getById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // メール重複チェック（ビジネスバリデーション）
  if (newEmail !== user.email) {
    const existing = await this.userRepository.getByEmail(newEmail);
    if (existing) {
      throw new Error(`Email already exists: ${newEmail}`);
    }
  }

  // 更新（Repository に委譲）
  return this.userRepository.update(userId, { email: newEmail });
}
```

### Step 4: プリミティブ引数を受け取る

```typescript
// ✅ OK - プリミティブ引数（Zod スキーマではない）
async create(
  email: string,
  firstName: string,
  lastName: string,
): Promise<User> { ... }

// ❌ NG - Schema を直接受け取らない
async create(data: UserCreateSchema): Promise<User> { ... }
```

API 層で Zod スキーマを parse してから、プリミティブ型を Service に渡す。

### Step 5: テスト実行

```bash
npm test -- {feature}.test.ts -v
```

全テストが PASS になることを確認。

### Step 6: ユーザーに結果を報告

実装完了時は以下を報告：
- **作成・変更したファイル**（パス）
- **実装したメソッド一覧**（メソッド名）
- **複数リポジトリの協調**（使用したリポジトリ）
- **テスト実行結果**（PASS/FAIL）

## Service 層の責務

### ✅ Service が担当する

- ビジネスロジック実装
- ビジネスバリデーション（重複チェック、ルール検証等）
- 複数リポジトリの協調
- データ変換・計算
- エラーハンドリング

### ❌ Service が担当しない

- **DB 操作**（Repository に委譲）
- **HTTP 処理**（API 層で処理）
- **Zod スキーマ処理**（API 層で parse）

**原則**: Service はビジネスロジックに専念。DB 操作は Repository に委譲。

## 注意事項

- Service は **ビジネスロジックに専念**（DB 操作は Repository に委譲）
- **プリミティブ引数** を受け取る（Schema ではない）
- **複数リポジトリを協調** させる（constructor で注入）
- **ビジネスバリデーション** を実装する（重複チェック、ルール検証）
- テストを GREEN にするための **最小限の実装** を心がける
- テストコードは変更しない
