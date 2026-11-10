# App管理（Mac mini 倉庫サーバー）

Mac mini M4 Pro で動かしている自宅サーバー「倉庫サーバー」の、設定・コード・資料をまとめたフォルダです。自作アプリを外出先の iPhone から開けるようにするサーバーで、インターネットにはポートを開けず、Tailscale でつながった自分の端末だけが届きます。内容は2026年11月10日時点のものです。

> **このフォルダは公開リポジトリにあります。** Tailscale の IP・tailnet 名・デバイス名・ユーザー名は伏せ字（`100.x.y.z`、`your-tailnet`、`your-mac`、`youruser`）に置き換えてあります。意味は `設定値.md` を見てください。パスワード・SSH 秘密鍵・FileVault 復旧キー・`.env` の中身・DB は入っていませんし、今後も入れません。

## フォルダの案内

| フォルダ | 役割 | 主な中身 |
| --- | --- | --- |
| `00_全体/` | まず全体をつかむ | システム概要と構成図、現在地点、しくみ入門、用語集 |
| `Docker/` | コンテナの動かし方 | しくみ、設計と規約、日常操作、コマンド、compose ファイル、起動・停止スクリプト |
| `Tailscale/` | 外からの入口 | しくみ、設定と ACL、コマンド、ACL の控え、家族と共有するときの案 |
| `App/` | アプリごとの中身 | アプリ追加手順、`homepage`（倉庫の画面）、`java-silver17`、`my-dictionary`、`kvstore`、計画中のアプリ |
| `macOS/` | サーバー本体（ホスト OS） | 設定と SSH、ファイアウォール、夏場の運用と電源、コマンド |
| `運用/` | 動かし続けるための資料 | セキュリティと脅威モデル、バックアップと復元、トラブル対応、確認に使うコマンド |
| `GitHubとClaudeCode/` | このフォルダの使い方 | 公開リポジトリでの決まり、Mac mini への持ってき方、Claude Code の導入、git のコマンド |
| `学習メモ/` | 並行して学んだこと | Linux 基本コマンド、AWS IAM、画面デザインの決め方、Java 演習用の Docker 環境 |
| `資料/` | 記録 | これまでの質問と記載場所の対応表、変更履歴と元にした資料 |
| `tools/` | 伏せ字の道具 | `sync.sh`（実際の値の確認・取り込み・戻し） |
| `設定値.md` | 伏せ字の一覧 | 伏せ字の意味と、実際の値の調べ方 |
| `CLAUDE.md`、`.claude/` | Claude Code 用 | 毎回読ませる前提と約束、許可ルール |

## 読む順（はじめての人）

1. `00_全体/01_システム概要.md`：何のためのサーバーで、どうつながっているか
2. `00_全体/03_しくみ入門.md` → `Docker/01_しくみ.md` → `Tailscale/01_しくみ.md`：なぜそう動くのか
3. `00_全体/02_現在地点.md`：今なにが動いているか
4. `Docker/03_日常操作.md`：起動・停止・確認のしかた
5. アプリを足すとき：`App/00_アプリ追加手順.md`

## 実機（Mac mini）との関係

実際に動いているのは Mac mini の `~/server` です。このフォルダは、それを機能ごとに並べ直し、実際の値を伏せ字にした写しです。

| Mac mini（`~/server/` の下） | このフォルダ |
| --- | --- |
| `apps/docker-compose.yml`、`apps/nginx/default.conf` | `Docker/compose/apps/` |
| `homepage/docker-compose.yml` | `Docker/compose/homepage/` |
| `scripts/up.sh` `down.sh` `status.sh` | `Docker/scripts/` |
| `homepage/config/` の設定ファイル | `App/homepage/config/` |
| `apps/kvstore/` | `App/kvstore/code/`（未取り込み） |
| `apps/my-dictionary/` | `App/my-dictionary/code/` |
| `data/apps/static/java-silver17/` | `App/java-silver17/code/` |
| `data/` のそれ以外（DB など） | 入れない |

| やりたいこと | Mac mini のターミナルで、このフォルダに移動してから実行 |
| --- | --- |
| 実際の値が紛れ込んでいないか調べる（コミットの前に毎回） | `bash tools/sync.sh check` |
| 実機の内容を、伏せ字にして取り込む | `bash tools/sync.sh import` |
| 伏せ字を実際の値に戻した写しを作る（git には入らない） | `bash tools/sync.sh fill` |

使い方は `tools/README.md` にあります。

## いま入っているものの確かさ

| もの | 状態 |
| --- | --- |
| 資料（Markdown） | claude.ai で作った設計仕様書（第2版）を機能ごとに分けたもの |
| `App/my-dictionary/code/` | 非公開リポジトリ My_BOX にあるコードと同じ。起動を確認済み |
| `App/java-silver17/code/index.html` | 元のアプリから同じ手順で組み立て直したもの。動作を確認済み。実機のファイルとは未照合 |
| compose 2つ、スクリプト3つ、`App/homepage/config/`、`Tailscale/acl.hujson`、`macOS/sshd/` | チャットの記録からの再現。実機・管理画面とは未照合 |
| KVストアのソース、nginx の `default.conf` の全文、`hello` のページ | **まだ入っていない**（Mac mini の中にしかない） |

Mac mini で `bash tools/sync.sh import` を1回実行すると、「記録からの再現」と「まだ入っていない」が、実機の内容（伏せ字済み）に置き換わります。

## 情報が食い違ったとき

1. Mac mini 実機のファイルと、コマンドの出力
2. このフォルダ
3. 過去の資料（claude.ai の設計仕様書、10〜30番台の Markdown）

資料の中の **「要確認」** は、チャットの記録から実機の状態を確定できなかった箇所です。確かめたら、その場所を書き直します。

## 最初にやること

1. Mac mini にこのフォルダを持ってくる（`GitHubとClaudeCode/README.md`）
2. `tools/values.local` に実際の値を書く（GitHub には上がらない）
3. `bash tools/sync.sh import` で実機の内容を取り込み、確かめてからコミットする
4. 「要確認」を実機で確かめて埋める

## 仕様書番号の索引

資料の見出しには、元の設計仕様書の番号（`5-4` など）を残しています。本文に「（6-1）」「13章」のように出てきたら、この表で場所を引けます。14章（引っ越し計画）は、いまの置き方に合わせて `GitHubとClaudeCode/README.md` に書き直しました。

| 仕様書の番号 | 見出し | 置いた場所 |
| --- | --- | --- |
| 0-4 | これまでに作った資料（旧版） | `資料/変更履歴と元資料.md` |
| 1-1 | 目的 | `00_全体/01_システム概要.md` |
| 1-2 | ハードウェア | `00_全体/01_システム概要.md` |
| 1-3 | 構成の考え方（建物のたとえ） | `00_全体/01_システム概要.md` |
| 1-4 | 設計原則 | `00_全体/01_システム概要.md` |
| 2-1 | サーバー本体 | `設定値.md` |
| 2-2 | アカウント・外部サービス | `設定値.md` |
| 2-3 | SSH 鍵 | `設定値.md` |
| 2-4 | URL 一覧（Tailscale がオンの端末からだけ開ける） | `設定値.md` |
| 3-1 | 稼働中のコンテナ | `00_全体/02_現在地点.md` |
| 3-2 | 倉庫に載っているアプリ（ポータルのタイル） | `00_全体/02_現在地点.md` |
| 3-3 | 構築フェーズの進捗 | `00_全体/02_現在地点.md` |
| 3-4 | 構築後の主な出来事 | `00_全体/02_現在地点.md` |
| 3-5 | 入っていないもの（設計書にはあるが未導入） | `00_全体/02_現在地点.md` |
| 4-1 | Tailscale の構成 | `Tailscale/02_設定とACL.md` |
| 4-2 | ACL（ポリシーファイル）全文 | `Tailscale/02_設定とACL.md` |
| 4-3 | ポート割当表 | `Tailscale/02_設定とACL.md` |
| 4-4 | Mac mini が待ち受けているポート（基準状態） | `Tailscale/02_設定とACL.md` |
| 5-1 | 設定一覧 | `macOS/01_設定とSSH.md` |
| 5-2 | FileVault というトレードオフ | `macOS/01_設定とSSH.md` |
| 5-3 | SSH | `macOS/01_設定とSSH.md` |
| 5-4 | tailscale コマンドのラッパー | `Tailscale/03_コマンド.md` |
| 5-5 | 画面だけ消す運用 | `macOS/01_設定とSSH.md` |
| 5-6 | ファイアウォールの許可アプリ（10月2日に棚卸し） | `macOS/02_ファイアウォール.md` |
| 5-7 | 夏場の運用と、外出時の止め方 | `macOS/03_夏場と電源.md` |
| 5-8 | やってはいけないこと | `macOS/03_夏場と電源.md` |
| 6-1 | 共通規約 | `Docker/02_設計と規約.md` |
| 6-2 | ディレクトリ構成（現在） | `Docker/02_設計と規約.md` |
| 6-3 | `~/server/homepage/docker-compose.yml` | `Docker/02_設計と規約.md` |
| 6-4 | `~/server/apps/docker-compose.yml` | `Docker/02_設計と規約.md` |
| 6-5 | `~/server/apps/nginx/default.conf`（構造） | `Docker/02_設計と規約.md` |
| 7-1 | Homepage（ポータル） | `App/homepage/README.md` |
| 7-2 | nginx（apps-static） | `Docker/02_設計と規約.md` |
| 7-3 | KVストア（apps-kvstore） | `App/kvstore/README.md` |
| 7-4 | My辞書（apps-dictionary） | `App/my-dictionary/README.md` |
| 7-5 | Java Silver 17 ドリル | `App/java-silver17/README.md` |
| 8-1 | スクリプト全文 | `Docker/03_日常操作.md` |
| 8-2 | 日常の操作 | `Docker/03_日常操作.md` |
| 8-3 | 電源を入れたときの手順 | `Docker/03_日常操作.md` |
| 8-4 | 定期作業 | `Docker/03_日常操作.md` |
| 9-1 | どの型で追加するか | `App/00_アプリ追加手順.md` |
| 9-2 | 共通の進め方 | `App/00_アプリ追加手順.md` |
| 9-3 | 型 A：静的アプリ | `App/00_アプリ追加手順.md` |
| 9-4 | 型 B：静的アプリ＋KVストア | `App/00_アプリ追加手順.md` |
| 9-5 | 型 C：専用バックエンド付き（My辞書で確立した形） | `App/00_アプリ追加手順.md` |
| 9-6 | 保留中の「独立ポート型」 | `App/00_アプリ追加手順.md` |
| 10-1 | 多層防御 | `運用/01_セキュリティ.md` |
| 10-2 | 脅威モデルの結果（旧「03_レッドチーム脅威モデル評価」より） | `運用/01_セキュリティ.md` |
| 10-3 | セキュリティの点検項目 | `運用/01_セキュリティ.md` |
| 10-4 | 家族と写真を共有するときの設計（将来） | `Tailscale/04_家族と共有するとき.md` |
| 11-1 | 何をどう守るか | `運用/02_バックアップと復元.md` |
| 11-2 | 今すぐできる手動バックアップ | `運用/02_バックアップと復元.md` |
| 11-3 | KVストアの復元（進捗がおかしくなったとき） | `App/kvstore/README.md` |
| 11-4 | 外付けドライブ購入後の計画 | `運用/02_バックアップと復元.md` |
| 12-1 | 症状別の早見表 | `運用/03_トラブル対応.md` |
| 12-2 | macOS 特有の落とし穴 | `運用/03_トラブル対応.md` |
| 12-3 | ターミナル操作の落とし穴 | `運用/03_トラブル対応.md` |
| 13-1 | 一覧 | `App/計画中/README.md` |
| 13-2 | coupon-checker（近所の店のクーポン有無チェッカー） | `App/計画中/coupon-checker.md` |
| 13-3 | バス予約アプリ（研修で作成） | `App/計画中/バス予約アプリ.md` |
| 13-4 | ローカル LLM | `App/計画中/ローカルLLM.md` |
| 13-5 | 重要メール抽出（mail-digest）の詳細 | `App/計画中/mail-digest.md` |
| 13-6 | フラッシュカードと Garmin の補足 | `App/計画中/README.md` |
| 13-7 | iPhone のボタン1つでオン・オフする方法 | `App/計画中/README.md` |
| 13-8 | 参考にできる公開リポジトリについて | `App/計画中/README.md` |
| 14-2 | Claude Code に任せるもの・任せないもの | `GitHubとClaudeCode/README.md` |
| 15-1 | Docker（コンテナを動かす） | `Docker/04_コマンド.md` |
| 15-2 | Tailscale | `Tailscale/03_コマンド.md` |
| 15-3 | macOS（電源・セキュリティ・状態） | `macOS/04_コマンド.md` |
| 15-4 | 確認・試験に使う道具 | `運用/04_確認に使うコマンド.md` |
| 15-5 | git（引っ越し後に使う） | `GitHubとClaudeCode/README.md` |
| 15-6 | Claude Code | `GitHubとClaudeCode/README.md` |
| 16-1 | 用語集 | `00_全体/04_用語集.md` |
| 16-2 | 変更履歴 | `資料/変更履歴と元資料.md` |
| 16-3 | 元にしたチャット（claude.ai プロジェクト内） | `資料/変更履歴と元資料.md` |
| 16-4 | 参考にした公式情報 | `資料/変更履歴と元資料.md` |
| 17-1 | まず3つの言葉 | `00_全体/03_しくみ入門.md` |
| 17-2 | Docker：プログラムは中、データは外 | `Docker/01_しくみ.md` |
| 17-3 | Tailscale：なぜポートを開けずにつながるのか | `Tailscale/01_しくみ.md` |
| 17-4 | nginx と HTTPS | `00_全体/03_しくみ入門.md` |
| 17-5 | ターミナル・シェル・SSH | `00_全体/03_しくみ入門.md` |
| 17-6 | Linux 基本コマンド8つ（名前は英単語の省略） | `学習メモ/Linux基本コマンド.md` |
| 17-7 | タイルを押してから画面が出るまで | `00_全体/03_しくみ入門.md` |
| 18-2 | 倉庫（ポータル）のデザイン | `App/homepage/README.md` |
| 18-3 | Java Silver 17 ドリル | `App/java-silver17/README.md` |
| 18-4 | My辞書 | `App/my-dictionary/README.md` |
| 19-1 | AWS IAM ポリシーの書き方 | `学習メモ/AWS_IAM.md` |
| 19-2 | アプリの画面デザインの決め方 | `学習メモ/画面デザインの決め方.md` |
| 19-3 | Java 演習用の Docker 環境（倉庫とは別物） | `学習メモ/Java演習用Docker環境.md` |
