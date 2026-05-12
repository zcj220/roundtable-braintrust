const { test, expect } = require('@playwright/test');

test.use({
  launchOptions: {
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  },
});

test.setTimeout(240000);

test('verified multimodal models only appear in multimodal select', async ({ page }) => {
  await page.goto('http://127.0.0.1:4176/prototype-ui/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#open-settings-drawer');

  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('roundtable-braintrust');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.click('#open-settings-drawer');
  await page.waitForSelector('#open-model-profile-modal');

  await page.click('#open-model-profile-modal');
  await page.selectOption('#provider-template-select', 'profile-volcengine');
  await page.fill('#profile-display-name', '火山多模态测试');
  await page.fill('#profile-provider-name', 'Volcengine Ark');
  await page.fill('#profile-model-id', 'doubao-seed-1-8-251228');
  await page.fill('#profile-api-key', process.env.ROUNDTRIP_VOLC_API_KEY || '');
  await page.click('#save-model-profile');
  await page.click('#close-model-profile-modal');

  await page.locator('[data-action="test-profile"]').first().click();
  await expect(page.locator('#multimodal-model-select')).toBeEnabled({ timeout: 120000 });
  await expect(page.locator('#multimodal-model-select')).toContainText('火山多模态测试');
  await expect(page.locator('#connected-model-list')).toContainText('多模态已验');
});
