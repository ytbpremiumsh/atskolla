import {Link} from 'react-router-dom';
import {useAuth} from '@/hooks/useAuth';
export function SchoolSetupGuide(){const {roles}=useAuth();if(!roles.includes('school_admin'))return null;return <details className="rounded-2xl border bg-card p-4"><summary className="cursor-pointer font-semibold">Panduan aktivasi sekolah</summary><p className="mt-2 text-sm text-muted-foreground">Siapkan data dan uji alur bersama sekolah sebelum digunakan oleh seluruh wali murid.</p><ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
 ['Identitas sekolah','Lengkapi kontak dan zona waktu.','/school-settings'],
 ['Kelas dan siswa','Siapkan kelas, impor siswa, dan periksa duplikat.','/students'],
 ['Akses bendahara','Tentukan pengguna yang berwenang mengelola tagihan.','/bendahara-manage'],
 ['Panduan wali murid','Sosialisasikan login, pembayaran, dan permintaan bantuan.','/panduan'],
 ['Kebijakan data','Pastikan dasar pemrosesan dan persetujuan wali sesuai kebutuhan.','/kebijakan-privasi'],
 ].map(([title,body,url],i)=><li key={url} className="rounded-xl bg-muted/40 p-3"><Link to={url} className="font-medium text-primary">{i+1}. {title}</Link><p className="mt-1 text-xs text-muted-foreground">{body}</p></li>)}</ol><p className="mt-3 text-xs text-muted-foreground">Untuk pembayaran online, rekening harus diverifikasi dan terhubung ke penyedia. Uji pembayaran melalui lingkungan pengujian yang sesuai, bukan dengan mengubah status menjadi lunas secara manual.</p></details>}
