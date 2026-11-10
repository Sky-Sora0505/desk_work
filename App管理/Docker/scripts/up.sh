#!/bin/bash
set -u
TS_IP="100.x.y.z"
SERVICES=(apps homepage)

for i in $(seq 1 30); do
  if tailscale ip -4 2>/dev/null | grep -q "^${TS_IP}$"; then break; fi
  echo "Tailscale の接続を待っています... (${i}/30)"
  sleep 2
done

if ! tailscale ip -4 2>/dev/null | grep -q "^${TS_IP}$"; then
  echo "エラー: Tailscale が接続されていません。起動を中止します。"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker Desktop を起動します..."
  open -a Docker
fi
for i in $(seq 1 60); do
  if docker info >/dev/null 2>&1; then break; fi
  echo "Docker の起動を待っています... (${i}/60)"
  sleep 2
done
if ! docker info >/dev/null 2>&1; then
  echo "エラー: Docker が起動しません。起動を中止します。"
  exit 1
fi

for s in "${SERVICES[@]}"; do
  if [ -f ~/server/$s/docker-compose.yml ]; then
    echo "起動: $s"
    (cd ~/server/$s && docker compose up -d)
  fi
done
echo "サービスを起動しました"
