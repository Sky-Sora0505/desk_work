"""Java Silver 17 ドリルの「倉庫サーバー版」を組み立てる。

使い方:
    python3 build.py <元のindex.html> <出力先のindex.html>

やっていること:
    元の HTML は <script> が2つある（1つ目=問題データ、2つ目=アプリ本体）。
    2つ目（アプリ本体）を「実行されないテキスト」として埋め込み直し、
    その後ろに bootstrap.html（保存先を KVストアに差し替える部品）を足す。
    アプリ本体のコードは1文字も変えない。
"""
import pathlib
import sys

src_path, out_path = sys.argv[1], sys.argv[2]
lines = pathlib.Path(src_path).read_text(encoding="utf-8").split("\n")

opens = [i for i, l in enumerate(lines) if l.strip() == "<script>"]
closes = [i for i, l in enumerate(lines) if l.strip() == "</script>"]
if len(opens) != 2 or len(closes) != 2:
    sys.exit(f"想定と違う構造です（<script> {len(opens)} 個 / </script> {len(closes)} 個）。中止します")

app_open, app_close = opens[1], closes[1]
app_src = "\n".join(lines[app_open + 1:app_close])
if "</script>" in app_src or not app_src.lstrip().startswith("(function()"):
    sys.exit("アプリ本体の形が想定と違います。中止します")

boot = (pathlib.Path(__file__).parent / "bootstrap.html").read_text(encoding="utf-8")

out = (
    "\n".join(lines[:app_open])
    + '\n<script type="text/plain" id="__appsrc">\n'
    + app_src
    + "\n</script>\n"
    + boot
    + "\n"
    + "\n".join(lines[app_close + 1:])
)
pathlib.Path(out_path).write_text(out, encoding="utf-8")
print(f"出力: {out_path}（{len(out.encode('utf-8'))} バイト）")
