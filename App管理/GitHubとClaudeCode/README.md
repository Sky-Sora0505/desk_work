# GitHub と Claude Code での使い方

このフォルダは、公開リポジトリ `Sky-Sora0505/desk_work` の `App管理/` にあります。誰でも読めるので、実際の値は伏せ字にしています。ここでは、Mac mini でこのフォルダを使う手順と、Claude Code の使い方をまとめます。コマンドは1行ずつ貼り、`%` が戻ってから次を貼ります。

## 公開リポジトリで守ること

| 決まり | 理由 |
| --- | --- |
| 実際の Tailscale IP・tailnet 名・デバイス名・ユーザー名を書かない | 攻撃者に地図を渡さない。伏せ字の意味は `設定値.md` |
| パスワード、SSH 秘密鍵、FileVault 復旧キー、`.env` の中身、DB を入れない | 漏れたら取り返しがつかない |
| コミットの前に `bash tools/sync.sh check` | 紛れ込みを機械的に見つける |
| いまのセキュリティの対応状況（何が未対応か）を書かない | 弱点の一覧を公開しない |

一度 push した内容は、後から消しても履歴に残ります。

## 1. Mac mini に持ってくる

desk_work をまだ Mac mini に置いていない場合は、置きたい場所で次を実行します。

```bash
git clone git@github.com:Sky-Sora0505/desk_work.git
```

すでにある場合は、場所を探して最新にします。パスが表示されれば見つかっています。

```bash
DESK="$(find ~ -maxdepth 4 -type d -name desk_work -not -path '*/Library/*' | head -1)"; echo "$DESK"
```

```bash
cd "$DESK" && git pull
```

```bash
cd "$DESK/App管理"
```

## 2. 実際の値を自分の Mac にだけ控える

```bash
cp tools/values.example tools/values.local
```

```bash
nano tools/values.local
```

右側を自分の値に書き換えて保存します（`Ctrl+O` → Enter → `Ctrl+X`）。このファイルは GitHub には上がりません。

## 3. 実機の内容を取り込む

KVストアのソース、nginx の設定、`hello` のページは、まだこのフォルダに入っていません。次のコマンドで取り込みます。実際の値は自動で伏せ字になります。

```bash
bash tools/sync.sh import
```

```bash
git status --short | head -60
```

```bash
git diff --stat
```

中身を目で確かめてから、コミットして送ります。

```bash
git add -A . && git commit -m "Import actual files from Mac mini (masked)"
```

```bash
git push
```

## 4. Claude Code を入れる

macOS 13 以上が必要です。公式の推奨はネイティブインストーラーで、Homebrew も使えます（[公式のセットアップ手順](https://code.claude.com/docs/es/setup.md)）。どちらか一方を実行します。

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

```bash
brew install --cask claude-code
```

```bash
claude --version
```

`App管理` フォルダで起動します。起動のたびに `CLAUDE.md`（公開リポジトリでの決まりを書いてある）が読まれます。

```bash
cd "$DESK/App管理" && claude
```

許可ルールは `.claude/settings.json` にあります。`deny` は実行させないもの、`ask` は毎回確認するものです。ルールはコマンドの文字列で判定されるので、書き方を変えればすり抜けます。「うっかりを止める柵」であって、本当の守りは「差分を見てから承認する」という自分の運用です。書き方は公式の settings と permissions のページ（`code.claude.com/docs/en/settings`、`code.claude.com/docs/en/permissions`）で最新を確かめ、セッション中に `/permissions` で有効なルールを見ます。

## 5. 日常の流れ

1. `cd "$DESK/App管理" && claude` で起動する
2. やりたいことを日本語で伝える（例：「フラッシュカードを型 B で追加して」）
3. Claude Code が実機（`~/server`）を直す → 差分を見て承認
4. 必要なら `docker compose build`、`~/server/scripts/up.sh`、`~/server/scripts/status.sh`
5. iPhone で開いて確認し、Tailscale をオフにして開かないことも確認する（これは人間にしかできない）
6. `bash tools/sync.sh import` でこのフォルダに取り込み、資料も直す
7. `bash tools/sync.sh check` → `git status` → コミット → `git push`

実際の値が入ったままの設定を、そのまま非公開で残したい場合は、非公開の My_BOX に置きます。この公開フォルダは「しくみと手順を残す場所」、My_BOX は「そのまま使える実物を残す場所」という分担です。

## 14-2. Claude Code に任せるもの・任せないもの

| 任せてよい | 必ず本人がやる（または承認する） |
| --- | --- |
| compose・nginx・Homepage の設定編集 | Tailscale 管理画面（ACL、端末承認、Tailnet Lock） |
| 自作アプリの実装とテスト | `sudo` を使う操作（sshd 設定、ファイアウォール、`shutdown`、`fdesetup`） |
| `docker compose build / up -d / logs`、`status.sh`、curl での試験 | データを消す操作（`down -v`、`system prune`、`~/server/data` の削除） |
| コミットの作成 | `git push`（内容を見てから）、リポジトリの公開設定 |
| 資料（`docs/`）の更新 | GitHub・Tailscale・macOS のアカウント設定、秘密情報の入力 |

## 15-5. git（引っ越し後に使う）

| コマンド | 意味 |
| --- | --- |
| `git status` | 変更されたファイルの一覧 |
| `git diff` / `git diff --cached` | まだ add していない差分 / add 済みの差分 |
| `git add <ファイル>` | 次のコミットに入れるものを選ぶ |
| `git commit -m "説明"` | 変更を記録する |
| `git log --oneline -10` | 最近の記録を10件 |
| `git push` | GitHub に送る（前に必ず `git status` と `git diff --cached --stat`） |
| `git restore <ファイル>` | まだコミットしていない変更を取り消す |
| `git revert <コミット>` | 過去のコミットを打ち消す新しいコミットを作る（履歴を消さない戻し方） |
| `git tag v1.0.0` | 試験に合格した版に名札を付ける |
| `ssh -T git@github.com` | GitHub に鍵で入れるかの確認 |

## 15-6. Claude Code

| 操作 | 意味 |
| --- | --- |
| `cd ~/server && claude` | このフォルダを作業場所として起動（`CLAUDE.md` を読む） |
| `claude --version` / `claude update` | バージョン確認 / 更新（ネイティブ版）。Homebrew 版は `brew upgrade --cask claude-code` |
| `/permissions` | セッション中に有効な許可ルールを確かめる |
| プランモード | 大きい変更の前に「計画だけ出して」と頼むと、何も変えずに手順を確認できる |
