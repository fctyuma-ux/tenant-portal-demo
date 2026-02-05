# AP. Web標準技術

## 概要

Webフロントエンド開発の基礎となる標準技術（DOM、JavaScript、イベント処理）を理解することは、フレームワークに依存しない強力な基盤を築きます。このセクションでは、DOMツリーの構造、DOM操作とパフォーマンスへの影響、そして実践的なToDoリストアプリケーション実装を通じて、Web標準の本質を学びます。

---

## 1. DOMツリーの構造

**DOM（Document Object Model）とは:**
- HTMLドキュメントをツリー状のオブジェクト構造で表現
- JavaScriptから動的にアクセス・操作可能

**ツリー構造の例:**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Document</title>
  </head>
  <body>
    <div id="app">
      <h1>Hello</h1>
      <p>World</p>
    </div>
  </body>
</html>
```

**対応するDOMツリー:**

```
Document
  └─ html
      ├─ head
      │   └─ title
      │       └─ "Document"
      └─ body
          └─ div#app
              ├─ h1
              │   └─ "Hello"
              └─ p
                  └─ "World"
```

**ノード種別:**
- **Document Node:** ドキュメント全体
- **Element Node:** HTMLタグ（div, p等）
- **Text Node:** テキスト内容
- **Attribute Node:** 属性（id, class等）

---

## 2. DOM 操作とパフォーマンス

**重要な概念：リフロー・リペイント**

- **リフロー（Reflow）:** レイアウト計算をやり直す（最もコスト高）
- **リペイント（Repaint）:** 画面再描画（リフローより軽い）

**パフォーマンスへの影響:**

```javascript
// ❌ 悪いパターン：ループ内で DOM アクセス（複数回のリフロー）
for (let i = 0; i < 1000; i++) {
    document.getElementById('box').style.width = i + 'px';  // 毎回リフロー
}

// ✅ 良いパターン：DOM をキャッシュして操作
const box = document.getElementById('box');
for (let i = 0; i < 1000; i++) {
    box.style.width = i + 'px';  // メモリアクセスのみ
}
// 最後に一度だけブラウザが再描画
```

**最適化テクニック:**

```javascript
// 1. 複数変更を一度に：classList 使用
element.classList.add('active', 'highlight');  // 複合クラス適用

// 2. Document Fragment で バッチ追加
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
    const li = document.createElement('li');
    li.textContent = `Item ${i}`;
    fragment.appendChild(li);
}
document.getElementById('list').appendChild(fragment);  // 一度だけ追加

// 3. 読取と書込を分離
const heights = [];
for (let el of elements) {
    heights.push(el.offsetHeight);  // 読取フェーズ（キャッシュ）
}
for (let i = 0; i < elements.length; i++) {
    elements[i].style.height = heights[i] * 1.1 + 'px';  // 書込フェーズ
}
```

---

## 3. イベント処理と委譲

**イベントリスニング:**

```javascript
// 直接リスナー登録
button.addEventListener('click', (e) => {
    console.log('ボタンクリック');
});

// イベント委譲（推奨）：親要素でリッスン
document.getElementById('list').addEventListener('click', (e) => {
    if (e.target.tagName === 'LI') {
        console.log('リストアイテムクリック:', e.target.textContent);
    }
});
```

**メリット：**
- メモリ効率（リスナーが1個で済む）
- 動的に追加されるアイテムにも対応

---

## 4. DOM クエリ選択

**方法と性能:**

```javascript
// 最速：ID 指定（最も特異的）
const element = document.getElementById('target');

// 高速：クラス名（複合可能）
const elements = document.querySelectorAll('.active');

// 柔軟：CSS セレクタ（最遅い）
const items = document.querySelectorAll('ul > li.item[data-id="5"]');

// ベストプラクティス：結果をキャッシュ
const container = document.querySelector('.container');  // 1回だけ
const items = container.querySelectorAll('.item');      // スコープ限定
```

---

## 5. ToDoリストアプリの実装

**完全な実装例：**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Todo App</title>
    <style>
        body { font-family: Arial; max-width: 600px; margin: 50px auto; }
        #todo-input { width: 70%; padding: 8px; }
        button { padding: 8px 16px; cursor: pointer; }
        .todo-list { list-style: none; padding: 0; margin-top: 20px; }
        .todo-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            border: 1px solid #ddd;
            margin: 5px 0;
            border-radius: 4px;
        }
        .todo-item.completed { text-decoration: line-through; color: #999; }
        .delete-btn { background: #ff4444; color: white; border: none; padding: 4px 8px; cursor: pointer; }
        .complete-btn { background: #44ff44; color: black; border: none; padding: 4px 8px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Todo List</h1>
    <div>
        <input
            type="text"
            id="todo-input"
            placeholder="タスクを入力..."
        />
        <button id="add-btn">追加</button>
    </div>
    <ul id="todo-list" class="todo-list"></ul>

    <script>
        class TodoApp {
            constructor() {
                this.input = document.getElementById('todo-input');
                this.addBtn = document.getElementById('add-btn');
                this.list = document.getElementById('todo-list');
                this.todos = [];

                // イベント登録
                this.addBtn.addEventListener('click', () => this.addTodo());
                this.input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.addTodo();
                });

                // イベント委譲：リスト内のボタンクリックを処理
                this.list.addEventListener('click', (e) => {
                    if (e.target.classList.contains('delete-btn')) {
                        const id = parseInt(e.target.dataset.id);
                        this.deleteTodo(id);
                    }
                    if (e.target.classList.contains('complete-btn')) {
                        const id = parseInt(e.target.dataset.id);
                        this.toggleTodo(id);
                    }
                });
            }

            addTodo() {
                const text = this.input.value.trim();
                if (!text) return;

                const todo = {
                    id: Date.now(),
                    text: text,
                    completed: false
                };

                this.todos.push(todo);
                this.render();
                this.input.value = '';
            }

            deleteTodo(id) {
                this.todos = this.todos.filter(t => t.id !== id);
                this.render();
            }

            toggleTodo(id) {
                const todo = this.todos.find(t => t.id === id);
                if (todo) {
                    todo.completed = !todo.completed;
                    this.render();
                }
            }

            render() {
                // リストをクリア
                this.list.innerHTML = '';

                // Fragment でバッチ追加（パフォーマンス最適化）
                const fragment = document.createDocumentFragment();

                this.todos.forEach(todo => {
                    const li = document.createElement('li');
                    li.className = 'todo-item';
                    if (todo.completed) {
                        li.classList.add('completed');
                    }

                    const span = document.createElement('span');
                    span.textContent = todo.text;

                    const btnContainer = document.createElement('div');

                    const completeBtn = document.createElement('button');
                    completeBtn.textContent = todo.completed ? '未完了' : '完了';
                    completeBtn.className = 'complete-btn';
                    completeBtn.dataset.id = todo.id;

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '削除';
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.dataset.id = todo.id;

                    btnContainer.appendChild(completeBtn);
                    btnContainer.appendChild(deleteBtn);

                    li.appendChild(span);
                    li.appendChild(btnContainer);
                    fragment.appendChild(li);
                });

                this.list.appendChild(fragment);
            }
        }

        // アプリ初期化
        new TodoApp();
    </script>
</body>
</html>
```

---

## 6. ライフサイクルと非同期処理

**DOMContentLoaded vs load:**

```javascript
// DOMContentLoaded：HTML パース完了時（画像読込前）
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM構造が完全に読込まれた');
    // DOM操作はここから安全に実行可能
});

// load：すべてのリソース読込完了時
window.addEventListener('load', () => {
    console.log('ページ全体が読込完了');
    // 画像サイズ取得等、リソース依存の処理
});
```

---

## 7. よくある DOM パターン

**テンプレートの動的生成:**

```javascript
// テンプレートリテラル使用
function createUserCard(user) {
    return `
        <div class="user-card" data-id="${user.id}">
            <h3>${user.name}</h3>
            <p>${user.email}</p>
            <button class="edit-btn">編集</button>
        </div>
    `;
}

const html = createUserCard({ id: 1, name: '太郎', email: 'taro@example.com' });
document.getElementById('container').innerHTML = html;
```

**安全な HTML 設定（XSS対策）:**

```javascript
// ❌ 危険：ユーザー入力を直接 innerHTML に設定
element.innerHTML = userInput;  // XSS 脆弱性

// ✅ 安全：textContent を使用（テキストのみ）
element.textContent = userInput;

// ✅ 安全：createTextNode
const node = document.createTextNode(userInput);
element.appendChild(node);

// ✅ 安全：sanitize ライブラリ使用
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

---

## 8. MutationObserver で DOM 変更を監視

```javascript
// DOM 変更を検知
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
            console.log('子要素が追加/削除されました');
        }
        if (mutation.type === 'attributes') {
            console.log(`属性 ${mutation.attributeName} が変更されました`);
        }
    });
});

// 監視開始
observer.observe(document.getElementById('container'), {
    childList: true,
    attributes: true,
    subtree: true
});

// 監視停止
observer.disconnect();
```

---

## ポイント

- DOMツリーは HTML を階層的なオブジェクト構造で表現
- リフロー・リペイントはパフォーマンスを大きく左右するため、バッチ操作・キャッシュが重要
- イベント委譲で メモリ効率と保守性を向上
- Document Fragment と classList で DOM操作を最適化
- XSS対策として、ユーザー入力は textContent か sanitize ライブラリで処理
- ToDoリストのような CRUD アプリケーションは素の JavaScript でも実装可能
