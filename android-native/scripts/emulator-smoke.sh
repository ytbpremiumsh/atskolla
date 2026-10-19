#!/usr/bin/env bash
set -euo pipefail
mkdir -p previews
adb install build/android-native/app/build/outputs/apk/debug/app-debug.apk
adb logcat -c
for screen in home attendance spp schedule more info leave contact messages grades calendar card account; do
  adb shell am force-stop com.atskolla.parent
  adb shell am start -W -n com.atskolla.parent/.NativePreviewActivity --es screen "$screen"
  sleep 2
  adb shell screencap -p "/sdcard/$screen.png"
  adb pull "/sdcard/$screen.png" "previews/$screen.png"
  adb shell uiautomator dump /sdcard/window.xml
  adb pull /sdcard/window.xml "previews/$screen.xml"
done
adb shell am force-stop com.atskolla.parent
adb shell pm clear com.atskolla.parent
adb shell am start -W -n com.atskolla.parent/.ParentActivity
sleep 2
adb shell screencap -p /sdcard/login.png
adb pull /sdcard/login.png previews/login.png
adb logcat -d -b crash > previews/crash-log.txt
python3 android-native/scripts/verify-previews.py
