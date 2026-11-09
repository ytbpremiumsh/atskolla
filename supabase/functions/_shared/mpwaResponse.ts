/** A 200 response alone does not confirm that MPWA accepted a message. */
export function mpwaAccepted(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const value = data as Record<string, unknown>;
  if (value.status === false || value.status === 'false' || value.success === false) return false;
  return value.status === true || value.status === 'true' || value.success === true;
}

/** Do not echo gateway response bodies: they can contain credentials or HTML. */
export function mpwaFailureMessage(data: unknown): string {
  const value = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const message = String(value.msg || value.message || value.error || '').toLowerCase();
  if (/api.?key|api_key|unauthori|forbidden|invalid sender|invali.*sender/.test(message))
    return 'Kunci akses atau nomor pengirim WhatsApp tidak cocok dengan perangkat gateway. Periksa pengaturan gateway sekolah.';
  if (/not connected|disconnect|periksa koneksi|logged out|session.*(lost|closed)/.test(message))
    return 'Sesi WhatsApp terputus. Hubungkan kembali perangkat melalui kode QR pada pengaturan WhatsApp.';
  if (/not registered|not.*whatsapp|invalid number|nomor.*(salah|valid|terdaftar)/.test(message))
    return 'Nomor tujuan tidak valid atau belum terdaftar di WhatsApp. Periksa nomor tujuan tes.';
  if (/limit|too many|quota|kuota/.test(message))
    return 'Batas pengiriman gateway tercapai. Tunggu sebentar sebelum mencoba kembali.';
  if (/file not found|not found|invalid response/.test(message))
    return 'Alamat layanan WhatsApp tidak merespons dengan benar. Periksa pengaturan alamat gateway.';
  return 'Gateway WhatsApp belum menerima pesan. Periksa perangkat dan pengaturan gateway, lalu coba kembali.';
}
