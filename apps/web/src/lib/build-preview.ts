import type { ProjectFile } from "@/types";

/** Bundle HTML/CSS/JS project files into a single document for iframe preview */
export function buildPreviewHtml(files: ProjectFile[]): string {
  const htmlFile =
    files.find((f) => f.path === "index.html") ??
    files.find((f) => f.path.endsWith(".html"));

  if (!htmlFile) {
    return `<!DOCTYPE html><html><body style="font-family:system-ui;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>No index.html found — create one to preview.</p></body></html>`;
  }

  const cssFiles = files.filter((f) => f.path.endsWith(".css"));
  const jsFiles = files.filter((f) => f.path.endsWith(".js") || f.path.endsWith(".jsx"));
  const imageFiles = files.filter((f) => f.language === "image" && f.content.startsWith("data:image/"));

  let html = htmlFile.content;

  const replaceAssetReferences = (source: string) => imageFiles.reduce((result, image) => {
    const escapedPath = image.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return result
      .replace(new RegExp(`([\\"'])(?:\\./)?${escapedPath}([\\"'])`, "g"), `$1${image.content}$2`)
      .replace(new RegExp(`url\\((['"]?)(?:\\./)?${escapedPath}\\1\\)`, "g"), `url($1${image.content}$1)`);
  }, source);

  html = replaceAssetReferences(html);

  // Keep existing <link rel=stylesheet> and external <script src=> tags so
  // CDN resources and external libs continue to load in the preview.

  const inlineCss = replaceAssetReferences(cssFiles.map((f) => f.content).join("\n"));
  const inlineJs = jsFiles.map((f) => f.content).join("\n");

  const styleBlock = inlineCss ? `<style>${inlineCss}</style>` : "";
  const scriptBlock = inlineJs ? `<script>${inlineJs}<\/script>` : "";

  if (html.includes("</head>")) {
    html = html.replace("</head>", `${styleBlock}\n</head>`);
  } else if (html.includes("<body")) {
    html = html.replace("<body", `${styleBlock}\n<body`);
  } else {
    html = styleBlock + html;
  }

  if (html.includes("</body>")) {
    html = html.replace("</body>", `${scriptBlock}\n</body>`);
  } else {
    html += scriptBlock;
  }

  return html;
}
