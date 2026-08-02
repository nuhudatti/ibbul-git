import { expect, test } from "@playwright/test";

const STUDENT_MATRIC = process.env.E2E_STUDENT_MATRIC ?? "U22/FNS/CSC/1101";
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD ?? "student123";

test.describe("Student revision workflow", () => {
  test("Open Full Project restores editable IDE after CHANGES_REQUESTED", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      logs.push(text);
      console.log(`[browser] ${text}`);
    });

    await page.goto("/");
    await page.getByLabel(/matric number/i).fill(STUDENT_MATRIC);
    await page.getByLabel(/^password$/i).fill(STUDENT_PASSWORD);
    await page.getByRole("button", { name: /enter workspace/i }).click();
    await page.waitForURL("**/workspace**", { timeout: 30_000 });

    await expect(page.getByText(/resume editing|changes requested/i).first()).toBeVisible({
      timeout: 30_000,
    });

    const openProjectButton = page
      .getByRole("button", { name: /open full project|restore editable workspace/i })
      .first();
    await expect(openProjectButton).toBeVisible();
    await openProjectButton.click();

    await expect
      .poll(() => logs.some((line) => line.includes("BUTTON CLICKED")), { timeout: 15_000 })
      .toBe(true);
    await expect
      .poll(() => logs.some((line) => line.includes("RESTORE STARTED")), { timeout: 15_000 })
      .toBe(true);
    await expect
      .poll(() => logs.some((line) => line.includes("SNAPSHOT LOADED")), { timeout: 15_000 })
      .toBe(true);
    await expect
      .poll(() => logs.some((line) => line.includes("loadProject CALLED")), { timeout: 15_000 })
      .toBe(true);
    await expect
      .poll(() => logs.some((line) => line.includes("RESTORE COMPLETE")), { timeout: 15_000 })
      .toBe(true);

    await expect(page.getByText(/editable workspace/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".cm-content").first()).toBeVisible({ timeout: 15_000 });

    const editor = page.locator(".cm-content").first();
    await editor.click();
    await page.keyboard.type("\n<!-- e2e-revision-edit -->");

    await expect
      .poll(async () => {
        const text = await editor.innerText();
        return text.includes("e2e-revision-edit");
      })
      .toBe(true);

    const resubmit = page.getByRole("button", { name: /^resubmit$/i });
    if (await resubmit.isVisible()) {
      await resubmit.click();
      await expect
        .poll(() => logs.some((line) => line.includes("Revision request API succeeded")), {
          timeout: 30_000,
        })
        .toBe(true);
    }
  });
});
