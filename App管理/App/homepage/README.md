# homepage（倉庫の入口・ポータル）

iPhone のホーム画面「倉庫」で開く画面です。Homepage という公開ソフトをそのまま使い、見た目は `config/` の設定ファイルで決めています。

## 7-1. Homepage（ポータル）

倉庫の入口です。iPhone のホーム画面には、このページだけを「倉庫」という名前で登録しています（Safari の共有ボタン → ホーム画面に追加）。

| ファイル（`~/server/homepage/config/`） | 役割 | 現在の内容 |
| --- | --- | --- |
| `settings.yaml` | 全体設定 | タイトル「倉庫サーバー」、日本語、ダークテーマ、`color: slate`、`headerStyle: clean` |
| `services.yaml` | タイルの一覧 | 下の全文 |
| `widgets.yaml` | 上部の表示 | 日付と時刻（`dateStyle: long`、`timeStyle: short`、24時間表示、`text_size: xl`） |
| `bookmarks.yaml` | リンク集 | 自動生成のまま。GitHub や AWS コンソールを並べるのに使える |
| `docker.yaml` `kubernetes.yaml` `proxmox.yaml` `custom.css` `custom.js` | 未使用 | 自動生成。`docker.yaml` は空のままにする（Docker 連携を使わない） |

`services.yaml`（現在。アイコンの打ち間違い `mdi-language-jave` を直した後の形）

```yaml
- ツール:
    - 動作確認:
        href: http://100.x.y.z:8081/hello/
        description: 倉庫の動作確認ページ
        icon: mdi-check-circle

- 学習:
    - Java Silver 17 ドリル:
        href: http://100.x.y.z:8081/java-silver17/
        description: 416問・8章（進捗はサーバー保存）
        icon: mdi-language-java
    - My辞書:
        href: http://100.x.y.z:8081/my-dictionary/
        description: 検索エンジン付きの自分専用辞書
        icon: mdi-book-open-variant
```

| 注意点 | 内容 |
| --- | --- |
| 反映 | 保存すれば自動で反映。出なければ `docker compose restart` |
| アイコン | `mdi-〇〇`（Material Design Icons）か内蔵名。存在しない名前だと空白になるだけ |
| `HOMEPAGE_ALLOWED_HOSTS` | アドレス欄に入れるホスト名をポート込みで列挙。無いと `Host validation failed` で表示されない |
| 開かないタイル | まだ作っていないアプリのタイルは置かない（混乱のもと） |
| YAML の確認 | Mac の python3 には PyYAML がない。`docker logs homepage --tail 20` で `YAMLException` がないかを見る |

## 18-2. 倉庫（ポータル）のデザイン

倉庫の画面は、Homepage という公開されているソフト（`ghcr.io/gethomepage/homepage:v2.4.0`）がそのまま表示しています。自分で書いたデザインのコードは無く、見た目は設定ファイル3つで決まっています。`custom.css` と `custom.js` は空です。

`~/server/homepage/config/settings.yaml`

```yaml
title: 倉庫サーバー
language: ja
theme: dark
color: slate
headerStyle: clean
```

`~/server/homepage/config/widgets.yaml`

```yaml
- datetime:
    text_size: xl
    format:
      dateStyle: long
      timeStyle: short
      hour12: false
```

`services.yaml`（タイルの一覧）は 7-1 に全文があります。

| 画面に見えているもの（11月10日のスクリーンショット） | 決めている設定 |
| --- | --- |
| 紺色がかった暗い背景と、少し明るいタイル | `theme: dark` と `color: slate` |
| いちばん上の「2026年11月10日 7:44」 | `widgets.yaml` の `datetime`。`dateStyle: long` が「年月日」、`timeStyle: short` と `hour12: false` が24時間表示、`text_size: xl` が大きさ |
| 見出し「ツール」「学習」 | `services.yaml` のグループ名 |
| タイルの名前・説明・左のアイコン | `services.yaml` の各項目の名前、`description`、`icon`（`mdi-check-circle`、`mdi-language-java`、`mdi-book-open-variant`） |
| 見出しに枠や下線がない | `headerStyle: clean` |
| ブラウザのタブに出る名前 | `title: 倉庫サーバー` |
| 右下の丸い矢印 | Homepage 本体の「再読み込み」ボタン |
| 左下の `v2.4.0 … Update Available` | Homepage 本体の表示。バージョンを固定しているので、新しい版が出ると出る。異常ではない |

| 変えたいこと | `settings.yaml` に書くこと |
| --- | --- |
| 色あいを変える | `color:` を `slate` `gray` `zinc` `neutral` `stone` `amber` `yellow` `lime` `green` `emerald` `teal` `cyan` `sky` `blue` `indigo` `violet` `purple` `fuchsia` `pink` `rose` `red` `white` のどれかに |
| 明るい画面にする | `theme: light` |
| 見出しの形を変える | `headerStyle:` を `underlined`（既定）`boxed` `clean` `boxedWidgets` のどれかに |
| グループを横並びにする | 下の例の `layout:` |
| 左下のバージョン表示を消す | `hideVersion: true` |
| 背景に画像を入れる | `background: /images/background.png` |
| タイルを別のタブで開く | `target: _blank` |

```yaml
layout:
  学習:
    style: row
    columns: 2
```

保存すれば自動で反映されます。出ないときは `cd ~/server/homepage && docker compose restart && cd ~` です。もっと細かく変えたいときは `custom.css` に CSS を書きます。設定の一覧は [Homepage の公式ドキュメント](https://gethomepage.dev/configs/settings/) にあります。Homepage 自体を新しくするときは、compose の `v2.4.0` を新しい版の番号に書き換えて `docker compose up -d` し、ポータルが開くか確かめます。
