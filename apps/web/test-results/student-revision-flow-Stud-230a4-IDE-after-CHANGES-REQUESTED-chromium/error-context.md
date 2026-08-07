# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student-revision-flow.spec.ts >> Student revision workflow >> Open Full Project restores editable IDE after CHANGES_REQUESTED
- Location: e2e\student-revision-flow.spec.ts:7:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/resume editing|changes requested/i).first()
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByText(/resume editing|changes requested/i).first()

```

```yaml
- alert
- banner:
  - text: My Dream Project
  - button "Explorer"
  - button "Terminal"
  - button "AI Mentor"
  - button "Run"
  - button "Deploy"
  - link "Settings":
    - /url: /workspace/settings
- paragraph: VPE · Verified identity
- paragraph: 0 artifacts
- link "Global registry":
  - /url: /verified
- link "My portfolio":
  - /url: /u/U22-FNS-CSC-1101
- button "My Projects 1"
- complementary:
  - text: Explorer
  - button "New file"
  - button "New folder"
  - button "Import image"
  - button "🌐 index.html"
  - button "🎨 styles.css"
  - button "⚡ script.js"
- main:
  - button "Code"
  - button "Preview"
  - text: Editable workspace
  - button "Select all"
  - button "Copy"
  - button "Paste"
  - textbox
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | const STUDENT_MATRIC = process.env.E2E_STUDENT_MATRIC ?? "U22/FNS/CSC/1101";
  4  | const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD ?? "student123";
  5  | 
  6  | test.describe("Student revision workflow", () => {
  7  |   test("Open Full Project restores editable IDE after CHANGES_REQUESTED", async ({ page }) => {
  8  |     const logs: string[] = [];
  9  |     page.on("console", (msg) => {
  10 |       const text = msg.text();
  11 |       logs.push(text);
  12 |       console.log(`[browser] ${text}`);
  13 |     });
  14 | 
  15 |     await page.goto("/");
  16 |     await page.getByLabel(/matric number/i).fill(STUDENT_MATRIC);
  17 |     await page.getByLabel(/^password$/i).fill(STUDENT_PASSWORD);
  18 |     await page.getByRole("button", { name: /enter workspace/i }).click();
  19 |     await page.waitForURL("**/workspace**", { timeout: 30_000 });
  20 | 
> 21 |     await expect(page.getByText(/resume editing|changes requested/i).first()).toBeVisible({
     |                                                                               ^ Error: expect(locator).toBeVisible() failed
  22 |       timeout: 30_000,
  23 |     });
  24 | 
  25 |     const openProjectButton = page
  26 |       .getByRole("button", { name: /open full project|restore editable workspace/i })
  27 |       .first();
  28 |     await expect(openProjectButton).toBeVisible();
  29 |     await openProjectButton.click();
  30 | 
  31 |     await expect
  32 |       .poll(() => logs.some((line) => line.includes("BUTTON CLICKED")), { timeout: 15_000 })
  33 |       .toBe(true);
  34 |     await expect
  35 |       .poll(() => logs.some((line) => line.includes("RESTORE STARTED")), { timeout: 15_000 })
  36 |       .toBe(true);
  37 |     await expect
  38 |       .poll(() => logs.some((line) => line.includes("SNAPSHOT LOADED")), { timeout: 15_000 })
  39 |       .toBe(true);
  40 |     await expect
  41 |       .poll(() => logs.some((line) => line.includes("loadProject CALLED")), { timeout: 15_000 })
  42 |       .toBe(true);
  43 |     await expect
  44 |       .poll(() => logs.some((line) => line.includes("RESTORE COMPLETE")), { timeout: 15_000 })
  45 |       .toBe(true);
  46 | 
  47 |     await expect(page.getByText(/editable workspace/i).first()).toBeVisible({ timeout: 15_000 });
  48 |     await expect(page.locator(".cm-content").first()).toBeVisible({ timeout: 15_000 });
  49 | 
  50 |     const editor = page.locator(".cm-content").first();
  51 |     await editor.click();
  52 |     await page.keyboard.type("\n<!-- e2e-revision-edit -->");
  53 | 
  54 |     await expect
  55 |       .poll(async () => {
  56 |         const text = await editor.innerText();
  57 |         return text.includes("e2e-revision-edit");
  58 |       })
  59 |       .toBe(true);
  60 | 
  61 |     const resubmit = page.getByRole("button", { name: /^resubmit$/i });
  62 |     if (await resubmit.isVisible()) {
  63 |       await resubmit.click();
  64 |       await expect
  65 |         .poll(() => logs.some((line) => line.includes("Revision request API succeeded")), {
  66 |           timeout: 30_000,
  67 |         })
  68 |         .toBe(true);
  69 |     }
  70 |   });
  71 | });
  72 | 
```