(function (global) {
  const CFG = () => global.ULA_COLLECT_CONFIG || {};
  const LOCAL_KEY = "ula_student_submissions";

  function normalizeMatric(raw) {
    let m = String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/\\/g, "/");
    const slug = m.match(/^U(\d{2})-([A-Z]{3})-([A-Z]{3})-(\d{4})$/);
    if (slug) return `U${slug[1]}/${slug[2]}/${slug[3]}/${slug[4]}`;
    return m;
  }

  function isValidMatric(m) {
    return /^U\d{2}\/[A-Z]{3}\/[A-Z]{3}\/\d{4}$/.test(m);
  }

  function readLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function writeLocal(rows) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  }

  async function gasGet(params) {
    const url = CFG().gasUrl;
    if (!url) throw new Error("Google Sheets URL not configured. See README.md.");

    const qs = new URLSearchParams(params);
    const res = await fetch(`${url}?${qs}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  const storage = {
    normalizeMatric,
    isValidMatric,

    async list() {
      if (CFG().storageMode === "gas") {
        const data = await gasGet({ action: "list", key: CFG().adminKey || "" });
        return data.students || [];
      }
      return readLocal().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    },

    async getByMatric(matric) {
      const norm = normalizeMatric(matric);
      const all = await storage.list();
      return all.find((s) => normalizeMatric(s.matric) === norm) || null;
    },

    async save(entry) {
      const norm = normalizeMatric(entry.matric);
      if (!isValidMatric(norm)) {
        throw new Error("Invalid matric. Use format U22/FNS/CSC/1105");
      }

      const row = {
        matric: norm,
        firstName: String(entry.firstName || "").trim(),
        lastName: String(entry.lastName || "").trim(),
        program: CFG().program,
        email: String(entry.email || "").trim(),
        updatedAt: new Date().toISOString(),
      };

      if (!row.firstName || !row.lastName) {
        throw new Error("First name and last name are required.");
      }

      if (CFG().storageMode === "gas") {
        const data = await gasGet({
          action: "save",
          matric: row.matric,
          firstName: row.firstName,
          lastName: row.lastName,
          program: row.program,
          email: row.email,
        });
        return data.student || row;
      }

      const all = readLocal();
      const idx = all.findIndex((s) => normalizeMatric(s.matric) === norm);
      if (idx >= 0) all[idx] = { ...all[idx], ...row };
      else all.push({ ...row, createdAt: row.updatedAt });
      writeLocal(all);
      return row;
    },
  };

  global.UlaStorage = storage;
})(window);
