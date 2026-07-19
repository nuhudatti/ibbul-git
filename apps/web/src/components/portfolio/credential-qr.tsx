"use client";

interface CredentialQrProps {
  url: string;
  size?: number;
  className?: string;
  label?: string;
}

/** QR via server API — avoids client bundling `qrcode` in the monorepo */
export function CredentialQr({ url, size = 88, className = "", label }: CredentialQrProps) {
  if (!url) {
    return (
      <div
        className={`ula-print-qr-placeholder ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  const qrSrc = `/api/qr?url=${encodeURIComponent(url)}&size=${size * 3}`;

  return (
    <img
      src={qrSrc}
      alt={label ?? "Scan to verify credential online"}
      className={`ula-print-qr ${className}`}
      width={size}
      height={size}
    />
  );
}
