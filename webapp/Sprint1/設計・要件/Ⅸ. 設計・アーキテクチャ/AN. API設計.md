# AN. API設計

## 概要

API設計はクライアント・サーバー間の通信仕様を定義するプロセス。REST、GraphQL、gRPCなど複数のパラダイムがあり、要件に応じて選択します。

---

## REST API設計

HTTPプロトコルの標準メソッド（GET、POST、PUT、DELETE）を活用し、リソース指向の設計を行うパターン。

### 設計原則

```
# リソース指向（良い例）
GET    /api/users              # ユーザー一覧取得
POST   /api/users              # ユーザー作成
GET    /api/users/{id}         # 特定ユーザー取得
PUT    /api/users/{id}         # ユーザー更新
DELETE /api/users/{id}         # ユーザー削除

# 悪い例（RPC的）
GET    /api/getUser            # 動作を中心にした設計
POST   /api/createUser
POST   /api/updateUser
```

### HTTPメソッドと適切なステータスコード

```python
# GET: リソース取得（べき等、キャッシュ可能）
@app.route('/api/users/<id>', methods=['GET'])
def get_user(id):
    return jsonify(user), 200  # 200 OK

# POST: リソース作成（べき等なし）
@app.route('/api/users', methods=['POST'])
def create_user():
    user = UserService.create(request.json)
    return jsonify(user), 201  # 201 Created

# PUT: リソース全体置き換え（べき等）
@app.route('/api/users/<id>', methods=['PUT'])
def update_user(id):
    user = UserService.update(id, request.json)
    return jsonify(user), 200

# DELETE: リソース削除（べき等）
@app.route('/api/users/<id>', methods=['DELETE'])
def delete_user(id):
    UserService.delete(id)
    return '', 204  # 204 No Content
```

### ペーギング・フィルタリング・ソート

```python
@app.route('/api/products', methods=['GET'])
def list_products():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    category = request.args.get('category')
    sort_by = request.args.get('sort_by', 'created_at')

    products = ProductService.search(page, per_page, category, sort_by)
    return jsonify(products), 200
```

- **利点**: シンプル、キャッシング優秀、ブラウザ対応
- **欠点**: オーバーフェッチ、アンダーフェッチの可能性
- **適用**: Webアプリケーション、公開API、シンプルな操作

---

## GraphQL設計

クライアントが必要なデータを明確に指定でき、オーバーフェッチやアンダーフェッチを回避できるクエリ言語。

```graphql
# スキーマ定義
type User {
  id: ID!
  name: String!
  email: String!
  orders: [Order!]!
}

type Order {
  id: ID!
  user: User!
  items: [OrderItem!]!
  total: Float!
  status: OrderStatus!
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
}

type Query {
  user(id: ID!): User
  orders(userId: ID!): [Order!]!
}

type Mutation {
  createUser(name: String!, email: String!): User!
  updateOrderStatus(id: ID!, status: OrderStatus!): Order!
}
```

```graphql
# クライアント: 必要なフィールドのみ取得
query GetUserWithOrders {
  user(id: "123") {
    name
    email
    orders {
      id
      total
      items {
        product { name, price }
        quantity
      }
    }
  }
}
```

- **利点**: 必要なデータのみ取得、開発効率、複雑なクエリに強い
- **欠点**: キャッシング困難、実装複雑性
- **適用**: モバイルアプリ、複雑なクエリ、開発効率重視

---

## gRPC設計

高性能な遠隔手続き呼び出しフレームワーク。バイナリ通信とHTTP/2を活用し、マイクロサービス間通信に最適。

```protobuf
syntax = "proto3";

service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc CreateUser (CreateUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
  int64 created_at = 4;
}

message GetUserRequest {
  string id = 1;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}
```

```python
# サーバー実装例
class UserServicer(UserServiceServicer):
    def GetUser(self, request, context):
        user = UserRepository.find(request.id)
        if not user:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            return User()
        return User(id=user.id, name=user.name, email=user.email)
```

- **利点**: 高パフォーマンス、バイナリ効率、型安全
- **欠点**: ブラウザ対応困難、学習曲線高い
- **適用**: マイクロサービス、高パフォーマンス要求、内部通信

---

## エラーハンドリング

### REST APIエラーレスポンス（統一形式）

```python
@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'error': {
            'code': 'BAD_REQUEST',
            'message': 'The request is invalid',
            'details': str(error)
        }
    }), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': {
            'code': 'NOT_FOUND',
            'message': 'The requested resource was not found'
        }
    }), 404
```

### GraphQLエラーハンドリング

```python
class CreateUserMutation(graphene.Mutation):
    user = graphene.Field(UserType)
    success = graphene.Boolean()
    errors = graphene.List(graphene.String)

    def mutate(root, info, name, email):
        errors = []
        if not name:
            errors.append('Name is required')
        if '@' not in email:
            errors.append('Valid email is required')

        if errors:
            return CreateUserMutation(success=False, errors=errors)

        user = User(name=name, email=email)
        db.session.add(user)
        db.session.commit()
        return CreateUserMutation(user=user, success=True)
```

---

## 選択時の比較

| 特性 | REST | GraphQL | gRPC |
|------|------|---------|------|
| 学習曲線 | 低 | 中 | 高 |
| キャッシング | 優秀 | 困難 | 困難 |
| 開発速度 | 速い | 中程度 | 遅い |
| パフォーマンス | 中程度 | 悪い | 優秀 |
| ブラウザ対応 | 優秀 | 優秀 | 困難 |
| 実装複雑性 | 低 | 中 | 高 |

**選択ガイド:**
- REST: Webアプリケーション、公開API、シンプルな操作
- GraphQL: モバイルアプリ、複雑なクエリ、開発効率重視
- gRPC: マイクロサービス、高パフォーマンス要求、内部通信
