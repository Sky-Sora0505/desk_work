# App管理（Mac mini 倉庫サーバー）

Mac mini M4 Pro（macOS 26、メモリ 24GB）で動く個人用の「倉庫サーバー」の、設定・コード・資料のフォルダ。
外からは Tailscale 経由のみ。フォルダの案内は README.md。

## いちばん大事なこと
- このフォルダは **公開リポジトリ**（desk_work）にある。実際の Tailscale IP・tailnet 名・デバイス名・macOS ユーザー名を、ファイルにもコミットメッセージにも書かない。
- 資料と設定は伏せ字（100.x.y.z、your-tailnet、your-mac、youruser、Your-Mac）で書く。意味は 設定値.md。
- 実際の値は tools/values.local にある（git に入らない）。このファイルの中身を読んだり表示したりしない。
- コミットの前に必ず bash tools/sync.sh check を実行し、OK を確認する。

## 応答
- 日本語で。表と構造化した Markdown を優先。
- コマンドや設定の「なぜ」を一言添える（本人は学習中の初心者）。
- ターミナルに貼るコマンドには # で始まるコメント行や、山かっこの置き換え記号を入れない（zsh でエラーになる）。

## 絶対に守ること
1. ポート開放しない。tailscale funnel は使わない。
2. Docker の ports は必ず Tailscale IP を付ける（"100.x.y.z:外:中" の形）。"8081:8080" や 0.0.0.0 は禁止。
3. 新しいアプリは ports を持たせず、nginx の default.conf に location を足して 8081 配下に置く。
4. イメージはバージョン固定（latest 禁止）。自作は local/名前:版。
5. コンテナは user: "501:20"、read_only: true + tmpfs /tmp。docker.sock をマウントしない。
6. .env、鍵、DB（~/server/data）は git に入れない。中身を画面に出さない。
7. データを消す操作（down -v、system prune、~/server/data の削除）と sudo は実行せず、コマンドを提示して本人に任せる。
8. Tailscale の ACL は管理画面が正。Tailscale/acl.hujson は控え。管理画面の変更は本人が行う。

## 変更の進め方
- 実際に動いているのは Mac mini の ~/server。このフォルダは伏せ字にした写し。対応は tools/README.md。
- 実機を変えたら bash tools/sync.sh import で取り込み、資料（Docker/、Tailscale/、App/ の Markdown）も同じコミットで直す。
- このフォルダの設定を実機に使うときは bash tools/sync.sh fill で _実機用/ に写しを作り、本人がコピーする。
- nginx を変えたら docker exec apps-static nginx -t。compose を変えたら docker compose config --services。
- 最後に ~/server/scripts/status.sh で「公開ポートが Tailscale IP の 3000 と 8081 だけ」を確認する。
- 新しいアプリはテスト環境で単体・結合試験を通してから本番とポータルに登録する（App/00_アプリ追加手順.md）。
- コミットの前に git status と git diff --cached --stat を見せる。push は本人の確認後。

## macOS の注意
- sed -i は sed -i '' の形。sshd は ListenAddress が効かない。温度は pmset -g therm。
- スクリプトは bash 3.2 で動く書き方にする。zsh のエイリアスに頼らない。
