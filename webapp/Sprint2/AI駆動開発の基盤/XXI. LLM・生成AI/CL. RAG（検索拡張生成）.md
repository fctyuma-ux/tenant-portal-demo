# CL. RAG（検索拡張生成）

## 概要

RAG（Retrieval Augmented Generation）は、LLMの知識カットオフや限定されたコンテキストの問題を解決するパターンです。外部ナレッジベースから関連情報を検索し、その結果をプロンプトに統合することで、最新情報・専門知識・プライベートデータを活用した高精度な応答を実現します。このセクションでは、ベクトルデータベース、Embedding、セマンティック検索、メタデータフィルタリング、そしてデータ同期戦略までを網羅します。

---

## 1. RAGの基本フロー

**3つのステップ:**
1. **Retrieval（検索）:** クエリに関連するドキュメント片を検索
2. **Augmentation（拡張）:** 検索結果をプロンプトに統合
3. **Generation（生成）:** 拡張プロンプトでLLMが応答生成

**実装の流れ:**

```
ユーザー質問
    ↓
テキスト Embedding 化
    ↓
ベクトル DB で類似検索
    ↓
関連ドキュメント取得
    ↓
プロンプト統合
    ↓
LLM 応答生成
```

---

## 2. ベクトルデータベース（Vector DB）

**定義:**
- テキストを高次元ベクトルに変換して保存
- ベクトル間の距離で「意味的な近さ」を判定
- 高速な類似検索が可能

**主要なベクトルDB:**
| DB | 特性 | 用途 |
|---|---|---|
| Pinecone | フルマネージド、スケール容易 | SaaS向け |
| Weaviate | オープンソース、柔軟 | オンプレミス |
| Milvus | 高性能、分散対応 | 大規模データ |
| Chroma | 軽量、開発用 | プロトタイプ |

**ベクトルDB へのデータ挿入:**

```python
import weaviate
from weaviate.classes.config import Configure

# Weaviate クライアント接続
client = weaviate.connect_to_local()

# スキーマ定義
client.collections.create(
    name="Documents",
    vectorizer_config=Configure.Vectorizer.text2vec_openai(),
    properties=[
        weaviate.classes.config.Property(
            name="content",
            data_type=weaviate.classes.config.DataType.TEXT
        )
    ]
)

# ドキュメント挿入
collection = client.collections.get("Documents")
collection.data.insert(
    properties={
        "content": "Claude は Anthropic が開発した AI アシスタントです。"
    }
)
```

---

## 3. Embedding とセマンティック検索

**Embedding の仕組み:**
- テキストを固定次元ベクトル（例：1536次元）に変換
- 同じ意味のテキストは近い座標に配置される
- 類似度計算（コサイン類似度等）で類似度算出

**主要な Embedding API:**
- OpenAI：text-embedding-3-small / large
- Anthropic：独自 Embedding（今後対応予定）
- Cohere：日本語対応強い

**セマンティック検索の実装:**

```python
from openai import OpenAI

client = OpenAI()

def semantic_search(query: str, documents: list, top_k: int = 3):
    """セマンティック検索"""

    # クエリを Embedding
    query_embedding = client.embeddings.create(
        model="text-embedding-3-small",
        input=query
    ).data[0].embedding

    # ドキュメントを Embedding
    doc_embeddings = []
    for doc in documents:
        embedding = client.embeddings.create(
            model="text-embedding-3-small",
            input=doc
        ).data[0].embedding
        doc_embeddings.append(embedding)

    # コサイン類似度計算
    import numpy as np
    similarities = []
    for doc_emb in doc_embeddings:
        similarity = np.dot(query_embedding, doc_emb) / (
            np.linalg.norm(query_embedding) * np.linalg.norm(doc_emb)
        )
        similarities.append(similarity)

    # 上位 K 件を返す
    top_indices = sorted(
        range(len(similarities)),
        key=lambda i: similarities[i],
        reverse=True
    )[:top_k]

    return [documents[i] for i in top_indices]
```

---

## 4. メタデータフィルタリング

**目的:**
- 検索対象を制限（例：特定日時以降のドキュメント）
- 精度向上・ノイズ削減

**メタデータ例:**
```json
{
    "content": "ドキュメント本文",
    "metadata": {
        "author": "田中太郎",
        "date": "2024-02-04",
        "category": "技術",
        "source": "internal_wiki"
    }
}
```

**フィルタ条件での検索:**

```python
def search_with_filters(query: str, filters: dict):
    """メタデータフィルタ付き検索"""

    query_embedding = embed(query)

    # ベクトルDB での検索（フィルタ付き）
    results = client.collections.get("Documents").query.near_vector(
        near_vector=query_embedding,
        where={
            "path": ["metadata", "date"],
            "operator": "GreaterOrEqual",
            "valueDate": filters.get("min_date", "2024-01-01")
        },
        limit=10
    )

    return results
```

---

## 5. RAG パイプラインの構築

**Ingestion（取り込み）フェーズ:**

```python
from langchain.document_loaders import PDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Pinecone

# PDFロード
loader = PDFLoader("document.pdf")
documents = loader.load()

# テキスト分割
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)
chunks = splitter.split_documents(documents)

# ベクトルDB へ保存
embeddings = OpenAIEmbeddings()
vector_store = Pinecone.from_documents(chunks, embeddings)
```

**Retrieval（検索）フェーズ:**

```python
# ユーザークエリで検索
query = "Claude の特徴は何ですか？"
retrieved_docs = vector_store.similarity_search(query, k=3)
```

**Generation（生成）フェーズ:**

```python
import anthropic

client = anthropic.Anthropic()

# 検索結果をコンテキストに統合
context = "\n".join([doc.page_content for doc in retrieved_docs])
prompt = f"""
以下の情報に基づいて、質問に答えてください。

【参考情報】
{context}

【質問】
{query}
"""

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": prompt}]
)
print(response.content[0].text)
```

---

## 6. データ同期と更新戦略

**新規ドキュメント追加:**
```python
def add_document(doc_text: str, metadata: dict):
    """新規ドキュメントを追加"""
    embedding = embed(doc_text)
    vector_store.add_documents(
        documents=[Document(page_content=doc_text, metadata=metadata)],
        embeddings=[embedding]
    )
```

**既存ドキュメント更新:**
```python
def update_document(doc_id: str, new_text: str):
    """既存ドキュメントを更新"""
    # 旧バージョン削除
    vector_store.delete([doc_id])

    # 新バージョン追加
    add_document(new_text, metadata={"doc_id": doc_id})
```

**ドキュメント削除:**
```python
def delete_document(doc_id: str):
    """ドキュメント削除"""
    vector_store.delete([doc_id])
```

---

## 7. 検索精度の評価

**評価指標:**
- **Precision（適合率）:** 検索結果中、関連度の高い割合
- **Recall（再現率）:** 関連ドキュメント中、検索で取得された割合
- **MRR（Mean Reciprocal Rank）:** 最初の関連結果のランク

**テスト例:**

```python
def evaluate_rag(test_queries: list, expected_docs: list):
    """RAG検索の精度評価"""

    precisions = []

    for query, expected in zip(test_queries, expected_docs):
        retrieved = vector_store.similarity_search(query, k=5)
        retrieved_ids = [doc.metadata["id"] for doc in retrieved]

        # 一致数 / 取得数
        precision = len(set(retrieved_ids) & set(expected)) / len(retrieved_ids)
        precisions.append(precision)

    avg_precision = sum(precisions) / len(precisions)
    print(f"平均 Precision: {avg_precision:.2%}")

    return avg_precision
```

---

## 8. RAG チャットボットの実装

**マルチターン対応:**

```python
class RAGChatbot:
    def __init__(self, vector_store):
        self.vector_store = vector_store
        self.conversation = []
        self.client = anthropic.Anthropic()

    def chat(self, user_input: str) -> str:
        """ユーザー入力に対応"""

        # 会話履歴を含めた検索クエリ作成
        search_query = user_input
        if self.conversation:
            # 前ラウンドのコンテキスト含める
            search_query += " " + self.conversation[-1]["content"][:100]

        # 関連ドキュメント検索
        docs = self.vector_store.similarity_search(search_query, k=3)
        context = "\n".join([doc.page_content for doc in docs])

        # プロンプト構築
        prompt = f"""
参考情報に基づいて、質問に丁寧に答えてください。

【参考情報】
{context}

【会話履歴】
{json.dumps(self.conversation, ensure_ascii=False, indent=2)}

【新規質問】
{user_input}
"""

        # LLM 応答生成
        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        assistant_response = response.content[0].text

        # 会話履歴保存
        self.conversation.append({"role": "user", "content": user_input})
        self.conversation.append({"role": "assistant", "content": assistant_response})

        return assistant_response
```

---

## 9. ハイブリッド検索

**目的:**
- キーワード検索とセマンティック検索の組み合わせ
- 精度向上、偽陰性減少

**実装:**

```python
def hybrid_search(query: str, keyword_weight=0.3, semantic_weight=0.7):
    """ハイブリッド検索"""

    # キーワード検索
    keyword_results = bm25_search(query, k=10)
    keyword_scores = {doc.id: score for doc, score in keyword_results}

    # セマンティック検索
    semantic_results = semantic_search(query, k=10)
    semantic_scores = {doc.id: score for doc, score in semantic_results}

    # スコア統合（正規化）
    all_doc_ids = set(keyword_scores.keys()) | set(semantic_scores.keys())
    hybrid_scores = {}

    for doc_id in all_doc_ids:
        kw_score = keyword_scores.get(doc_id, 0) / max(keyword_scores.values())
        sem_score = semantic_scores.get(doc_id, 0) / max(semantic_scores.values())
        hybrid_scores[doc_id] = (
            keyword_weight * kw_score + semantic_weight * sem_score
        )

    # スコア上位のドキュメントを返す
    top_docs = sorted(
        hybrid_scores.items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]

    return top_docs
```

---

## ポイント

- RAG は Retrieval → Augmentation → Generation の3ステップで構成
- ベクトルDB は Embedding に基づく高速な類似検索を実現
- セマンティック検索は意味的な関連性を判定でき、キーワード検索の補完に最適
- メタデータフィルタで検索対象を絞り込み、ノイズ削減
- データ同期は追加・更新・削除の戦略を事前に設計
- 評価指標（Precision/Recall）で検索品質を定量測定
- ハイブリッド検索でキーワード＆セマンティックの両立
