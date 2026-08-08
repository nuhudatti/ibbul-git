import assert from "node:assert";
import { buildLiveDeployResponse } from "./live-deploy-runtime.ts";
import { buildManifest } from "./live-deploy-utils.ts";
import { saveDeployment, getDeploymentByPath } from "./deployment-store.ts";
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
        assert.equal(response.headers["Content-Type"], "application/javascript; charset=utf-8");
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
    {
      name: "preserves projectId in relative and root-relative links for live deployment pages",
      fn: () => {
        const files: ProjectFile[] = [
          {
            path: "index.html",
            content: '<a href="index2.html">Page 2</a><link rel="stylesheet" href="css/style.css"><script src="js/app.js"></script><img src="images/logo.png">',
          },
          { path: "index2.html", content: "<html></html>" },
          { path: "css/style.css", content: "body{color:#111;}" },
          { path: "js/app.js", content: "console.log('ok');" },
          { path: "images/logo.png", content: "PNGDATA" },
          { path: "pages/about.html", content: '<a href="index2.html">Nested page</a>' },
        ];

        const root = buildLiveDeployResponse(files, "index.html", deployUrl);
        assert.equal(root.status, 200);
        assert.match(root.body.toString(), /href="\/live\/test-matric\/test-project\/index2.html"/);
        assert.match(root.body.toString(), /href="\/live\/test-matric\/test-project\/css\/style.css"/);
        assert.match(root.body.toString(), /src="\/live\/test-matric\/test-project\/js\/app.js"/);
        assert.match(root.body.toString(), /src="\/live\/test-matric\/test-project\/images\/logo.png"/);
        assert.doesNotMatch(root.body.toString(), /href="\/live\/test-matric\/(?!test-project)/);

        const nested = buildLiveDeployResponse(files, "pages/about.html", deployUrl);
        assert.equal(nested.status, 200);
        assert.match(nested.body.toString(), /\/live\/test-matric\/test-project\/pages\/index2.html/);
        assert.doesNotMatch(nested.body.toString(), /href="\/live\/test-matric\/(?!test-project)/);
      },
    },
    {
      name: "serves a complete static site structure with root, nested pages, CSS, JS, and images",
      fn: () => {
        const files: ProjectFile[] = [
          {
            path: "index.html",
            content:
              '<!DOCTYPE html><html><head><link rel="stylesheet" href="/css/style.css"></head><body><img src="/images/logo.png"><script src="/js/app.js"></script><a href="/index2.html">Index2</a><a href="/pages/about.html">About</a></body></html>',
          },
          { path: "index2.html", content: '<!DOCTYPE html><html><head></head><body>Index2 works</body></html>' },
          { path: "css/style.css", content: "body{color:#111;background:url('/images/logo.png')}" },
          { path: "js/app.js", content: "console.log('live app');" },
          { path: "images/logo.png", content: "PNGDATA" },
          { path: "pages/about.html", content: '<!DOCTYPE html><html><head></head><body><img src="../images/logo.png">About page</body></html>' },
        ];

        const root = buildLiveDeployResponse(files, "", deployUrl);
        assert.equal(root.status, 200);
        assert.match(root.body.toString(), /href="\/live\/test-matric\/test-project\/css\/style.css"/);
        assert.match(root.body.toString(), /src="\/live\/test-matric\/test-project\/images\/logo.png"/);
        assert.match(root.body.toString(), /src="\/live\/test-matric\/test-project\/js\/app.js"/);
        assert.match(root.body.toString(), /href="\/live\/test-matric\/test-project\/index2.html"/);
        assert.doesNotMatch(root.body.toString(), /<base\s/i);

        const index2 = buildLiveDeployResponse(files, "index2.html", deployUrl);
        assert.equal(index2.status, 200);
        assert.match(index2.body.toString(), /Index2 works/);

        const css = buildLiveDeployResponse(files, "css/style.css", deployUrl);
        assert.equal(css.status, 200);
        assert.equal(css.headers["Content-Type"], "text/css; charset=utf-8");
        assert.match(css.body.toString(), /url\('\/live\/test-matric\/test-project\/images\/logo.png'\)/);

        const js = buildLiveDeployResponse(files, "js/app.js", deployUrl);
        assert.equal(js.status, 200);
        assert.equal(js.headers["Content-Type"], "application/javascript; charset=utf-8");
        assert.match(js.body.toString(), /console\.log\('live app'\);/);

        const image = buildLiveDeployResponse(files, "images/logo.png", deployUrl);
        assert.equal(image.status, 200);
        assert.equal(image.headers["Content-Type"], "image/png");
        assert.equal(image.body.toString(), "PNGDATA");

        const about = buildLiveDeployResponse(files, "pages/about.html", deployUrl);
        assert.equal(about.status, 200);
        assert.match(about.body.toString(), /src="\/live\/test-matric\/test-project\/images\/logo\.png"/);
      },
    },
    {
      name: "preserves full nested paths through storage, manifest, and runtime",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "index.html", content: "<html><head></head><body>root</body></html>" },
          { path: "pages/about.html", content: "<html><head></head><body>About</body></html>" },
          { path: "css/style.css", content: "body{color:#111;}" },
          { path: "js/app.js", content: "console.log('ok');" },
          { path: "images/logo.png", content: "PNGDATA" },
        ];

        const manifest = buildManifest(files);
        assert.deepEqual(Object.keys(manifest).sort(), [
          "css/style.css",
          "images/logo.png",
          "index.html",
          "js/app.js",
          "pages/about.html",
        ]);

        const stored = saveDeployment("test-matric", "test-project", "Test Project", files);
        assert.deepEqual(stored.files.map((f) => f.path).sort(), [
          "css/style.css",
          "images/logo.png",
          "index.html",
          "js/app.js",
          "pages/about.html",
        ]);
        assert.equal(stored.deployPath, deployUrl);

        const loaded = getDeploymentByPath(deployUrl);
        assert.ok(loaded, "Deployment should be retrievable by deploy path");
        assert.deepEqual((loaded?.files ?? []).map((f: ProjectFile) => f.path).sort(), [
          "css/style.css",
          "images/logo.png",
          "index.html",
          "js/app.js",
          "pages/about.html",
        ]);

        const root = buildLiveDeployResponse(files, "", deployUrl);
        assert.equal(root.status, 200);

        const about = buildLiveDeployResponse(files, "pages/about.html", deployUrl);
        assert.equal(about.status, 200);

        const css = buildLiveDeployResponse(files, "css/style.css", deployUrl);
        assert.equal(css.status, 200);

        const js = buildLiveDeployResponse(files, "js/app.js", deployUrl);
        assert.equal(js.status, 200);

        const image = buildLiveDeployResponse(files, "images/logo.png", deployUrl);
        assert.equal(image.status, 200);
      },
    },
    {
      name: "preserves nested directory paths through manifest and runtime for deployed files",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "index.html", content: "<html><head></head><body>root</body></html>" },
          { path: "pages/about.html", content: "<html><head></head><body>About</body></html>" },
          { path: "css/style.css", content: "body{color:#111;}" },
          { path: "js/app.js", content: "console.log('ok');" },
          { path: "images/logo.png", content: "PNGDATA" },
        ];

        const manifest = buildManifest(files);
        assert.deepEqual(Object.keys(manifest).sort(), [
          "css/style.css",
          "images/logo.png",
          "index.html",
          "js/app.js",
          "pages/about.html",
        ]);

        const root = buildLiveDeployResponse(files, "", deployUrl);
        assert.equal(root.status, 200);

        const about = buildLiveDeployResponse(files, "pages/about.html", deployUrl);
        assert.equal(about.status, 200);

        const css = buildLiveDeployResponse(files, "css/style.css", deployUrl);
        assert.equal(css.status, 200);

        const js = buildLiveDeployResponse(files, "js/app.js", deployUrl);
        assert.equal(js.status, 200);

        const image = buildLiveDeployResponse(files, "images/logo.png", deployUrl);
        assert.equal(image.status, 200);
      },
    },
    {
      name: "rewrites CSS @import relative paths and preserves external URLs",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "styles/main.css", content: '@import "fonts.css"; body { background: url("../images/bg.png"); }' },
          { path: "styles/fonts.css", content: '@font-face { src: url("https://example.com/test.woff2"); }' },
          { path: "images/bg.png", content: "PNGDATA" },
        ];

        const response = buildLiveDeployResponse(files, "styles/main.css", deployUrl);
        assert.equal(response.status, 200);
        assert.match(response.body.toString(), /@import "\/live\/test-matric\/test-project\/styles\/fonts\.css";/);
        assert.match(response.body.toString(), /url\("\/live\/test-matric\/test-project\/images\/bg\.png"\)/);

        const fontsResponse = buildLiveDeployResponse(files, "styles/fonts.css", deployUrl);
        assert.equal(fontsResponse.status, 200);
        assert.match(fontsResponse.body.toString(), /url\("https:\/\/example\.com\/test\.woff2"\)/);
      },
    },
    {
      name: "preserves external HTTP and protocol-relative image URLs",
      fn: () => {
        const files: ProjectFile[] = [
          {
            path: "index.html",
            content: '<html><head></head><body><img src="http://example.com/image.jpg"><img src="//example.com/image2.jpg"></body></html>',
          },
        ];
        const response = buildLiveDeployResponse(files, "index.html", deployUrl);
        assert.equal(response.status, 200);
        assert.match(response.body.toString(), /src="http:\/\/example\.com\/image\.jpg"/);
        assert.match(response.body.toString(), /src="\/\/example\.com\/image2\.jpg"/);
      },
    },
    {
      name: "resolves nested relative asset paths correctly",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "blog/index.html", content: '<img src="logo.png">' },
          { path: "blog/pages/about.html", content: '<img src="../logo.png">' },
          { path: "blog/logo.png", content: "PNGDATA" },
        ];

        const rootResponse = buildLiveDeployResponse(files, "blog/index.html", deployUrl);
        assert.equal(rootResponse.status, 200);
        assert.match(rootResponse.body.toString(), /src="\/live\/test-matric\/test-project\/blog\/logo\.png"/);

        const nestedResponse = buildLiveDeployResponse(files, "blog/pages/about.html", deployUrl);
        assert.equal(nestedResponse.status, 200);
        assert.match(nestedResponse.body.toString(), /src="\/live\/test-matric\/test-project\/blog\/logo\.png"/);
      },
    },
    {
      name: "handles spaces and encoded characters in asset paths",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "blog/index.html", content: '<img src="images/my%20logo.png">' },
          { path: "blog/images/my logo.png", content: "PNGDATA" },
        ];
        const response = buildLiveDeployResponse(files, "blog/index.html", deployUrl);
        assert.equal(response.status, 200);
        assert.match(response.body.toString(), /src="\/live\/test-matric\/test-project\/blog\/images\/my%20logo\.png"/);
      },
    },
    {
      name: "serves files requested with percent-encoded request paths",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "img/capt abba 01.jpg", content: "DATA" },
        ];
        const response = buildLiveDeployResponse(files, "img/capt%20abba%2001.jpg", deployUrl);
        assert.equal(response.status, 200);
        assert.equal(response.body.toString(), "DATA");
      },
    },
    {
      name: "returns correct MIME type for images",
      fn: () => {
        const files: ProjectFile[] = [
          { path: "images/logo.png", content: "PNGDATA" },
          { path: "images/photo.jpg", content: "JPGDATA" },
          { path: "images/graphic.svg", content: "<svg></svg>" },
        ];
        assert.equal(buildLiveDeployResponse(files, "images/logo.png", deployUrl).headers["Content-Type"], "image/png");
        assert.equal(buildLiveDeployResponse(files, "images/photo.jpg", deployUrl).headers["Content-Type"], "image/jpeg");
        assert.equal(buildLiveDeployResponse(files, "images/graphic.svg", deployUrl).headers["Content-Type"], "image/svg+xml");
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
