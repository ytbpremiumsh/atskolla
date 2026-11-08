import { Link } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAvailableDashboards } from "@/lib/dashboards";
export function ReadOnlyAccessNotice({
  canEdit,
  editors = "Admin Sekolah atau Operator",
}: {
  canEdit: boolean;
  editors?: string;
}) {
  const { roles } = useAuth();
  if (canEdit) return null;
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-xl border bg-secondary/40 p-4 text-sm"
    >
      <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="font-semibold">Akses lihat saja</p>
        <p className="mt-1 text-muted-foreground">
          Perubahan di halaman ini dikelola {editors}. Hubungi Admin Sekolah
          jika tugas Anda memerlukan akses tersebut.
        </p>
        {getAvailableDashboards(roles).length > 1 && (
          <Link
            className="mt-2 inline-block font-semibold text-primary underline"
            to="/select-role"
          >
            Pilih dashboard sesuai tugas
          </Link>
        )}
      </div>
    </div>
  );
}
