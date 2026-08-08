export const normalizeRequestPath = (segments: string[] | undefined): string => {
  const raw = (segments ?? []).join("/");
  const cleaned = raw
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .trim();

  const parts = cleaned.split("/");
  const resolved: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }

  return resolved.join("/");
};

export const getContentType = (path: string): string => {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "html":
      return "text/html; charset=utf-8";
    case "css":
      return "text/css; charset=utf-8";
    case "js":
    case "mjs":
      return "application/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "svg":
      return "image/svg+xml";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "ico":
      return "image/x-icon";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "ogg":
    case "ogv":
      return "video/ogg";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "woff":
      return "font/woff";
    case "woff2":
      return "font/woff2";
    case "ttf":
      return "font/ttf";
    case "otf":
      return "font/otf";
    case "eot":
      return "application/vnd.ms-fontobject";
    case "pdf":
      return "application/pdf";
    case "txt":
      return "text/plain; charset=utf-8";
    case "xml":
      return "application/xml; charset=utf-8";
    case "webmanifest":
      return "application/manifest+json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
};

export const parseDataUrl = (content: string): { data: Uint8Array; mime: string } | null => {
  const match = content.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!match) return null;
  const [, mime, base64, payload] = match;

  if (base64) {
    return {
      data: Uint8Array.from(Buffer.from(payload, "base64")),
      mime,
    };
  }

  return {
      data: new TextEncoder().encode(decodeURIComponent(payload)),
      mime,
  };
};

export const buildManifest = (files: { path: string; content: string; language?: string }[]) => {
  const manifest: Record<string, { path: string; content: string; language?: string }> = {};
  for (const file of files) {
    const path = file.path
      .trim()
      .replace(/\\/g, "/")
      .replace(/\/+/g, "/")
      .replace(/^\//, "")
      .replace(/\/$/, "");
    if (!path) continue;
    manifest[path] = {
      path,
      content: file.content,
      language: file.language,
    };
  }
  return manifest;
};

export const findTargetFile = (
  manifest: Record<string, { path: string; content: string; language?: string }>,
  targetPath: string,
  entry: string
) => {
  const normalized = targetPath
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\//, "")
    .replace(/\/$/, "");

  if (!normalized) return manifest[entry];
  if (manifest[normalized]) return manifest[normalized];
  if (!normalized.includes(".") && manifest[`${normalized}.html`]) return manifest[`${normalized}.html`];
  if (manifest[`${normalized}/index.html`]) return manifest[`${normalized}/index.html`];
  return undefined;
};

const normalizeDeployRoot = (deployUrl: string) => deployUrl.replace(/\/+$|\/$/g, "");

export const injectBaseHref = (html: string, baseHref: string): string => {
  if (/<base\s[^>]*>/i.test(html)) return html;
  return html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
};

const isExternalOrSpecialUrl = (value: string) => {
  if (!value) return true;
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?|data:|mailto:|tel:|javascript:)/i.test(value);
};

const rewriteLocalReference = (value: string, deployUrl: string, requestPath = "") => {
  if (!value || isExternalOrSpecialUrl(value)) return null;

  const rootBase = normalizeDeployRoot(deployUrl);
  if (value.startsWith("/")) {
    return `${rootBase}${value}`;
  }

  const basePath = requestPath ? `${rootBase}/${requestPath}` : `${rootBase}/`;
  const resolved = new URL(value, `http://localhost${basePath}`);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
};

const rewriteLocalCssUrl = (value: string, deployUrl: string, requestPath = "") => {
  const cleaned = value.trim();
  const rewritten = rewriteLocalReference(cleaned, deployUrl, requestPath);
  return rewritten ? rewritten : null;
};

export const rewriteHtmlLocalPaths = (html: string, deployUrl: string, requestPath = ""): string => {
  let output = html;

  output = output.replace(/((?:src|href|poster|action)=)(['"]?)([^'"\s>]+)(\2)/gi, (match, prefix, quote, value) => {
    const rewritten = rewriteLocalReference(value, deployUrl, requestPath);
    if (!rewritten) {
      return match;
    }
    return `${prefix}${quote}${rewritten}${quote}`;
  });

  output = output.replace(/srcset=(['"])(.*?)\1/gi, (_, quote, value) => {
    const updated = value
      .split(',')
      .map((segment: string) => {
        const parts = segment.trim().split(/\s+/, 2);
        const src = parts[0];
        const descriptor = parts[1] || "";
        const rewritten = rewriteLocalReference(src, deployUrl, requestPath);
        if (rewritten) {
          return `${rewritten}${descriptor ? ' ' + descriptor : ''}`;
        }
        return segment;
      })
      .join(', ');
    return `srcset=${quote}${updated}${quote}`;
  });

  output = output.replace(/url\(\s*(['"]?)([^)]*?)\1\s*\)/gi, (_, quote, value) => {
    const rewritten = rewriteLocalCssUrl(value, deployUrl, requestPath);
    return rewritten ? `url(${quote}${rewritten}${quote})` : `url(${quote}${value}${quote})`;
  });

  output = output.replace(/(<[^>]+style=)(['"])(.*?)\2/gi, (match: string, prefix: string, quote: string, value: string) => {
    const rewritten = value.replace(/url\(\s*(['"]?)([^)]*?)\1\s*\)/gi, (_: string, q: string, path: string) => {
      const rewrittenPath = rewriteLocalCssUrl(path, deployUrl, requestPath);
      return rewrittenPath ? `url(${q}${rewrittenPath}${q})` : `url(${q}${path}${q})`;
    });
    return `${prefix}${quote}${rewritten}${quote}`;
  });

  return output;
};

export const rewriteCssLocalPaths = (css: string, deployUrl: string, requestPath = ""): string => {
  let output = css;
  output = output.replace(/@import\s+(['"])([^'"\s]+)\1([^;]*);/gi, (_, quote, path, suffix) => {
    const cleaned = path.trim();
    if (isExternalOrSpecialUrl(cleaned)) {
      return `@import ${quote}${path}${quote}${suffix};`;
    }
    const rewritten = rewriteLocalReference(cleaned, deployUrl, requestPath);
    return rewritten ? `@import ${quote}${rewritten}${quote}${suffix};` : `@import ${quote}${path}${quote}${suffix};`;
  });
  output = output.replace(/@import\s+url\(\s*(['"]?)([^)]*?)\1\s*\)([^;]*);/gi, (_, quote, path, suffix) => {
    const cleaned = path.trim();
    if (isExternalOrSpecialUrl(cleaned)) {
      return `@import url(${quote}${path}${quote})${suffix};`;
    }
    const rewritten = rewriteLocalReference(cleaned, deployUrl, requestPath);
    return rewritten ? `@import url(${quote}${rewritten}${quote})${suffix};` : `@import url(${quote}${path}${quote})${suffix};`;
  });
  output = output.replace(/url\(\s*(['"]?)([^)]*?)\1\s*\)/gi, (_, quote, path) => {
    const cleaned = path.trim();
    const rewritten = rewriteLocalReference(cleaned, deployUrl, requestPath);
    return rewritten ? `url(${quote}${rewritten}${quote})` : `url(${quote}${path}${quote})`;
  });

  return output;
};

export const rewriteJsLocalPaths = (js: string, deployUrl: string, requestPath = ""): string => {
  const rootBase = normalizeDeployRoot(deployUrl);
  let output = js;

  output = output.replace(/(\bimport\s+['"])(\/(?!\/)[^'"]+)(['"])/gi, (match, prefix, path, suffix) => `${prefix}${rootBase}${path}${suffix}`);
  output = output.replace(/(\bexport\s+\*\s+from\s+['"])(\/(?!\/)[^'"]+)(['"])/gi, (match, prefix, path, suffix) => `${prefix}${rootBase}${path}${suffix}`);
  output = output.replace(/(\bfrom\s+['"])(\/(?!\/)[^'"]+)(['"])/gi, (match, prefix, path, suffix) => `${prefix}${rootBase}${path}${suffix}`);
  output = output.replace(/(\bimport\s*\(\s*['"])(\/(?!\/)[^'"]+)(['"]\s*\))/gi, (match, prefix, path, suffix) => `${prefix}${rootBase}${path}${suffix}`);

  return output;
};

export const rewriteLocalPaths = rewriteHtmlLocalPaths;
