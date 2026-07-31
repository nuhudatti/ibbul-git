import assert from "node:assert";
import { buildLiveDeployResponse } from "./live-deploy-runtime.ts";
import type { ProjectFile } from "../types/index.ts";

const deployUrl = "/live/test-matric/test-project";

const run = async () => {
  const tests: Array<{ name: string; fn: () => void }> = [
    {
      name: "serves index.html for root requests",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "index.html", content: "<html><head></head><body>root</body></html>" },
        ];
        const response = buildLiveDeployResponse(files, "", deployUrl);
        assert.equal(response.status, 200);
        assert.equal(response.headers["Content-Type"], "text/html; charset=utf-8");
        assert.match(response.body.toString(), /root/);
      },
    },
    {
      name: "serves nested folder pages and rewrites root-relative assets in HTML",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "pages/about.html", content: '<html><head></head><body><img src="/assets/logo.png"></body></html>' },
          { path: "assets/logo.png", content: "PNGDATA" },
          { path: "index.html", content: "<html><head></head><body>root</body></html>" },
        ];
        const response = buildLiveDeployResponse(files, "pages/about.html", deployUrl);
        assert.equal(response.status, 200);
        assert.match(response.body.toString(), /src="\/live\/test-matric\/test-project\/assets\/logo.png"/);
      },
    },
    {
      name: "serves CSS and rewrites url() root-relative references",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "styles/app.css", content: "body { background: url('/images/bg.png'); }" },
          { path: "images/bg.png", content: "PNGDATA" },
        ];
        const response = buildLiveDeployResponse(files, "styles/app.css", deployUrl);
        assert.equal(response.status, 200);
        assert.equal(response.headers["Content-Type"], "text/css; charset=utf-8");
        assert.match(response.body.toString(), /url\('\/live\/test-matric\/test-project\/images\/bg.png'\)/);
      },
    },
    {
      name: "serves JS and rewrites root-relative import paths",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "scripts/app.js", content: "import '/lib/util.js'; console.log('ok');" },
          { path: "lib/util.js", content: "export const x = 1;" },
        ];
        const response = buildLiveDeployResponse(files, "scripts/app.js", deployUrl);
        assert.equal(response.status, 200);
        assert.equal(response.headers["Content-Type"], "text/javascript; charset=utf-8");
        assert.match(response.body.toString(), /import '\/live\/test-matric\/test-project\/lib\/util.js';/);
      },
    },
    {
      name: "serves favicon and manifest.json with correct mime types",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "favicon.ico", content: "ICO" },
          { path: "manifest.webmanifest", content: "{}" },
        ];
        const favicon = buildLiveDeployResponse(files, "favicon.ico", deployUrl);
        const manifest = buildLiveDeployResponse(files, "manifest.webmanifest", deployUrl);
        assert.equal(favicon.headers["Content-Type"], "image/x-icon");
        assert.equal(manifest.headers["Content-Type"], "application/manifest+json; charset=utf-8");
      },
    },
    {
      name: "serves fonts and binary assets with right content-type",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "fonts/inter.woff2", content: "BINARY" },
          { path: "video/sample.mp4", content: "BINARY" },
          { path: "audio/sample.mp3", content: "BINARY" },
          { path: "document/file.pdf", content: "BINARY" },
        ];
        assert.equal(buildLiveDeployResponse(files, "fonts/inter.woff2", deployUrl).headers["Content-Type"], "font/woff2");
        assert.equal(buildLiveDeployResponse(files, "video/sample.mp4", deployUrl).headers["Content-Type"], "video/mp4");
        assert.equal(buildLiveDeployResponse(files, "audio/sample.mp3", deployUrl).headers["Content-Type"], "audio/mpeg");
        assert.equal(buildLiveDeployResponse(files, "document/file.pdf", deployUrl).headers["Content-Type"], "application/pdf");
      },
    },
    {
      name: "returns 404 for missing deep links under nested folders",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "index.html", content: "<html></html>" },
        ];
        const response = buildLiveDeployResponse(files, "missing/page.html", deployUrl);
        assert.equal(response.status, 404);
      },
    },
    {
      name: "serves index.html for folder paths",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "index.html", content: "root" },
          { path: "blog/index.html", content: "blog" },
        ];
        const response = buildLiveDeployResponse(files, "blog", deployUrl);
        assert.equal(response.status, 200);
        assert.match(response.body.toString(), /blog/);
      },
    },
    {
      name: "preserves external CDN URLs without rewriting",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "index.html", content: '<html><head><script src="https://cdn.example.com/lib.js"></script></head><body></body></html>' },
        ];
        const response = buildLiveDeployResponse(files, "", deployUrl);
        assert.equal(response.status, 200);
        assert.match(response.body.toString(), /https:\/\/cdn.example.com\/lib.js/);
      },
    },
    {
      name: "rewrites root-relative CSS @font-face src URLs",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "styles/fonts.css", content: "@font-face { src: url('/fonts/test.woff2'); }" },
          { path: "fonts/test.woff2", content: "BINARY" },
        ];
        const response = buildLiveDeployResponse(files, "styles/fonts.css", deployUrl);
        assert.match(response.body.toString(), /url\('\/live\/test-matric\/test-project\/fonts\/test.woff2'\)/);
      },
    },
  ];

  let passed = 0;

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS: ${test.name}`);
      passed += 1;
    } catch (error) {
      console.error(`FAIL: ${test.name}`);
      console.error(error);
      process.exitCode = 1;
      break;
    }
  }

  if (passed === tests.length) {
    console.log(`All ${passed} live deploy validation tests passed.`);
  }
};

await run();
