import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type LandingPopupConfig = {
  enabled: boolean;
  title: string;
  body: string;
  image_url: string;
  button_label: string;
  button_url: string;
  delay_seconds: number;
  show_once: boolean;
  version: number;
};

export const DEFAULT_POPUP: LandingPopupConfig = {
  enabled: false,
  title: "",
  body: "",
  image_url: "",
  button_label: "",
  button_url: "",
  delay_seconds: 2,
  show_once: true,
  version: 1,
};

export const POPUP_SETTING_KEY = "landing_popup";

export function parsePopupConfig(raw?: string | null): LandingPopupConfig {
  if (!raw) return DEFAULT_POPUP;
  try {
    return { ...DEFAULT_POPUP, ...(JSON.parse(raw) as Partial<LandingPopupConfig>) };
  } catch {
    return DEFAULT_POPUP;
  }
}

export default function LandingPopup() {
  const [config, setConfig] = useState<LandingPopupConfig | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", POPUP_SETTING_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const cfg = parsePopupConfig(data?.value);
        if (!cfg.enabled || (!cfg.title && !cfg.body && !cfg.image_url)) return;
        const seenKey = `atskolla_popup_v${cfg.version}`;
        if (cfg.show_once && localStorage.getItem(seenKey) === "1") return;
        setConfig(cfg);
        const t = setTimeout(() => setOpen(true), Math.max(0, cfg.delay_seconds) * 1000);
        return () => clearTimeout(t);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => {
    setOpen(false);
    if (config?.show_once) {
      try {
        localStorage.setItem(`atskolla_popup_v${config.version}`, "1");
      } catch {
        /* noop */
      }
    }
  };

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        {config.image_url && (
          <img
            src={config.image_url}
            alt={config.title || "Informasi ATSkolla"}
            loading="lazy"
            className="w-full max-h-64 object-cover"
          />
        )}
        <div className="space-y-3 p-6 pt-5">
          {config.title && <h2 className="text-lg font-bold leading-snug">{config.title}</h2>}
          {config.body && <p className="whitespace-pre-line text-sm text-muted-foreground">{config.body}</p>}
          {config.button_label && config.button_url && (
            <Button asChild className="w-full gradient-primary text-primary-foreground">
              <a
                href={config.button_url}
                target={/^https?:\/\//i.test(config.button_url) ? "_blank" : undefined}
                rel="noreferrer"
                onClick={close}
              >
                {config.button_label}
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
