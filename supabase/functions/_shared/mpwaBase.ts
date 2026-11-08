import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const DEFAULT_MPWA_BASE = "https://atskollagateway.my.id";

let cached: { url: string; at: number } | null = null;

/** Alamat gateway MPWA, diatur Super Admin via platform_settings.mpwa_base_url. */
export async function getMpwaBase(): Promise<string> {
  if (cached && Date.now() - cached.at < 60_000) return cached.url;
  let url = DEFAULT_MPWA_BASE;
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "mpwa_base_url")
      .maybeSingle();
    const v = (data?.value || "").trim();
    if (/^https?:\/\//i.test(v)) url = v.replace(/\/+$/, "");
  } catch (_) { /* pakai default */ }
  cached = { url, at: Date.now() };
  return url;
}
