/**
 * Google Apps Script backend for student-data-collection (GitHub Pages).
 *
 * Setup:
 * 1. New Google Sheet → Extensions → Apps Script → paste this file
 * 2. Set SECRET_ADMIN_KEY below (same as adminKey in assets/config.js)
 * 3. Run setupSheet once (or let doPost create headers)
 * 4. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
 * 5. Copy web app URL into assets/config.js → gasUrl
 * 6. Set storageMode: "gas"
 */

const SECRET_ADMIN_KEY = "ula-admin-change-me";
const SHEET_NAME = "Students";

function setupSheet() {
  const sh = getSheet();
  if (sh.getLastRow() === 0) {
    sh.appendRow([
      "updatedAt",
      "matric",
      "firstName",
      "lastName",
      "program",
      "email",
    ]);
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
  }
  return sh;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function checkKey(key) {
  return key && String(key) === SECRET_ADMIN_KEY;
}

function normalizeMatric(raw) {
  let m = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\\/g, "/");
  const slug = m.match(/^U(\d{2})-([A-Z]{3})-([A-Z]{3})-(\d{4})$/);
  if (slug) return "U" + slug[1] + "/" + slug[2] + "/" + slug[3] + "/" + slug[4];
  return m;
}

function rowsToStudents(data) {
  if (data.length < 2) return [];
  const headers = data[0];
  const idx = (name) => headers.indexOf(name);
  const out = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[idx("matric")]) continue;
    out.push({
      matric: row[idx("matric")],
      firstName: row[idx("firstName")],
      lastName: row[idx("lastName")],
      program: row[idx("program")],
      email: row[idx("email")] || "",
      updatedAt: row[idx("updatedAt")] || "",
    });
  }
  return out;
}

function saveFromParams(p) {
  setupSheet();
  const matric = normalizeMatric(p.matric);
  if (!/^U\d{2}\/[A-Z]{3}\/[A-Z]{3}\/\d{4}$/.test(matric)) {
    return jsonResponse({ error: "Invalid matric format" });
  }

  const sh = getSheet();
  const data = sh.getDataRange().getValues();
  const now = new Date().toISOString();
  const row = [
    now,
    matric,
    String(p.firstName || "").trim(),
    String(p.lastName || "").trim(),
    String(p.program || "").trim(),
    String(p.email || "").trim(),
  ];

  if (!row[2] || !row[3]) {
    return jsonResponse({ error: "First and last name required" });
  }

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (normalizeMatric(data[i][1]) === matric) {
      sh.getRange(i + 1, 1, 1, 6).setValues([row]);
      found = true;
      break;
    }
  }
  if (!found) {
    sh.appendRow(row);
  }

  return jsonResponse({
    student: {
      matric: row[1],
      firstName: row[2],
      lastName: row[3],
      program: row[4],
      email: row[5],
      updatedAt: row[0],
    },
  });
}

/** GET works from GitHub Pages (no CORS preflight). Students use action=save (no key). */
function doGet(e) {
  const p = e.parameter || {};
  setupSheet();
  const action = p.action || "list";

  if (action === "save") {
    return saveFromParams(p);
  }

  if (!checkKey(p.key)) {
    return jsonResponse({ error: "Unauthorized" });
  }

  if (action === "list") {
    const data = getSheet().getDataRange().getValues();
    return jsonResponse({ students: rowsToStudents(data) });
  }

  return jsonResponse({ error: "Unknown action" });
}
