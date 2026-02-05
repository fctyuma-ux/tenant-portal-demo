# CM. Agent・ツール連携

## 概要

LLMエージェントは、外部ツール・API・計算機能を動的に呼び出す自律的なシステムです。Function Calling により、LLMは「何をすべきか」を判断し、外部関数の実行を指示できます。このセクションでは、Function Calling の仕組み、複数関数の管理、並列実行、エラーハンドリング、そしてエージェントの実装パターンを学びます。

---

## 1. Function Calling の定義と仕組み

**Function Calling とは:**
- LLM が外部関数呼び出しを「リクエスト」する機能
- LLM は直接関数を実行せず、「〇〇を実行して」と指示する
- アプリケーションが実際に関数を実行し、結果を LLM に返す

**フロー:**

```
ユーザー入力
    ↓
LLM が状況判定
    ↓
「search_web()を実行してください」と指示
    ↓
アプリが search_web() を実行
    ↓
結果を LLM に返す
    ↓
LLM が結果を統合して応答生成
```

---

## 2. 関数定義の形式

**Anthropic Function Calling（Tools）:**

```python
tools = [
    {
        "name": "get_weather",
        "description": "指定都市の現在の天気を取得",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "都市名（日本語）"
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "温度単位"
                }
            },
            "required": ["city"]
        }
    }
]
```

**関数定義の要素:**
- `name`：関数名（一意であること）
- `description`：関数の説明（LLMが判定用に読む）
- `input_schema`：入力パラメータを JSON Schema で定義
- `required`：必須パラメータ

---

## 3. Function Calling の実装

**基本的な流れ:**

```python
import anthropic
import json

client = anthropic.Anthropic()

# ツール定義
tools = [
    {
        "name": "calculator",
        "description": "数学計算を実行",
        "input_schema": {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": ["add", "subtract", "multiply", "divide"]
                },
                "a": {"type": "number"},
                "b": {"type": "number"}
            },
            "required": ["operation", "a", "b"]
        }
    }
]

# 関数の実装
def calculator(operation: str, a: float, b: float) -> float:
    if operation == "add":
        return a + b
    elif operation == "subtract":
        return a - b
    elif operation == "multiply":
        return a * b
    elif operation == "divide":
        return a / b if b != 0 else None

# LLM 呼び出し
user_message = "25と17を足してください。その後、結果を3で割ってください"

messages = [{"role": "user", "content": user_message}]

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=tools,
    messages=messages
)

# Function Calling ループ
while response.stop_reason == "tool_use":
    # LLM が呼び出した関数を取得
    tool_calls = [block for block in response.content if block.type == "tool_use"]

    # 関数実行と結果収集
    tool_results = []
    for tool_call in tool_calls:
        tool_name = tool_call.name
        tool_input = tool_call.input

        # 関数実行
        result = calculator(**tool_input)

        tool_results.append({
            "type": "tool_result",
            "tool_use_id": tool_call.id,
            "content": str(result)
        })

    # 結果を LLM に返す
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": tool_results})

    # 次のレスポンスを取得
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        tools=tools,
        messages=messages
    )

# 最終的なテキスト応答を出力
final_response = next(
    (block.text for block in response.content if hasattr(block, "text")),
    None
)
print(final_response)
```

---

## 4. 複数関数の登録と選択

**複数関数の例:**

```python
tools = [
    {
        "name": "search_database",
        "description": "社内データベースを検索",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "limit": {"type": "integer", "default": 10}
            },
            "required": ["query"]
        }
    },
    {
        "name": "send_email",
        "description": "メール送信",
        "input_schema": {
            "type": "object",
            "properties": {
                "to": {"type": "string"},
                "subject": {"type": "string"},
                "body": {"type": "string"}
            },
            "required": ["to", "subject", "body"]
        }
    },
    {
        "name": "schedule_meeting",
        "description": "会議をスケジュール",
        "input_schema": {
            "type": "object",
            "properties": {
                "attendees": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "date": {"type": "string"},
                "duration_minutes": {"type": "integer"}
            },
            "required": ["attendees", "date"]
        }
    }
]

# 関数実装
def execute_tool(tool_name: str, tool_input: dict):
    if tool_name == "search_database":
        # データベース検索を実装
        return f"検索結果: {tool_input['query']}"
    elif tool_name == "send_email":
        # メール送信を実装
        return f"メール送信完了: {tool_input['to']}"
    elif tool_name == "schedule_meeting":
        # 会議スケジュールを実装
        return f"会議スケジュール完了: {len(tool_input['attendees'])}人"
    else:
        return "不明な関数"
```

---

## 5. Parallel Function Calling

**目的:**
- 複数の関数を同時に呼び出し
- 処理時間短縮、効率化

**実装例:**

```python
def agent_with_parallel_calls(user_query: str):
    """並列 Function Calling に対応"""

    messages = [{"role": "user", "content": user_query}]

    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        tools=tools,
        messages=messages
    )

    while response.stop_reason == "tool_use":
        # 複数の tool_use ブロックを取得
        tool_calls = [block for block in response.content if block.type == "tool_use"]

        # 複数関数を並列実行
        import concurrent.futures

        tool_results = []

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = {}
            for tool_call in tool_calls:
                future = executor.submit(
                    execute_tool,
                    tool_call.name,
                    tool_call.input
                )
                futures[future] = tool_call.id

            # 結果を収集
            for future in concurrent.futures.as_completed(futures):
                tool_use_id = futures[future]
                result = future.result()
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_use_id,
                    "content": str(result)
                })

        # LLM に結果を返す
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            tools=tools,
            messages=messages
        )

    # 最終応答を返す
    return next(
        (block.text for block in response.content if hasattr(block, "text")),
        "処理完了"
    )
```

---

## 6. エラーハンドリング

**関数実行エラーの処理:**

```python
def execute_tool_safe(tool_name: str, tool_input: dict) -> str:
    """エラーハンドリング付き関数実行"""

    try:
        if tool_name == "search_database":
            # 接続エラーの可能性
            if not check_database_connection():
                return "エラー: データベースに接続できません"
            return search_database(**tool_input)

        elif tool_name == "send_email":
            # メール送信エラーの可能性
            if not validate_email(tool_input.get("to")):
                return "エラー: 無効なメールアドレスです"
            return send_email(**tool_input)

        else:
            return "エラー: 不明な関数です"

    except Exception as e:
        return f"エラー: {str(e)}"

# tool_result に成功/失敗を含める
tool_results.append({
    "type": "tool_result",
    "tool_use_id": tool_call.id,
    "content": execute_tool_safe(tool_call.name, tool_call.input),
    "is_error": "エラー:" in result  # エラーフラグ
})
```

---

## 7. エージェント実装パターン

**リアクティブエージェント（ReAct）:**

```python
class ReActAgent:
    def __init__(self, tools: list):
        self.tools = tools
        self.client = anthropic.Anthropic()
        self.max_iterations = 10

    def run(self, user_query: str) -> str:
        """ユーザークエリを実行"""

        messages = [
            {
                "role": "user",
                "content": f"""
あなたは有能なアシスタントです。
質問に答えるため、必要に応じて利用可能なツールを使用してください。

ユーザーの質問: {user_query}
"""
            }
        ]

        iteration = 0
        while iteration < self.max_iterations:
            iteration += 1

            # LLM 呼び出し
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2048,
                tools=self.tools,
                messages=messages
            )

            # テキスト応答がある場合、終了
            text_blocks = [block for block in response.content if hasattr(block, "text")]
            if response.stop_reason == "end_turn" and text_blocks:
                return text_blocks[0].text

            # Tool use が含まれている場合、実行
            tool_calls = [block for block in response.content if block.type == "tool_use"]
            if not tool_calls:
                break

            # ツール実行
            messages.append({"role": "assistant", "content": response.content})

            tool_results = []
            for tool_call in tool_calls:
                result = execute_tool_safe(tool_call.name, tool_call.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_call.id,
                    "content": result
                })

            messages.append({"role": "user", "content": tool_results})

        return "最大反復数に達しました"
```

---

## ポイント

- Function Calling は LLM が関数呼び出しを「指示」し、アプリが実際に実行する仕組み
- 関数定義は JSON Schema で厳密に記述し、LLM が正確に理解できるようにする
- 複数関数対応時は、関数ごとに説明を明確に書き、LLM が最適選択できるように設計
- Parallel Calling で複数関数を同時実行し、処理時間短縮
- エラーハンドリングは関数実行レベルで実装し、LLM に結果を正確に伝える
- エージェント実装は反復ループで Tool use → 実行 → 結果返却を繰り返す
