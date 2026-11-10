# macOS の設定と SSH

サーバー本体（ホスト OS）の守りです。SSH の設定例は `sshd/` にあります。

macOS は「盗まれても読めない（FileVault）」「外から見えない（ファイアウォール＋ステルス）」「入れるのは鍵を持つ自分だけ（SSH 鍵認証）」の3点で固めています。Docker を入れる前にこの章を全部終わらせました。

## 5-1. 設定一覧

| 項目 | 設定値 | 確認コマンド（合格の表示） |
| --- | --- | --- |
| ファイアウォール | オン | `sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate`（`State = 1`） |
| ステルスモード | オン（ping にも応答しない） | `… --getstealthmode`（`stealth mode is on`） |
| FW のアプリ許可 | CP3 で一時許可した python3 は削除済み | システム設定 → ネットワーク → ファイアウォール → オプション |
| スリープ | `sleep 0` `disksleep 0` | `pmset -g` |
| 停電後の自動起動 | `autorestart 1` | `pmset -g` |
| FileVault | オン（構築前から）。復旧キーは保管済み | `fdesetup status`（`FileVault is On.`） |
| 自動ログイン | オフ | `defaults read /Library/Preferences/com.apple.loginwindow autoLoginUser`（**エラーが出れば正常**） |
| ロック画面 | パスワード要求を「すぐに」 | システム設定 → ロック画面 |
| 共有 | リモートログイン（SSH）のみオン。他はすべてオフ（AirPlay レシーバーもオフ） | システム設定 → 一般 → 共有 |
| ソフトウェアアップデート | 「セキュリティ対応とシステムファイル」はオン、「macOS アップデートをインストール」はオフ。代わりに**月に1回、手動で更新** | システム設定 → 一般 → ソフトウェアアップデート |
| アカウント分離 | 未実施。`youruser` 単独（管理者）で運用中 | 設計書の推奨は「管理者を新設し、既存を通常ユーザーに下げる（パターンB）」 |
| Docker Desktop | 「Start Docker Desktop when you sign in」オン | Docker Desktop → Settings → General |

`pmset -g` に `sleep 0 (sleep prevented by …)` と出るのは、今スリープを止めているアプリの説明です。設定は正しく入っています。macOS 26 では設定画面の項目名が変わることがあるため、GUI と食い違うときはコマンドの結果を正とします。

## 5-2. FileVault というトレードオフ

FileVault がオンだと、起動のたびに画面でログインするまでディスクが開かず、Tailscale も Docker も動きません。つまり**外出中に停電すると、帰宅してログインするまで使えません**。「物理的に触れない人には読ませない」という FileVault の役割そのものなので、受け入れています。

| 対策 | 内容 | 状態 |
| --- | --- | --- |
| リモート再起動 | `sudo fdesetup authrestart`（1回だけ認証を引き継いで再起動し、ログイン画面で止まらない） | 運用ルール |
| UPS | 短時間の停電を乗り切り、突然の電断でディスクや DB が壊れるのを防ぐ | 設計書上の推奨。導入は**要確認** |
| 外付けドライブの暗号化 | APFS（暗号化）にすると起動のたびに手動マウントが必要。自宅据え置きなら暗号化なしも可 | ドライブ購入時に決める |

## 5-3. SSH

**サーバー側**：`/etc/ssh/sshd_config.d/99-hardening.conf`（権限 600、root だけが読めるので `sudo cat` で見る）

```
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
AllowUsers youruser
MaxAuthTries 3
```

| ルール | 理由 |
| --- | --- |
| `sshd_config` 本体は編集しない | 冒頭の `Include /etc/ssh/sshd_config.d/*` が先に読まれ、SSH は「最初に設定した値が勝つ」ため、本体の末尾に書いても効かないことがある |
| 同じフォルダの `100-macos.conf` は触らない | macOS 標準の設定。番号が小さい 99 の方が先に読まれる |
| `ListenAddress` は使わない | macOS の sshd は launchd のソケット起動なので無視される。22番は全インターフェースで待ち受けるが、鍵認証のみ＋`AllowUsers` で守る（受け入れた残存リスク） |
| 変更後は `sudo sshd -T` で確認 | 書いた内容ではなく、実際に有効な値が表示される |

**クライアント側**：接続元の `~/.ssh/config`（権限 600）

```
Host skymac
    HostName your-mac.your-tailnet.ts.net
    User youruser
    IdentityFile ~/.ssh/id_ed25519_server
    IdentitiesOnly yes
```

これで `ssh skymac` だけで接続できます。`IdentitiesOnly yes` は「指定した鍵だけを試す」設定で、余計な鍵を順に試して `MaxAuthTries 3` に引っかかるのを防ぎます。

## 5-5. 画面だけ消す運用

**スリープ中は外からつながりません**。画面を消したいだけなら、スリープではなく `pmset displaysleepnow` を使います。ショートカット App でこのコマンドを実行する操作を作り、`Control+7` に割り当てました（Logicool キーボードと競合する場合は別のキーにする）。
