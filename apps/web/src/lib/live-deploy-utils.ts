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

export const rewriteHtmlLocalPaths = (html: string, deployUrl: string): string => {
  const rootBase = normalizeDeployRoot(deployUrl);
  let output = html;

  output = output.replace(/((?:src|href|poster|action)=)(['"]?)\/(?!\/)([^'"\s>]+)\2/gi, (match, prefix, quote, path) => {
    return `${prefix}${quote}${rootBase}/${path}${quote}`;
  });

  output = output.replace(/srcset=(['"])(.*?)\1/gi, (_, quote, value) => {
    const updated = value
      .split(',')
      .map((segment: string) => {
        const parts = segment.trim().split(/\s+/, 2);
        const src = parts[0];
        const descriptor = parts[1] || "";
        if (src.startsWith('/') && !src.startsWith('//')) {
          return `${rootBase}${src}${descriptor ? ' ' + descriptor : ''}`;
        }
        return segment;
      })
      .join(', ');
    return `srcset=${quote}${updated}${quote}`;
  });

  output = output.replace(/url\((['"]?)\/(?!\/)([^)'"\s]+)\1\)/gi, (_, quote, path) => {
    return `url(${quote}${rootBase}/${path}${quote}`;
  });

  output = output.replace(/(<[^>]+style=)(['"])(.*?)\2/gi, (match: string, prefix: string, quote: string, value: string) => {
    const rewritten = value.replace(/url\((['"]?)\/(?!\/)([^)'"\s]+)\1\)/gi, (_, q: string, path: string) => `url(${q}${rootBase}/${path}${q})`);
    return `${prefix}${quote}${rewritten}${quote}`;
  });

  return output;
};

export const rewriteCssLocalPaths = (css: string, deployUrl: string): string => {
  const rootBase = normalizeDeployRoot(deployUrl);

  let output = css;
  output = output.replace(/@import\s+(['"])(\/(?!\/)[^'"]+)\1/gi, (_, quote, path) => `@import ${quote}${rootBase}${path}${quote}`);
  output = output.replace(/@import\s+url\((['"]?)\/(?!\/)([^)'"\s]+)\1\)/gi, (_, quote, path) => `@import url(${quote}${rootBase}/${path}${quote})`);
  output = output.replace(/url\((['"]?)\/(?!\/)([^)'"\s]+)\1\)/gi, (_, quote, path) => `url(${quote}${rootBase}/${path}${quote})`);

  return output;
};

export const rewriteJsLocalPaths = (js: string, deployUrl: string): string => {
  const rootBase = normalizeDeployRoot(deployUrl);
  let output = js;

  output = output.replace(/(\bimport\s+['"])(\/(?!\/)[^'"]+)(['"])/gi, (match, prefix, path, suffix) => `${prefix}${rootBase}${path}${suffix}`);
  output = output.replace(/(\bexport\s+\*\s+from\s+['"])(\/(?!\/)[^'"]+)(['"])/gi, (match, prefix, path, suffix) => `${prefix}${rootBase}${path}${suffix}`);
  output = output.replace(/(\bfrom\s+['"])(\/(?!\/)[^'"]+)(['"])/gi, (match, prefix, path, suffix) => `${prefix}${rootBase}${path}${suffix}`);
  output = output.replace(/(\bimport\s*\(\s*['"])(\/(?!\/)[^'"]+)(['"]\s*\))/gi, (match, prefix, path, suffix) => `${prefix}${rootBase}${path}${suffix}`);

  return output;
};

export const rewriteLocalPaths = rewriteHtmlLocalPaths;
