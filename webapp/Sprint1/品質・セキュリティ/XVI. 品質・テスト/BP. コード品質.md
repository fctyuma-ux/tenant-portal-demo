# BP. コード品質

## 概要

コードの読みやすさ・保守性・安全性を確保するための品質管理手法を学びます。静的解析ツール、リンターによる一貫性確保、コードレビュー、複雑度測定により、技術的債務を最小化しながら高品質なコードベースを維持します。

---

## 静的解析による品質向上

### 静的解析ツールの役割

プログラムを実行することなくコード内の問題を検出します。潜在的なバグ（未使用変数、型エラー）、セキュリティ脆弱性、パフォーマンス問題を開発フェーズで早期発見。

### ESLint の設定と実装

JavaScriptコード品質の一貫性を強制するツール。推奨ルール（`eslint:recommended`）をベースに、プロジェクト固有のルールをカスタマイズ。no-unused-vars（エラー）、no-console（警告）、eqeqeq（===強制）など。

### TypeScript による型チェック

静的型チェックで多くのバグを防止。関数の引数・戻り値の型を明示。`"5" + 3`のような型不一致エラーをコンパイル時に検出。

```javascript
// .eslintrc.js の例
module.exports = {
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  rules: {
    'no-unused-vars': 'error',
    'eqeqeq': 'error',      // === を強制
    'max-depth': ['warn', 3],  // ネスト深さを3以下に制限
    'max-lines': ['warn', 300]  // ファイルは300行以下を推奨
  }
};

// TypeScript の型チェック
function addNumbers(a: number, b: number): number {
  return a + b;
}
addNumbers("5", 3);  // コンパイルエラー: 型不一致
```

### SonarQube による包括的な品質分析

Code Smells（保守性低下問題）、Security Hotspots（セキュリティリスク）、Coverage（テストカバレッジ）、Duplications（コード重複）を統合的に分析。

---

## リンターによる一貫性の確保

### Prettier によるコードフォーマット

開発者の書き方の違いを自動的に統一します。セミコロン、クォート、インデント、行の最大文字数を統一。整形前後で動作が変わらないことが特徴。

```javascript
// フォーマット前
const users=[{id:1,name:"Alice"},{id:2,name:"Bob"}]
function greet(msg){console.log(msg)}

// Prettier で自動フォーマット後
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

function greet(msg) {
  console.log(msg);
}
```

### Husky と lint-staged によるコミット前チェック

コミット前に自動でESLint・Prettier実行。ステージされたファイルのみ検査。テストも自動実行。不正なコードの混入を事前防止。

---

## コードレビューのベストプラクティス

### レビュー観点の定義

複数の観点から実施：
- **機能性**: 要件実装、エッジケース対応
- **可読性**: 変数名の明確さ、複雑なロジックのコメント
- **パフォーマンス**: 不要なループ、N+1クエリ問題
- **セキュリティ**: 入力検証・エスケープ、認証・認可
- **テスト**: 十分なテストカバレッジ、エッジケース対応
- **保守性**: DRY原則、一貫性のある設計パターン

### レビューコメントの書き方

非建設的な指摘ではなく、改善提案を具体的に提示。時間計算量の改善案、テストケース追加提案など、実装者が納得しやすいコメント。

---

## メトリクスに基づく品質管理

### コード複雑度の測定

**Cyclomatic Complexity（サイクロマティック複雑度）**: 分岐の数に基づいて複雑度を計算。複雑度が高いほど、テストが必要なパスが増えます。

シンプルな関数：複雑度1。if/else、switch分岐が増えると複雑度上昇。複雑度が4を超える場合は関数分割を検討。

### 保守性指数（Maintainability Index）

複数の指標を組み合わせて保守性を評価。行数、複雑度、Halstead Metricなどから計算。85-100は優秀、70-85は良好、70以下は要改善。

長い関数・複雑なロジックは保守性が低い。単責任原則に従い、小さな関数に分割すると保守性が向上。

```javascript
// 複雑で保守性が低い関数
function processUserData(userData) {
  const result = {};
  for (let i = 0; i < userData.length; i++) {
    if (userData[i].active) {
      if (userData[i].role === 'admin') {
        result[userData[i].id] = { ...userData[i], permissions: ['all'] };
      } else if (userData[i].role === 'user') {
        result[userData[i].id] = { ...userData[i], permissions: ['read'] };
      }
    }
  }
  return result;
}

// 保守性が高い実装（単責任原則）
function processUserData(userData) {
  return userData
    .filter(user => user.active)
    .map(user => ({ ...user, permissions: getPermissions(user.role) }))
    .reduce((acc, user) => { acc[user.id] = user; return acc; }, {});
}
```

---

## 継続的な品質改善

### コード品質レポートの生成

package.jsonで複合的な品質分析スクリプトを定義。ESLint、TypeScript型チェック、テストカバレッジ、SonarQube分析を自動実行。

### チームのコード品質基準策定

- **テストカバレッジ**: 行カバレッジ85%以上、新機能100%
- **複雑度**: 平均5以下、最大15以下
- **品質スコア**: SonarQube A以上、Code Smell 0
- **パフォーマンス**: バンドルサイズ500KB以下（gzip）
- **リリース前**: テスト成功、レビュー承認、基準満たす、ドキュメント更新
