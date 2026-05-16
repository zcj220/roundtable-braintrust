import { test, expect } from "@playwright/test";

test("instrumentation flow", async ({ page }) => {
  const counts = {
    knowledgeUploadTriggerClicked: 0,
    knowledgeUploadInputClickInvoked: 0,
    knowledgeUploadInputChangeFired: 0,
    appLanguageToggleClicked: 0,
    appThemeToggleClicked: 0,
  };

  await page.goto("http://127.0.0.1:4173/prototype-ui/");

  // Add listeners via evaluate to avoid timing issues with DOMContentLoaded
  await page.evaluate(() => {
    const input = document.querySelector("#knowledge-upload-input");
    if (input) {
      input.addEventListener("click", () => {
        (window as any)._inputClickInvoked = ((window as any)._inputClickInvoked || 0) + 1;
      });
      input.addEventListener("change", () => {
        (window as any)._inputChangeFired = ((window as any)._inputChangeFired || 0) + 1;
      });
    }
  });

  const bodyInitialClass = await page.evaluate(() => document.body.className);
  const bodyInitialText = await page.evaluate(() => document.body.innerText.substring(0, 100));

  // 1. Click #knowledge-upload-trigger (using force because of spotlight overlay)
  const trigger = page.locator("#knowledge-upload-trigger");
  if (await trigger.count() > 0) {
    await trigger.click({ force: true });
    counts.knowledgeUploadTriggerClicked++;
  }

  // 2. Check #knowledge-upload-input events
  counts.knowledgeUploadInputClickInvoked = await page.evaluate(() => (window as any)._inputClickInvoked || 0);

  // Simulate change on input
  const input = page.locator("#knowledge-upload-input");
  if (await input.count() > 0) {
     await input.setInputFiles({
        name: "test.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("hello"),
     });
  }
  counts.knowledgeUploadInputChangeFired = await page.evaluate(() => (window as any)._inputChangeFired || 0);

  // 3. App Language Toggle
  const langToggle = page.locator("#app-language-toggle");
  if (await langToggle.count() > 0) {
    await langToggle.click({ force: true });
    counts.appLanguageToggleClicked++;
  }

  // 4. App Theme Toggle
  const themeToggle = page.locator("#app-theme-toggle");
  if (await themeToggle.count() > 0) {
    await themeToggle.click({ force: true });
    counts.appThemeToggleClicked++;
  }

  const bodyFinalClass = await page.evaluate(() => document.body.className);
  const bodyFinalText = await page.evaluate(() => document.body.innerText.substring(0, 100));

  console.log("COUNTS:" + JSON.stringify(counts));
  console.log("INITIAL_CLASS:" + bodyInitialClass);
  console.log("FINAL_CLASS:" + bodyFinalClass);
  console.log("INITIAL_TEXT_START:" + bodyInitialText);
  console.log("FINAL_TEXT_START:" + bodyFinalText);
});
