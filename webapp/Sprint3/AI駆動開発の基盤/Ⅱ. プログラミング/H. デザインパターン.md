# H. デザインパターン

## 概要

デザインパターンは反復される設計問題の再利用可能な解決策です。並行処理のパターンはワーカー分離、ロック戦略、シャットダウン処理など実装で繰り返される課題を整理します。

---

## 1. Producer-Consumer

**役割:** 生産者と消費者をキューで分離

```
Producer → [Queue] → Consumer
```

- 生産速度と消費速度が異なってもOK
- 実装が独立、テスト容易

```javascript
const queue = [];
producer.on('data', data => queue.push(data));
consumer.on('ready', () => process(queue.shift()));
```

---

## 2. Active Object

**役割:** オブジェクトへの呼び出しを非同期代理実行

```
Client → ActiveObject.method() → Future/Promise
```

Angular等で活用：`service.getData().subscribe(data => {...})`

---

## 3. Monitor / Locking

**Monitor:** データと同期機構をセットでカプセル化

**Locking:** 共有リソースへのアクセスを制御

```
lock(resource)
  ... use resource ...
unlock()
```

---

## 4. シャットダウン

ワーカープール終了時、全タスク完了を待つ必要

**パターン：**
- Poison pill：終了メッセージをキューに入れる
- Flag check：ワーカーが終了フラグ確認
- Timeout：強制終了

```javascript
const STOP = Symbol('STOP');
queue.push(STOP);
worker.on('message', msg => {
  if (msg === STOP) return;
});
```

---

## 5. バックプレッシャー

**問題:** 生産速度 > 消費速度 → キュー膨張

**解決:** 消費者が「待ってくれ」と生産者に伝える

```javascript
if (queue.size >= MAX_SIZE) {
  producer.pause();
}
```

---

## 6. 層分けの目的

コード変更の影響を局所化

```
Presentation → Application → Domain → Infrastructure
```

**メリット：** テスト容易、変更に強い、責務明確

---

## 7. 実践スキル

- Producer-Consumer実装と速度差検証
- デッドロック回避設計
- バックプレッシャー機能確認
- シャットダウン処理実装

