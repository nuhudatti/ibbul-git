import assert from "node:assert";
import { resolveCreationPath } from "./utils.ts";

const cases = [
  { input: "style.css", parent: null, expected: "style.css" },
  { input: "style.css", parent: "pages", expected: "pages/style.css" },
  { input: "pages/style.css", parent: "assets", expected: "pages/style.css" },
  { input: "about.html", parent: "pages", expected: "pages/about.html" },
];

for (const testCase of cases) {
  assert.equal(resolveCreationPath(testCase.input, testCase.parent), testCase.expected);
}

console.log("PASS: resolveCreationPath preserves folder-aware file placement");
