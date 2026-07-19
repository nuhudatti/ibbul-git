import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url?.trim()) {
    return NextResponse.json({ error: "url query parameter is required" }, { status: 400 });
  }

  const requested = Number(req.nextUrl.searchParams.get("size") ?? 264);
  const width = Number.isFinite(requested)
    ? Math.min(Math.max(Math.round(requested), 64), 512)
    : 264;

  try {
    const png = await QRCode.toBuffer(url, {
      errorCorrectionLevel: "H",
      margin: 1,
      width,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
