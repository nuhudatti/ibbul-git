import type { ProjectFile } from "@/types";

const normalizePath = (path: string) =>
  path
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/g, "")
    .replace(/\s+/g, "")
    .replace(/\/+/, "/");

const dirname = (path: string) => {
  const normalized = normalizePath(path);
  const parts = normalized.split("/");
  parts.pop();
  return parts.filter(Boolean).join("/");
};

const normalizeHref = (href: string) =>
  href.trim().replace(/\\/g, "/").replace(/^\s+|\s+$/g, "");

const resolvePreviewUrl = (basePath: string, href: string): string | null => {
  const cleaned = normalizeHref(href);
  if (!cleaned) return null;
  if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(cleaned)) return null;
  const [raw] = cleaned.split("#", 1);
  return raw.startsWith("/")
    ? normalizePath(raw)
    : normalizePath(`${dirname(basePath)}/${raw}`);
};

const isExternalUrl = (value: string) => /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(value);

const serializeManifest = (files: ProjectFile[]) => {
  const manifest: Record<string, ProjectFile> = {};
  for (const file of files) {
    const path = normalizePath(file.path);
    if (!path) continue;
    manifest[path] = {
      path,
      content: file.content,
      language: file.language,
    } as ProjectFile;
  }
  return manifest;
};

const buildPreviewRuntime = (entry: string, manifestJson: string) =>
  [
    "(() => {",
    "  const manifest = " + manifestJson + ";",
    "",
    "  function normalizePath(path) {",
    "    return path",
    "      .trim()",
    "      .replace(/\\\\/g, '/')",
    "      .replace(new RegExp('^/+', 'g'), '')",
    "      .replace(new RegExp('/+$', 'g'), '')",
    "      .replace(new RegExp('\\\\s+', 'g'), '')",
    "      .replace(new RegExp('/+', 'g'), '/');",
    "  }",
    "",
    "  function dirname(path) {",
    "    const normalized = normalizePath(path);",
    "    const parts = normalized.split('/');",
    "    parts.pop();",
    "    return parts.filter(Boolean).join('/');",
    "  }",
    "",
    "  function normalizeHref(href) {",
    "    return href.trim().replace(/\\\\/g, '/').replace(/^\\s+|\\s+$/g, '');",
    "  }",
    "",
    "  function resolvePreviewUrl(basePath, href) {",
    "    const cleaned = normalizeHref(href);",
    "    if (!cleaned) return null;",
    "    if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\\\\)/.test(cleaned)) return null;",
    "    const [raw] = cleaned.split('#', 1);",
    "    return raw.startsWith('/')",
    "      ? normalizePath(raw)",
    "      : normalizePath(dirname(basePath) + '/' + raw);",
    "  }",
    "",
    "  function isExternalUrl(value) {",
    "    return /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\\\\)/.test(value);",
    "  }",
    "",
    "  function createDataUrl(path, file) {",
    "    if (!file) return null;",
    "    if (file.content.startsWith('data:')) return file.content;",
    "    const extension = path.split('.').pop()?.toLowerCase();",
    "    const mime =",
    "      extension === 'svg'",
    "        ? 'image/svg+xml'",
    "        : extension === 'png'",
    "          ? 'image/png'",
    "          : extension === 'jpg' || extension === 'jpeg'",
    "            ? 'image/jpeg'",
    "            : extension === 'gif'",
    "              ? 'image/gif'",
    "              : extension === 'css'",
    "                ? 'text/css'",
    "                : extension === 'js'",
    "                  ? 'text/javascript'",
    "                  : 'application/octet-stream';",
    "    return 'data:' + mime + ';charset=utf-8,' + encodeURIComponent(file.content);",
    "  }",
    "",
    "  function rewriteCssUrls(css, basePath, getFile) {",
    "    return css.replace(/url\\((['\"]?)([^'\"\\)]+)\\1\\)/g, (match, quote, href) => {",
    "      if (isExternalUrl(href) || href.startsWith('data:')) return match;",
    "      const target = resolvePreviewUrl(basePath, href);",
    "      if (!target) return match;",
    "      const file = getFile(target.split('#')[0].split('?')[0]);",
    "      const dataUrl = createDataUrl(target, file);",
    "      if (!dataUrl) return match;",
    "      return 'url(' + (quote || '') + dataUrl + (quote || '') + ')';",
    "    });",
    "  }",
    "",
    "  const getFile = (path) => manifest[normalizePath(path)];",
    "  const entry = " + JSON.stringify(entry) + ";",
    "",
    "  const loadPage = (pagePath) => {",
    "    const normalized = normalizePath(pagePath || entry);",
    "    const file = getFile(normalized) || getFile(entry);",
    "    if (!file) {",
    "      document.documentElement.innerHTML = '<body style=\"font-family:system-ui;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0\"><div><h1 style=\"margin:0 0 .5rem;\">Page not found</h1><p style=\"margin:0;\">The file \"' + normalized + '\" could not be loaded.</p></div></body>';",
    "      return;",
    "    }",
    "",
    "    const parsed = new DOMParser().parseFromString(file.content, 'text/html');",
    "    const currentPath = file.path;",
    "    const docHead = document.createElement('head');",
    "    const docBody = document.createElement('body');",
    "",
    "    const cloneNode = (node, container, currentPath) => {",
    "      if (node.nodeType === Node.TEXT_NODE) {",
    "        container.appendChild(document.createTextNode(node.textContent || ''));",
    "        return;",
    "      }",
    "      if (node.nodeType !== Node.ELEMENT_NODE) return;",
    "",
    "      const element = document.createElement(node.tagName.toLowerCase());",
    "      Array.from(node.attributes).forEach((attr) => {",
    "        const name = attr.name;",
    "        const value = attr.value;",
    "",
    "        if ((name === 'href' || name === 'src' || name === 'poster' || name === 'srcset') && !isExternalUrl(value) && !value.startsWith('data:')) {",
    "          const resolved = resolvePreviewUrl(currentPath, value);",
    "          if (resolved) {",
    "            if (name === 'href' && element.tagName.toLowerCase() === 'a') {",
    "              element.setAttribute(name, '/' + resolved);",
    "            } else if (name === 'srcset') {",
    "              const updated = value",
    "                .split(',')",
    "                .map((segment) => {",
    "                  const parts = segment.trim().split(/\\s+/, 2);",
    "                  const src = parts[0];",
    "                  const descriptor = parts[1] || '';",
    "                  const resolvedSrc = resolvePreviewUrl(currentPath, src);",
    "                  const targetPath = resolvedSrc ? resolvedSrc.split('#')[0].split('?')[0] : src;",
    "                  const targetFile = getFile(targetPath);",
    "                  const dataUrl = createDataUrl(targetPath, targetFile);",
    "                  return dataUrl ? dataUrl + (descriptor ? ' ' + descriptor : '') : segment;",
    "                })",
    "                .join(', ');",
    "              element.setAttribute(name, updated);",
    "              return;",
    "            } else {",
    "              const targetPath = resolved.split('#')[0].split('?')[0];",
    "              const targetFile = getFile(targetPath);",
    "              if (targetFile && (name === 'src' || name === 'poster')) {",
    "                const dataUrl = createDataUrl(targetPath, targetFile);",
    "                if (dataUrl) {",
    "                  element.setAttribute(name, dataUrl);",
    "                  return;",
    "                }",
    "              }",
    "            }",
    "          }",
    "        }",
    "",
    "        if (name === 'style') {",
    "          element.setAttribute(name, rewriteCssUrls(value, currentPath, getFile));",
    "          return;",
    "        }",
    "",
    "        if (name === 'src' && element.tagName.toLowerCase() === 'script') {",
    "          return;",
    "        }",
    "",
    "        element.setAttribute(name, value);",
    "      });",
    "",
    "      const tagName = element.tagName.toLowerCase();",
    "      if (tagName === 'script') {",
    "        const src = node.getAttribute('src') || '';",
    "        const type = node.getAttribute('type') || '';",
    "        if (src && !isExternalUrl(src) && !src.startsWith('data:')) {",
    "          const resolved = resolvePreviewUrl(currentPath, src);",
    "          const targetPath = resolved ? resolved.split('#')[0].split('?')[0] : src;",
    "          const targetFile = getFile(targetPath);",
    "          if (targetFile && targetFile.content != null) {",
    "            const script = document.createElement('script');",
    "            if (type) script.type = type;",
    "            if (node.hasAttribute('nomodule')) script.setAttribute('nomodule', '');",
    "            script.textContent = targetFile.content;",
    "            container.appendChild(script);",
    "            return;",
    "          }",
    "        }",
    "        if (!src) {",
    "          const script = document.createElement('script');",
    "          if (type) script.type = type;",
    "          script.textContent = node.textContent || '';",
    "          container.appendChild(script);",
    "          return;",
    "        }",
    "      }",
    "",
    "      if (tagName === 'link' && element.getAttribute('rel') === 'stylesheet') {",
    "        const href = node.getAttribute('href') || '';",
    "        if (!isExternalUrl(href) && !href.startsWith('data:')) {",
    "          const resolved = resolvePreviewUrl(currentPath, href);",
    "          const targetPath = resolved ? resolved.split('#')[0].split('?')[0] : href;",
    "          const targetFile = getFile(targetPath);",
    "          if (targetFile && targetFile.content != null) {",
    "            const style = document.createElement('style');",
    "            style.textContent = rewriteCssUrls(targetFile.content, targetPath, getFile);",
    "            container.appendChild(style);",
    "            return;",
    "          }",
    "        }",
    "      }",
    "",
    "      if (tagName === 'a' && element.hasAttribute('href')) {",
    "        const href = element.getAttribute('href') || '';",
    "        if (!isExternalUrl(href) && !href.startsWith('mailto:') && !href.startsWith('tel:')) {",
    "          element.addEventListener('click', (event) => {",
    "            event.preventDefault();",
    "            const resolved = resolvePreviewUrl(currentPath, href);",
    "            if (resolved) {",
    "              const normalized = resolved.split('#')[0].split('?')[0];",
    "              if (getFile(normalized) && normalized.endsWith('.html')) {",
    "                if (window.location.pathname.replace(/^\\//, '') !== normalized) {",
    "                  window.history.pushState({}, '', '/' + normalized);",
    "                }",
    "                loadPage(normalized);",
    "              } else {",
    "                window.location.href = href;",
    "              }",
    "            }",
    "          });",
    "        }",
    "      }",
    "",
    "      Array.from(node.childNodes).forEach((child) => cloneNode(child, element, currentPath));",
    "      container.appendChild(element);",
    "    };",
    "",
    "    Array.from(parsed.head.childNodes).forEach((child) => cloneNode(child, docHead, currentPath));",
    "    Array.from(parsed.body.childNodes).forEach((child) => cloneNode(child, docBody, currentPath));",
    "",
    "    document.head.replaceChildren(...Array.from(docHead.childNodes));",
    "    document.body.replaceChildren(...Array.from(docBody.childNodes));",
    "    document.title = parsed.querySelector('title')?.textContent || document.title;",
    "  };",
    "",
    "  const currentPath = normalizePath(window.location.pathname.replace(/^\\//, '')) || entry;",
    "  loadPage(currentPath);",
    "",
    "  window.addEventListener('popstate', () => {",
    "    const pathname = normalizePath(window.location.pathname.replace(/^\\//, '')) || entry;",
    "    loadPage(pathname);",
    "  });",
    "",
    "  if (window.location.pathname.replace(/^\\//, '') === '' && entry) {",
    "    window.history.replaceState({}, '', '/' + entry);",
    "  }",
    "})();",
  ].join('\n');

const createDataUrl = (path: string, file: ProjectFile | undefined) => {
  if (!file) return null;
  if (file.content.startsWith("data:")) return file.content;
  const extension = path.split(".").pop()?.toLowerCase();
  const mime =
    extension === "svg"
      ? "image/svg+xml"
      : extension === "png"
        ? "image/png"
        : extension === "jpg" || extension === "jpeg"
          ? "image/jpeg"
          : extension === "gif"
            ? "image/gif"
            : extension === "css"
              ? "text/css"
              : extension === "js"
                ? "text/javascript"
                : "application/octet-stream";
  return `data:${mime};charset=utf-8,${encodeURIComponent(file.content)}`;
};

const rewriteCssUrls = (css: string, basePath: string, getFile: (path: string) => ProjectFile | undefined) =>
  css.replace(/url\((['"]?)([^'"\)]+)\1\)/g, (match, quote, href) => {
    if (isExternalUrl(href) || href.startsWith("data:")) return match;
    const target = resolvePreviewUrl(basePath, href);
    if (!target) return match;
    const file = getFile(target.split("#")[0].split("?")[0]);
    const dataUrl = createDataUrl(target, file);
    if (!dataUrl) return match;
    return "url(" + (quote || "") + dataUrl + (quote || "") + ")";
  });

export function buildPreviewHtml(files: ProjectFile[]): string {
  const manifest = serializeManifest(files);
  const entry = manifest["index.html"]?.path || Object.keys(manifest).find((path) => path.toLowerCase().endsWith(".html"));

  if (!entry) {
    return `<!DOCTYPE html><html><body style="font-family:system-ui;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>No index.html found — create one to preview.</p></body></html>`;
  }

  const manifestJson = JSON.stringify(manifest).replace(/<\/script>/g, "<\\/script>");
  const runtime = buildPreviewRuntime(entry, manifestJson);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Project Preview</title>
  <style>html,body{height:100%;margin:0;background:#0b0e14;color:#fff;font-family:system-ui, sans-serif;}body{overflow:hidden;}</style>
</head>
<body>
  <script>${runtime}</script>
</body>
</html>`;
}
