# java-silver17（Java Silver 17 ドリル）

416問・8章の一問一答です。`code/index.html` が倉庫に置いている完成品、`build/` が保存先を KVストアに差し替える部品と組み立てスクリプトです。

## 7-5. Java Silver 17 ドリル

| 項目 | 内容 |
| --- | --- |
| 中身 | 別の Claude チャットで作った単体 HTML（React なし、ビルド不要）。416問・8章 |
| 置き場 | `~/server/data/apps/static/java-silver17/index.html`（約245KB） |
| 保存 | 元は localStorage（`jsilver17_v1` と `jsilver17_v1_ui`）。この保存の受け口だけを KVストアに差し替え、アプリ本体は1行も変えていない |
| 運用方針 | Claude でのアプリ更新はしない。問題の追加はアプリ内の機能で行う |
| 保存の確認 | `curl -s "http://100.x.y.z:8081/api/kv?prefix=jsilver17"` で `jsilver17_v1` が出れば効いている |
| 検証 | 2台を模擬した16項目で、競合時の拒否（KV-409-01）とサーバー停止時の保存停止（KV-CL-02）を確認 |

## 18-3. Java Silver 17 ドリル

1つの HTML ファイル（3,631行）に全部入っています。

| 部分 | 行数 | 中身 |
| --- | --- | --- |
| 画面の骨組みとデザイン | 123行 | HTML と CSS。色は CSS 変数でまとめてあり、明るい画面と暗い画面の2組を持つ（背景 `#EEF1F6` / `#0F131B`、アクセント `#3B47B8` / `#8F9BFF`）。文字は IBM Plex Sans JP、コードは JetBrains Mono |
| 問題データ | 3,148行 | 416問・8章の本文 |
| アプリ本体 | 175行 | 出題・採点・進捗の記録。元のアプリのまま、1文字も変えていない |
| 保存先を差し替える部品 | 約170行 | 倉庫用に足した `bootstrap.html` |

元のアプリは、進捗をブラウザの中（`localStorage`）の `jsilver17_v1` と `jsilver17_v1_ui` に保存します。このままだと iPhone と Mac で別々の進捗になるので、次の方法で保存先だけを KVストアに変えています。

1. アプリ本体の `<script>` を `<script type="text/plain" id="__appsrc">` に変える。ブラウザはこれを「ただの文字」と見なし、すぐには実行しない
2. 部品が先に動き、KVストアから2つのキーを読む（`GET /api/kv/jsilver17_v1`）。値とリビジョン番号を覚える
3. 読み終わったら、アプリ本体の文字を取り出し、`localStorage` という名前で「偽物」を渡して実行する。アプリは今までどおり `localStorage.getItem` / `setItem` を呼んでいるつもりで、実際は部品を呼んでいる
4. アプリが保存すると、部品は 0.4秒まとめてから `PUT` で送る。そのとき `X-Expected-Revision` に「読んだときのリビジョン」を付ける
5. 他の端末が先に保存していれば、サーバーが 409 を返す。部品は以後の保存を止め、画面下に赤いお知らせを出す
6. 起動時に読めなかった場合も保存を止める（空のデータで上書きしないため）
7. 別のアプリから戻ってきたとき、30秒以上たっていれば `/meta` でリビジョンを確かめる

仕組みの中心は、この数行です。

```javascript
/* ---- 読み込みが終わってからアプリ本体を動かす ---- */
function run() {
  var src = document.getElementById('__appsrc');
  if (!src) return;
  new Function('localStorage', src.textContent)(shim);
}

Promise.all(KEYS.map(load)).then(run).catch(function (e) {
  blocked = { code: 'KV-CL-02' };
  KEYS.forEach(function (k) { if (!(k in cache)) { cache[k] = null; rev[k] = 0; } });
  run();
  notice('進捗を読み込めませんでした', /* 以下略 */);
});
```

Claude で元のアプリを更新したくなったら、新しい HTML を保存して次を実行すれば、同じ形に組み立て直せます（元の HTML の `<script>` が2つという構造が変わっていたら、スクリプトは何も書かずに止まります）。

```bash
python3 build/build.py 元のindex.html index.html
```
