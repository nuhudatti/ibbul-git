import type { ProjectFile } from "../types/index.ts";
import {
  normalizeRequestPath,
  getContentType,
  parseDataUrl,
  buildManifest,
  findTargetFile,
  rewriteHtmlLocalPaths,
  rewriteCssLocalPaths,
  rewriteJsLocalPaths,
} from "./live-deploy-utils.ts";

export interface LiveDeployResponse {
  status: number;
  headers: Record<string, string>;
  body: string | Uint8Array;
}

export function buildLiveDeployResponse(
  files: ProjectFile[],
  requestPath: string,
  deployUrl: string
): LiveDeployResponse {
  const manifest = buildManifest(files);
  const entry = manifest["index.html"]?.path || Object.keys(manifest).find((path) => path.toLowerCase().endsWith(".html")) || "index.html";
  const file = findTargetFile(manifest, requestPath || entry, entry);

  if (!file) {
    return {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
      body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Not found</title></head><body>The file ${requestPath || entry} could not be found.</body></html>`,
    };
  }

  const contentType = getContentType(file.path);
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "no-cache",
  };

  if (contentType.startsWith("text/html")) {
    return {
      status: 200,
      headers,
      body: rewriteHtmlLocalPaths(file.content, deployUrl),
    };
  }

  if (contentType.startsWith("text/css")) {
    return {
      status: 200,
      headers,
      body: rewriteCssLocalPaths(file.content, deployUrl),
    };
  }

  if (contentType.startsWith("text/javascript") || contentType.includes("application/javascript")) {
    return {
      status: 200,
      headers,
      body: rewriteJsLocalPaths(file.content, deployUrl),
    };
  }

  if (file.content.startsWith("data:")) {
    const parsed = parseDataUrl(file.content);
    if (parsed) {
      headers["Content-Type"] = parsed.mime;
      return {
        status: 200,
        headers,
        body: parsed.data,
      };
    }
  }

  if (contentType.startsWith("text/") && !contentType.includes("charset")) {
    headers["Content-Type"] = `${contentType}; charset=utf-8`;
  }

  return {
    status: 200,
    headers,
    body: file.content,
  };
}
