# BS. コンテナオーケストレーション - Sprint 1

## 概要

コンテナオーケストレーションは、数千のコンテナを自動的にスケーリング、スケジューリング、管理するプラットフォームです。Sprint 1では、Kubernetesの基本概念、Pod、Service、Deploymentを習得します。

---

## 1. Kubernetes の基本概念

### コンテナオーケストレーションの必要性

Docker Compose は単一ホスト上の複数コンテナを管理できますが、複数サーバーに数千のコンテナを分散配置し、自動スケーリング・障害復旧・ローリングアップデートを実施するのは手動管理では不可能。Kubernetesがこれらを自動化します。

**Kubernetes が解決する課題：** スケジューリング（自動判定・配置）、スケーリング（自動調整）、障害復旧（自動再起動・再配置）、ローリングアップデート（ゼロダウンタイム）、リソース最適化（最適配置アルゴリズム）、マルチテナント（Namespace で隔離）。

---

### Kubernetes クラスタの構造

**コントロールプレーン（マスター）：** API Server（REST API提供）、Scheduler（Pod配置決定）、Controller Manager（Pod/Deployment管理）、etcd（全状態を記録する分散DB）。

**ワーカーノード：** kubelet（Pod実行・監視）、Container Runtime（Docker等）、kube-proxy（ネットワーク管理）。

**動作：** コントロールプレーンがクラスタ全体を統制し、各ワーカーノード上で複数の Pod を実行。

---

## 2. Pod

### Pod の概念

**Pod：** Kubernetesの最小デプロイ単位。ほとんどの場合 1 Pod = 1 コンテナですが、複数コンテナを同一 Pod に含めることも可能。同一 Pod内のコンテナはネットワーク名前空間を共有し、localhost で相互通信可能。

**複数コンテナの使用例：**
- **サイドカーパターン：** メインコンテナ（Nginx）＋補助コンテナ（ログ収集）
- **Adapter パターン：** アプリケーション（Java）＋メトリクス変換（Prometheus Exporter）

---

### Pod のライフサイクル

**状態遷移：** Pending（スケジュール待機・イメージpull中）→ Running（起動実行中）→ Succeeded/Failed（正常終了/異常終了）→ Terminated（削除）。

**Probe による健全性確認：**
- **Liveness Probe：** 「コンテナは今も生きているか」。失敗時は再起動。
- **Readiness Probe：** 「トラフィック受信準備ができているか」。失敗時は Service から削除。

---

## 3. Service

### Service の役割

Pod は Auto Scaling により頻繁に生成・削除されるため、IP アドレスが常に変わります。Service は Pod の前に立ち、安定したエンドポイント、ロードバランシング、自動探知を提供。

**効果：** クライアントは Service の不変 IP・FQDN に接続すれば、Service が自動的に健全な Pod にルーティング。

---

### Service のタイプ

**ClusterIP（デフォルト）：** クラスタ内部通信のみ。DB など内部サービス向け。

**NodePort：** ワーカーノード経由で外部アクセス可能。開発・テスト環境向け（30000～32767番号）。

**LoadBalancer：** クラウド LB と統合。本番環境での外部アクセス向け。外部 IP が自動割り当て。

---

## 4. Deployment

### Deployment による Pod 管理

Deployment は「このイメージのコンテナを 3 個起動・維持してほしい」という望ましい状態を宣言的に定義。Kubernetes がその状態を自動実現。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

**利点：** Pod が 0 個→3 個自動作成、Pod が削除されても自動復旧、レプリカ数変更で自動スケーリング。

---

### ローリングアップデート

新バージョンへの切り替えを、サービス停止なしに段階的に実施します。

**流れ：** 新 Pod 1 個起動（maxSurge=1）→ 古い Pod 1 個削除（maxUnavailable=1）→ この繰り返し → 最終的に全て新バージョンに更新（ダウンタイムなし）。

**パラメータ：** maxSurge（同時作成可能な新 Pod 数）、maxUnavailable（同時削除可能な古 Pod 数）。

---

## チェックポイント

- [ ] コンテナオーケストレーションの必要性を説明できる
- [ ] Kubernetes クラスタの構造と各コンポーネントの役割を説明できる
- [ ] Pod の概念と複数コンテナの用途を説明できる
- [ ] Pod のライフサイクルと Probe の役割を説明できる
- [ ] Service のタイプ（ClusterIP/NodePort/LoadBalancer）の違いを説明できる
- [ ] Deployment による宣言型管理の利点を説明できる
- [ ] ローリングアップデートの仕組みを説明できる
