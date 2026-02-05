# BH. 認証・認可

## 概要

認証はユーザーの身元確認、認可はそのユーザーが何をできるかの制御です。Cookie によるセッション管理と JWT トークンの使い分け、RBAC / ABAC によるアクセス制御、最小権限の原則が安全で柔軟なシステムを実現します。クライアント・サーバー間での権限検証が信頼性を確保します。

---

## 1. Cookie とセッション

**役割:** ステートフルな認証（サーバー側に状態を保持）

### Cookie の概要

```http
# サーバーがクライアントにCookieを設定
Set-Cookie: sessionId=abc123; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600

# クライアントが以後のリクエストに自動付与
Cookie: sessionId=abc123
```

### Cookie セキュリティ属性

| 属性 | 説明 | 重要度 |
|------|------|--------|
| **HttpOnly** | JavaScript からアクセス不可（XSS対策） | 必須 |
| **Secure** | HTTPS のみで送信 | 必須 |
| **SameSite=Strict** | 異なりサイトからのリクエストで送信しない（CSRF対策） | 高 |
| **Path=/api** | 特定パスのみ送信 | 中 |
| **Max-Age** | 有効期限（秒） | 高 |

**Next.js での Cookie 設定:**
```typescript
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();

  // ログイン時にCookieを設定
  cookieStore.set('sessionId', generateSessionId(), {
    httpOnly: true,    // XSS対策
    secure: true,      // HTTPS強制
    sameSite: 'strict', // CSRF対策
    maxAge: 3600       // 1時間
  });

  return Response.json({ success: true });
}
```

---

## 2. JWT（JSON Web Token）

**役割:** ステートレスな認証（サーバー側に状態を保持しない）

### JWT 構造

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWxpY2UiLCJpYXQiOjE2MDAwMDAwMDB9.
SIGNATURE

╰─ Header (Base64)  ──→ {"alg":"HS256","typ":"JWT"}
   ╰─ Payload (Base64) ──→ {"sub":"123","name":"Alice","iat":1600000000}
   ╰─ Signature ──────────→ HMAC-SHA256(header.payload, secret)
```

### JWT 発行と検証

```typescript
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

// JWT 発行
export function generateToken(userId: string) {
  return jwt.sign(
    {
      sub: userId,        // Subject（ユーザーID）
      iat: Math.floor(Date.now() / 1000), // Issued At
      exp: Math.floor(Date.now() / 1000) + 3600  // Expiration（1時間後）
    },
    SECRET
  );
}

// JWT 検証
export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Next.js API での検証
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    return Response.json({ userId: payload.sub });
  } catch (error) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }
}
```

---

## 3. リフレッシュトークンフロー

**役割:** JWT の有効期限を短く保ち、刷新する仕組み

```
【認証フロー】
1. ユーザーがログイン
   ↓
2. サーバー: accessToken（15分有効）+ refreshToken（7日有効）を発行
   ↓
3. クライアント: accessToken でAPI呼び出し
   ↓
4. accessToken が期限切れ
   ↓
5. refreshToken でトークン刷新リクエスト
   ↓
6. 新しい accessToken を取得して再試行
```

**実装例：**
```typescript
// トークン発行
export function issueTokens(userId: string) {
  const accessToken = jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    process.env.REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

// トークン刷新
export async function POST(request: Request) {
  const { refreshToken } = await request.json();

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET!);
    const newAccessToken = jwt.sign(
      { sub: payload.sub },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    return Response.json({ accessToken: newAccessToken });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// クライアント: SWR / axios インターセプタで自動刷新
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL
});

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const { data } = await axios.post('/api/auth/refresh', {
        refreshToken: localStorage.getItem('refreshToken')
      });
      localStorage.setItem('accessToken', data.accessToken);
      return axiosInstance(error.config); // リトライ
    }
    throw error;
  }
);
```

---

## 4. RBAC（Role-Based Access Control）

**役割:** ロール（役割）に基づいたアクセス制御

```typescript
// ロール定義
type Role = 'admin' | 'moderator' | 'user' | 'guest';

const permissions: Record<Role, string[]> = {
  admin: ['read', 'create', 'update', 'delete', 'manage_users'],
  moderator: ['read', 'create', 'update', 'delete'],
  user: ['read', 'create', 'update'],
  guest: ['read']
};

// 権限チェック関数
function hasPermission(role: Role, action: string): boolean {
  return permissions[role].includes(action);
}

// API でのチェック
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.slice(7);
  const payload = verifyToken(token);
  const user = await db.user.findById(payload.sub);

  if (!hasPermission(user.role, 'create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 処理実行
  return Response.json({ success: true });
}

// React でのUI制御
export function EditPostButton({ post, user }) {
  if (!hasPermission(user.role, 'update')) {
    return null; // ボタンを表示しない
  }

  return <button onClick={() => editPost(post.id)}>編集</button>;
}
```

---

## 5. ABAC（Attribute-Based Access Control）

**役割:** 属性（ユーザー属性・リソース属性・環境）に基づいたアクセス制御

```typescript
// 属性の定義
interface User {
  id: string;
  department: string;  // 属性: 部門
  level: number;       // 属性: レベル
  createdAt: Date;
}

interface Resource {
  id: string;
  owner: string;       // 属性: 所有者
  classification: 'public' | 'internal' | 'confidential';
  department: string;
}

// ポリシー定義
function canAccess(user: User, resource: Resource, action: string): boolean {
  // Rule 1: 所有者は常にアクセス可能
  if (user.id === resource.owner) return true;

  // Rule 2: 公開リソースは誰でも読み取り可能
  if (resource.classification === 'public' && action === 'read') return true;

  // Rule 3: 同部門かつレベル3以上は内部リソースにアクセス可能
  if (
    user.department === resource.department &&
    user.level >= 3 &&
    resource.classification === 'internal'
  ) return true;

  // Rule 4: 管理者（レベル5）は全リソースにアクセス可能
  if (user.level === 5) return true;

  return false;
}
```

---

## 6. リソース所有者の制御

**役割:** ユーザーが自分のリソースのみを操作できるようにする

```typescript
// API: ユーザー自身のプロフィール更新
export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const token = request.headers.get('authorization')?.slice(7);
  const payload = verifyToken(token);

  // 他者のリソースの更新を防ぐ
  if (payload.sub !== params.userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  await db.user.update(params.userId, body);
  return Response.json({ success: true });
}

// API: ユーザーの記事一覧（自身のみ）
export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const token = request.headers.get('authorization')?.slice(7);
  const payload = verifyToken(token);

  // 他者の非公開記事は見えない
  const articles = await db.article.findMany({
    where: {
      userId: params.userId,
      ...(payload.sub !== params.userId ? { published: true } : {})
    }
  });

  return Response.json(articles);
}
```

---

## 7. フロントエンドの権限制御

**役割:** ユーザー体験を改善（不要なUI非表示）

```typescript
// AuthContext の作成
import { createContext, useContext } from 'react';

interface AuthContext {
  user: User | null;
  loading: boolean;
  canAccess: (action: string) => boolean;
}

const AuthCtx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decoded = jwt_decode(token);
        setUser(decoded);
      } catch {
        localStorage.removeItem('accessToken');
      }
    }
    setLoading(false);
  }, []);

  const canAccess = (action: string) => {
    if (!user) return false;
    return permissions[user.role]?.includes(action) ?? false;
  };

  return (
    <AuthCtx.Provider value={{ user, loading, canAccess }}>
      {children}
    </AuthCtx.Provider>
  );
}

// 使用例
export function Dashboard() {
  const auth = useContext(AuthCtx)!;

  if (auth.loading) return <Spinner />;

  return (
    <div>
      {auth.canAccess('update') && <EditButton />}
      {auth.canAccess('delete') && <DeleteButton />}
      {auth.user?.role === 'admin' && <AdminPanel />}
    </div>
  );
}
```

---

## 8. ログアウトと権限失効

```typescript
// ログアウト API
export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('sessionId');

  // また、refreshToken をブラックリストに追加（オプション）
  // または、DB に logout_at タイムスタンプを記録
  const token = request.headers.get('authorization')?.slice(7);
  await db.logout.create({ token, loggedOutAt: new Date() });

  return Response.json({ success: true });
}

// クライアント
function LogoutButton() {
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  };

  return <button onClick={handleLogout}>ログアウト</button>;
}
```

---

## 9. セキュリティチェックリスト

- [ ] Cookie に HttpOnly と Secure を設定しているか
- [ ] JWT の有効期限は短く（15分程度）設定しているか
- [ ] refreshToken は安全に保存されているか（localStorage ではなく）
- [ ] RBAC / ABAC を定義し、ドキュメント化しているか
- [ ] リソース所有者チェックはサーバー側で必ず実施しているか
- [ ] フロントエンドの権限制御は UI 改善のみで、セキュリティ判定ではないか
- [ ] ログアウト時に token を無効化する仕組みがあるか
- [ ] 権限エラーは 403 Forbidden で返しているか

---

## まとめ

認証と認可は多層的で、Cookie / JWT・RBAC / ABAC・サーバー・クライアントでの検証が不可欠です。
最小権限の原則に基づいて、ユーザーに必要最小限の権限のみを付与することが重要です。
