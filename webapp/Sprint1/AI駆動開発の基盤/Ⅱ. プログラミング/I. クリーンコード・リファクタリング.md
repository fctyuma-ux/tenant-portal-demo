# I. クリーンコード・リファクタリング

## 概要

リファクタリングは「外部仕様を変えずに内部構造を改善する」活動です。AI駆動開発では、生成されたコードをリファクタリングして品質を高めることが不可欠です。

---

## 1. リファクタリングの基本方針

**定義：** 振る舞いは維持しつつ、内部構造を改善する活動

**機能追加とリファクタリングを混ぜてはいけない理由：** 変更の影響範囲が不明確になり、原因特定が困難、テストが複雑化するため。

**小刻みな変更：** 各ステップは小さく、都度動作確認できる粒度に保つ。テストがあれば自動検証、なければ手動で入出力確認します。

---

## 2. 主要なリファクタリング技法

**Rename：** 最も効く改善は「名前変更」です。意図を示す名前が読みやすさを大幅に向上させます。関数は動詞で、変数は意図を、クラスは名詞で、ブーリアンは is/has で始めます。

```javascript
// ❌ 不明確
function calc(arr) {
  let t = 0;
  for (let i = 0; i < arr.length; i++) t += arr[i];
  return t;
}

// ✅ 意図が明確
function sumPrices(priceArray) {
  return priceArray.reduce((total, price) => total + price, 0);
}
```

**Extract Method / Variable：** まとまりのある処理や複雑な式を切り出して、意図を表します。

**Inline：** 過剰に抽象化されたコードを元に戻し、シンプルにします。

**Replace Temp with Query：** 一時変数の計算結果をメソッドに置き換え、再計算可能にします。

**Introduce Parameter Object：** 引数が増えすぎたときに、パラメータオブジェクトにまとめます。

---

## 3. リファクタリングの実践フロー

1. テストを実行、合格を確認
2. 1つの改善を実施
3. テスト実行、合格を確認
4. 繰り返す

テストがない場合は、入出力を手動確認して、変更前後で同じ結果が得られることを確認します。過剰抽象を戻すときは Inline を活用してシンプルにします。

---

## 4. AI生成コードのリファクタリング観点

**長すぎる関数の分割：** 10行を超える関数は分割を検討。各ステップが明確になります。

```javascript
// ✅ 分割（各ステップが明確）
async function handleUserRegistration(req, res) {
  const email = req.body.email;
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });
  if (await userExists(email)) return res.status(409).json({ error: 'Email exists' });
  const newUser = await createUser(email, req.body.password);
  return res.json(newUser);
}
```

**重複を共通化する：** 同じ判定・処理が複数箇所にあれば、関数に切り出します。

**変数名の修正：** 生成コードは変数名（d, p, f など）が不適切なことが多いので、意図が明確な名前に変更します。

---

## まとめ

**重点項目：** 外部仕様を変えずに内部を改善、Rename で意図を明確に、Extract Method で分割、小刻みに変更、過剰抽象を戻す。定期的に実施することで、コードの理解しやすさと保守性が大幅に向上します。
