# AK. ソフトウェア設計原則

## 概要

ソフトウェア設計原則は、保守性・拡張性・可読性を実現するためのガイドラインです。SOLID原則をはじめ、DRY、KISS、YAGNI、関心の分離などの原則があります。

---

## SOLID原則

### Single Responsibility Principle (単一責任)
各クラス・関数は1つの責任のみを持つ。変更の影響範囲が最小化され、テストが容易になります。

### Open/Closed Principle (開放閉鎖)
拡張には開き、修正には閉じているべき。既存コードに変更を加えず新機能を追加できる設計。

```python
# 良い例: 抽象クラスで拡張性を確保
from abc import ABC, abstractmethod

class PaymentMethod(ABC):
    @abstractmethod
    def process(self, amount): pass

class CreditCard(PaymentMethod):
    def process(self, amount): pass

class PaymentProcessor:
    def process(self, payment: PaymentMethod, amount):
        payment.process(amount)  # 新しい支払い方法追加時に修正不要
```

### Liskov Substitution Principle (リスコフ置換)
派生クラスは基底クラスと互換性を持つべき。親クラスを子クラスに置き換えても動作する設計。

### Interface Segregation Principle (インターフェース分離)
不要な依存性を強いるべきではない。大きなインターフェースを小さく分割し、必要な部分のみに依存。

### Dependency Inversion Principle (依存性逆転)
高レベルモジュールが低レベルモジュールに依存すべきではなく、両者が抽象に依存すべき。

---

## その他の重要原則

### DRY (Don't Repeat Yourself)
同じロジック・知識の重複を排除。修正負担が減り、バグ修正の影響範囲が最小化。

### KISS (Keep It Simple, Stupid)
シンプルで理解しやすいコード設計を優先。複雑な実装よりも、明確で保守しやすい実装を目指す。

```python
# 良い例: 複数の責任を関数に分割
def calculate_price(items, discount_code, customer_type):
    subtotal = sum(item['price'] * item['qty'] for item in items)
    discount = get_discount_rate(discount_code)
    vip_bonus = 0.05 if customer_type == "VIP" else 0
    return subtotal * (1 - discount - vip_bonus)
```

### YAGNI (You Aren't Gonna Need It)
必要になるまで実装を遅延させる。使用予定のない機能で無駄な複雑性を追加しない。

### 関心の分離 (Separation of Concerns)
異なる関心事を分離し、各モジュールが1つの関心に焦点を当てる。テストと保守が容易になります。

---

## 適用時の注意点

- **段階的導入**: すべての原則を一度に適用する必要はない。チームのスキル・要件に合わせて段階的に導入
- **バランス**: 過度な抽象化は逆に複雑性を増す。適切なレベルでの設計が重要
- **チーム共通認識**: チーム全体で原則を理解し実践することで初めて効果が発揮される
