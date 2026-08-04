# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student-revision-flow.spec.ts >> Student revision workflow >> Open Full Project restores editable IDE after CHANGES_REQUESTED
- Location: e2e\student-revision-flow.spec.ts:7:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/workspace**" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - img "IBBUL logo" [ref=e6]
          - generic [ref=e7]: Project ULA
        - link "Verified artifacts" [ref=e16] [cursor=pointer]:
          - /url: /verified
    - main [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - img "IBBUL logo" [ref=e21]
          - heading "Verified proof-of-work for every student." [level=1] [ref=e22]: Verified proof-of-workfor every student.
        - generic [ref=e23]:
          - generic [ref=e24]:
            - heading "Enter workspace" [level=2] [ref=e25]
            - paragraph [ref=e26]: Sign in with your matric to open the IDE, deployments, and your portfolio.
            - generic [ref=e27]:
              - generic [ref=e28]:
                - generic [ref=e29]: Matric number
                - textbox "Matric number" [ref=e30]:
                  - /placeholder: U22/FNS/CSC/1105
                  - text: U22/FNS/CSC/1101
              - generic [ref=e31]:
                - generic [ref=e32]: Password
                - textbox "Password" [ref=e33]:
                  - /placeholder: Your password
                  - text: student123
              - alert [ref=e34]: Login failed
              - button "Enter workspace" [ref=e35]
            - generic [ref=e38]: Institution-grade · Matric-bound identity
          - generic [ref=e42]:
            - generic [ref=e43]:
              - generic [ref=e44]: Live
              - heading "Verified artifacts" [level=2] [ref=e56]
              - paragraph [ref=e57]: Lecturer-sealed proof-of-work — public, hashed, and deployable.
            - generic [ref=e58]:
              - generic: ULA
              - generic [ref=e59]: Loading artifacts…
            - generic [ref=e60]:
              - link "Open artifact registry" [ref=e61] [cursor=pointer]:
                - /url: /verified
              - paragraph [ref=e64]: Drag the preview card · tap names to switch
        - generic [ref=e66]:
          - generic [ref=e67]:
            - generic [ref=e76]:
              - heading "Recent network activity" [level=3] [ref=e77]
              - paragraph [ref=e78]: Loading live feed…
            - generic [ref=e79]:
              - button "Refresh activity" [ref=e80]
              - link "Registry" [ref=e86] [cursor=pointer]:
                - /url: /verified
          - paragraph [ref=e91]: No recent activity.
    - contentinfo [ref=e92]: Verified Proof-of-Work Portfolio Engine
  - alert [ref=e93]
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
> 19 |     await page.waitForURL("**/workspace**", { timeout: 30_000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
  20 | 
  21 |     await expect(page.getByText(/resume editing|changes requested/i).first()).toBeVisible({
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