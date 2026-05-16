import { test, expect } from '@playwright/test';

test('minimal check against prototype-ui', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  await page.goto('http://127.0.0.1:4173/prototype-ui/');

  // Check #knowledge-upload-trigger with force click to avoid interception
  const uploadTrigger = page.locator('#knowledge-upload-trigger');
  if (await uploadTrigger.isVisible()) {
      try {
          const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null),
            uploadTrigger.click({ force: true }),
          ]);
          console.log('Knowledge upload trigger clicked. File chooser opened:', !!fileChooser);
      } catch (e) {
          console.log('Failed to click knowledge-upload-trigger:', e.message);
      }
  } else {
      console.log('#knowledge-upload-trigger not found.');
  }

  // Check #app-theme-toggle
  const themeToggle = page.locator('#app-theme-toggle');
  if (await themeToggle.isVisible()) {
      try {
          const initialText = await themeToggle.innerText();
          const initialBodyClass = await page.evaluate(() => document.body.className);
          await themeToggle.click({ force: true });
          const newText = await themeToggle.innerText();
          const newBodyClass = await page.evaluate(() => document.body.className);
          console.log('Theme toggle clicked.');
          console.log('Text changed:', initialText !== newText, '| Initial:', initialText, '| New:', newText);
          console.log('Body class changed:', initialBodyClass !== newBodyClass, '| Initial:', initialBodyClass, '| New:', newBodyClass);
      } catch (e) {
          console.log('Failed to click app-theme-toggle:', e.message);
      }
  } else {
      console.log('#app-theme-toggle not found.');
  }

  if (consoleErrors.length > 0) console.log('Console Errors:', consoleErrors);
  if (pageErrors.length > 0) console.log('Page Errors:', pageErrors);
});
