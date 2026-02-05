# AB. AI生成コードの検証

## 概要
AI生成コードは必ず人間が検証する必要があります。多層防御として機能する検証プロセスにより、見落としを防ぎ本番環境での問題を未然に防げます。

---

## 1. コードレビュー

### 1.1 静的レビューの流れ
```
ステップ1: 要件との照合
- AI が要件を正しく理解したか
- すべての要件が実装されているか

例: 要件「パスワードをbcryptでハッシュ化」
    AI提案「password をそのまま保存」→ ❌ 不承認

ステップ2: パターン・慣例の確認
- プロジェクト既存コードとの一貫性
- チームの命名規則に従っているか

例: 慣例「async/await を使う」
    AI提案「.then().catch()」→ スタイル修正

ステップ3: エラーハンドリング
- エラーケースがすべてカバーされているか
- リソースリークがないか
```

### 1.2 セキュリティチェック
```
1. 入力値検証
❌ db.query(`UPDATE users SET ... WHERE id = ${id}`);  // SQL注入
✅ db.query('UPDATE users SET ... WHERE id = ?', [id]);  // パラメータ化

2. パスワード・トークン管理
❌ return Math.random().toString(36);  // 暗号的に不安全
✅ return crypto.randomBytes(32).toString('hex');  // 暗号乱数

3. 認証・認可
❌ const getUserData = (userId) => { return db.user(userId); }  // 確認なし
✅ if (userId !== authenticatedUserId && !isAdmin(authenticatedUserId)) throw new UnauthorizedError();

4. データ公開
❌ { user: { ...user, hashedPassword } }  // 機密情報露出
✅ { user: { id, email, username } }  // 必要なデータのみ
```

### 1.3 パフォーマンスレビュー
```
1. アルゴリズム計算量
❌ O(n²): for (let i = 0; i < users.length; i++) { for (let j = i + 1; j < users.length; j++) }
✅ O(n): const emails = new Set(); users.forEach(u => emails.has(u.email));

2. N+1クエリ問題
❌ orders.map(async (order) => { customer: await db.customers.find({ id: order.customerId }) })
✅ SELECT orders.*, customers.* FROM orders JOIN customers ... WHERE userId = ?

3. メモリ効率
❌ const data = fs.readFileSync('huge-file.json');  // 全読み込み
✅ fs.createReadStream('huge-file.json').pipe(JSONStream.parse('*'));  // ストリーム処理
```

---

## 2. テスト

### 2.1 テスト駆動開発との組み合わせ
```
ステップ1: 人間がテストを書く（先に）
describe('User Registration', () => {
  it('should create a user with valid email', () => {});
  it('should reject duplicate email', () => {});
  it('should hash password', () => {});
});

ステップ2-4: AI が実装 → テスト実行 → パス / 失敗時は AI 修正
```

### 2.2 テストケースの網羅性
```
【正常系】有効なデータで登録成功、password がハッシュ化、password がレスポンスに含まれない

【エラー系】email 空 → 422、password 8文字未満 → 422、重複 email → 409

【セキュリティ系】SQL注入処理、XSS入力エスケープ、password が平文でレスポンスに入らない

【パフォーマンス系】1000件のユーザーがいても高速、DB接続プール正常使用

AI は正常系しか生成しない傾向があるため、セキュリティ・パフォーマンス系は人間が追加
```

### 2.3 テスト結果の検証
```
✅ PASS: 実装がテストを満たしている
❌ FAIL: 実装が要件を満たしていない → AI に修正指示 → 再テスト
⚠️ PASS だが疑問がある: テストが不十分な可能性 → テストケース追加

例: パスワードハッシュ化テストが PASS でも、
毎回異なるハッシュが生成されるかの確認がないなら、
改善テストを追加する必要がある
```

---

## 3. セキュリティチェック

### 3.1 OWASP Top 10との対照
```
1. Injection（SQLインジェクション）
✅ 対策: パラメータ化クエリを使用

2. Authentication（認証の失敗）
✅ 対策: bcrypt でパスワードをハッシュ化、暗号乱数でトークン生成

3. Sensitive Data Exposure（機密情報漏洩）
✅ 対策: エラーメッセージ・ログ・APIレスポンスに機密情報を含めない

4. Access Control（アクセス制御の不備）
✅ 対策: API に認証チェック、操作対象が本人か確認
```

### 3.2 静的解析ツール
```
ESLint セキュリティプラグイン:
npm install --save-dev eslint-plugin-security
実行: npm run lint

検出例:
⚠️ Potential SQL Injection detected
⚠️ Use crypto module for random generation
```

### 3.3 セキュリティレビューチェックリスト
```
[ ] 入力値検証（パラメータ検証、データ型チェック、範囲チェック）
[ ] 認証・認可（認証ミドルウェア、リソース所有者確認、権限レベル確認）
[ ] データ保護（bcrypt/scryptハッシュ化、機密情報除外、ログ記録なし）
[ ] エラーハンドリング（詳細メッセージ避止、スタックトレース返さない）
[ ] 依存関係（脆弱性ライブラリ確認）

スキャン: npm audit
```

---

## 4. 統合的な検証フロー

### 4.1 検証の多層構造
```
Layer 1: 自動構文チェック（JavaScript有効性、型チェック）
Layer 2: 静的解析（ESLint、セキュリティプラグイン、脆弱性スキャン）
Layer 3: ユニットテスト（関数単位、エッジケース）
Layer 4: 統合テスト（複数モジュール、DB クエリ）
Layer 5: 人間レビュー（ビジネスロジック、セキュリティ、パフォーマンス）
Layer 6: 本番前テスト（E2E、ステージング環境）
```

### 4.2 問題発見時の対応
```
ステップ1: 問題を記録（「テスト: AuthService.login で無効パスワードの時にエラーが返されない」）
ステップ2: AI に修正を指示（テスト内容・現在のコードを示す）
ステップ3: AI が修正提案
ステップ4: 再テスト（パス確認）
ステップ5: コード内にコメント記録（問題・原因・修正内容）
```

---

## 5. 検証の自動化と効率化

### 5.1 CI/CDパイプライン
```
CI パイプライン:
→ lint（ESLint）
→ type-check（TypeScript）
→ Unit tests
→ Security audit (npm audit)
→ SAST（静的解析）
→ Integration tests
→ build

全てのステップがパス → マージ可能
1つでも失敗 → マージ不可、AI に修正を指示
```

### 5.2 継続的な改善
```
1回目: AI がセキュリティバグを生成
→ セキュリティレビュー強化、チェックリスト追加

2回目: 同じ種類のバグは出ない
→ コンテキストに「セキュリティ要件」を明記、テンプレート共有

3回目以降: 定型的な部分の品質が向上
→ 複雑な部分に集中可能
```

---

## まとめ

**重点項目:**
- 多層的な検証（自動 + 手動）
- テストが要件を満たすかを客観的に検証
- セキュリティチェック（OWASP）を必ず実施
- 自動ツール活用で検証効率化
- 検証結果を「学習」として次の開発に活かす
