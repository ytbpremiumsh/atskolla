import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import {
  fetchProfileBundle,
  profileQueryKey,
  type ProfileBundle,
} from "@/hooks/useProfile";

interface AuthContextType {
  user: User | null;
  profile: { full_name: string; school_id: string | null; avatar_url: string | null } | null;
  roles: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMPTY_BUNDLE: ProfileBundle = { profile: null, roles: [] };

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [bundle, setBundle] = useState<ProfileBundle>(EMPTY_BUNDLE);
  const [loading, setLoading] = useState(true);

  const loadBundle = async (userId: string) => {
    try {
      // Route through React Query cache so useProfileQuery consumers stay in sync.
      const data = await queryClient.fetchQuery({
        queryKey: profileQueryKey(userId),
        queryFn: () => fetchProfileBundle(userId),
        staleTime: 60_000,
      });
      setBundle(data);
    } catch (e) {
      console.warn("fetchProfileBundle failed", e);
      setBundle(EMPTY_BUNDLE);
    }
  };

  useEffect(() => {
    let mounted = true;

    // "Ingat Saya" enforcement: if user logged in with Remember Me OFF
    // (ephemeral session), sign them out when the browser/tab is reopened
    // in a fresh tab (no sessionStorage tab marker).
    try {
      const wasEphemeral = localStorage.getItem("was_ephemeral") === "1";
      const tabAlive = sessionStorage.getItem("tab_alive") === "1";
      if (wasEphemeral && !tabAlive) {
        supabase.auth.signOut().catch(() => {});
        localStorage.removeItem("was_ephemeral");
      }
      sessionStorage.setItem("tab_alive", "1");
    } catch {}

    // Safety timeout: never let the app stay in "loading" forever.
    const safety = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    const handleSession = (session: { user?: User } | null) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        // Fire-and-forget — never block the loading flag on network.
        // Layout guards re-render once roles arrive.
        loadBundle(session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setUser(null);
        setBundle(EMPTY_BUNDLE);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'TOKEN_REFRESHED' && !session) {
        setUser(null);
        setBundle(EMPTY_BUNDLE);
        setLoading(false);
        return;
      }
      // IMPORTANT: do NOT await inside this callback (Supabase deadlock pattern).
      handleSession(session);
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        console.warn("Session restore failed, clearing state:", error.message);
        supabase.auth.signOut().catch(() => {});
        setUser(null);
        setBundle(EMPTY_BUNDLE);
        setLoading(false);
        return;
      }
      handleSession(session);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    // Retry with exponential backoff for transient network errors (Failed to fetch / 5xx / 522).
    const maxAttempts = 3;
    let lastError: string | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) return { error: null };
        const msg = error.message || "";
        const lower = msg.toLowerCase();
        const isNetwork =
          lower.includes("failed to fetch") ||
          lower.includes("network") ||
          lower.includes("timeout") ||
          lower.includes("522") ||
          lower.includes("524") ||
          lower.includes("503") ||
          lower.includes("load failed");
        if (!isNetwork || attempt === maxAttempts) return { error: msg };
        lastError = msg;
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : "Network error";
        if (attempt === maxAttempts) return { error: lastError };
      }
      // backoff: 600ms, 1500ms
      await new Promise((r) => setTimeout(r, attempt === 1 ? 600 : 1500));
    }
    return { error: lastError };
  };

  const signOut = async () => {
    try {
      sessionStorage.removeItem("active_dashboard");
      sessionStorage.removeItem("dashboard_chosen");
    } catch {}
    queryClient.removeQueries({ queryKey: ["profile-bundle"] });
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: bundle.profile,
        roles: bundle.roles,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
