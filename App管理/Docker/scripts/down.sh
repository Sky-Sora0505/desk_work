#!/bin/bash
set -u
SERVICES=(homepage apps)
for s in "${SERVICES[@]}"; do
  if [ -f ~/server/$s/docker-compose.yml ]; then
    echo "停止: $s"
    (cd ~/server/$s && docker compose down)
  fi
done
echo "サービスを停止しました"
