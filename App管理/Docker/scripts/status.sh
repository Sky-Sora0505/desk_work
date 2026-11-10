#!/bin/bash
echo "===== Tailscale ====="
tailscale ip -4 2>/dev/null || echo "!! Tailscale 未接続"
echo ""
echo "===== Docker ====="
if docker info >/dev/null 2>&1; then
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
  echo "!! Docker Desktop が起動していません"
fi
echo ""
echo "===== 公開ポート（100.x.y.z: で始まれば正常 / *: なら異常）====="
lsof -iTCP -sTCP:LISTEN -n -P 2>/dev/null | grep com.docke | awk '{print $9}' | sort -u
