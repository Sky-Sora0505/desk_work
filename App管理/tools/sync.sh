#!/bin/bash
# 公開リポジトリに実際の値（IP など）を入れないための道具。
#
#   bash tools/sync.sh check    実際の値が紛れ込んでいないか調べる（コミットの前に必ず）
#   bash tools/sync.sh import   Mac mini の ~/server から取り込み、伏せ字に置き換える
#   bash tools/sync.sh fill     伏せ字を実際の値に戻した写しを _実機用/ に作る
#
# 実際の値は tools/values.local に書く（git には入らない）。ひな形は tools/values.example。
# macOS 標準の bash 3.2 で動く書き方にしている。
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VALUES="$ROOT/tools/values.local"
SERVER="${SERVER_DIR:-$HOME/server}"
FILLED="$ROOT/_実機用"

# 名前 と 伏せ字 の対応（values.local の左側の名前と同じ）
NAMES=(TS_IP TAILNET DEVICE MAC_USER MAC_HOSTNAME)
MASKS=("100.x.y.z" "your-tailnet" "your-mac" "youruser" "Your-Mac")
REALS=()

# 取り込みの対応表:  種類|実機側（~/server からの相対パス）|このフォルダ側
#   F = ファイル1つ   D = フォルダまるごと
MAPPINGS=(
  "F|apps/docker-compose.yml|Docker/compose/apps/docker-compose.yml"
  "F|apps/nginx/default.conf|Docker/compose/apps/nginx/default.conf"
  "F|homepage/docker-compose.yml|Docker/compose/homepage/docker-compose.yml"
  "F|scripts/up.sh|Docker/scripts/up.sh"
  "F|scripts/down.sh|Docker/scripts/down.sh"
  "F|scripts/status.sh|Docker/scripts/status.sh"
  "F|homepage/config/settings.yaml|App/homepage/config/settings.yaml"
  "F|homepage/config/services.yaml|App/homepage/config/services.yaml"
  "F|homepage/config/widgets.yaml|App/homepage/config/widgets.yaml"
  "F|homepage/config/bookmarks.yaml|App/homepage/config/bookmarks.yaml"
  "F|homepage/config/custom.css|App/homepage/config/custom.css"
  "F|homepage/config/custom.js|App/homepage/config/custom.js"
  "D|apps/kvstore|App/kvstore/code"
  "D|apps/my-dictionary|App/my-dictionary/code"
  "D|data/apps/static/hello|App/hello/code"
  "D|data/apps/static/java-silver17|App/java-silver17/code"
)

# fill で実機用の写しを作る場所
FILL_TARGETS=("Docker/compose" "Docker/scripts" "App/homepage/config")

load_values() {
  if [ ! -f "$VALUES" ]; then
    echo "tools/values.local がありません。"
    echo "  cp tools/values.example tools/values.local"
    echo "を実行し、右側を自分の値に書き換えてください（調べ方は 設定値.md）。"
    exit 1
  fi
  local i=0 line v
  while [ $i -lt ${#NAMES[@]} ]; do
    line="$(grep -E "^${NAMES[$i]}=" "$VALUES" | head -1)"
    v="${line#*=}"
    if [ -z "$v" ] || [ "$v" = "${MASKS[$i]}" ]; then
      echo "tools/values.local の ${NAMES[$i]} が未記入です（ひな形のままです）。"
      exit 1
    fi
    if [ ${#v} -lt 5 ]; then
      echo "tools/values.local の ${NAMES[$i]} が短すぎます（5文字未満）。関係ない文字まで置き換えてしまうので中止します。"
      exit 1
    fi
    REALS[$i]="$v"
    i=$((i + 1))
  done
}

# 正規表現の特別な文字を無効にする（検索する側）
esc_pat() { printf '%s' "$1" | sed -e 's/[][\.*^$|]/\\&/g'; }
# 置き換える側
esc_rep() { printf '%s' "$1" | sed -e 's/[\\&|]/\\&/g'; }

is_text() { grep -Iq . "$1" 2>/dev/null; }

# $1 = ファイル, $2 = mask（実値→伏せ字）か fill（伏せ字→実値）
convert_file() {
  local f="$1" mode="$2" i=0 args=() from to
  is_text "$f" || return 0
  while [ $i -lt ${#NAMES[@]} ]; do
    if [ "$mode" = "mask" ]; then from="${REALS[$i]}"; to="${MASKS[$i]}"; else from="${MASKS[$i]}"; to="${REALS[$i]}"; fi
    args+=(-e "s|$(esc_pat "$from")|$(esc_rep "$to")|g")
    i=$((i + 1))
  done
  sed "${args[@]}" "$f" > "$f.tmp.$$" && cat "$f.tmp.$$" > "$f"
  rm -f "$f.tmp.$$"
}

convert_tree() {
  local d="$1" mode="$2" f
  find "$d" -type f -not -name '*.png' -not -name '*.jpg' -print | while IFS= read -r f; do
    convert_file "$f" "$mode"
  done
}

# 取り込んではいけないものを消す（データ、秘密情報、ビルド物）
prune_tree() {
  local d="$1"
  find "$d" \( -name node_modules -o -name target -o -name data \) -type d -prune -exec rm -rf {} + 2>/dev/null
  find "$d" -type f \( -name '.DS_Store' -o -name '*.db' -o -name '*.db-shm' -o -name '*.db-wal' -o -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' -o -name '*.bak-*' \) -exec rm -f {} + 2>/dev/null
}

cmd_check() {
  load_values
  local i=0 hits found=0
  while [ $i -lt ${#NAMES[@]} ]; do
    hits="$(cd "$ROOT" && grep -rIl -F --exclude-dir=.git --exclude-dir=_実機用 --exclude=values.local -- "${REALS[$i]}" . 2>/dev/null)"
    if [ -n "$hits" ]; then
      found=1
      echo "!! ${NAMES[$i]} の実際の値が入っているファイル:"
      echo "$hits" | sed 's/^/     /'
    fi
    i=$((i + 1))
  done
  hits="$(cd "$ROOT" && grep -rIl -E --exclude-dir=.git --exclude-dir=_実機用 --exclude=sync.sh -- 'BEGIN [A-Z ]*PRIVATE KEY' . 2>/dev/null)"
  if [ -n "$hits" ]; then
    found=1
    echo "!! 秘密鍵らしいものが入っているファイル:"
    echo "$hits" | sed 's/^/     /'
  fi
  if [ $found -eq 1 ]; then
    echo ""
    echo "このままコミットしないでください。上のファイルを直すか、bash tools/sync.sh import をやり直してください。"
    exit 1
  fi
  echo "OK: 実際の値と秘密鍵は見つかりませんでした。"
}

cmd_import() {
  load_values
  if [ ! -d "$SERVER" ]; then
    echo "$SERVER がありません。Mac mini の上で実行してください。"
    exit 1
  fi
  local m kind src dst n=0
  for m in "${MAPPINGS[@]}"; do
    kind="${m%%|*}"; src="${m#*|}"; dst="${src#*|}"; src="${src%%|*}"
    if [ "$kind" = "F" ] && [ -f "$SERVER/$src" ]; then
      mkdir -p "$(dirname "$ROOT/$dst")"
      cp "$SERVER/$src" "$ROOT/$dst"
      convert_file "$ROOT/$dst" mask
      echo "取り込み: $src"
      n=$((n + 1))
    elif [ "$kind" = "D" ] && [ -d "$SERVER/$src" ]; then
      mkdir -p "$ROOT/$dst"
      cp -R "$SERVER/$src/." "$ROOT/$dst/"
      prune_tree "$ROOT/$dst"
      convert_tree "$ROOT/$dst" mask
      echo "取り込み: $src/"
      n=$((n + 1))
    else
      echo "（実機に無いので飛ばします: $src）"
    fi
  done
  echo ""
  echo "$n 件を取り込み、実際の値を伏せ字に置き換えました。続けて確認します。"
  cmd_check
  echo "次は git status と git diff で内容を確かめてから、コミットしてください。"
}

cmd_fill() {
  load_values
  rm -rf "$FILLED"
  local t
  for t in "${FILL_TARGETS[@]}"; do
    mkdir -p "$FILLED/$t"
    cp -R "$ROOT/$t/." "$FILLED/$t/"
    convert_tree "$FILLED/$t" fill
  done
  echo "実際の値を入れた写しを作りました: $FILLED"
  echo "このフォルダは git に入りません。中身を確かめてから、必要なファイルを ~/server の同じ場所へ自分でコピーしてください。"
}

case "${1:-}" in
  check) cmd_check ;;
  import) cmd_import ;;
  fill) cmd_fill ;;
  *)
    echo "使い方: bash tools/sync.sh check | import | fill"
    exit 1
    ;;
esac
