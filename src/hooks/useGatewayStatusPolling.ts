import { useEffect, useRef } from "react";

/** Sequential checks; ignore stale results after changing school/number or unmounting. */
export function useGatewayStatusPolling(
  enabled: boolean,
  identity: string,
  fast: boolean,
  check: () => Promise<boolean | null>,
  onStatus: (connected: boolean) => void,
) {
  const callbacks = useRef({ check, onStatus });
  callbacks.current = { check, onStatus };
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (stopped || running) return;
      clearTimeout(timer);
      if (document.visibilityState === "hidden") return;
      running = true;
      try {
        const connected = await callbacks.current.check();
        if (!stopped && typeof connected === "boolean") callbacks.current.onStatus(connected);
      } catch {
        // Transient failures do not mean the device is disconnected.
      } finally {
        running = false;
        if (!stopped) timer = setTimeout(poll, fast ? 4000 : 20000);
      }
    };
    const resume = () => { if (document.visibilityState !== "hidden") void poll(); };
    timer = setTimeout(poll, fast ? 250 : 800);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
    };
  }, [enabled, identity, fast]);
}
