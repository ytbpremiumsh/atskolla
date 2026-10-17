# ATSkolla Parent Android

Aplikasi WebView untuk https://atskolla.com/parent, Android 8.0 ke atas.
ID aplikasi: `com.atskolla.parent`. Nama: ATSkolla Parent.

## Membuat APK

Setelah perubahan dikirim ke GitHub, buka tab **Actions → Build ATSkolla Parent APK**.
Workflow berjalan otomatis untuk perubahan Android di `main`, atau pilih **Run workflow**.
Setelah berhasil, unduh artifact **ATSkolla-Parent-debug**, ekstrak ZIP, lalu instal `app-debug.apk`.
APK debug untuk pengujian, bukan untuk publikasi Play Store. Signing release harus memakai
keystore milik pemilik aplikasi dan disimpan aman di luar repositori.

Untuk build lokal: buka folder ini di Android Studio, gunakan JDK 17, SDK 35,
Android Gradle Plugin 8.9.2 dan Gradle 8.11.1. Dengan Gradle tersebut tersedia:

```sh
gradle :app:assembleDebug :app:lintDebug
```

## Perilaku

- JavaScript, DOM storage dan cookie aktif untuk aplikasi web dan sesi login.
- Navigasi HTTPS atskolla.com tetap di aplikasi; tautan luar dan popup yang
  dibuka pengguna diteruskan ke browser/aplikasi terkait, termasuk pembayaran dan WhatsApp.
- Tombol kembali, indikator pemuatan, pemulihan state, unggah berkas melalui pemilih Android,
  dan pesan kesalahan dengan tombol coba lagi.
- Tidak mengabaikan kesalahan sertifikat, tidak mengizinkan HTTP atau akses berkas lokal.
- Memerlukan internet; konten mengikuti website tanpa build ulang APK.

## Batasan dan pengujian perangkat

Belum diuji di perangkat/emulator. Verifikasi login/logout, sesi setelah restart,
tombol kembali, rotasi layar, mode offline, unggah bukti dan alur pembayaran.
Unduhan URL HTTPS diteruskan ke browser; unduhan `blob:`/`data:` yang dibuat JavaScript
(misalnya PDF dari jsPDF), kamera/QR, geolokasi, dan push notification belum diimplementasikan.
Browser memiliki sesi terpisah sehingga unduhan yang memerlukan login dapat meminta login ulang.
Ikon launcher memakai logo ATSkolla asli, termasuk adaptive icon dan splash Android 12+.
Build APK dan Android Lint harus berhasil sebelum APK dinyatakan siap uji.


## Versi 1.1.0 — identitas ATSkolla

Logo yang disediakan pemilik digunakan tanpa perubahan pada aset PNG aslinya.
Ikon adaptif diberi ruang aman agar tidak terpotong oleh mask launcher Android.
Splash sistem disambung dengan loading native berlogo, animasi lembut yang menghormati
pengaturan animasi perangkat, dan transisi setelah halaman selesai dimuat tanpa jeda buatan.
Indikator kecil ditampilkan pada navigasi berikutnya. Ada pesan koneksi lambat,
batas tunggu awal 45 detik, tombol coba lagi dan buka browser.
Layout dapat digulir pada layar pendek atau ukuran font besar. Mendukung back Android 13+.

APK yang dibagikan lewat Actions tetap build debug untuk pengujian. Bila Android menolak
pembaruan karena tanda tangan APK debug lama berbeda, build sebelumnya dan build ini
memakai keystore debug berbeda dari runner CI. Jangan menghapus aplikasi tanpa memahami
bahwa sesi lokal akan hilang; gunakan signing key tetap untuk distribusi rutin/produksi.
