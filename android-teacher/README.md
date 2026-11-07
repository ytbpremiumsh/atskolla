# ATSkolla Guru — Android native

Separate package `com.atskolla.teacher`, Android 8+ (API 26), target 36. Java widgets, no WebView. Website colors and real school assets; native layouts adapted for phone screens. Parent remains independently installed.

Uses the existing website Supabase publishable key and **the teacher's authenticated JWT**. Refresh tokens are serialized in Android Keystore-encrypted storage. No service-role keys, privileged backend changes or Lovable AI prompts. Existing RLS remains authoritative.

Modules: teaching/home and homeroom dashboards; subject attendance with journal notes; homeroom manual attendance (holiday checks); own students and histories; monitoring; teaching/live schedules; subject/class reports and analytics; PDF preview/download and genuine XLSX; leave review and attendance synchronization; academic calendar; school announcements; manual notifications; native QR/barcode camera, face image verification via the existing face-recognition service, and optional NFC/keyboard RFID; teacher card, profile/password and local logout. School suspension and assigned-class guards are preserved. Camera/NFC requested only for those features.

Face verification uses the school's existing backend/provider; no production face calls or real attendance/WhatsApp writes are performed by build tests. Manual attendance and leave reviews preserve departure rows. Existing backend workflows are not transactional; a partial failure is surfaced instead of silently claiming success. Teacher notification screen follows the web's manual-notification filter; background FCM push is not configured.

Build: Gradle 8.13, Java17. Run `gradle :app:assembleDebug :app:assembleRelease :app:bundleRelease :app:lintRelease` from this directory. Shared ATSkolla resources and public API configuration are included from android-native; Parent source is not compiled into Guru. Release AAB/APK require owner signing for Google Play. Debug UI fixtures only exist in debug builds; synthetic checks never access real students or send real messages.
