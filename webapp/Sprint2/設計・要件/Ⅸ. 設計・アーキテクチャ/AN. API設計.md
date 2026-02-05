# AN. API設計

## 概要

API設計は、クライアント・サーバー間の通信契約を定義するプロセスです。OpenAPI（OAS）仕様を用いてスキーマファーストアプローチを実現し、API定義から自動でドキュメント・コード生成・バリデーションを行うことで、開発効率と品質を両立させます。

---

## 1. レート制限アルゴリズム

API を過度に利用されないよう、リクエスト数を制限する仕組みが必要です。

**トークンバケット方式：** 一定時間に許可される「トークン」を管理
```
初期: バケット容量 = 100トークン
毎秒: 10トークン追加（最大100を超えない）
リクエスト: 1リクエスト = 1トークン消費

結果: 秒単位での急激なバースト要求を制限しつつ、
     平均的な利用は許可
```

**実装例：**
```
ユーザーAの利用:
  00秒: 100トークン（満杯）
  10秒間に50リクエスト → 50トークン消費 → 50トークン残
  11秒: 50 + 10 = 60トークン（再充填）
```

---

## 2. OpenAPI（OAS）の構造

**OpenAPI とは：** REST API の仕様を記述する標準フォーマット

**基本構造：**
```yaml
openapi: 3.0.0
info:
  title: E-commerce API
  version: 1.0.0

paths:
  /products:
    get:
      summary: Get all products
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Product'

components:
  schemas:
    Product:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        price:
          type: number
      required:
        - id
        - name
```

**Swagger UI / ReDoc：** OAS ファイルから自動的にインタラクティブなドキュメントを生成
- ブラウザでエンドポイント・パラメータ・レスポンス例を確認
- API テスト機能で実際にリクエストを送信可能

---

## 3. スキーマファースト開発

**流れ：**
1. OpenAPI 仕様を記述
2. 仕様から型定義・ルーティング・バリデーションコード自動生成
3. クライアント・サーバーが同じスキーマに基づいて実装

**メリット：**
- クライアント・サーバーの「契約」が明確化
- 誤ったスキーマでの実装を防止
- ドキュメント = 仕様 = コード（二重管理がない）

**生成ツール：**
- OpenAPI Generator：複数言語対応
- swagger-codegen：Java、Node.js 対応
- Zod、TypeScript：型安全なバリデーション

---

## 4. スキーマバリデーション

**リクエストバリデーション：** 受け取ったデータが OAS スキーマに準拠しているか検証

```typescript
// リクエストボディのバリデーション
app.post('/products', (req, res) => {
  // OpenAPI スキーマに基づいて検証
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      price: { type: 'number', minimum: 0 }
    },
    required: ['name', 'price']
  };
  
  // Zod/Joi/Ajv でバリデーション
  const result = validate(req.body, schema);
  if (!result.valid) {
    return res.status(400).json({ errors: result.errors });
  }
  // 処理続行
});
```

**エラーレスポンスの統一：** バリデーションエラーを一貫したフォーマットで返す
```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "price", "message": "must be >= 0" }
  ]
}
```

---

## 5. API設計のベストプラクティス

**リソース指向アーキテクチャ：** HTTP メソッド + URL でアクションを表現
```
GET    /products         → 一覧取得
GET    /products/:id     → 詳細取得
POST   /products         → 作成
PUT    /products/:id     → 更新
DELETE /products/:id     → 削除
```

**冪等性（Idempotency）：** 同じリクエストを何度実行しても、結果が同じ
- GET / PUT / DELETE：冪等（複数回実行で状態が変わらない）
- POST：冪等でない可能性（毎回新しいリソース作成）

**ページネーション・フィルタリング：**
```
GET /products?page=2&limit=20&category=electronics
```

</EOFZ
