(function () {
  const CFG = window.ULA_COLLECT_CONFIG || {};
  const form = document.getElementById("student-form");
  const statusEl = document.getElementById("form-status");
  const programEl = document.getElementById("program");
  const matricEl = document.getElementById("matric");
  const loadBtn = document.getElementById("load-existing");

  if (programEl) programEl.value = CFG.program || "";

  function showStatus(msg, ok) {
    statusEl.textContent = msg;
    statusEl.className = "status show " + (ok ? "ok" : "err");
  }

  function fillForm(student) {
    matricEl.value = student.matric;
    document.getElementById("firstName").value = student.firstName;
    document.getElementById("lastName").value = student.lastName;
    document.getElementById("email").value = student.email || "";
    programEl.value = student.program || CFG.program;
  }

  loadBtn?.addEventListener("click", async () => {
    const matric = matricEl.value.trim();
    if (!matric) {
      showStatus("Enter your matric number first.", false);
      return;
    }
    loadBtn.disabled = true;
    try {
      const existing = await UlaStorage.getByMatric(matric);
      if (!existing) {
        showStatus("No saved record for this matric yet. Fill the form and submit.", false);
        return;
      }
      fillForm(existing);
      showStatus("Loaded your saved details. Update and submit to save changes.", true);
    } catch (e) {
      showStatus(e.message || "Could not load record.", false);
    } finally {
      loadBtn.disabled = false;
    }
  });

  const params = new URLSearchParams(location.search);
  const presetMatric = params.get("matric");
  if (presetMatric && matricEl) {
    matricEl.value = presetMatric;
    loadBtn?.click();
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("submit-btn");
    btn.disabled = true;
    showStatus("Saving…", true);

    try {
      const saved = await UlaStorage.save({
        matric: matricEl.value,
        firstName: document.getElementById("firstName").value,
        lastName: document.getElementById("lastName").value,
        email: document.getElementById("email").value,
      });
      showStatus(
        `Saved successfully for ${saved.matric}. Thank you — your details are on file with ${CFG.projectName || "Project ULA"}.`,
        true
      );
    } catch (err) {
      showStatus(err.message || "Save failed. Try again.", false);
    } finally {
      btn.disabled = false;
    }
  });
})();
