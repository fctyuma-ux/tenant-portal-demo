# AA. コンテキスト・エンジニアリング

## 概要
AIが高品質なコード提案をするには、十分な「コンテキスト（文脈・背景情報）」が必要です。開発生産性は「AIに何を伝えるか」に大きく左右されます。

---

## 1. コンテキスト設計

### 1.1 情報の層構造
```
Layer 1: プロジェクト全体（目的、技術スタック、アーキテクチャ方針）
Layer 2: 関連機能（既存コード、DBスキーマ、APIパターン）
Layer 3: 具体的タスク（要件、入出力形式、制約条件）
Layer 4: 参考実装（類似コード、ベストプラクティス）
```

### 1.2 効果的なコンテキスト例
```
❌ 不十分: 「ユーザー登録API を書いてください」

✅ 充実したコンテキスト:
【プロジェクト背景】Node.js + Express + PostgreSQL、TypeScript
【既存ユーザーモデル】id(UUID), email(unique), hashedPassword, createdAt, updatedAt
【API設計慣例】{ error: string, code: number }, { data: object, status: 'success' }
【要件】POST /api/users、password: 8文字以上・大小英数含む、バリデーションエラー: 422
【既存実装参考】LoginService.ts の例を示す
```

---

## 2. 情報の取捨選択

### 2.1 優先度付け
```
★★★ 必須: 入出力形式、バリデーション、エラーハンドリング、既存モデル、セキュリティ要件
★★  推奨: 同じ領域の実装、API規約、技術スタック
★   補足: ビジョン説明、詳細な命名規約
❌  不要: 関連ドメイン詳細、全体システム図、過去のメール内容
```

### 2.2 情報最適化フロー
```
1. 必要な情報を列挙（タスク、要件、ユーザー、既存コード、制約）
2. 優先度をつける（★★★～★）
3. トークン数（文字数）確認
4. 曖昧な表現・矛盾を除去
```

---

## 3. 効果的な指示

### 3.1 構造化された指示
```
❌ 非構造化: 「パスワードは最小8文字、大文字小文字含む、数字も、記号もあるといい」

✅ 構造化:
【必須要件】最小8文字、大文字1文字以上、小文字1文字以上、数字1文字以上
【推奨要件】記号(!@#$%^&*)を1文字以上含む
【エラー処理】バリデーション失敗時は例外、メッセージは日本語
【テスト条件】正常系'Abc12345'、エラー系'abcdef'（大文字なし）
```

### 3.2 曖昧さを排除
```
「高速にする」→「O(n log n)以下に」または「1000件で100ms以内」
「使いやすく」→「API は RESTful に従う」「HTTP ステータスコード採用」
「安全に」→「パスワードはbcryptでハッシュ化」「入力値は全て検証」
```

### 3.3 例示による指示
```
【リクエスト例】
POST /api/users
{ "email": "alice@example.com", "username": "alice", "password": "SecurePass123!" }

【レスポンス例 - 成功 (201)】
{ "data": { "id": "uuid-123", "email": "alice@example.com", "username": "alice" }, "status": "success" }

【レスポンス例 - メール重複 (409)】
{ "error": "メールアドレスは既に登録されています", "code": 409 }
```

---

## 4. コンテキスト管理の実践

### 4.1 ドキュメント化による保持
```
プロジェクト立ち上げ時:
- README: プロジェクト概要・セットアップ
- ARCHITECTURE.md: システム構成・レイヤー設計
- API.md: API仕様・エラーコード
- CODING_STANDARD.md: コーディング規約

実装時: README、既存実装ファイル、API.md から関連セクションを引用
```

### 4.2 段階的なコンテキスト拡張
```
タスク1: ユーザー登録 → コンテキスト: ユーザーモデル、バリデーション
タスク2: パスワードリセット → コンテキスト: メール送信、トークン生成（タスク1を流用）
タスク3: OAuth連携 → コンテキスト: OAuth設定、ユーザーマッピング（タスク1・2を参照）
```

### 4.3 定期更新
```
❌ AIプロンプトだけ更新
✅ ドキュメント＋プロンプト両方更新
理由: ドキュメントが Source of Truth となり、全員が同じ情報源を参照可能
```

---

## 5. 情報の種類別ガイド

### 5.1 データ構造情報
```
❌ テキスト: 「User テーブルには id, email, password があります」

✅ スキーマ:
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  hashedPassword VARCHAR(255) NOT NULL
);
理由: SQLは曖昧さがなく、AIも容易に理解可能
```

### 5.2 既存実装の参照
```
❌ 全ファイル貼り付け（500行全部）
✅ 関連部分だけ抽出:
「既存の LoginService から参考:
const loginUser = async (email: string, password: string) => {
  const user = await User.findByEmail(email);
  if (!user) throw new Error('User not found');
  const isValid = await bcrypt.compare(password, user.hashedPassword);
  if (!isValid) throw new Error('Invalid password');
  return user;
};
これと同じパターンでユーザー登録を実装してください」
```

---

## まとめ

**重点項目:**
- コンテキストは多層構造（プロジェクト → 機能 → タスク）
- 必要な情報を優先度順に整理
- 構造化・具体化して曖昧さを排除
- ドキュメント化で情報を再利用
- 質 > 量: AIに与える情報は「質」が重要
