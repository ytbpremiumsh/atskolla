import LegalLayout, { SectionHeading, Prose, CheckList, InfoCallout } from "./LegalLayout";

const TOC = [
  { id: "definisi", label: "1. Definisi" },
  { id: "pendaftaran", label: "2. Pendaftaran & Akun" },
  { id: "hak", label: "3. Hak & Kewajiban" },
  { id: "pembayaran", label: "4. Ketentuan Pembayaran" },
  { id: "keamanan", label: "5. Keamanan Sistem" },
  { id: "haki", label: "6. Kekayaan Intelektual" },
  { id: "batas", label: "7. Pembatasan Tanggung Jawab" },
  { id: "perubahan", label: "8. Perubahan Ketentuan" },
  { id: "hukum", label: "9. Hukum yang Berlaku" },
  { id: "kontak", label: "10. Kontak" },
];

export default function Terms() {
  return (
    <LegalLayout
      title="Syarat & Ketentuan"
      description="Aturan penggunaan layanan ATSkolla, hak & kewajiban pengguna, ketentuan pembayaran, keamanan akun, dan penggunaan sistem."
      path="/syarat-ketentuan"
      breadcrumb="Syarat & Ketentuan"
      updatedAt="18 November 2026"
      toc={TOC}
    >
      <Prose>
        <p>
          Selamat datang di <strong>ATSkolla</strong>. Dengan mendaftar dan menggunakan layanan
          kami, Anda dianggap telah membaca, memahami, dan menyetujui seluruh Syarat &
          Ketentuan berikut. Mohon dibaca dengan seksama sebelum menggunakan layanan.
        </p>
      </Prose>

      <SectionHeading id="definisi" num={1}>Definisi</SectionHeading>
      <CheckList
        items={[
          <><strong>Layanan</strong> — seluruh fitur dan modul pada platform ATSkolla, termasuk aplikasi web, portal wali murid, dan integrasi pihak ketiga.</>,
          <><strong>Pengguna</strong> — sekolah, staf sekolah, guru, wali kelas, bendahara, wali murid, atau pihak lain yang mengakses layanan.</>,
          <><strong>Akun</strong> — identitas yang digunakan pengguna untuk mengakses layanan.</>,
        ]}
      />

      <SectionHeading id="pendaftaran" num={2}>Pendaftaran & Akun</SectionHeading>
      <CheckList
        items={[
          "Pengguna wajib memberikan data yang benar, akurat, dan terkini pada saat pendaftaran.",
          "Pengguna bertanggung jawab penuh atas kerahasiaan kata sandi dan seluruh aktivitas pada akunnya.",
          "Segera hubungi tim ATSkolla apabila terdapat indikasi akses tidak sah pada akun Anda.",
        ]}
      />

      <SectionHeading id="hak" num={3}>Hak & Kewajiban Pengguna</SectionHeading>
      <CheckList
        variant="success"
        items={[
          "Pengguna dapat menggunakan fitur sesuai peran, pengaturan sekolah, dan ketentuan layanan yang berlaku.",
          "Pengguna berhak atas dukungan teknis melalui kanal resmi ATSkolla.",
          "Pengguna wajib menjaga kerahasiaan data siswa, guru, dan wali murid sesuai peraturan perundang-undangan yang berlaku.",
        ]}
      />
      <CheckList
        variant="danger"
        items={[
          "Dilarang menyalahgunakan layanan untuk tindakan melanggar hukum, spam, phising, atau merugikan pihak lain.",
          "Dilarang membagikan akses akun kepada pihak yang tidak berwenang.",
        ]}
      />

      <SectionHeading id="pembayaran" num={4}>Ketentuan Pembayaran</SectionHeading>
      <Prose>
        <p>
          Pembayaran SPP dan tagihan online diproses melalui penyedia pembayaran yang terhubung
          dengan ATSkolla. Seluruh transaksi tercatat dan dapat diverifikasi
          melalui riwayat transaksi.
        </p>
      </Prose>
      <CheckList
        items={[
          "Pilihan pembayaran dapat mencakup Virtual Account, QRIS, dan gerai retail. Metode yang tersedia mengikuti aktivasi penyedia serta pengaturan sekolah.",
          "Wali melihat pokok tagihan, biaya layanan, dan total sebelum membayar. Biaya penyedia pembayaran dipotong dari dana yang diterima sekolah sesuai metode yang digunakan.",
          "Bukti pembayaran yang tersedia dapat dilihat melalui riwayat transaksi dan diunduh sesuai fitur layanan.",
        ]}
      />
      <InfoCallout tone="info" title="Verifikasi otomatis">
        Status pembayaran diperbarui setelah konfirmasi sah dari penyedia diterima.
        Waktu pembaruan bergantung pada respons penyedia dan koneksi.
      </InfoCallout>

      <Prose><p>Layanan tanpa biaya langganan sekolah mensyaratkan penggunaan SPP Online secara aktif, dengan waktu persiapan 60 hari. Tagihan online dapat dibuat setelah rekening sekolah disetujui penyedia. Pembayaran lunas dan pencairan dana merupakan dua status yang berbeda; pencairan mengikuti konfirmasi penyedia. Pembayaran cicilan hanya tersedia pada tagihan yang mengizinkannya dan mengurangi sisa setelah transaksi dikonfirmasi.</p></Prose>

      <SectionHeading id="keamanan" num={5}>Keamanan Sistem</SectionHeading>
      <CheckList
        items={[
          "Data pengguna dienkripsi menggunakan standar industri (TLS 1.2+ untuk transmisi).",
          "Akses ke data sekolah dibatasi berdasarkan peran: Super Admin, Kepala Sekolah, Bendahara, Wali Kelas, Guru, dan Wali Murid.",
          "Dilarang melakukan upaya peretasan, reverse-engineering, penetration testing tanpa izin, atau eksploitasi celah keamanan.",
        ]}
      />

      <SectionHeading id="haki" num={6}>Kekayaan Intelektual</SectionHeading>
      <Prose>
        <p>
          Seluruh konten, logo, desain antarmuka, dan kode sumber ATSkolla dilindungi oleh hak
          cipta. Dilarang menyalin, mendistribusikan, atau memodifikasi tanpa izin tertulis
          dari kami.
        </p>
      </Prose>

      <SectionHeading id="batas" num={7}>Pembatasan Tanggung Jawab</SectionHeading>
      <Prose>
        <p>
          ATSkolla tidak bertanggung jawab atas kerugian yang timbul akibat kelalaian pengguna,
          gangguan jaringan pihak ketiga, atau kondisi force majeure. Ketersediaan layanan
          diupayakan setinggi mungkin, namun tidak dijamin tanpa gangguan 100%.
        </p>
      </Prose>

      <SectionHeading id="perubahan" num={8}>Perubahan Ketentuan</SectionHeading>
      <Prose>
        <p>
          Kami berhak memperbarui Syarat & Ketentuan ini sewaktu-waktu. Perubahan akan
          diinformasikan melalui platform dan berlaku efektif sejak tanggal publikasi.
        </p>
      </Prose>

      <SectionHeading id="hukum" num={9}>Hukum yang Berlaku</SectionHeading>
      <Prose>
        <p>
          Syarat & Ketentuan ini tunduk pada hukum yang berlaku di Republik Indonesia.
          Perselisihan yang timbul akan diselesaikan secara musyawarah, dan apabila tidak
          tercapai kesepakatan, akan diselesaikan melalui pengadilan yang berwenang.
        </p>
      </Prose>

      <SectionHeading id="kontak" num={10}>Kontak</SectionHeading>
      <Prose>
        <p>
          Pertanyaan terkait ketentuan ini dapat dikirim ke{" "}
          <a href="mailto:halo@atskolla.com">halo@atskolla.com</a> atau melalui halaman{" "}
          <a href="/kontak">Kontak Kami</a>.
        </p>
      </Prose>
    </LegalLayout>
  );
}
