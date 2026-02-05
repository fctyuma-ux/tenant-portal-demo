# AN. API設計

## 概要

APIのバージョニングと進化管理は、後方互換性を保ちながら機能を拡張するための重要なパターンです。クライアント・サーバー間の契約を明確にし、段階的な廃止戦略により既存ユーザーへの影響を最小化します。

---

## 1. バージョニング戦略

**ヘッダーによるバージョニング：** `Accept: application/vnd.api+json;version=1`のようにヘッダーで指定。URLを変更しないため、キャッシュやCDNのルール変更が不要です。

**Semantic Versioning (SemVer)：** `MAJOR.MINOR.PATCH` 形式。MAJORは後方非互換な変更、MINORは後方互換な機能追加、PATCHはバグ修正。

**URLバージョニング：** `/api/v1/users` → `/api/v2/users`。古いバージョンの廃止が明確ですが、ルーティング複雑性が増します。

---

## 2. Deprecation戦略

**Deprecationヘッダー：** 廃止予定のエンドポイントに `Deprecation: true` と `Sunset: <HTTP-date>` を返します。クライアント開発者に事前通知できます。

段階的な廃止スケジュール：
1. Deprecationヘッダーを追加（6ヶ月）
2. ドキュメント更新・通知メール送信
3. サンセット日を設定（さらに6ヶ月）
4. エンドポイント削除

```
Deprecation: true
Sunset: Wed, 21 Nov 2025 11:30:00 GMT
Link: </api/v2/users>; rel="successor-version"
```

---

## 3. ゲートウェイオフロード

**Gateway Offloading：** API ゲートウェイで認証・レート制限・ロギングを一元管理。バックエンドサービスは本来のロジックに専念できます。

ゲートウェイの責務：
- SSL/TLS ターミネーション
- リクエスト/レスポンス変換
- レート制限・クォータ管理
- ロギング・監視

---

## 4. 次世代プロトコル

**gRPC Gateway / gRPC-Web：** Protocol Buffersを使用した高速通信。モバイルやブラウザクライアントに対して、gRPC-Webで HTTP/1.1 互換にします。

利点：
- RESTより3～7倍高速
- 型安全（スキーマ定義）
- ストリーミング対応
- ペイロード削減

```protobuf
// user_service.proto
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(Empty) returns (stream User);
}
```

---

## 5. バージョン間の互換性管理

**段階的拡張：** 新フィールドは追加のみ、既存フィールドは削除禁止。デフォルト値を明示し、クライアント側で無視できる設計。

**ドキュメント管理：** OpenAPI（Swagger）でバージョン別エンドポイント定義を保持。変更履歴は CHANGELOG.md で管理。

---

## 要件カバレッジ

本セクションは以下のitemsをカバーしています：ヘッダーによるバージョニング、Semantic Versioning、Deprecationヘッダーの付与、Gateway Offloading、gRPC Gateway / gRPC-Web
