# 仕様駆動開発（SDD）

## 概要

仕様駆動開発（Specification-Driven Development）は、形式的な仕様記述（数学的に厳密な形式）に基づいてソフトウェアを開発する手法です。BDDが「人間が読める言語」で要件を記述するのに対し、SDDは「数学的に曖昧さのない形式」で仕様を定義し、その仕様から直接コードを生成したり、自動的に仕様の充足性を証明します。

## 契約による設計（Design by Contract）

クラスやメソッドの振る舞いを「契約」として明示的に定義する手法。契約は3つの要素で構成：

| 要素 | 説明 |
|------|------|
| **前提条件（Precondition）** | メソッド呼び出し時に満たされるべき条件。呼び出し側の責任 |
| **事後条件（Postcondition）** | メソッド実行後に必ず満たされる条件。実装側の責任 |
| **不変条件（Invariant）** | オブジェクトのライフタイム全体で常に満たされる条件 |

```java
public class BankAccount {
  private double balance;

  /**
   * 前提条件：amount > 0 AND amount <= balance
   * 事後条件：balance == old(balance) - amount
   * 不変条件：balance >= 0
   */
  public void withdraw(double amount) {
    if (amount <= 0) throw new IllegalArgumentException("正の数");
    if (amount > balance) throw new InsufficientFundsException();
    balance -= amount;
    assert balance >= 0 : "不変条件が破られました";
  }
}
```

## 形式的仕様記述

SDDの本来の形は、形式的な数学言語を使って仕様を記述すること。代表言語：

- **Z言語**：集合論ベース
- **TLA+**：時間論理ベース（分散システム向け）
- **Alloy**：関係代数ベース（軽量）

```
Z言語での例：
─────────────────────────────────
BankAccount
───────────
accountId: AccountId
balance: ℕ       // 自然数（0以上）

Withdraw
────────
amount? ≤ balance    // 前提条件
balance' = balance - amount?  // 事後条件
```

## 仕様記述のレベル

| レベル | 説明 |
|--------|------|
| **システム仕様** | システム全体の動作を数学的に定義 |
| **インターフェース仕様** | メソッド・クラスの振る舞いを定義 |
| **実装仕様** | アルゴリズムの詳細を定義 |

```
例：給与管理システム

システム仕様：
  ∀e ∈ employees: salary(e) = baseSalary(e) × (1 - taxRate(e))

インターフェース仕様：
  method calculateSalary(e: Employee, period: DateRange): Money
  postcondition: result = e.baseSalary × (1 - e.taxRate)
```

## 形式的証明

SDDの強力な特徴は、プログラムの正当性を数学的に証明できること：

```
例：整数ソート関数

仕様：
─────────────────────────────────
sort(arr: int[]): int[]
postcondition:
  ∀i < j: result[i] ≤ result[j]  // ソート済み
  ∀x ∈ arr: x ∈ result            // 要素が失われていない
  length(result) = length(arr)    // 長さが変わらない

形式的証明：
1. ベースケース（arr.length = 0 or 1）→ 自明にソート済み ✓
2. 帰納ステップ（arr.length > 1）→ 全要素が処理される ✓
  → QED（証明完了）
```

## AI駆動開発での役割

SDDはAI駆動開発の最終段階で特に価値を発揮：

```
AI駆動開発のフロー：

段階1：BDD（人間が要件を書く）
  Scenario: 給与を計算する
    Then 手取りが800である

段階2：TDD（テストに変換）
  @Test void testSalaryCalculation()
    { assertEquals(800, calc(1000)); }

段階3：SDD（形式的仕様で検証）
  ∀employee:
    calculateSalary(e) = e.baseSalary × (1 - e.taxRate)
  形式的証明：すべての従業員で成立

段階4：AIが仕様から実装を生成
  public double calculateSalary(Employee e) {
    return e.baseSalary * (1 - e.taxRate);
  }
  ※AIが生成したコードが形式的仕様を満たすことを自動検証
```

## 複数AIエージェント間での一貫性保証

```
AIエージェント1（給与計算）
  仕様：salary(e) = baseSalary(e) × (1 - taxRate(e))

AIエージェント2（税務処理）
  仕様：tax(e) = baseSalary(e) × taxRate(e)

AIエージェント3（給与明細作成）
  仕様：netSalary(e) = salary(e)

→ 形式的証明により、3つのエージェント間に矛盾がないことを
  数学的に保証できます
```

## メリットと課題

| メリット | 課題 |
|---------|------|
| 曖昧さがない（数学的に厳密） | 形式仕様記述に高度な数学知識が必要 |
| バグを設計段階で排除 | 規模が大きいと仕様記述自体が複雑化 |
| 自動テスト生成 | すべての仕様を形式化できるとは限らない |
| 並行処理・分散システムの正当性証明 | |

## 現実的な活用

```
小規模プロジェクト：BDD + TDD で十分
大規模・複雑なプロジェクト：BDD + TDD + SDD
  ├─ ビジネス要件：Gherkin（BDD）
  ├─ 実装要件：テスト（TDD）
  └─ クリティカルロジック：形式仕様（SDD）

リアルタイム・並行処理システム：SDD
  └─ 「いつデッドロックが起きるか」を数学的に証明
```

SDDは、AI駆動開発において「AIが生成したコードは本当に仕様を満たしているか」を数学的に保証するための最後の砦です。
