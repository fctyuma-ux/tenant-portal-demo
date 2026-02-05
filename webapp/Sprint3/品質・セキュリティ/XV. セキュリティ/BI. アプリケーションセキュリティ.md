# BI. アプリケーションセキュリティ

## 概要

アプリケーションセキュリティはブラウザと Web サーバー間の通信をセキュアにする基盤です。このセクションではセキュリティヘッダーの種類・役割、特に Content-Security-Policy (CSP) と Strict-Transport-Security (HSTS) に焦点を当てて解説します。

適切なヘッダー設定により、XSS、クリックジャッキング、MITM 攻撃など多くの脅威を未然に防ぎます。

---

## 1. セキュリティヘッダーの役割

Web セキュリティヘッダーはブラウザに対して「どのような行為を許可するか」を指示します。

- **受動的防御**：既知の脅威パターンを検知
- **先制的防御**：不正なリソース読み込みを事前に遮断
- **ブラウザ実装依存**：古いブラウザでは効果なし

ヘッダーはサーバーのレスポンスに含めて送出されます。

---

## 2. Content-Security-Policy (CSP)

**役割と効果**
- XSS（クロスサイトスクリプティング）を防止
- インラインスクリプトや外部スクリプトの読み込み制御
- レポート機能で違反を検知

**CSP の基本形**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://trusted-cdn.com
```

- `default-src 'self'`：デフォルトは同一オリジンのみ
- `script-src`：スクリプト読み込み元を指定
- `'unsafe-inline'`：インラインスクリプト許可（非推奨）

**段階的な導入**
```
# 1. まずレポートモードで違反検知
Content-Security-Policy-Report-Only: default-src 'self'; ...

# 2. 本運用ではヘッダーを有効化
Content-Security-Policy: default-src 'self'; ...
```

---

## 3. Strict-Transport-Security (HSTS)

**役割と効果**
- HTTP から HTTPS への自動リダイレクトをブラウザに指示
- MITM（中間者攻撃）による HTTP ダウングレードを防止
- プリロードリストに登録すると、新規インストール時も HTTPS 強制

**HSTS ヘッダーの設定**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- `max-age`：ブラウザがこの指示を記憶する期間（秒）
- `includeSubDomains`：サブドメインにも適用
- `preload`：Chrome/Firefox/Safari のプリロードリストに登録申請

---

## 4. その他の重要ヘッダー

**X-Frame-Options**
```
X-Frame-Options: DENY
```
- iframe での埋め込みを禁止（クリックジャッキング対策）

**X-Content-Type-Options**
```
X-Content-Type-Options: nosniff
```
- MIME タイプの推測を禁止（スクリプト実行回避）

**Referrer-Policy**
```
Referrer-Policy: strict-origin-when-cross-origin
```
- リファラー情報の送出ルールを制御

---

## 5. セキュリティヘッダーの適用

**最小限の設定セット**
```python
from flask import Flask

app = Flask(__name__)

@app.after_request
def set_security_headers(response):
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'"
    return response
```

---

## 6. CSP の設定と調整

**本運用に向けた最適化**
1. レポートモードでログ収集（1～2週間）
2. 違反ログを確認し、許可するドメインを追加
3. 本運用ヘッダーへ移行

**よくある違反と対応**
- インラインスタイル：`style-src 'unsafe-inline'` を追加（推奨されない）
- 外部 API 呼び出し：API ドメインを `connect-src` に追加
- Google Fonts：`fonts.googleapis.com` と `fonts.gstatic.com` を許可

---

## 7. ヘッダー設定の検証

**オンラインツール**
- Mozilla Observatory（セキュリティ採点）
- Security Header.io（ヘッダー診断）

**curl による確認**
```bash
curl -I https://example.com | grep -i "Content-Security-Policy\|Strict-Transport"
```

定期的な検証により、ヘッダー設定のずれを早期に検知します。
