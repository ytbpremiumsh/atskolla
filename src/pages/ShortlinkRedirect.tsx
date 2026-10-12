import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function ShortlinkRedirect() {
  const { code } = useParams<{ code: string }>();
  const [status, setStatus] = useState<"loading" | "notfound">("loading");

  useEffect(() => {
    if (!code) return;

    // Canonicalize legacy /s/:code links to the clean root-domain URL.
    if (window.location.pathname.startsWith("/s/")) {
      window.history.replaceState(null, "", `/${encodeURIComponent(code)}`);
    }

    (async () => {
      const { data } = await supabase
        .from("short_links")
        .select("target_url, is_active")
        .eq("code", code)
        .maybeSingle();

      if (!data || !data.is_active) {
        setStatus("notfound");
        return;
      }
      // Fire-and-forget: log click & increment via RPC (allowed for anon)
      supabase.rpc("increment_shortlink_click", { _code: code }).then(() => {});
      // Also try inserting click row with UA/referer for richer analytics
      supabase
        .from("short_links")
        .select("id")
        .eq("code", code)
        .maybeSingle()
        .then(({ data: l }) => {
          if (l?.id) {
            supabase.from("short_link_clicks").insert({
              link_id: l.id,
              user_agent: navigator.userAgent,
              referer: document.referrer || null,
            }).then(() => {});
          }
        });

      // Redirect (external or internal)
      const url = data.target_url;
      if (/^https?:\/\//i.test(url)) {
        window.location.replace(url);
      } else {
        window.location.replace(url.startsWith("/") ? url : `/${url}`);
      }
    })();
  }, [code]);

  if (status === "notfound") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-bold">Tautan tidak ditemukan</h1>
        <p className="text-muted-foreground">Shortlink ini tidak aktif atau tidak ada.</p>
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
