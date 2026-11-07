#!/usr/bin/env bash
set -euo pipefail
mkdir -p previews
adb install build/android-native/app/build/outputs/apk/debug/app-debug.apk
adb logcat -c
adb shell pm grant com.atskolla.parent android.permission.POST_NOTIFICATIONS
for screen in home attendance spp schedule more info leave contact messages grades calendar card account; do
  adb shell am force-stop com.atskolla.parent
  adb shell am start -W -n com.atskolla.parent/.NativePreviewActivity --es screen "$screen"
  adb shell uiautomator dump /sdcard/window.xml
  adb pull /sdcard/window.xml "previews/$screen.xml"
  # UIAutomator waits for the native UI to become idle before the screenshot.
  adb shell screencap -p "/sdcard/$screen.png"
  adb pull "/sdcard/$screen.png" "previews/$screen.png"
done
for modal in students payment success; do
  adb shell am force-stop com.atskolla.parent
  adb shell am start -W -n com.atskolla.parent/.NativePreviewActivity --es modal "$modal"
  adb shell uiautomator dump /sdcard/modal.xml
  adb pull /sdcard/modal.xml "previews/modal-$modal.xml"
  adb shell screencap -p "/sdcard/modal-$modal.png"
  adb pull "/sdcard/modal-$modal.png" "previews/modal-$modal.png"
done
adb shell am force-stop com.atskolla.parent
adb shell am start -W -n com.atskolla.parent/.PaymentRouteCheckActivity
adb shell uiautomator dump /sdcard/payment-routing.xml
adb pull /sdcard/payment-routing.xml previews/payment-routing.xml
adb shell am force-stop com.atskolla.parent
adb shell am start -W -n com.atskolla.parent/.CheckoutCheckActivity --es mode pending
sleep 6
adb shell uiautomator dump /sdcard/checkout-pending.xml
adb pull /sdcard/checkout-pending.xml previews/checkout-pending.xml
adb shell screencap -p /sdcard/checkout-pending.png
adb pull /sdcard/checkout-pending.png previews/checkout-pending.png
adb shell am force-stop com.atskolla.parent
adb shell am start -W -n com.atskolla.parent/.CheckoutCheckActivity --es mode paid
sleep 7
adb shell uiautomator dump /sdcard/checkout-paid.xml
adb pull /sdcard/checkout-paid.xml previews/checkout-paid.xml
adb shell am force-stop com.atskolla.parent
adb shell am start -W -n com.atskolla.parent/.CheckoutCheckActivity --es mode partial
sleep 7
adb shell uiautomator dump /sdcard/checkout-partial.xml
adb pull /sdcard/checkout-partial.xml previews/checkout-partial.xml
adb shell am force-stop com.atskolla.parent
adb shell am start -W -n com.atskolla.parent/.InvoiceCheckActivity
for attempt in $(seq 1 20); do
  adb shell uiautomator dump /sdcard/invoice-check.xml
  adb pull /sdcard/invoice-check.xml previews/invoice-check.xml
  if rg -q 'INVOICE CHECK PASSED|INVOICE CHECK FAILED' previews/invoice-check.xml; then break; fi
  sleep 1
done
adb exec-out run-as com.atskolla.parent cat files/invoice-fixture.pdf > previews/invoice-fixture.pdf
adb shell am force-stop com.atskolla.parent
adb shell am start -W -n com.atskolla.parent/.NativeLifecycleCheckActivity
for attempt in $(seq 1 20); do
  adb shell uiautomator dump /sdcard/lifecycle.xml
  adb pull /sdcard/lifecycle.xml previews/lifecycle.xml
  if rg -q 'CHECKS PASSED|CHECKS FAILED' previews/lifecycle.xml; then break; fi
  sleep 1
done
adb shell am force-stop com.atskolla.parent
adb shell am start -W -n com.atskolla.parent/.NativeSessionPreviewActivity
adb shell uiautomator dump /sdcard/restored.xml
adb pull /sdcard/restored.xml previews/restored.xml
adb shell screencap -p /sdcard/restored.png
adb pull /sdcard/restored.png previews/restored.png
adb shell am force-stop com.atskolla.parent
adb shell am start -W -n com.atskolla.parent/.NativeSessionPreviewActivity
adb shell uiautomator dump /sdcard/restored-again.xml
adb pull /sdcard/restored-again.xml previews/restored-again.xml
adb shell am force-stop com.atskolla.parent
adb shell pm clear com.atskolla.parent
adb shell am start -W -n com.atskolla.parent/.SplashActivity
adb shell screencap -p /sdcard/splash.png
adb pull /sdcard/splash.png previews/splash.png
sleep 2
adb shell screencap -p /sdcard/login.png
adb pull /sdcard/login.png previews/login.png
adb logcat -d -b crash > previews/crash-log.txt
python3 android-native/scripts/verify-previews.py
