# 振る舞い駆動開発（BDD）

## 概要

振る舞い駆動開発（Behavior-Driven Development）は、TDDを進化させた手法です。「振る舞い（ビジネス要件）が仕様である」という考え方に基づき、開発者、QA、ビジネスアナリストが**同じ言語**で要件を記述し、それが自動実行可能なテストになります。

## Given-When-Then（GWT）フレームワーク

振る舞いを3つのパートで表現：

```
Given（与えられた）→ When（～のとき）→ Then（そのとき）
前提条件            アクション       期待される結果
システムの初期状態   ユーザーの操作   検証対象
```

## Gherkinシンタックス

BDDの標準言語。ビジネス側が読める言語で要件を記述し、自動的にテストに変換：

```gherkin
Feature: 顧客が食品をオンラインで注文する

  Scenario: VIP顧客は配送料が無料になる
    Given 顧客"田中太郎"がVIP会員である
    And 顧客のショッピングカートに商品が入っている
    When 顧客が注文を確定する
    Then 注文の配送料は0円である
    And 確認メールが顧客に送信される
```

## Gherkinからテストコードへの自動変換

各ステップがJavaメソッドに自動マップ（Cucumberフレームワーク）：

```java
public class OrderStepDefinitions {
  private Customer customer;
  private Order order;

  @Given("顧客{string}がVIP会員である")
  public void customerIsVIPMember(String name) {
    customer = new Customer(name);
    customer.setMembershipLevel(MembershipLevel.VIP);
  }

  @When("顧客が注文を確定する")
  public void customerConfirmsOrder() {
    order = new OrderService().createOrder(customer);
  }

  @Then("注文の配送料は{int}円である")
  public void shippingCostShouldBe(int expectedCost) {
    assertEquals(expectedCost, order.getShippingCost());
  }
}
```

## BDDの力：ビジネス側と開発側の共有言語

| 従来のプロセス（曖昧性） | BDD（共通言語） |
|----------------------|-----------------|
| ビジネス → 仕様書 → 開発 → QA（各段階で認識ズレ） | ビジネス側の言語がそのままテストになる（認識ズレなし） |

```gherkin
# ビジネス側が書く（これがそのままテストになる）
Scenario: VIP顧客は配送料が無料になる
  Given VIP顧客がいる
  When 注文を確定する
  Then 配送料は0円である
# ↓ 自動的にテストに変換される → 実装と常に同期
```

## シナリオ設計パターン

| パターン | 説明 |
|---------|------|
| **Happy Path** | 正常な流れで成功 |
| **Exception Path** | エラー・例外処理 |
| **Boundary Case** | 境界値（最大・最小値） |

## AI駆動開発での役割

- **曖昧性の排除**：Given-When-Then構造により、AIが解釈する余地がない
- **複数AIエージェント間の同期**：すべてのエージェントが同じ「成功基準」を共有
- **自動検証**：Gherkinシナリオは自動的にテストに変換され、AI生成コードを即座に検証

BDDは「人間とAIが同じ言語で対話する」AI駆動開発の実現方法です。
