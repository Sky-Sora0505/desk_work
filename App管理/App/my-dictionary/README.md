# my-dictionary（My辞書）

検索エンジン付きの自分専用辞書です（Node.js + SQLite、依存パッケージなし）。コードは `code/` にあります。

## 7-4. My辞書（apps-dictionary）

| 項目 | 内容 |
| --- | --- |
| 構成 | Node.js + SQLite。画面は `public/`（`index.html` `app.js` `app.css` `sw.js` `manifest.webmanifest` ほか） |
| URL | `http://100.x.y.z:8081/my-dictionary/` |
| データ | `~/server/data/dictionary/dictionary.db*`（単体版から引き継ぎ済み） |
| 機能 | 検索、タグ絞り込み、単語の追加・削除、CSV の取り込み・書き出し（上限 20MB） |
| 倉庫向けの改修 | 画面側の絶対パス（`/api/`、`/samples/`、`/sw.js`）を相対パスに変更。`/my-dictionary/` の下で動かし、KVストアの `/api/` とぶつからないようにした。`sw.js` のキャッシュ名は `dict-shell-v3`、`manifest` の `start_url` と `scope` は `./` |
| 単体用 compose | 削除済み（起動は `~/server/apps/docker-compose.yml` から） |
| コードの正本 | 変更はまず `~/server/apps/my-dictionary/` で行い、その後 My_BOX にコピーしてコミット（二重管理。引っ越しで解消する → 14章） |

| API（`/my-dictionary/api/…`） | 動作 |
| --- | --- |
| GET `health` | `{"ok":true}` |
| GET `dictionaries` | 辞書の一覧と語数（`wordCount`） |
| POST `dictionaries/{id}/words` | 単語の追加。本文 `{"word","reading","meaning","tagIds"}` |
| DELETE `words/{id}` | 単語の削除（204） |

## 18-4. My辞書

依存パッケージなしの Node.js プログラムです（`npm install` 不要。SQLite は Node.js 22 に内蔵のものを使う）。

| ファイル | 行数 | 役割 |
| --- | --- | --- |
| `Dockerfile` | 22 | `node:22-alpine` を土台に、`node` ユーザー（非 root）で動かす。30秒ごとに `api/health` を見るヘルスチェック付き |
| `package.json` | 14 | 名前と起動コマンドだけ。依存は無い |
| `server.js` | 512 | API、DB、画面ファイルの配信を1つにまとめたサーバー |
| `public/index.html` | 58 | 画面の骨組み。上にタイトルとタグの絞り込み、下に検索バーと「＋」ボタン |
| `public/app.js` | 1,178 | 画面の動き。検索、並び順、単語とタグの編集、CSV の取り込み |
| `public/app.css` | 451 | デザイン。iPhone の標準アプリに寄せた配色（背景 `#f2f2f7`、アクセント `#007aff`）で、暗い画面にも自動で合わせる |
| `public/sw.js` | 24 | オフライン用（HTTPS のときだけ動く。倉庫は HTTP なので今は働かない） |
| `public/manifest.webmanifest` | 16 | ホーム画面に追加したときの名前とアイコン |
| `public/samples/fe_terms.csv` | 511 | 初期データ（基本情報の用語 304語） |

| テーブル（SQLite） | 中身 |
| --- | --- |
| `dictionaries` | 辞書（名前、並び順）。最初は「基本情報辞書」が1つ |
| `words` | 単語（辞書、単語、読み、意味、作成・更新日時） |
| `tags` | タグ（辞書、名前、色、並び順）。色は Finder と同じ7色 |
| `word_tags` | どの単語にどのタグが付いているか |

| メソッドと URL（`/my-dictionary/api/` の後ろ） | 動作 |
| --- | --- |
| GET `health` | 稼働確認 |
| GET / POST `dictionaries` | 辞書の一覧 / 作成 |
| PUT / DELETE `dictionaries/{id}` | 辞書の名前変更 / 削除（最後の1つは消せない） |
| GET / POST `dictionaries/{id}/words` | 単語の一覧 / 追加 |
| GET / POST `dictionaries/{id}/tags` | タグの一覧 / 作成（同じ名前は 409） |
| POST `dictionaries/{id}/import` | 取り込み（画面側で CSV を読み、その行を送る） |
| GET `dictionaries/{id}/export` | CSV の書き出し |
| PUT / DELETE `words/{id}` | 単語の編集 / 削除 |
| PUT / DELETE `tags/{id}` | タグの編集 / 削除 |

検索は、サーバーではなく画面側（`app.js`）で行います。文字をそろえてから（全角と半角、大文字と小文字、ひらがなとカタカナの違いを無視）、単語ごとに点数を付けて高い順に並べます。

| 一致のしかた | 点数 |
| --- | --- |
| 単語と完全に一致 | 100 |
| 読みと完全に一致 | 95 |
| 単語の先頭に一致 | 80 前後 |
| 読みの先頭に一致 | 75 前後 |
| 単語の途中に含まれる | 60 |
| 読みの途中に含まれる | 55 |
| 意味の中に含まれる | 34 または 28 |
| 1〜2文字違い（あいまい一致。3文字以上の語で） | 18 または 14 |

スペースで区切ると、すべての語を含むものだけが出ます（AND 検索）。結果は上位200件まで表示します。
