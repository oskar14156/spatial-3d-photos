#!/bin/sh
set -eu

requested="${1:-auto}"
port=8081

while lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; do
  port=$((port + 1))
done

has_android_device() {
  command -v adb >/dev/null 2>&1 || return 1
  adb devices 2>/dev/null | awk '
    NR > 1 && $2 == "device" { found = 1 }
    END { exit found ? 0 : 1 }
  '
}

if [ "$requested" = "auto" ]; then
  if has_android_device; then
    requested="android"
  else
    requested="ios"
  fi
fi

echo "Starting $requested debug build on Metro port $port"

case "$requested" in
  ios)
        exec npx expo run:ios --device --configuration Debug --port "$port" --no-install
    ;;
  android)
    exec npx expo run:android --device --port "$port"
    ;;
  *)
    echo "Usage: npm run device [ios|android]" >&2
    exit 2
    ;;
esac
