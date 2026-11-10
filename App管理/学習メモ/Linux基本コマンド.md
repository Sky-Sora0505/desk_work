# Linux 基本コマンド8つ

名前は英単語の省略です。語源で覚えます。

## 17-6. Linux 基本コマンド8つ（名前は英単語の省略）

| コマンド | 語源 | 意味 | 書き方 | 例 |
| --- | --- | --- | --- | --- |
| `pwd` | Print Working Directory | 今いる場所を表示 | `pwd` | `pwd` → `/Users/youruser/server` |
| `ls` | list | 中身の一覧 | `ls [オプション] [場所]` | `ls -la ~/server`（`-l` 詳細、`-a` 隠しファイルも） |
| `cd` | Change Directory | 移動 | `cd [移動先]` | `cd ~/server/apps`、`cd ..`（1つ上）、`cd -`（直前の場所） |
| `mkdir` | Make Directory | フォルダを作る | `mkdir [オプション] 名前` | `mkdir -p ~/server/data/dictionary`（`-p` は途中の階層もまとめて作る） |
| `cp` | copy | コピー | `cp [オプション] 元 先` | `cp -R ~/Downloads/dictionary-app ~/server/apps/my-dictionary`（フォルダは `-r` か `-R`） |
| `mv` | move | 移動・改名 | `mv 元 先` | `mv old.yml new.yml`（同じ場所へ動かす＝名前が変わる） |
| `rm` | remove | 削除 | `rm [オプション] 名前` | `rm -i test.txt`（`-i` は確認する）。ごみ箱に入らず、すぐ消える |
| `cat` | concatenate（連結する） | 中身を表示 | `cat ファイル [ファイル2 …]` | `cat ~/server/apps/docker-compose.yml` |

書き方の共通ルールは「コマンド（動詞） オプション（`-` で始まる設定） 引数（対象）」です。`cp` と `mv` は左が元、右が先です。`[ ]` は「省略できる」という記法で、実際には打ちません。

| パスの記号 | 意味 |
| --- | --- |
| `/` | いちばん上（ルート）。区切りの文字でもある |
| `~` | 自分のホームフォルダ（`/Users/youruser`） |
| `.` | 今いるフォルダ |
| `..` | 1つ上のフォルダ |

`/` から始まるのが絶対パス（住所）、今いる場所からの道順が相対パスです。次に覚えると効くのは `grep`（検索）、`chmod`（権限の変更）、`tail -f`（ログを流し見）です。
