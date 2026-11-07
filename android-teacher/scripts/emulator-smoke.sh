#!/usr/bin/env bash
set -euo pipefail
mkdir -p previews
apk=$(find build -name app-debug.apk -print -quit)
adb install "$apk"
adb logcat -c
adb shell am start -W -n com.atskolla.teacher/.TeacherChecksActivity
for attempt in $(seq 1 20); do
 adb shell uiautomator dump /sdcard/checks.xml
 adb pull /sdcard/checks.xml previews/checks.xml
 if rg -q 'TEACHER CHECKS PASSED|TEACHER CHECKS FAILED' previews/checks.xml; then break; fi
 sleep 1
done
adb exec-out run-as com.atskolla.teacher cat files/teacher-report.pdf > previews/teacher-report.pdf
adb exec-out run-as com.atskolla.teacher cat files/teacher-report.xlsx > previews/teacher-report.xlsx
for screen in home wali schedule live subject manual students monitoring mapel report leaves calendar announcements notifications account card more login; do
 adb shell am force-stop com.atskolla.teacher
 adb shell am start -W -n com.atskolla.teacher/.TeacherPreviewActivity --es screen "$screen"
 adb shell uiautomator dump /sdcard/view.xml
 adb pull /sdcard/view.xml "previews/$screen.xml"
 adb shell screencap -p /sdcard/view.png
 adb pull /sdcard/view.png "previews/$screen.png"
done
adb shell am force-stop com.atskolla.teacher
adb shell pm clear com.atskolla.teacher
adb shell am start -W -n com.atskolla.teacher/.TeacherActivity
sleep 2
adb shell uiautomator dump /sdcard/real-login.xml
adb pull /sdcard/real-login.xml previews/real-login.xml
adb logcat -d -b crash > previews/crash-log.txt
python3 android-teacher/scripts/verify.py
