#!/usr/bin/env bash
# VM-side monitor for WSL GPU benches: RAM, Chrome process count, new kernel dxg errors. Log: test-results/bench/wsl-vm.log
# Usage: scripts/bench/wsl-vm-monitor.sh   (leave running in a second terminal; Ctrl+C to stop)
mkdir -p "$(dirname "$0")/../../test-results/bench"
out="$(dirname "$0")/../../test-results/bench/wsl-vm.log"
while true; do
  echo "$(date +%T) $(free -m | awk '/Mem/{print "used="$3" avail="$7}') chrome=$(pgrep -c chrome) dxgk_err=$(dmesg 2>/dev/null | grep -c 'dxgk.*failed')" >> "$out"
  sync -f "$out" 2>/dev/null
  sleep 2
done
