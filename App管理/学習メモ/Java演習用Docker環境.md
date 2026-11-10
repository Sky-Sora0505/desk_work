# Java 演習用の Docker 環境

倉庫とは別の、Java Silver の勉強用の環境です。

## 19-3. Java 演習用の Docker 環境（倉庫とは別物）

Java Silver の勉強用に、Mac mini の Docker で作った演習環境です。倉庫（`~/server`）とは別のフォルダにあります。

| 項目 | 内容 |
| --- | --- |
| 場所 | `~/java-training/01-member-point`（手順書では `~/1_Java_Q`） |
| コンテナ | `db`（`postgres:16`）と `app`（`eclipse-temurin:17-jdk`）の2つ |
| つなぎ方 | フォルダ全体をコンテナの `/work` に見せる。Mac の VS Code で編集し、コンテナの中で `javac` と `java` を実行する |
| DB への接続 | コンテナからは `jdbc:postgresql://db:5432/training`、Mac からは `localhost:15432` |
| ドライバ | `lib/postgresql.jar`（42.7.4） |
| 確認できたこと | Java 17.0.20、`接続成功 members件数=0` |
| 教材 | 環境構築、Docker コマンド集、GitHub（`Sky-Sora0505/desk_work` の `Java Silver` フォルダ）連携、問題4つ（Q1 会員ポイント〜Q4 在庫） |
| 補足 | 9月20日の手順書には「OrbStack が起動している状態で」とあるが、9月26日の確認では OrbStack は入っておらず、Docker Desktop が動いている |

```bash
docker compose exec app bash -c "javac -cp lib/postgresql.jar -d out \$(find src -name '*.java')"
docker compose exec app bash -c "java -cp out:lib/postgresql.jar Main"
```

| つまずきやすい点 | 説明 |
| --- | --- |
| `init.sql` は初回起動のときしか実行されない | 直したいときは `docker compose down -v` してから `up -d`（演習用の DB なので消してよい。倉庫では `-v` を使わない） |
| `depends_on` は起動の順番だけ | DB が受け付けられるようになるまで待ってはくれない |
| プロンプトで今どこにいるか分かる | `%` はシェル、`training=#` は psql、`training-#` は SQL の入力途中。psql は `\q` で抜ける |

**ポートの書き方に注意**：`ports: ["15432:5432"]` のように IP を省くと、家の Wi-Fi につながった全部の機器から DB に届きます。倉庫の規約（6-1）と同じく、次のように `127.0.0.1` を付けます。使わないときは `docker compose down` で止めておきます。

```yaml
    ports: ["127.0.0.1:15432:5432"]
```
