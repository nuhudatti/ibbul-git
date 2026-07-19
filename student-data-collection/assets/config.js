/**
 * Copy this folder to GitHub Pages (or any static host).
 * Set storageMode to "gas" and paste your Google Apps Script URL after setup.
 */
window.ULA_COLLECT_CONFIG = {
  institutionName: "Ibrahim Badamasi Babangida University, Lapai",
  projectName: "Project ULA",
  tagline: "Official student profile intake · Faculty of Natural Sciences",

  /** Fixed for every student on this intake form */
  program: "B.Sc Computer Science",

  matricHint: "U22/FNS/CSC/1105",
  matricFormatHelp: "Format: U{year}/{faculty}/{department}/{number}",

  /**
   * "gas" = Google Sheets (recommended for GitHub Pages)
   * "local" = browser localStorage only (demo / single-machine testing)
   */
  storageMode: "local",

  /** Deploy google-apps-script/Code.gs → Web app → paste URL here */
  gasUrl: "",

  /** Must match SECRET_ADMIN_KEY in the Apps Script project */
  adminKey: "62214629",

  /** Shown on records page — change before sharing admin link */
  recordsPageHint: "Keep the records link private. Only share index.html with students.",
};
