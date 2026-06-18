import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tenant resolver (multi-tenant subdomain).
 * Host examples:
 *   atskolla.com / www.atskolla.com / absenpintar.lovable.app / localhost
 *     -> root mode (landing/marketing), tenant = null
 *   smkcendikia.atskolla.com -> tenant slug "smkcendikia"
 *   smk-cendikia.absenpintar.online -> tenant slug "smk-cendikia"
 *
 * Root domains are configurable via VITE_ROOT_HOSTS (comma-separated).
 * Default root hosts include the production domains and lovable preview hosts.
 */

const ROOT_HOSTS = new Set<string>(
  (import.meta.env.VITE_ROOT_HOSTS || "atskolla.com,absenpintar.online,absenpintar.com,localhost,lovable.app,lovableproject.com")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

const RESERVED = new Set([
  "www", "app", "api", "admin", "super", "superadmin", "affiliate", "parent",
  "support", "help", "docs", "blog", "mail", "email", "wa", "whatsapp", "cdn",
  "static", "assets", "dashboard", "login", "register", "auth", "panduan",
  "pricing", "fitur", "presentation", "penawaran", "proposal", "pitch",
  "monitoring", "scan", "public", "test", "dev", "staging", "demo", "root",
  "id-preview--be8d9619-1add-4ede-b66b-9c44088286b4", // lovable preview prefix
]);

export function parseSubdomain(hostname: string = window.location.hostname): string | null {
  const host = hostname.toLowerCase();

  // Strip port if any
  const clean = host.split(":")[0];

  // Exact root match
  if (ROOT_HOSTS.has(clean)) return null;
  // www.X where X is a root host
  if (clean.startsWith("www.")) {
    const rest = clean.slice(4);
    if (ROOT_HOSTS.has(rest)) return null;
  }

  // IP address -> no tenant
  if (/^\d+\.\d+\.\d+\.\d+$/.test(clean)) return null;

  // Lovable preview / project hosts: <slug>.lovable.app / .lovableproject.com
  if (clean.endsWith(".lovable.app") || clean.endsWith(".lovableproject.com")) return null;

  // Find the matching root suffix
  const parts = clean.split(".");
  if (parts.length < 3) return null; // need at least sub.domain.tld

  // Match last 2 parts vs root hosts (e.g. atskolla.com)
  const lastTwo = parts.slice(-2).join(".");
  if (!ROOT_HOSTS.has(lastTwo)) return null;

  const sub = parts.slice(0, parts.length - 2).join("-").toLowerCase();
  if (!sub || sub === "www" || RESERVED.has(sub)) return null;
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(sub)) return null;
  return sub;
}

export type TenantSchool = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
};

type TenantState = {
  loading: boolean;
  slug: string | null;
  school: TenantSchool | null;
  notFound: boolean;
};

const TenantContext = createContext<TenantState>({
  loading: true,
  slug: null,
  school: null,
  notFound: false,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TenantState>(() => {
    const slug = typeof window !== "undefined" ? parseSubdomain() : null;
    return { loading: !!slug, slug, school: null, notFound: false };
  });

  useEffect(() => {
    if (!state.slug) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, slug, logo")
        .eq("slug", state.slug!)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setState((s) => ({ ...s, loading: false, school: null, notFound: true }));
      } else {
        setState((s) => ({ ...s, loading: false, school: data as TenantSchool, notFound: false }));
        // Update <title>
        try { document.title = `${data.name} - ATSkolla`; } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [state.slug]);

  return <TenantContext.Provider value={state}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}

export function buildTenantUrl(slug: string, path: string = "/"): string {
  if (typeof window === "undefined") return path;
  const host = window.location.hostname;
  // Find a known root host to attach the subdomain to
  const parts = host.split(".");
  const lastTwo = parts.slice(-2).join(".");
  if (ROOT_HOSTS.has(lastTwo)) {
    return `${window.location.protocol}//${slug}.${lastTwo}${path}`;
  }
  // Fallback: same origin + path
  return path;
}
