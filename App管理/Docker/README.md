# Docker

コンテナの動かし方に関するものを集めたフォルダです。

| ファイル・フォルダ | 中身 |
| --- | --- |
| `01_しくみ.md` | イメージ・コンテナ・ボリュームとは何か。プログラムは中、データは外 |
| `02_設計と規約.md` | コンテナを足すときの決まり、フォルダ構成、compose と nginx の解説 |
| `03_日常操作.md` | 起動・停止・確認、電源を入れたときの手順、定期作業 |
| `04_コマンド.md` | Docker のコマンドと名前の由来 |
| `compose/apps/docker-compose.yml` | nginx・KVストア・My辞書の3サービス（実機では `~/server/apps/`） |
| `compose/apps/nginx/` | nginx の設定の置き場（全文は未取り込み） |
| `compose/homepage/docker-compose.yml` | ポータル（実機では `~/server/homepage/`） |
| `scripts/` | `up.sh` `down.sh` `status.sh`（実機では `~/server/scripts/`） |

compose とスクリプトの中の `100.x.y.z` や `youruser` は伏せ字です。このままでは動きません。実機で使うときは `bash tools/sync.sh fill` で実際の値を入れた写しを作ります（`tools/README.md`）。

compose とスクリプトは、チャットの記録から再現したものです。実機のファイルが正なので、`bash tools/sync.sh import` で実機の内容に置き換えてください。
