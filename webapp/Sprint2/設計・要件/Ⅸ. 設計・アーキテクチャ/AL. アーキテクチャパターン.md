# AL. アーキテクチャパターン

## 概要

アーキテクチャパターンは、レガシーコードの改善・テスタビリティ向上・リファクタリングを系統的に進めるための設計指針です。既存コードを「仕様化テスト」で保護し、「ポート・アダプター」パターンで依存性を逆転させることで、段階的かつ安全な改善を実現します。

---

## 1. レガシーコード改善戦略

**レガシーコードの定義：** テストがないため、変更が困難で、副作用が不透明なコード

**保護戦略：**

**仕様化テスト（Characterization Test）：** レガシーコードの実際の振る舞いを「仕様」として記録するテスト
- 現在の（正しいかどうかに関わらず）振る舞いをテストで定義
- リファクタリング後も同じ振る舞いを保証する「回帰テスト」として機能

```
// レガシーコード
function calculateDiscount(amount) {
  if (amount > 1000) return amount * 0.9;
  return amount;
}

// 仕様化テスト（現在の振る舞いを記録）
test('1000を超える金額は10%割引される', () => {
  expect(calculateDiscount(1500)).toBe(1350);
});
```

**スプラウトメソッド・ラップメソッド：** 既存コードを傷つけずに新機能を追加
- スプラウト：新しい機能を別メソッドに抽出し、テスト
- ラップ：既存メソッドの呼び出しを新メソッドで包む

---

## 2. ポート・アダプターパターン

**目的：** 外部依存（DB、API、UI）をコアロジックから分離し、テスタビリティ・柔軟性を向上

**ポート：** コアロジックが依存する「インターフェース」
- 例：`UserRepository` インターフェース（ユーザーデータの永続化方法は問わない）

**アダプター：** ポートを具体実装するもの
- 実装版：`DatabaseUserRepository`（MySQL を使用）
- テスト版：`InMemoryUserRepository`（メモリに保存）

**Primary vs Secondary：**
- **Primary（駆動側）：** ユーザー、API クライアント等、システムを外から駆動する存在
- **Secondary（駆動される側）：** DB、外部 API 等、システムが外に依存する存在

**ポート定義例：**
```typescript
interface UserRepository {
  findById(id: string): User | null;
  save(user: User): void;
}

class UserService {
  constructor(private repository: UserRepository) {}
  
  updateUser(id: string, name: string) {
    const user = this.repository.findById(id);
    user.name = name;
    this.repository.save(user);
  }
}
```

**テストでの活用：**
```typescript
const mockRepository: UserRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};

const service = new UserService(mockRepository);
// DB を使わずテスト可能
```

---

## 3. リファクタリング基礎

**目的：** 外部仕様を変えず、内部構造を改善（特定の観点から）

**段階的リファクタリング：**
- メソッド抽出：長いメソッドを小さなメソッドに分割
- 条件分岐簡素化：複雑な if-else を Strategy パターン等で改善
- 重複排除：同じロジックを関数化

**テストによる安全性確保：**
```
元のテストが緑 → リファクタリング → テストが緑のまま
= 外部仕様が保たれている証拠
```

---

## 4. クリーンアーキテクチャ

**同心円構造：** 中心（ビジネスロジック）から外側へ進むほど、フレームワーク・DB・UI 等、詳細な実装技術が配置される

**層の役割：**
- **Entity（エンティティ）：** ビジネスルール
- **Use Case（ユースケース）：** アプリケーション固有のビジネスロジック
- **Interface Adapter（インターフェースアダプター）：** Controller、Presenter、Gateway（DB、API）
- **Frameworks & Drivers：** Web フレームワーク、DB ライブラリ等

**依存性のルール：** 内側の層は、外側の層に依存してはならない
- OK：UI → Use Case
- NG：Use Case → UI

**依存性逆転（DIP）：** インターフェースに依存し、具体実装は後で注入
```typescript
// 良い例
class OrderService {
  constructor(private paymentGateway: PaymentGateway) {}
}

// 実装を注入
const service = new OrderService(new StripePaymentGateway());
```

---

## 5. リファクタリングの実践

**段階的改善プラン：**
1. 仕様化テストで現在の振る舞いを保護
2. ポート・アダプターで依存性を抽出
3. ユースケース層に集中したロジックを実装
4. 古いコードを段階的に置き換え

**効果測定：** テストカバレッジの向上、複雑度の低下、テスト実行時間
