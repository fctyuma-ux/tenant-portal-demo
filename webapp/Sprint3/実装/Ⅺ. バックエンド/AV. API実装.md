# AV. API実装

## 概要

APIの仕様を統一的に管理し、開発効率を向上させることは重要です。OpenAPI Specification (OAS) は業界標準のAPI定義フォーマットであり、Swagger UIを組み合わせることで、ドキュメント自動生成、クライアント生成、テスト環境の構築が実現できます。

---

## OpenAPI Specification (OAS)

OpenAPI Specification は、REST APIを言語非依存的に記述するための仕様です。エンドポイント、リクエスト・レスポンス形式、認証方式などを統一フォーマットで定義します。

**OASの主要要素:**
- **Paths：** エンドポイントと対応するHTTPメソッド
- **Components/Schemas：** リクエスト・レスポンスの型定義
- **Parameters：** クエリ、パス、ヘッダーパラメータ
- **Security Schemes：** 認証方式（OAuth2、APIキーなど）
- **Examples：** 実行例

OAS 3.0.0 以降が標準となっており、JSON または YAML形式で記述します。

---

## Swagger UI

Swagger UIは、OpenAPI定義から自動生成される対話的なAPI ドキュメント＆テストツールです。ブラウザからAPIエンドポイントを直接呼び出すことができ、開発時の確認が効率的になります。

**特徴:**
- ドキュメント自動生成
- Try It Out（実行テスト）機能
- 複数バージョンの管理
- セキュリティスキーム対応

---

## Zod to OpenAPIによる自動生成

手書きのOAS定義は保守が困難です。Zodで定義したスキーマから自動生成することで、実装とドキュメントの乖離を防ぎます。

**実装例:**
```typescript
import { z } from 'zod';
import { generateSchema } from '@zod-openapi/zod-to-openapi';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  createdAt: z.date(),
});

const openApiSchema = generateSchema(UserSchema, {
  description: 'User object',
});

// OpenAPI仕様に組み込み
```

このアプローチにより、型安全性を保ちながらドキュメントが常に最新に保たれます。

---

## Swagger UIの組み込み

Express/Node.jsを使った組み込み例：

```javascript
import swaggerUi from 'swagger-ui-express';
import { generateOpenAPIDocument } from './openapi-generator';

const openApiDocument = generateOpenAPIDocument();
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
```

`/api/docs` にアクセスすると、Swagger UIが利用可能になります。

---

## ベストプラクティス

- **バージョン管理：** API変更時は旧バージョンも提供継続
- **エラー定義の統一：** 共通エラーコードを定義し、OASで記述
- **レート制限の記載：** ドキュメント内にレート制限を明記
- **例の充実：** 実装例を複数示すことで利用者の理解を促進
