import { useEffect, useRef, useCallback } from "react";
import QRCodeStyling from "qr-code-styling";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  studentName?: string;
  studentClass?: string;
  schoolName?: string;
  schoolLogo?: string;
  autoFrame?: boolean;
  customInstructions?: string[];
}

const DEFAULT_INSTRUCTIONS = [
  "Tunjukkan QR Code ini kepada guru/petugas piket",
  "Tunjukkan QR ini saat absensi pulang",
  "Orang tua/wali akan menerima notifikasi otomatis",
  "Jangan berikan QR Code kepada orang lain",
  "Segera lapor jika QR Code hilang/rusak",
];

const QRCodeDisplay = ({ data, size = 200, studentName, studentClass, schoolName, schoolLogo, autoFrame = true, customInstructions }: QRCodeDisplayProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    qrCode.current = new QRCodeStyling({
      width: size,
      height: size,
      data,
      type: "svg",
      dotsOptions: { color: "hsl(234, 89%, 40%)", type: "rounded" },
      cornersSquareOptions: { color: "hsl(234, 89%, 30%)", type: "extra-rounded" },
      cornersDotOptions: { color: "hsl(260, 80%, 50%)", type: "dot" },
      backgroundOptions: { color: "#ffffff" },
      imageOptions: { crossOrigin: "anonymous", margin: 4 },
    });

    if (ref.current) {
      ref.current.innerHTML = "";
      qrCode.current.append(ref.current);
    }
  }, [data, size]);

  const downloadWithFrame = useCallback(async () => {
    if (!qrCode.current) return;

    const qrRaw = await qrCode.current.getRawData("png");
    if (!qrRaw) return;

    const qrBlob = qrRaw instanceof Blob ? qrRaw : new Blob([new Uint8Array(qrRaw as any)]);
    const qrImg = new Image();
    const qrUrl = URL.createObjectURL(qrBlob);

    qrImg.onload = () => {
      const instructions = customInstructions && customInstructions.length > 0 ? customInstructions : DEFAULT_INSTRUCTIONS;

      // Full HD output (1080x1920 portrait)
      const canvasW = 1080;
      const qrSize = 700;
      const headerH = 340;
      const instrLineH = 48;
      const instrBoxH = 80 + instructions.length * instrLineH;
      const noticeH = 80;
      const footerH = 100;
      const qrSectionH = qrSize + 60 + 120 + 70; // qr + border padding + top gap + nis
      const canvasH = Math.max(1920, headerH + qrSectionH + 60 + instrBoxH + 30 + noticeH + footerH + 40);

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d")!;

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Top gradient band
      const grad = ctx.createLinearGradient(0, 0, canvasW, 0);
      grad.addColorStop(0, "hsl(234, 89%, 40%)");
      grad.addColorStop(1, "hsl(260, 80%, 50%)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasW, headerH, [0, 0, 40, 40]);
      ctx.fill();

      // Header text
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      if (schoolName) {
        ctx.font = "bold 36px system-ui, sans-serif";
        ctx.fillText(schoolName, canvasW / 2, 80, canvasW - 80);
      }
      if (studentName) {
        ctx.font = "bold 56px system-ui, sans-serif";
        ctx.fillText(studentName, canvasW / 2, 180, canvasW - 80);
      }
      if (studentClass) {
        ctx.font = "36px system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillText(`Kelas ${studentClass}`, canvasW / 2, 250);
      }

      // QR Code centered
      const qrX = (canvasW - qrSize) / 2;
      const qrY = headerH + 120;

      // QR border/shadow
      ctx.fillStyle = "#f3f4f6";
      ctx.beginPath();
      ctx.roundRect(qrX - 30, qrY - 30, qrSize + 60, qrSize + 60, 24);
      ctx.fill();
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // NIS text below QR
      ctx.fillStyle = "#374151";
      ctx.textAlign = "center";
      ctx.font = "bold 32px system-ui, sans-serif";
      const nisY = qrY + qrSize + 70;
      ctx.fillText(`NIS: ${data}`, canvasW / 2, nisY);

      // Instructions section
      const instrStartY = nisY + 60;
      const instrX = 100;
      const instrW = canvasW - 200;

      ctx.fillStyle = "#f0f4ff";
      ctx.beginPath();
      ctx.roundRect(instrX, instrStartY, instrW, instrBoxH, 20);
      ctx.fill();
      ctx.strokeStyle = "#c7d2fe";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#1e3a8a";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("📋 Petunjuk Penggunaan", canvasW / 2, instrStartY + 45);

      ctx.fillStyle = "#374151";
      ctx.font = "24px system-ui, sans-serif";
      ctx.textAlign = "left";
      instructions.forEach((line, i) => {
        ctx.fillText(`${i + 1}. ${line}`, instrX + 30, instrStartY + 90 + i * instrLineH, instrW - 60);
      });

      // Security notice
      const noticeY = instrStartY + instrBoxH + 30;
      ctx.fillStyle = "#fef2f2";
      ctx.beginPath();
      ctx.roundRect(instrX, noticeY, instrW, noticeH, 16);
      ctx.fill();
      ctx.strokeStyle = "#fecaca";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#991b1b";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚠️ QR Code ini bersifat rahasia & hanya untuk keperluan sekolah", canvasW / 2, noticeY + 50);

      // Footer
      ctx.fillStyle = "#9ca3af";
      ctx.font = "24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ATSkolla Attendance System", canvasW / 2, canvasH - 60);

      // Download
      const link = document.createElement("a");
      link.download = `QR-${studentName || data}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      URL.revokeObjectURL(qrUrl);
    };
    qrImg.src = qrUrl;
  }, [data, size, studentName, studentClass, schoolName, customInstructions]);

  const handleSimpleDownload = () => {
    qrCode.current?.download({ name: `qr-${studentName || data}`, extension: "png" });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={ref} className="rounded-xl overflow-hidden border border-border p-2 bg-white" />
      <div className="flex gap-2">
        {autoFrame && (studentName || schoolName) ? (
          <Button variant="outline" size="sm" onClick={downloadWithFrame} className="text-xs">
            <Download className="h-3.5 w-3.5 mr-1" />  Unduh QR Code
          </Button>
        ) : (
          <button onClick={handleSimpleDownload} className="text-xs text-primary hover:underline font-medium">

            Unduh QR Code
          </button>
        )}
      </div>
    </div>
  );
};

export default QRCodeDisplay;
