# BG. 外部API・サービス連携

## 概要

外部API・SaaS連携は現代的なアプリケーション開発の必須スキルです。このセクションでは、通信の信頼性確保（タイムアウト、リトライ、サーキットブレーカー）、Webhook の実装、署名検証によるセキュリティ、レート制限対応、そして実践的なユースケース（Stripe連携、天気情報表示）までを網羅します。

---

## 1. タイムアウト設定

**目的:**
- 無限待機の防止
- ユーザーエクスペリエンス向上
- リソースリーク防止

**実装例：**

```python
import requests
from requests.exceptions import Timeout, ConnectTimeout

def call_external_api(url: str, timeout_sec: int = 5):
    """タイムアウト付き API 呼び出し"""

    try:
        # connect_timeout: 接続確立の待機時間
        # read_timeout: レスポンス読み込みの待機時間
        response = requests.get(
            url,
            timeout=(connect_timeout=3, read_timeout=timeout_sec)
        )
        return response.json()

    except ConnectTimeout:
        print("接続タイムアウト")
        return None

    except Timeout:
        print("読み込みタイムアウト")
        return None

    except requests.RequestException as e:
        print(f"リクエストエラー: {e}")
        return None
```

**JavaScript（Node.js）:**

```javascript
async function callExternalAPI(url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('タイムアウト');
        } else {
            console.error('リクエストエラー:', error);
        }
        return null;
    }
}
```

---

## 2. サーキットブレーカーパターン

**目的:**
- 連続的な失敗を早期に検知
- 外部サービスのダウン時に負荷を軽減
- グレースフルな機能低下

**状態遷移:**

```
正常（Closed）
    ↓（失敗連続）
開放（Open）
    ↓（タイムアウト後）
半開（Half-Open）
    ↓（成功で復帰）
正常（Closed）
```

**実装例：**

```python
from enum import Enum
import time

class CircuitBreakerState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout_sec=60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout_sec = timeout_sec
        self.last_failure_time = None
        self.state = CircuitBreakerState.CLOSED

    def call(self, func, *args, **kwargs):
        """サーキットブレーカー経由で関数呼び出し"""

        # Open 状態：呼び出し拒否
        if self.state == CircuitBreakerState.OPEN:
            if time.time() - self.last_failure_time > self.timeout_sec:
                self.state = CircuitBreakerState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN")

        # 関数実行
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result

        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        """成功時の処理"""
        self.failure_count = 0
        self.state = CircuitBreakerState.CLOSED

    def _on_failure(self):
        """失敗時の処理"""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitBreakerState.OPEN

# 使用例
breaker = CircuitBreaker()

def unreliable_api():
    # 時々失敗する API
    import random
    if random.random() < 0.3:
        raise Exception("API failed")
    return "success"

try:
    result = breaker.call(unreliable_api)
except Exception as e:
    print(f"Error: {e}")
```

---

## 3. リトライ処理の実装

**戦略:**
- 指数バックオフ：待機時間を指数的に増加（1秒 → 2秒 → 4秒...）
- ジッター（Jitter）：同時リトライを分散

**実装例：**

```python
import time
import random
from functools import wraps

def retry_with_backoff(max_retries=3, base_delay=1, max_delay=30):
    """指数バックオフ付きリトライデコレータ"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)

                except Exception as e:
                    if attempt == max_retries - 1:
                        raise

                    # 指数バックオフ + ジッター
                    wait_time = min(base_delay * (2 ** attempt), max_delay)
                    jitter = random.uniform(0, wait_time * 0.1)
                    wait_time += jitter

                    print(f"リトライ {attempt + 1}/{max_retries}, {wait_time:.1f}秒待機...")
                    time.sleep(wait_time)

        return wrapper

    return decorator

@retry_with_backoff(max_retries=3)
def call_unstable_api():
    """不安定な API 呼び出し"""
    response = requests.get("https://unstable-api.example.com/data")
    response.raise_for_status()
    return response.json()
```

---

## 4. Webhook の仕組み

**概念:**
- クライアントがサーバーをポーリングするのではなく
- サーバーがイベント発生時にクライアントにコールバック（push）

**フロー:**

```
Stripe（外部サービス）
    ↓（支払い完了）
Webhook POST
    ↓
app.example.com/webhook/payment
    ↓
イベント処理
```

---

## 5. 署名検証（Signature Verification）

**目的:**
- リクエストが本当に外部サービスから来たか確認
- 改ざん検知

**Stripe Webhook例：**

```python
import hmac
import hashlib
import json
from flask import Flask, request

app = Flask(__name__)
WEBHOOK_SECRET = "whsec_xxx..."  # Stripe ダッシュボードから取得

@app.route('/webhook/stripe', methods=['POST'])
def stripe_webhook():
    """Stripe Webhook 受信"""

    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')

    # 署名検証
    try:
        event = verify_signature(payload, sig_header)
    except Exception as e:
        print(f"署名検証失敗: {e}")
        return "Unauthorized", 401

    # イベント処理
    event_type = event['type']

    if event_type == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        print(f"支払い成功: {payment_intent['id']}")
        # データベース更新等

    elif event_type == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        print(f"支払い失敗: {payment_intent['id']}")
        # ユーザー通知等

    return "OK", 200

def verify_signature(payload: bytes, sig_header: str) -> dict:
    """Stripe 署名検証"""

    # ペイロード + シークレットで HMAC-SHA256 計算
    expected_sig = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    # リクエストの署名と比較
    if not hmac.compare_digest(expected_sig, sig_header):
        raise Exception("Invalid signature")

    return json.loads(payload)
```

---

## 6. レート制限ハンドリング

**HTTP Status 429（Too Many Requests）への対応:**

```python
def call_with_rate_limit_handling(url: str, max_retries=3):
    """レート制限対応のAPI呼び出し"""

    for attempt in range(max_retries):
        try:
            response = requests.get(url)

            if response.status_code == 429:
                # Retry-After ヘッダーを確認
                retry_after = int(
                    response.headers.get('Retry-After', 60)
                )
                print(f"レート制限。{retry_after}秒待機...")
                time.sleep(retry_after)
                continue

            response.raise_for_status()
            return response.json()

        except requests.RequestException as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)

    return None
```

---

## 7. ユーザーごとのレート制限実装

**概念:**
- API利用者ごとに呼び出し数を制限
- 公平な利用を確保

**実装例：**

```python
from collections import defaultdict
import time

class RateLimiter:
    def __init__(self, requests_per_minute=60):
        self.requests_per_minute = requests_per_minute
        self.user_requests = defaultdict(list)

    def is_allowed(self, user_id: str) -> bool:
        """ユーザーのリクエストが許可されているか"""

        now = time.time()
        # 1分以内のリクエストを抽出
        recent = [
            t for t in self.user_requests[user_id]
            if now - t < 60
        ]

        if len(recent) >= self.requests_per_minute:
            return False

        # リクエストを記録
        self.user_requests[user_id] = recent + [now]
        return True

# 使用例
limiter = RateLimiter(requests_per_minute=100)

@app.route('/api/data')
def get_data():
    user_id = request.headers.get('X-User-ID')

    if not limiter.is_allowed(user_id):
        return {"error": "Rate limit exceeded"}, 429

    return {"data": "..."}
```

---

## 8. 天気情報表示の例

**実装全体：**

```python
import requests
from datetime import datetime

class WeatherService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.openweathermap.org/data/2.5/weather"

    def get_weather(self, city: str, unit: str = "metric") -> dict:
        """城市の天気情報を取得"""

        params = {
            "q": city,
            "appid": self.api_key,
            "units": unit  # "metric" = Celsius
        }

        try:
            response = requests.get(
                self.base_url,
                params=params,
                timeout=5
            )
            response.raise_for_status()

            data = response.json()
            return {
                "city": data["name"],
                "country": data["sys"]["country"],
                "temperature": data["main"]["temp"],
                "feels_like": data["main"]["feels_like"],
                "description": data["weather"][0]["description"],
                "humidity": data["main"]["humidity"],
                "wind_speed": data["wind"]["speed"],
                "timestamp": datetime.now().isoformat()
            }

        except requests.Timeout:
            return {"error": "Request timeout"}

        except requests.HTTPError as e:
            if e.response.status_code == 404:
                return {"error": f"City not found: {city}"}
            return {"error": str(e)}

# 使用例（Flask）
from flask import Flask, jsonify

app = Flask(__name__)
weather_service = WeatherService(api_key="your_api_key")

@app.route('/weather/<city>')
def get_weather_endpoint(city: str):
    weather = weather_service.get_weather(city)
    return jsonify(weather)

# 実行例
if __name__ == "__main__":
    weather = weather_service.get_weather("Tokyo")
    print(f"{weather['city']}: {weather['temperature']}°C, {weather['description']}")
```

---

## 9. キャッシング戦略

**外部APIのレスポンスをキャッシュ:**

```python
from functools import lru_cache
import time

class CachedWeatherService:
    def __init__(self, api_key: str, cache_ttl_sec=600):
        self.api_key = api_key
        self.cache = {}
        self.cache_ttl = cache_ttl_sec

    def get_weather(self, city: str) -> dict:
        """キャッシュ付き天気取得"""

        # キャッシュを確認
        if city in self.cache:
            cached_data, timestamp = self.cache[city]
            if time.time() - timestamp < self.cache_ttl:
                print(f"キャッシュから取得: {city}")
                return cached_data

        # 新鮮なデータを取得
        data = self._fetch_from_api(city)
        self.cache[city] = (data, time.time())

        return data

    def _fetch_from_api(self, city: str) -> dict:
        """実際の API 呼び出し"""
        # 天気情報取得処理
        pass
```

---

## ポイント

- タイムアウト設定は connect_timeout（接続） と read_timeout（読み込み）を分離
- サーキットブレーカーで連続的な外部サービス障害を早期に検知
- 指数バックオフ + ジッターでリトライを効率化
- Webhook は署名検証で正当性確保（改ざん防止）
- レート制限対応は Retry-After ヘッダーと user_id 別制限を組み合わせ
- 外部API は キャッシング で 呼び出し削減・コスト最適化
