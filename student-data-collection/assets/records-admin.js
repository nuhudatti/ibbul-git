(function () {
  const CFG = window.ULA_COLLECT_CONFIG || {};
  const EXPORT_META_KEY = "ula_export_batches";
  const SESSION_KEY = "ula_records_unlocked";

  const gate = document.getElementById("key-gate");
  const app = document.getElementById("records-app");
  const keyInput = document.getElementById("admin-key-input");
  const unlockBtn = document.getElementById("unlock-btn");
  const tbody = document.getElementById("student-rows");
  const searchEl = document.getElementById("search");
  const statTotal = document.getElementById("stat-total");
  const statBatch = document.getElementById("stat-batch");
  const statLast = document.getElementById("stat-last-export");

  let allStudents = [];

  function getExportMeta() {
    try {
      return JSON.parse(localStorage.getItem(EXPORT_META_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveExportMeta(meta) {
    localStorage.setItem(EXPORT_META_KEY, JSON.stringify(meta));
  }

  function nextBatchNumber() {
    const meta = getExportMeta();
    const n = (meta.batchCount || 0) + 1;
    meta.batchCount = n;
    meta.lastExportAt = new Date().toISOString();
    saveExportMeta(meta);
    return n;
  }

  function escapeCsv(val) {
    const s = String(val ?? "");
    return `"${s.replace(/"/g, '""')}"`;
  }

  /** Matches Project ULA admin bulk import: matric, first, last, program[, email] */
  function toBulkCsv(rows) {
    const lines = rows.map((r) =>
      [
        escapeCsv(r.matric),
        escapeCsv(r.firstName),
        escapeCsv(r.lastName),
        escapeCsv(r.program || CFG.program),
        r.email ? escapeCsv(r.email) : "",
      ].join(",")
    );
    return lines.join("\r\n");
  }

  function downloadText(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function updateStats() {
    const meta = getExportMeta();
    statTotal.textContent = String(allStudents.length);
    statBatch.textContent = String(meta.batchCount || 0);
    statLast.textContent = meta.lastExportAt
      ? new Date(meta.lastExportAt).toLocaleString()
      : "—";
  }

  function renderRows(rows) {
    const q = (searchEl?.value || "").trim().toLowerCase();
    const filtered = rows.filter((s) => {
      if (!q) return true;
      const blob = `${s.matric} ${s.firstName} ${s.lastName} ${s.email || ""}`.toLowerCase();
      return blob.includes(q);
    });

    tbody.innerHTML = filtered
      .map(
        (s) => `
      <tr data-matric="${s.matric}">
        <td class="mono">${s.matric}</td>
        <td>${s.firstName} ${s.lastName}</td>
        <td>${s.program || CFG.program}</td>
        <td>${s.email || "<span style='color:var(--muted)'>—</span>"}</td>
        <td style="white-space:nowrap">
          <button type="button" class="btn btn-ghost btn-sm" data-dl="${s.matric}">CSV</button>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll("[data-dl]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const matric = btn.getAttribute("data-dl");
        const row = allStudents.find((x) => x.matric === matric);
        if (!row) return;
        const batch = nextBatchNumber();
        const stamp = new Date().toISOString().slice(0, 10);
        downloadText(
          toBulkCsv([row]),
          `ula-student-${row.matric.replace(/\//g, "-")}-batch-${String(batch).padStart(3, "0")}-${stamp}.csv`,
          "text/csv;charset=utf-8"
        );
        updateStats();
      });
    });
  }

  async function refresh() {
    allStudents = await UlaStorage.list();
    renderRows(allStudents);
    updateStats();
  }

  function unlock() {
    const key = keyInput.value.trim();
    if (key !== (CFG.adminKey || "")) {
      alert("Invalid admin key.");
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "1");
    gate.classList.add("hidden");
    app.classList.remove("hidden");
    refresh();
  }

  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    gate.classList.add("hidden");
    app.classList.remove("hidden");
    refresh();
  }

  unlockBtn?.addEventListener("click", unlock);
  keyInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") unlock();
  });

  searchEl?.addEventListener("input", () => renderRows(allStudents));

  document.getElementById("refresh-btn")?.addEventListener("click", refresh);

  document.getElementById("export-all-csv")?.addEventListener("click", () => {
    if (allStudents.length === 0) {
      alert("No student records yet.");
      return;
    }
    const batch = nextBatchNumber();
    const stamp = new Date().toISOString().slice(0, 10);
    const pad = String(batch).padStart(3, "0");
    downloadText(
      toBulkCsv(allStudents),
      `ula-students-bulk-batch-${pad}-${stamp}.csv`,
      "text/csv;charset=utf-8"
    );
    updateStats();
  });

  document.getElementById("export-all-json")?.addEventListener("click", () => {
    if (allStudents.length === 0) {
      alert("No student records yet.");
      return;
    }
    const batch = nextBatchNumber();
    const stamp = new Date().toISOString().slice(0, 10);
    const pad = String(batch).padStart(3, "0");
    downloadText(
      JSON.stringify({ batch, exportedAt: new Date().toISOString(), students: allStudents }, null, 2),
      `ula-students-backup-batch-${pad}-${stamp}.json`,
      "application/json"
    );
    updateStats();
  });

  document.getElementById("import-json")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const rows = data.students || data;
      if (!Array.isArray(rows)) throw new Error("Invalid JSON");
      if (CFG.storageMode === "local") {
        localStorage.setItem("ula_student_submissions", JSON.stringify(rows));
        await refresh();
        alert(`Imported ${rows.length} record(s) into local storage.`);
      } else {
        alert("JSON import is for local mode only. Use CSV export from Sheets or re-fetch.");
      }
    } catch (err) {
      alert(err.message || "Import failed");
    }
    e.target.value = "";
  });
})();
