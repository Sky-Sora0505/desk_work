# tools（公開リポジトリに実際の値を入れないための道具）

このフォルダは公開リポジトリにあるので、Tailscale の IP や tailnet 名などの実際の値を入れてはいけません。`sync.sh` は、その置き換えと確認を自動でやるスクリプトです。

## 最初に1回だけ

Mac mini のターミナルで、`App管理` フォルダに移動してから実行します。

```bash
cp tools/values.example tools/values.local
```

```bash
nano tools/values.local
```

右側を自分の値に書き換えます（調べ方は `設定値.md`）。保存は `Ctrl+O` → Enter → `Ctrl+X` です。`values.local` は `.gitignore` に入っているので、GitHub には上がりません。

## 3つの使い方

| コマンド | すること | 使うとき |
| --- | --- | --- |
| `bash tools/sync.sh check` | 実際の値や秘密鍵が紛れ込んでいないか調べる。見つかるとファイル名を出して止まる | **コミットの前に毎回** |
| `bash tools/sync.sh import` | Mac mini の `~/server` から設定とコードを取り込み、実際の値を伏せ字に置き換える。最後に check も行う | 実機を変えた後、資料を実機に合わせたいとき |
| `bash tools/sync.sh fill` | 伏せ字を実際の値に戻した写しを `_実機用/` に作る（git には入らない） | このフォルダの compose や設定を実機に使いたいとき |

## import で取り込まれるもの

| Mac mini（`~/server/` の下） | このフォルダ |
| --- | --- |
| `apps/docker-compose.yml` | `Docker/compose/apps/docker-compose.yml` |
| `apps/nginx/default.conf` | `Docker/compose/apps/nginx/default.conf` |
| `homepage/docker-compose.yml` | `Docker/compose/homepage/docker-compose.yml` |
| `scripts/up.sh` `down.sh` `status.sh` | `Docker/scripts/` |
| `homepage/config/` の設定ファイル | `App/homepage/config/` |
| `apps/kvstore/` | `App/kvstore/code/` |
| `apps/my-dictionary/` | `App/my-dictionary/code/` |
| `data/apps/static/hello/` | `App/hello/code/` |
| `data/apps/static/java-silver17/` | `App/java-silver17/code/` |

DB（`*.db`）、`.env`、鍵、`node_modules`、`target`、`.bak-` の控えは取り込みません。アプリを足したら、`sync.sh` の `MAPPINGS` に1行足します。

## 注意

- 伏せ字にできるのは `values.local` に書いた5つの値だけです。それ以外の個人的な情報（メールアドレス、住所、パスワードなど）は自分の目で確かめます。
- `import` のあとは、必ず `git diff` で中身を見てからコミットします。
- 一度 push した内容は、後から消しても履歴に残ります。迷ったら push の前に止めます。
