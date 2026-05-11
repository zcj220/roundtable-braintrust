const { test, expect } = require('@playwright/test');

test.use({
  launchOptions: {
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  },
});

test.setTimeout(120000);

test('left shortcuts and roundtable workbench render correctly', async ({ page }) => {
  await page.route('**/api/v3/chat/completions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mocked-chat',
        object: 'chat.completion',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'mock ok',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    });
  });

  await page.goto('http://127.0.0.1:4176/prototype-ui/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#open-people-library');

  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('roundtable-braintrust');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });

  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.locator('#open-people-library')).toContainText('打开人物库');
  await expect(page.locator('#open-roundtable-workbench')).toContainText('打开圆桌台');

  await page.click('#open-roundtable-workbench');
  await expect(page.locator('#roundtable-workbench-modal')).toHaveClass(/open/);
  await expect(page.locator('#roundtable-evidence-detail')).toContainText('选中一条证据后');
  await page.click('#close-roundtable-workbench');

  await page.click('#open-settings-drawer');
  await page.click('#open-model-profile-modal');
  await page.selectOption('#provider-template-select', 'profile-volcengine');
  await page.fill('#profile-display-name', '火山方舟');
  await page.fill('#profile-provider-name', 'Volcengine Ark');
  await page.fill('#profile-model-id', 'doubao-seed-1-8-251228');
  await page.fill('#profile-api-key', 'demo');
  await page.click('#save-model-profile');
  await page.click('#close-model-profile-modal');

  await page.locator('[data-action="test-profile"]').first().click();
  await expect(page.locator('#connected-model-list')).toContainText('火山方舟');
  await expect(page.locator('#connected-model-list')).toContainText('多模态');
  await expect(page.locator('#connected-model-list')).toContainText('延迟');
  await expect(page.locator('#connected-model-list')).not.toContainText('多模态已验');
  await expect(page.locator('#connected-model-list')).not.toContainText('多模态延迟');
});