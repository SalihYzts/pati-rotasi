#!/usr/bin/env bash
# Yerelde release APK derler (arm64). Gereken: Android SDK (~/Android/Sdk) ve JDK 21.
# Çıktı: dist/pati-rotasi.apk
set -euo pipefail
cd "$(dirname "$0")/.."

export JAVA_HOME="${JAVA_HOME_21:-$HOME/.jdks/jdk-21.0.2}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

[ -d android ] || CI=1 npx expo prebuild --platform android --no-install

(cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon)

mkdir -p dist
cp android/app/build/outputs/apk/release/app-release.apk dist/pati-rotasi.apk
echo "APK hazır: dist/pati-rotasi.apk"
