import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** A neutral logo plate; white transparent marks get a dark plate, never recolored. */
export function logoNeedsDarkSurface(pixels: ArrayLike<number>): boolean {
  let visible = 0, light = 0, transparent = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 32) { transparent++; continue; }
    visible++;
    if (pixels[i] > 215 && pixels[i + 1] > 215 && pixels[i + 2] > 215) light++;
  }
  return visible > 0 && transparent > 0 && light / visible > 0.85;
}
export function BrandLogo({ className, style, src, onLoad, onError, crossOrigin, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [metadata, setMetadata] = useState({ src: "", ratio: 1, dark: false });
  const [withoutCors, setWithoutCors] = useState<string | undefined>();
  const current = metadata.src === src ? metadata : { ratio: 1, dark: false };
  return <span className={cn("inline-flex max-w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 align-middle shadow-sm", className)}
    style={{ aspectRatio: String(current.ratio), ...style, backgroundColor: current.dark ? "#334155" : "#ffffff", padding: "3px", objectFit: undefined }}>
    <img {...props} src={src} crossOrigin={withoutCors === src ? undefined : (crossOrigin ?? "anonymous")}
      className="block h-full w-full min-w-0 object-contain" style={{ filter: withoutCors === src ? "drop-shadow(0 0 0.6px rgba(15,23,42,.6))" : "none", mixBlendMode: "normal" }}
      onLoad={(event) => {
        const image = event.currentTarget;
        let dark = false;
        try {
          const canvas = document.createElement("canvas"); canvas.width = 32; canvas.height = 32;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (context && image.naturalWidth) {
            context.drawImage(image, 0, 0, 32, 32);
            dark = logoNeedsDarkSurface(context.getImageData(0, 0, 32, 32).data);
          }
        } catch { /* External hosts without CORS keep a neutral white plate. */ }
        setMetadata({ src: src ?? "", ratio: image.naturalWidth / (image.naturalHeight || 1) || 1, dark });
        onLoad?.(event);
      }}
      onError={(event) => {
        if (src && withoutCors !== src && !crossOrigin) { setWithoutCors(src); return; }
        onError?.(event);
      }} />
  </span>;
}
