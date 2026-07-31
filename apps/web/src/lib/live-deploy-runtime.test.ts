import { strict as assert } from "node:assert";
import { buildLiveDeployResponse } from "./live-deploy-runtime.ts";
import type { ProjectFile } from "../types/index";

const deployUrl = "/live/test-matric/test-project";

function makeFiles(files: ProjectFile[]) {
  return files;
}

describe("live deploy runtime", () => {
  it("serves index.html for root requests", () => {
    const files = makeFiles([
      { path: "index.html", content: "<html><head></head><body>root</body></html>" },
    ]);
    const response = buildLiveDeployResponse(files, "", deployUrl);
    assert.equal(response.status, 200);
    assert.equal(response.headers["Content-Type"], "text/html; charset=utf-8");
    assert.match(response.body.toString(), /root/);
  });

  it("serves nested folder pages and rewrites root-relative assets in HTML", () => {
    const files = makeFiles([
      { path: "index.html", content: '<html><head></head><body><img src="/assets/logo.png"></body></html>' },
      { path: "assets/logo.png", content: "PNGDATA" },
      { path: "pages/about.html", content: "<html><head></head><body>about</body></html>" },
    ]);
    const response = buildLiveDeployResponse(files, "pages/about.html", deployUrl);
    assert.equal(response.status, 200);
    assert.match(response.body.toString(), /src="\/live\/test-matric\/test-project\/assets\/logo.png"/);
  });

  it("serves CSS and rewrites url() root-relative references", () => {
    const files = makeFiles([
      { path: "styles/app.css", content: "body { background: url('/images/bg.png'); }" },
      { path: "images/bg.png", content: "PNGDATA" },
    ]);
    const response = buildLiveDeployResponse(files, "styles/app.css", deployUrl);
    assert.equal(response.status, 200);
    assert.equal(response.headers["Content-Type"], "text/css; charset=utf-8");
    assert.match(response.body.toString(), /url\('\/live\/test-matric\/test-project\/images\/bg.png'\)/);
  });

  it("serves JS and rewrites root-relative import paths", () => {
    const files = makeFiles([
      { path: "scripts/app.js", content: "import '/lib/util.js'; console.log('ok');" },
      { path: "lib/util.js", content: "export const x = 1;" },
    ]);
    const response = buildLiveDeployResponse(files, "scripts/app.js", deployUrl);
    assert.equal(response.status, 200);
    assert.equal(response.headers["Content-Type"], "text/javascript; charset=utf-8");
    assert.match(response.body.toString(), /import '\/live\/test-matric\/test-project\/lib\/util.js';/);
  });

  it("serves favicon and manifest.json with correct mime types", () => {
    const files = makeFiles([
      { path: "favicon.ico", content: "ICO" },
      { path: "manifest.webmanifest", content: "{}" },
    ]);
    const favicon = buildLiveDeployResponse(files, "favicon.ico", deployUrl);
    const manifest = buildLiveDeployResponse(files, "manifest.webmanifest", deployUrl);
    assert.equal(favicon.headers["Content-Type"], "image/x-icon");
    assert.equal(manifest.headers["Content-Type"], "application/manifest+json; charset=utf-8");
  });

  it("serves fonts and binary assets with right content-type", () => {
    const files = makeFiles([
      { path: "fonts/inter.woff2", content: "BINARY" },
      { path: "video/sample.mp4", content: "BINARY" },
      { path: "audio/sample.mp3", content: "BINARY" },
      { path: "document/file.pdf", content: "BINARY" },
    ]);
    assert.equal(buildLiveDeployResponse(files, "fonts/inter.woff2", deployUrl).headers["Content-Type"], "font/woff2");
    assert.equal(buildLiveDeployResponse(files, "video/sample.mp4", deployUrl).headers["Content-Type"], "video/mp4");
    assert.equal(buildLiveDeployResponse(files, "audio/sample.mp3", deployUrl).headers["Content-Type"], "audio/mpeg");
    assert.equal(buildLiveDeployResponse(files, "document/file.pdf", deployUrl).headers["Content-Type"], "application/pdf");
  });

  it("returns 404 for missing deep links under nested folders", () => {
    const files = makeFiles([
      { path: "index.html", content: "<html></html>" },
    ]);
    const response = buildLiveDeployResponse(files, "missing/page.html", deployUrl);
    assert.equal(response.status, 404);
  });

  it("serves index.html for folder paths", () => {
    const files = makeFiles([
      { path: "index.html", content: "root" },
      { path: "blog/index.html", content: "blog" },
    ]);
    const response = buildLiveDeployResponse(files, "blog", deployUrl);
    assert.equal(response.status, 200);
    assert.match(response.body.toString(), /blog/);
  });

  it("preserves external CDN URLs without rewriting", () => {
    const files = makeFiles([
      { path: "index.html", content: '<html><head><script src="https://cdn.example.com/lib.js"></script></head><body></body></html>' },
    ]);
    const response = buildLiveDeployResponse(files, "", deployUrl);
    assert.equal(response.status, 200);
    assert.match(response.body.toString(), /https:\/\/cdn.example.com\/lib.js/);
  });

  it("rewrites root-relative CSS @font-face src URLs", () => {
    const files = makeFiles([
      { path: "styles/fonts.css", content: "@font-face { src: url('/fonts/test.woff2'); }" },
      { path: "fonts/test.woff2", content: "BINARY" },
    ]);
    const response = buildLiveDeployResponse(files, "styles/fonts.css", deployUrl);
    assert.match(response.body.toString(), /url\('\/live\/test-matric\/test-project\/fonts\/test.woff2'\)/);
  });
});
