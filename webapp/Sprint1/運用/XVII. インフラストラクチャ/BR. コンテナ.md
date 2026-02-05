# BR. コンテナ - Sprint 1

## 概要

コンテナは、アプリケーションとその依存関係をパッケージ化し、どの環境でも同じように動作させるテクノロジーです。Sprint 1では、コンテナの基本概念、Docker基礎、Dockerfile、Docker Composeを習得します。

---

## 1. コンテナの基本概念

### 仮想マシン vs コンテナ

**仮想マシン（VM）：** ハイパーバイザーの上に複数のゲストOS＋アプリを動作させる。GB単位のメモリ、起動時間は数分、高い隔離度。

**コンテナ：** ホストOSのカーネルを共有、プロセスレベルで隔離。MB～数百MB、起動時間は数秒、スケーラビリティが高い。

**比較：** コンテナは起動が高速で、メモリ効率が優れ、リソースを効率的に利用。デプロイの簡素化により、ポータビリティが実現されます。

---

### Build Once, Run Anywhere

開発環境と本番環境の環境差（OS、ライブラリバージョン）による問題を解決します。Dockerfileでアプリケーションと全ての依存関係をパッケージ化すれば、開発環境・テスト環境・本番環境で同じコンテナが動作。

**ワークフロー：** Dockerfile作成→docker buildでイメージ化・ローカルテスト→docker pushでレジストリアップロード→本番でdocker runで起動→開発環境と全く同じ動作。

---

## 2. Docker 基礎

### Dockerイメージとコンテナ

**イメージ：** OS、アプリケーション、ライブラリ、設定がパッケージ化された読み取り専用テンプレート。

**コンテナ：** イメージから起動された実行中のプロセス。同じイメージから複数のコンテナを独立して起動可能。

**階層構造：** Dockerイメージはレイヤーの積み重ね。FROM ubuntu→RUN apt-get→RUN pip install→COPY app.py という各命令が1レイヤーに対応。

---

### レイヤーキャッシュ

各レイヤーはキャッシュされるため、再ビルド時は変更部分以降だけ再構築。初回111秒のビルドが、app.py変更時は1秒に短縮（111倍高速化）。

**最適化のコツ：** 基本パッケージ層→依存関係→アプリコード、という順序でレイヤー配置。頻繁に変更される部分を下層に置くと、キャッシュが無効になり再ビルド時間が増加。

---

## 3. Dockerfile

### 基本命令

```dockerfile
FROM ubuntu:20.04          # ベースイメージ
WORKDIR /app               # 作業ディレクトリ
ENV PYTHONUNBUFFERED=1     # 環境変数
COPY requirements.txt .    # ホストのファイルをコピー
RUN pip install -r requirements.txt
COPY app.py .
EXPOSE 8000                # ドキュメント用（実際には何もしない）
CMD ["python", "app.py"]   # 起動コマンド
```

**主要命令：** FROM（ベースイメージ指定）、RUN（コマンド実行）、COPY（ファイルコピー）、WORKDIR（作業ディレクトリ指定）、CMD（起動コマンド）、EXPOSE（ポート番号ドキュメント化）、ENV（環境変数設定）。

---

### マルチステージビルド

Go・Javaなどコンパイル言語では、ビルド用ツールが実行時に不要。マルチステージビルドでビルドステージと実行ステージを分離すると、最終イメージをコンパクト化。

```dockerfile
FROM golang:1.19 AS builder
RUN go build -o app main.go

FROM alpine:latest
COPY --from=builder /app/app .
CMD ["./app"]
```

**効果：** 800MB→20MB（40分の1）にサイズ削減。

---

## 4. Docker Compose

### 基本概念

複数のコンテナをまとめて管理。docker-compose.yml で Web サーバー、データベース、キャッシュなどを定義し、docker-compose up/down で一括管理。

```yaml
version: '3.8'
services:
  web:
    image: python:3.9-slim
    ports:
      - "8000:8000"
    volumes:
      - ./app:/app
    depends_on:
      - db
  db:
    image: postgres:13
    environment:
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```

**ライフサイクルコマンド：** docker-compose up（起動）、logs（ログ確認）、stop（停止）、down（停止・削除）。

---

### サービス間通信

Docker Composeで定義されたサービスは自動的に同一ネットワークに接続され、サービス名で直接通信可能。web コンテナから db コンテナへは host="db" で接続。

---

### ボリューム管理

**名前付きボリューム：** Docker が管理（推奨）。データベース永続化。

**バインドマウント：** ホスト側ディレクトリをマウント。開発時の迅速なフィードバック用。

**永続化の流れ：** volumes指定→コンテナ削除後もボリュームは残る→docker-compose up で前回のデータ復元。

---

## チェックポイント

- [ ] 仮想マシンとコンテナの違いを説明できる
- [ ] Dockerイメージとコンテナの関係を理解している
- [ ] レイヤーキャッシュの仕組みを説明できる
- [ ] Dockerfile の基本命令を説明できる
- [ ] マルチステージビルドの利点を説明できる
- [ ] Docker Compose でサービス間通信を実現できる
- [ ] ボリュームによるデータ永続化を理解している
