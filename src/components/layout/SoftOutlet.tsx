import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";

/** Lightweight skeleton shown inside the layout while a page chunk loads (sidebar/header stay visible). */
export function SoftPageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Memuat halaman">
      <div className="h-20 rounded-2xl bg-muted/60" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted/50" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-muted/40" />
    </div>
  );
}

/** Outlet with local Suspense + soft fade-in on every route change. */
export default function SoftOutlet() {
  const { pathname } = useLocation();
  return (
    <Suspense fallback={<SoftPageSkeleton />}>
      <div key={pathname} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
        <Outlet />
      </div>
    </Suspense>
  );
}
