# テスト駆動開発（TDD）

## 概要

テスト駆動開発（Test-Driven Development）は、実装コードを書く前にテストを書く手法です。「テストが仕様である」という考え方により、要件を明確にし、保守性の高いコードを産み出します。

## Red-Green-Refactorサイクル

TDDは3つのステップを繰り返します：

| ステップ | 説明 |
|---------|------|
| **RED** | テストが失敗する状態。実装がないため当然失敗 |
| **GREEN** | テストを通すための最小限の実装。美しさは後で |
| **REFACTOR** | テストが緑のままコードを改善。重複排除・可読性向上 |

```java
// RED：銀行口座から金銭を引き出すテスト
@Test
public void testWithdraw() {
  BankAccount account = new BankAccount(1000);
  account.withdraw(200);
  assertEquals(800, account.getBalance());
}

// GREEN→REFACTOR：改善された実装
public class BankAccount {
  private double balance;
  private List<Transaction> history;

  public void withdraw(double amount) {
    if (amount <= 0) throw new IllegalArgumentException("正の数");
    if (amount > balance) throw new InsufficientFundsException();
    balance -= amount;
    history.add(new Transaction("引き出し", amount));
  }

  public double getBalance() { return balance; }
}
```

## テストファースト思考

テスト先行は単なる順序ではなく、思考プロセスの変化です：

**従来（実装ファースト）**：仕様 → 曖昧な理解 → 実装 → 気づいて修正 → テスト

**TDD（テストファースト）**：仕様 → 成功基準を具体化 → テスト → 実装 → 改善

## TDDのメリット

| メリット | 説明 |
|---------|------|
| **バグの早期発見** | テストで要件を厳密に定義 |
| **設計の改善** | テストしやすい設計（疎結合）が自然に導出される |
| **ドキュメント効果** | テストコード＝生きた仕様書 |

```java
// TDDで自然に導かれる設計（依存性注入）
public class OrderProcessor {
  private Database db;
  private EmailService email;

  public OrderProcessor(Database db, EmailService email) {
    this.db = db; this.email = email;
  }

  public void processOrder(Order order) {
    db.save(order); email.send("注文確定");
  }
}
// テスト時にモック（偽オブジェクト）を注入できる
```

## AI駆動開発での役割

- **AIへの指示の明確化**：テストが要件の仕様書となり、AIが「何を実装するか」を正確に理解
- **自動検証**：生成されたコードがテストで即座に検証可能
- **複数AIエージェント間の同期**：すべてのエージェントが同じテスト仕様を共有

TDDは、人間がAIに「正確に何をしてほしいのか」を伝えるための最高のコミュニケーション手段です。
