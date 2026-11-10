# Model pembayaran sekolah dan biaya admin ATSkolla

- Wali membayar pokok pembayaran (atau sisa/cicilan yang dipilih) + biaya layanan tetap ATSkolla.
- Default biaya layanan Rp3.000, sama untuk semua metode. Super Admin mengatur atskolla_admin_fee melalui Pengaturan Payment Gateway.
- DOKU memotong biaya dari total checkout, termasuk admin. QRIS mengikuti kontrak yang ditunjukkan pemilik: sampai Rp100.000 Rp555, selebihnya 0,7% dengan pembulatan rupiah.
- Sekolah memperoleh pokok dikurangi biaya gateway. Split FIX sekolah memakai nominal tersebut; selisih net settlement masuk rekening default merchant ATSkolla. Tidak ada komisi tambahan dari pokok SPP.
- Hasil admin utuh mengandalkan kecocokan tarif terkonfirmasi dengan potongan DOKU aktual dan rekening default merchant yang benar. Jangan mengklaim sudah direkonsiliasi hanya dari quote. Uji sandbox dan cocokkan satu laporan settlement nyata sebelum aktivasi produksi.
- VA/retail dikunci ke satu bank/gerai checkout. Tarif harus dimasukkan Super Admin sebagai total final termasuk pajak, sesuai Fee Scheme akun. Metode tanpa tarif belum ditampilkan kepada wali. Tidak memakai perkiraan tarif umum untuk membagi dana produksi.
- Sekolah mengaktifkan QRIS/VA/retail melalui Pengaturan Sekolah atau Bendahara > Saldo & Riwayat > Metode Pembayaran. RLS membatasi perubahan ke admin/bendahara sekolah terkait; pengecekan server tetap menolak metode nonaktif.
- Menonaktifkan metode berlaku pada pembuatan link baru. Link lama dan pembayaran pending tidak otomatis dibatalkan; ini memerlukan pembatalan provider atau menunggu kedaluwarsa. Riwayat lama tidak ditulis ulang. Uji dengan link baru saat memeriksa skema ini.

## Kebutuhan penerapan

Migrasi 20261110075734 telah disiapkan. Terapkan fungsi parent-portal, spp-doku dan manage-payment-gateway bersama frontend; aplikasi native 2.13.0 memerlukan server tersebut. Menerbitkan frontend saja belum mengaktifkan perhitungan baru.

Uji: pokok Rp100.000 + admin Rp3.000 = checkout Rp103.000, fee QRIS Rp721, sekolah Rp99.279, selisih ATSkolla Rp3.000. Pokok Rp97.000 + admin Rp3.000 = checkout Rp100.000, fee Rp555, sekolah Rp96.445. Cek pelunasan sisa dan cicilan memakai nominal yang sama di picker, permintaan server dan attempt ledger.
