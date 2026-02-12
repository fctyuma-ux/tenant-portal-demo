# Step 2: 俯瞰図解

## システム構成図

```mermaid
graph TB
    subgraph "ブラウザ"
        U[入居者] --> HOME[ホーム画面]
        U --> CHAT[チャット画面]
        A[管理者] --> DASH[ダッシュボード]
        A --> DOCS[ドキュメント管理]
        A --> FAQS[FAQ管理]
    end

    subgraph "Next.js (Vercel)"
        MW[Middleware<br/>認証・ルーティング]
        SA[Server Actions<br/>ログイン/Upload/FAQ]
        API[API Routes<br/>会話/メッセージ/解析]
        SVC[Domain Services<br/>chat-answer / pdf-analysis]
    end

    subgraph "Supabase"
        AUTH[Supabase Auth]
        DB[(PostgreSQL<br/>+ pgvector)]
        STR[Supabase Storage<br/>PDFファイル]
    end

    subgraph "外部API"
        OAI[OpenAI API<br/>GPT-4o-mini<br/>Embeddings]
    end

    HOME --> MW
    CHAT --> MW
    DASH --> MW
    DOCS --> MW
    FAQS --> MW

    MW --> AUTH
    MW --> SA
    MW --> API

    SA --> DB
    SA --> STR
    API --> SVC
    SVC --> DB
    SVC --> OAI
    SVC --> STR
```

## 3レイヤードアーキテクチャ

```mermaid
graph TB
    subgraph "Presentation Layer (app/)"
        P1[ページコンポーネント<br/>login, home, chat, admin/*]
        P2[Server Actions<br/>login, upload, FAQ CRUD]
        P3[API Routes<br/>conversations, messages, analyze, preview]
        P4[UIコンポーネント<br/>ChatClient, DocumentTable, etc.]
    end

    subgraph "Business Logic Layer (domain/services/)"
        B1[chat-answer.ts<br/>RAG回答生成]
        B2[pdf-analysis.ts<br/>PDF解析パイプライン]
    end

    subgraph "Data Access Layer (Supabase Client)"
        D1[server.ts<br/>サーバーサイドクライアント]
        D2[client.ts<br/>クライアントサイド]
        D3[admin.ts<br/>Service Role Key]
    end

    P3 --> B1
    P3 --> B2
    B1 --> D3
    B2 --> D3
    P1 --> D1
    P2 --> D1
    P4 --> D2
```

## AI チャット（RAG）フロー

```mermaid
sequenceDiagram
    participant U as 入居者
    participant FE as ChatClient
    participant API as /api/conversations/:id/messages
    participant SVC as chat-answer.ts
    participant OAI as OpenAI API
    participant DB as Supabase DB

    U->>FE: 質問入力 + 送信
    FE->>FE: 仮メッセージ表示 + タイピングアニメーション
    FE->>API: POST { content: "質問テキスト" }
    API->>DB: ユーザーメッセージ保存 (messages INSERT)
    API->>SVC: generateAnswer(question, propertyId)

    SVC->>OAI: Embeddings API (質問をベクトル化)
    OAI-->>SVC: query_embedding [1536次元]

    SVC->>DB: match_document_chunks(ベクトル類似度検索)
    DB-->>SVC: 上位5チャンク

    SVC->>DB: FAQキーワード検索 (ILIKE)
    DB-->>SVC: 関連FAQ最大3件

    SVC->>OAI: Chat Completions (system + context + question)
    OAI-->>SVC: AI回答テキスト

    SVC-->>API: { content, sources }
    API->>DB: AI回答メッセージ保存 (messages INSERT)
    API-->>FE: { user_message, assistant_message }

    FE->>FE: 仮メッセージ差替 + 回答表示
    U->>FE: フィードバック（👍/👎）
    FE->>API: PATCH /api/messages/:id/feedback
```

## PDF解析パイプライン

```mermaid
sequenceDiagram
    participant A as 管理者
    participant SA as Server Action
    participant API as /api/admin/documents/:id/analyze
    participant SVC as pdf-analysis.ts
    participant STR as Supabase Storage
    participant OAI as OpenAI Embeddings
    participant DB as Supabase DB

    A->>SA: PDFアップロード (Drag & Drop)
    SA->>STR: ファイル保存
    SA->>DB: documents INSERT (status: pending)

    A->>API: POST (解析開始)
    API->>SVC: analyzePdf(documentId)
    SVC->>DB: status → processing

    SVC->>STR: PDFダウンロード
    STR-->>SVC: PDFバイナリ

    SVC->>SVC: pdf-parse でテキスト抽出
    SVC->>SVC: チャンク分割 (500文字, 50文字overlap)

    loop バッチ処理 (20チャンクずつ)
        SVC->>OAI: Embeddings API
        OAI-->>SVC: ベクトル [1536次元] × N
    end

    SVC->>DB: document_chunks 一括INSERT
    SVC->>DB: status → completed

    SVC-->>API: { success: true }
    API-->>A: 解析完了
```

## 認証・ルーティングフロー

```mermaid
flowchart TD
    REQ[リクエスト] --> MW{Middleware}

    MW --> CHK1{認証済み?}
    CHK1 -->|No| PATH1{/login ?}
    PATH1 -->|Yes| LOGIN[ログイン画面表示]
    PATH1 -->|No| REDIR1[/login へリダイレクト]

    CHK1 -->|Yes| PATH2{/login ?}
    PATH2 -->|Yes| ROLE1{ロール判定}
    ROLE1 -->|admin| REDIR2[/admin へリダイレクト]
    ROLE1 -->|tenant| REDIR3[/home へリダイレクト]

    PATH2 -->|No| PATH3{/admin/* ?}
    PATH3 -->|Yes| ROLE2{admin ロール?}
    ROLE2 -->|Yes| ALLOW[アクセス許可]
    ROLE2 -->|No| REDIR4[/home へリダイレクト]

    PATH3 -->|No| ALLOW
```

## データベースER図

```mermaid
erDiagram
    properties ||--o{ users : "has"
    properties ||--o{ documents : "has"
    properties ||--o{ faqs : "has"
    properties ||--o{ announcements : "has"
    users ||--o{ conversations : "starts"
    conversations ||--o{ messages : "contains"
    documents ||--o{ document_chunks : "split into"

    properties {
        uuid id PK
        varchar name
    }
    users {
        uuid id PK
        uuid property_id FK
        varchar email
        varchar role "tenant | admin"
        varchar name
    }
    documents {
        uuid id PK
        uuid property_id FK
        varchar file_name
        varchar file_path
        int page_count
        varchar analysis_status "pending | processing | completed | error"
        varchar publish_status "unpublished | published"
    }
    document_chunks {
        uuid id PK
        uuid document_id FK
        text content
        vector embedding "1536次元"
        int page_number
        varchar page_image_path
    }
    faqs {
        uuid id PK
        uuid property_id FK
        varchar category
        text question
        text answer
    }
    conversations {
        uuid id PK
        uuid user_id FK
    }
    messages {
        uuid id PK
        uuid conversation_id FK
        varchar role "user | assistant"
        text content
        varchar feedback "positive | negative | null"
    }
    announcements {
        uuid id PK
        uuid property_id FK
        varchar title
        text body
        timestamptz published_at
    }
```
