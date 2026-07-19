import { jsPDF } from "jspdf";
import { matricToSlug } from "@/lib/matric";

export type CredentialPdfRow = {
  matric: string;
  fullName: string;
  program: string;
  tempPassword: string;
  status?: string;
};

const BRAND = { r: 6, g: 95, b: 70 };
const INK = { r: 15, g: 23, b: 42 };
const MUTED = { r: 82, g: 96, b: 117 };
const LINE = { r: 226, g: 232, b: 240 };

const MARGIN = 8;
const PAGE_W = 210;
const PAGE_H = 297;
const ROW_H = 9.5;
const TABLE_TOP = 36;

/** Rows per page after compact header */
const ROWS_PER_PAGE = 24;

const COL = {
  matric: MARGIN + 1,
  name: MARGIN + 44,
  program: MARGIN + 92,
  password: MARGIN + 148,
};

async function fetchLoginQrDataUrl(loginUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/qr?url=${encodeURIComponent(loginUrl)}&size=100`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function truncate(doc: jsPDF, text: string, maxW: number) {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

function drawPageHeader(
  doc: jsPDF,
  loginUrl: string,
  pageNum: number,
  totalPages: number,
  totalStudents: number,
  qrDataUrl: string | null
) {
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, PAGE_W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("IBBUL · PROJECT ULA — Student login roster", MARGIN, 9);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${totalStudents} students · Page ${pageNum}/${totalPages}`, PAGE_W - MARGIN, 9, {
    align: "right",
  });
  doc.setFontSize(6.5);
  doc.text(`Login: ${loginUrl}`, MARGIN, 16, { maxWidth: qrDataUrl ? 130 : PAGE_W - MARGIN * 2 });
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, "PNG", PAGE_W - MARGIN - 16, 4, 16, 16);
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, TABLE_TOP - 6, PAGE_W - MARGIN * 2, 6, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("MATRIC", COL.matric, TABLE_TOP - 1.5);
  doc.text("FULL NAME", COL.name, TABLE_TOP - 1.5);
  doc.text("PROGRAM", COL.program, TABLE_TOP - 1.5);
  doc.text("TEMP PASSWORD", COL.password, TABLE_TOP - 1.5);
}

function drawTableRow(
  doc: jsPDF,
  row: CredentialPdfRow,
  y: number,
  index: number
) {
  if (index % 2 === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(MARGIN, y - 3.5, PAGE_W - MARGIN * 2, ROW_H, "F");
  }

  doc.setFontSize(7);
  doc.setFont("courier", "bold");
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(truncate(doc, row.matric, 40), COL.matric, y + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(truncate(doc, row.fullName, 44), COL.name, y + 2);

  doc.setFontSize(6);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(truncate(doc, row.program, 52), COL.program, y + 2);

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.roundedRect(COL.password - 1, y - 2.5, 52, 6.5, 1, 1, "F");
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(truncate(doc, row.tempPassword, 48), COL.password + 2, y + 2.2);
}

function drawCoverPage(
  doc: jsPDF,
  rows: CredentialPdfRow[],
  loginUrl: string,
  qrDataUrl: string | null
) {
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, PAGE_W, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Student access credentials", MARGIN, 18);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Single file · Find your row with Ctrl+F / search your matric", MARGIN, 28);

  let y = 52;
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Sign in at", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.text(loginUrl, MARGIN, y + 6, { maxWidth: 120 });

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, "PNG", PAGE_W - MARGIN - 28, y - 4, 28, 28);
    doc.setFontSize(7);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("Scan to open login", PAGE_W - MARGIN - 14, y + 28, { align: "center" });
  }

  y += 22;
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.setFontSize(8);
  doc.text(
    [
      `This document lists all ${rows.length} provisioned student(s) in one place.`,
      "① Search this PDF for your matric (e.g. U22/FNS/CSC/1105)",
      "② Use your temporary password exactly as shown in your row",
      "③ Set a new password on first login",
    ].join("\n"),
    MARGIN,
    y
  );

  y += 28;
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.setFontSize(7);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("Roster begins on next page →", MARGIN, y);
}

export function credentialPdfFilename(rows: CredentialPdfRow[]): string {
  const stamp = new Date().toISOString().slice(0, 10);
  if (rows.length === 1) {
    const slug = matricToSlug(rows[0].matric);
    return `${slug}_ULA-Login-${stamp}.pdf`;
  }
  return `ula-student-logins-${rows.length}-${stamp}.pdf`;
}

export type CredentialDownloadResult = {
  mode: "single";
  count: number;
  pages: number;
};

/** One compact PDF — table layout, many students per page */
export async function downloadCredentialsPdf(
  rows: CredentialPdfRow[],
  loginUrl: string
): Promise<CredentialDownloadResult> {
  if (rows.length === 0) {
    throw new Error("No credentials to export");
  }

  const sorted = [...rows].sort((a, b) => a.matric.localeCompare(b.matric));
  const qrDataUrl = await fetchLoginQrDataUrl(loginUrl);

  const dataPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const totalPages = dataPages + 1;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  drawCoverPage(doc, sorted, loginUrl, qrDataUrl);

  for (let p = 0; p < dataPages; p++) {
    doc.addPage();
    const pageNum = p + 2;
    drawPageHeader(doc, loginUrl, pageNum, totalPages, sorted.length, p === 0 ? qrDataUrl : null);

    const slice = sorted.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE);
    let y = TABLE_TOP + 4;
    slice.forEach((row, i) => {
      drawTableRow(doc, row, y, i);
      y += ROW_H;
    });

    doc.setFontSize(6);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(
      "Tip: Press Ctrl+F and search your matric to jump to your row",
      PAGE_W / 2,
      PAGE_H - 6,
      { align: "center" }
    );
  }

  doc.save(credentialPdfFilename(sorted));
  return { mode: "single", count: sorted.length, pages: totalPages };
}
