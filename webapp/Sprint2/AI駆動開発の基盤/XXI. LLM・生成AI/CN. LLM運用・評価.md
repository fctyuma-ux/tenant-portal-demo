# CN. LLM運用・評価

## 概要

LLMを本番環境で運用するには、コスト管理、パフォーマンス監視、品質評価が不可欠です。このセクションでは、API料金最適化、トークン計測、キャッシング戦略、モデル選択の経済学、コスト監視ダッシュボード、そして A/B テストによる継続的改善まで、実運用に必要な知識を網羅します。

---

## 1. LLM API のコスト構造

**料金モデル:**
- **トークン単位：** 入力トークン（安い）と出力トークン（高い）で異なる
- **リクエスト単位：** API呼び出し1回で基本料金
- **ボリューム割引：** 大量利用で単価低下

**コスト比較例（2024年時点）:**

| モデル | 入力単価 | 出力単価 | 用途 |
|-------|--------|--------|------|
| Claude 3.5 Haiku | 低 | 低 | シンプル |
| Claude 3.5 Sonnet | 中 | 中 | バランス |
| Claude 3 Opus | 高 | 高 | 複雑推論 |
| GPT-4o | 中 | 高 | 汎用 |

---

## 2. トークン最適化

**トークン消費を削減:**

1. **プロンプトの簡潔化:**
   - 不要な前置きを削除
   - 例示の数を最適化（3～5個が目安）

2. **キャッシング活用:**
   - 同じコンテキスト部分を再利用
   - プロンプトキャッシング機能利用

3. **出力制限:**
   - `max_tokens` で不要な長文出力を制限
   - 段階的な出力リクエストで効率化

**コスト計測例:**

```python
import anthropic

client = anthropic.Anthropic()

def estimate_cost(text: str, model: str = "claude-3-5-sonnet-20241022"):
    """テキストのトークンコストを推定"""

    # トークン数計測（Anthropic API）
    token_count = client.messages.count_tokens(
        model=model,
        messages=[{"role": "user", "content": text}]
    )

    # 単価は参照資料から取得（例）
    price_map = {
        "claude-3-5-sonnet-20241022": {
            "input": 0.003 / 1000,      # $0.003 per 1K tokens
            "output": 0.015 / 1000
        },
        "claude-3-5-haiku-20241022": {
            "input": 0.00080 / 1000,
            "output": 0.004 / 1000
        }
    }

    prices = price_map[model]
    input_cost = token_count.input_tokens * prices["input"]
    # 出力は推定
    estimated_output_tokens = token_count.input_tokens * 0.5
    output_cost = estimated_output_tokens * prices["output"]

    return {
        "input_tokens": token_count.input_tokens,
        "estimated_output_tokens": estimated_output_tokens,
        "estimated_cost_usd": input_cost + output_cost
    }

# 使用例
result = estimate_cost("長いプロンプト...")
print(f"推定コスト: ${result['estimated_cost_usd']:.4f}")
```

---

## 3. Prompt Caching（プロンプトキャッシング）

**概念:**
- 同じプロンプト部分（例：会社ドキュメント）を複数リクエストで再利用
- キャッシュヒット時に安い料金で利用可能

**実装：**

```python
# キャッシュ対象：静的なシステムプロンプトやドキュメント
system_prompt_with_cache = """
あなたは企業の技術サポート担当者です。

【社内ドキュメント】（キャッシュ対象）
このセクションは複数リクエストで再利用される長いテキスト...
...大量のドキュメント内容...

【キャッシュ制御】
"""

# Anthropic APIでのキャッシング（フィーチャー確認が必要）
# API 仕様に従ってキャッシュフラグを設定
```

---

## 4. モデルの使い分け実装

**インテリジェントな モデル選択:**

```python
class ModelSelector:
    def __init__(self):
        self.models = {
            "simple": {
                "name": "claude-3-5-haiku-20241022",
                "cost": 0.001,
                "speed": "fast",
                "capability": "low"
            },
            "balanced": {
                "name": "claude-3-5-sonnet-20241022",
                "cost": 0.01,
                "speed": "medium",
                "capability": "high"
            },
            "advanced": {
                "name": "claude-3-opus-20250219",
                "cost": 0.075,
                "speed": "slow",
                "capability": "very_high"
            }
        }

    def select_model(self, complexity: str, budget_per_request: float) -> str:
        """タスク複雑度と予算からモデルを選択"""

        complexity_map = {
            "simple": "simple",          # 分類、簡単な質問
            "moderate": "balanced",      # 要約、翻訳
            "complex": "advanced"        # 複雑推論、コード生成
        }

        recommended = self.models[complexity_map.get(complexity, "balanced")]

        # 予算チェック
        if recommended["cost"] > budget_per_request:
            return self.models["simple"]["name"]

        return recommended["name"]

# 使用例
selector = ModelSelector()
model = selector.select_model("moderate", budget_per_request=0.05)
print(f"選択モデル: {model}")
```

---

## 5. コスト監視ダッシュボード

**計測項目:**
- 日別・ユーザー別のAPI呼び出し数
- モデル別の利用割合
- トークン消費トレンド
- コスト予測

**実装例：**

```python
import json
from datetime import datetime, timedelta

class CostMonitor:
    def __init__(self):
        self.logs = []

    def log_request(self, model: str, input_tokens: int, output_tokens: int):
        """API利用をログ"""

        self.logs.append({
            "timestamp": datetime.now().isoformat(),
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens
        })

    def get_daily_cost(self, days=7):
        """過去N日間の日別コスト"""

        prices = {
            "claude-3-5-sonnet-20241022": {"input": 0.003/1000, "output": 0.015/1000},
            "claude-3-5-haiku-20241022": {"input": 0.00080/1000, "output": 0.004/1000}
        }

        daily_costs = {}

        for log in self.logs:
            date = log["timestamp"].split("T")[0]
            if date not in daily_costs:
                daily_costs[date] = {"cost": 0, "requests": 0}

            prices_for_model = prices.get(log["model"], prices["claude-3-5-sonnet-20241022"])
            cost = (
                log["input_tokens"] * prices_for_model["input"] +
                log["output_tokens"] * prices_for_model["output"]
            )
            daily_costs[date]["cost"] += cost
            daily_costs[date]["requests"] += 1

        return daily_costs

    def forecast_monthly_cost(self):
        """月間コストの予測"""

        if not self.logs:
            return 0

        # 直近7日間の平均から推定
        recent_logs = [log for log in self.logs
                      if datetime.fromisoformat(log["timestamp"]) > datetime.now() - timedelta(days=7)]

        daily_avg = sum(log["cost"] for log in recent_logs) / 7 if recent_logs else 0
        monthly_forecast = daily_avg * 30

        return monthly_forecast

monitor = CostMonitor()
monitor.log_request("claude-3-5-sonnet-20241022", 1000, 500)
print(monitor.get_daily_cost())
```

---

## 6. A/B テストによる継続的改善

**テスト設計:**

```python
import random
from typing import Callable

class ABTestRunner:
    def __init__(self, variant_a: Callable, variant_b: Callable):
        self.variant_a = variant_a
        self.variant_b = variant_b
        self.results = {"A": [], "B": []}

    def run_test(self, test_cases: list, sample_ratio=0.5):
        """A/Bテストを実行"""

        for test_case in test_cases:
            variant = "A" if random.random() < sample_ratio else "B"

            if variant == "A":
                result = self.variant_a(test_case)
                self.results["A"].append(result)
            else:
                result = self.variant_b(test_case)
                self.results["B"].append(result)

    def analyze_results(self):
        """結果分析"""

        # 精度比較
        a_accuracy = sum(1 for r in self.results["A"] if r["correct"]) / len(self.results["A"])
        b_accuracy = sum(1 for r in self.results["B"] if r["correct"]) / len(self.results["B"])

        # コスト比較
        a_avg_cost = sum(r["cost"] for r in self.results["A"]) / len(self.results["A"])
        b_avg_cost = sum(r["cost"] for r in self.results["B"]) / len(self.results["B"])

        print(f"Variant A: 精度 {a_accuracy:.2%}, コスト ${a_avg_cost:.4f}")
        print(f"Variant B: 精度 {b_accuracy:.2%}, コスト ${b_avg_cost:.4f}")

        if a_accuracy > b_accuracy:
            print("→ Variant A を採用")
        elif b_accuracy > a_accuracy:
            print("→ Variant B を採用")
        else:
            print("→ 精度同等。コスト低い方を採用")
```

---

## 7. リアルタイムモニタリング

**監視する指標:**
- API レスポンス時間（p50, p95, p99）
- エラー率
- トークン消費レート
- 日次・週次のコスト増加率

**実装例：**

```python
import time
from collections import deque

class PerformanceMonitor:
    def __init__(self, window_size=1000):
        self.response_times = deque(maxlen=window_size)
        self.errors = deque(maxlen=window_size)
        self.costs = deque(maxlen=window_size)

    def record_request(self, duration_ms: float, error: bool = False, cost: float = 0):
        """リクエストを記録"""
        self.response_times.append(duration_ms)
        self.errors.append(error)
        self.costs.append(cost)

    def get_stats(self):
        """統計情報を取得"""
        import statistics

        response_times = list(self.response_times)
        response_times.sort()

        error_rate = sum(self.errors) / len(self.errors) if self.errors else 0
        total_cost = sum(self.costs)

        return {
            "avg_response_time_ms": statistics.mean(response_times),
            "p95_response_time_ms": response_times[int(len(response_times) * 0.95)],
            "error_rate": error_rate,
            "total_cost_usd": total_cost
        }
```

---

## 8. 品質評価指標

**定義:**

1. **精度（Accuracy）:** 正確な応答の割合
2. **再現性（Reproducibility）:** 同じ入力で一貫した出力
3. **遅延（Latency）:** API応答時間
4. **費用対効果（Cost-Effectiveness）:** 精度/コスト比

**評価テンプレート：**

```python
def evaluate_llm_quality(model: str, test_dataset: list):
    """LLMの品質を評価"""

    client = anthropic.Anthropic()
    scores = []

    for test_case in test_dataset:
        input_text = test_case["input"]
        expected_output = test_case["expected"]

        # LLM応答を取得
        start = time.time()
        response = client.messages.create(
            model=model,
            max_tokens=1024,
            messages=[{"role": "user", "content": input_text}]
        )
        latency = time.time() - start

        actual_output = response.content[0].text

        # 正確性を評価（簡易版）
        accuracy = 1.0 if expected_output.lower() in actual_output.lower() else 0.0

        scores.append({
            "accuracy": accuracy,
            "latency_ms": latency * 1000,
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens
        })

    # 統計計算
    avg_accuracy = sum(s["accuracy"] for s in scores) / len(scores)
    avg_latency = sum(s["latency_ms"] for s in scores) / len(scores)
    total_tokens = sum(s["tokens_used"] for s in scores)

    return {
        "model": model,
        "accuracy": avg_accuracy,
        "avg_latency_ms": avg_latency,
        "total_tokens": total_tokens,
        "quality_score": avg_accuracy * (1 - min(avg_latency / 5000, 1))  # 正確性 × 速度
    }
```

---

## ポイント

- API 料金はトークン単価で構成され、入出力で異なる
- トークン最適化は単なるコスト削減以上の価値（レスポンス速度向上）
- キャッシング機能で同じコンテキスト再利用時の料金を大幅削減
- モデル選択は複雑度・予算・レスポンス速度のバランスで判定
- ダッシュボードで日別・ユーザー別トレンド監視、予測
- A/B テストで定量的に精度向上効果を測定
- 継続的改善サイクルで品質とコストの最適バランスを実現
