import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Link2 } from "lucide-react";

type RedirectStatus = "loading" | "notfound" | "error";

export default function ShortlinkRedirect() {
  const { code } = useParams<{ code: string }>();
  const [status, setStatus] = useState<RedirectStatus>("loading");

  useEffect(() => {
    if (!code) {
      setStatus("notfound");
      return;
    }

    let cancelled = false;

    // /s/:code remains supported, but the visible/canonical URL uses /:code.
    if (window.location.pathname.startsWith("/s/")) {
      window.history.replaceState(null, "", `/${encodeURIComponent(code)}`);
    }

    const resolve = async () => {
      const normalizedCode = code.trim().toLowerCase();
      try {
        // SECURITY DEFINER RPC resolves active links without requiring public
        // SELECT access to the short_links table.
        const { data, error } = await (supabase.rpc as any)("resolve_shortlink", {
          _code: normalizedCode,
        });

        let link: any = !error ? (data as any[] | null)?.[0] : undefined;

        // Backward-compatible fallback for environments where the database
        // migration has not been applied yet but public table access is enabled.
        if (error) {
          console.warn("[shortlink] resolver RPC unavailable, trying table lookup:", error.message);
          const fallback = await supabase
            .from("short_links")
            .select("id, target_url, is_active")
            .eq("code", normalizedCode)
            .maybeSingle();

          if (fallback.error) {
            console.error("[shortlink] fallback lookup failed:", fallback.error.message);
            if (!cancelled) setStatus("error");
            return;
          }

          if (fallback.data?.is_active) {
            link = { link_id: fallback.data.id, target_url: fallback.data.target_url };
          }
        }

        if (cancelled) return;
        if (!link?.target_url) {
          if (!cancelled) setStatus("notfound");
          return;
        }

        // Count/log the visit best-effort; redirect must not depend on analytics.
        void supabase.rpc("increment_shortlink_click", { _code: normalizedCode });
        void supabase.from("short_link_clicks").insert({
          link_id: link.link_id,
          user_agent: navigator.userAgent,
          referer: document.referrer || null,
        }).then(({ error: clickError }) => {
          if (clickError) console.warn("[shortlink] click detail was not recorded:", clickError.message);
        });

        const rawUrl = link.target_url.trim();
        let destination: URL;
        if (/^https?:\/\//i.test(rawUrl)) {
          destination = new URL(rawUrl);
        } else {
          destination = new URL(rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`, window.location.origin);
        }

        // Only allow browser-safe HTTP(S) destinations.
        if (!["http:", "https:"].includes(destination.protocol)) {
          console.error("[shortlink] Unsupported destination protocol:", destination.protocol);
          if (!cancelled) setStatus("error");
          return;
        }

        window.location.replace(destination.toString());
      } catch (error) {
        console.error("[shortlink] unexpected redirect error:", error);
        if (!cancelled) setStatus("error");
      }
    };

    void resolve();
    return () => { cancelled = true; };
  }, [code]);

  if (status === "notfound" || status === "error") {
    const notFound = status === "notfound";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Link2 className="h-9 w-9 text-muted-foreground" />
        <h1 className="text-2xl font-bold">
          {notFound ? "Tautan tidak ditemukan" : "Tautan belum dapat dibuka"}
        </h1>
        <p className="max-w-md text-muted-foreground">
          {notFound
            ? `Kode “${code}” belum terdaftar atau sedang nonaktif. Periksa kode dan statusnya di Dashboard Super Admin → CMS & Konten Publik → Shortlink.`
            : "Sistem belum bisa memeriksa tujuan shortlink. Pastikan migrasi resolve_shortlink sudah diterapkan pada database Supabase, kemudian coba lagi."}
        </p>
        <a href="/" className="text-primary underline">Kembali ke beranda</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Mengarahkan…</p>
    </div>
  );
}
