# App（倉庫に載せているアプリ）

アプリごとに1フォルダです。各フォルダの `README.md` が説明、`code/` がコードです。

| フォルダ | アプリ | URL（伏せ字） | 状態 |
| --- | --- | --- | --- |
| `homepage/` | ポータル（倉庫の入口） | `http://100.x.y.z:3000` | 稼働中 |
| `java-silver17/` | Java Silver 17 ドリル | `http://100.x.y.z:8081/java-silver17/` | 稼働中 |
| `my-dictionary/` | My辞書 | `http://100.x.y.z:8081/my-dictionary/` | 稼働中 |
| `kvstore/` | 進捗の保存サーバー（画面は無い） | `http://100.x.y.z:8081/api/health` | 稼働中。ソースは未取り込み |
| `計画中/` | coupon-checker、mail-digest、バス予約、ローカル LLM など | — | 未導入 |

アプリを足すときは `00_アプリ追加手順.md` を見ます。

## 入っているコードの出どころ

| もの | 出どころ | 確かめたこと |
| --- | --- | --- |
| `my-dictionary/code/` | 非公開リポジトリ My_BOX の `Life/app_List/my-dictionary`（2026-10-25 のコミット） | 起動して `api/health` が応答し、初期データが 304語・9タグ |
| `java-silver17/code/index.html` | 元の Claude アーティファクトを取得し、`build/` の手順で組み立て直したもの | 2台での進捗共有、古い画面からの上書き拒否（KV-409-01）、サーバーに届かないときの警告 |
| `java-silver17/build/` | 保存先を差し替える部品はチャットの記録から再現。組み立てスクリプトは書き直し | 上と同じ |
| `homepage/config/` | チャットの記録から再現 | 実機とは未照合 |

確認はすべて、実機とは別の環境で行いました。KVストアの代わりには、同じ応答を返す検証用の簡易サーバーを使っています。実機のファイルが正なので、`bash tools/sync.sh import` で実機の内容に置き換えてください。

## まだ入っていないもの

| もの | ある場所 | 入れ方 |
| --- | --- | --- |
| KVストア（Java）のソース | Mac mini の `~/server/apps/kvstore/` | `bash tools/sync.sh import` |
| nginx の `default.conf` の全文 | Mac mini の `~/server/apps/nginx/` | 同上 |
| 動作確認ページ `hello` | Mac mini の `~/server/data/apps/static/hello/` | 同上 |

辞書のデータ（`dictionary.db`）と学習の進捗（`kvstore.db`）は、どの方法でもこのフォルダには入れません。
