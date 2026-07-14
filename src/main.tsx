import { createRoot } from "react-dom/client";
// Trim font weights to only what the landing/app actually renders above the fold.
// Additional weights can be added later per-page if needed.
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import App from "./App.tsx";
import "./index.css";

// Lazy-load remaining font weights after first paint so they don't block LCP.
if (typeof window !== "undefined") {
  const loadRest = () => {
    import("@fontsource/sora/400.css");
    import("@fontsource/sora/600.css");
    import("@fontsource/manrope/500.css");
    import("@fontsource/manrope/700.css");
  };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(loadRest, { timeout: 2000 });
  } else {
    setTimeout(loadRest, 1200);
  }
}

// Global safety nets — catch stray errors so they don't vanish silently.
if (typeof window !== "undefined") {
  // Auto-recover from stale chunk errors after a new deploy.
  // When index.html references a chunk hash that no longer exists on the CDN,
  // dynamic import() rejects with "Failed to fetch dynamically imported module".
  // We reload once (guarded via sessionStorage) so the user fetches fresh index.html.
  const RELOAD_KEY = "__stale_chunk_reloaded_at";
  const isStaleChunkError = (reason: unknown): boolean => {
    const msg =
      (reason && typeof reason === "object" && "message" in reason
        ? String((reason as any).message)
        : String(reason ?? "")) || "";
    return (
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("error loading dynamically imported module") ||
      msg.includes("Unable to preload CSS")
    );
  };
  const tryReloadOnce = () => {
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
      // Only reload once per 60s to avoid infinite loops if CDN is truly broken.
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  window.addEventListener("unhandledrejection", (event) => {
    // eslint-disable-next-line no-console
    console.error("[unhandledrejection]", event.reason);
    if (isStaleChunkError(event.reason)) tryReloadOnce();
  });
  window.addEventListener("error", (event) => {
    // eslint-disable-next-line no-console
    console.error("[window.error]", event.message, event.error);
    if (isStaleChunkError(event.error) || isStaleChunkError(event.message)) tryReloadOnce();
  });
  // Vite emits this event when a <link rel="modulepreload"> or dynamic import fails.
  window.addEventListener("vite:preloadError", (event: Event) => {
    // eslint-disable-next-line no-console
    console.error("[vite:preloadError]", event);
    event.preventDefault();
    tryReloadOnce();
  });
}


createRoot(document.getElementById("root")!).render(<App />);
