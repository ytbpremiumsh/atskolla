package com.atskolla.parent;

final class ParentMenu {
    static final String[][] ITEMS={{"info","Pengumuman","Informasi terbaru dari sekolah","bell"},{"leave","Izin & sakit","Pengajuan dan riwayat persetujuan","check"},{"contact","Wali kelas","Kontak guru dan informasi sekolah","card"},{"calendar","Kalender sekolah","Libur dan kegiatan sekolah","calendar"},{"card","Kartu pelajar","Identitas, QR dan unduh kartu","card"},{"account","Akun & privasi","Identitas wali, privasi dan keluar","grid"}};
    static String screen(String value){return "messages".equals(value)||"grades".equals(value)?"more":value;}
    private ParentMenu(){}
}
