const { test, expect } = require('@playwright/test');

const appUrl = process.env.ROUNDTRIP_APP_URL || 'http://127.0.0.1:4176/prototype-ui/index.html';
const browserPath = process.env.ROUNDTRIP_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

test.use({
  launchOptions: {
    executablePath: browserPath,
  },
});

test.setTimeout(120000);

async function seedConfiguredModel(page) {
  await page.evaluate(async () => {
    const request = indexedDB.open('roundtable-braintrust', 1);
    const db = await new Promise((resolve, reject) => {
      request.onupgradeneeded = () => {
        const nextDb = request.result;
        if (!nextDb.objectStoreNames.contains('peopleRoles')) {
          nextDb.createObjectStore('peopleRoles', { keyPath: 'id' });
        }
        if (!nextDb.objectStoreNames.contains('modelProfiles')) {
          nextDb.createObjectStore('modelProfiles', { keyPath: 'id' });
        }
        if (!nextDb.objectStoreNames.contains('appState')) {
          nextDb.createObjectStore('appState', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise((resolve, reject) => {
      const tx = db.transaction(['modelProfiles', 'appState'], 'readwrite');
      tx.objectStore('modelProfiles').put({
        id: 'profile-diagnostic',
        displayName: '诊断测试模型',
        providerName: 'Diagnostic',
        compatibility: 'openai',
        baseUrl: 'https://example.invalid/v1',
        endpointPath: '/chat/completions',
        modelId: 'diagnostic-model',
        apiKey: 'diagnostic-key',
        configured: true,
        locked: false,
        lastTestStatus: 'success',
        lastTestLatencyMs: 200,
      });
      tx.objectStore('appState').put({
        key: 'modelMappings',
        value: {
          main: 'profile-diagnostic',
          challenger: 'profile-diagnostic',
          judge: 'profile-diagnostic',
        },
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  });
}

async function openWorkbenchAndRunSearch(page, query) {
  await page.waitForSelector('#open-roundtable-workbench');
  await page.click('#new-topic');
  await page.waitForTimeout(300);
  await page.evaluate((nextQuery) => {
    document.getElementById('open-roundtable-workbench')?.click();
    const queryInput = document.getElementById('shared-agent-query');
    if (queryInput) {
      queryInput.value = nextQuery;
      queryInput.dispatchEvent(new Event('input', { bubbles: true }));
      queryInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    document.getElementById('run-web-search-agent')?.click();
  }, query);
}

test('web search diagnostics are shown when public sources fail', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.route('**/__roundtable_proxy?kind=duck**', async (route) => {
    await route.abort('timedout');
  });
  await page.route('**/__roundtable_proxy?kind=wiki**', async (route) => {
    await route.abort('timedout');
  });

  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await seedConfiguredModel(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openWorkbenchAndRunSearch(page, '测试网页搜索诊断是否会显示失败来源');

  await expect(page.locator('#shared-agent-status')).toContainText('网页搜索未拿到可用结果', { timeout: 30000 });
  await expect(page.locator('#shared-agent-status')).toContainText('DuckDuckGo', { timeout: 30000 });
  await expect(page.locator('#shared-agent-status')).toContainText('Wikipedia', { timeout: 30000 });
  await expect(page.locator('#shared-agent-status')).toContainText('浏览器未能完成跨站请求', { timeout: 30000 });
  await expect(page.locator('#discussion-stream')).not.toContainText('网页搜索与共享事实');
  expect(pageErrors).toEqual([]);
});

test('web search stores evidence when proxy and model both respond', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.route('**/__roundtable_proxy?kind=duck**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        Heading: '智能镜',
        AbstractText: 'DuckDuckGo 返回的测试摘要。',
        AbstractURL: 'https://example.com/duck',
        RelatedTopics: [],
      }),
    });
  });
  await page.route('**/__roundtable_proxy?kind=wiki**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(['智能镜', ['卫浴智能镜'], ['Wikipedia 返回的测试摘要。'], ['https://example.com/wiki']]),
    });
  });
  await page.route('**/chat/completions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        choices: [
          {
            message: {
              content: '共享事实包：1. 智能镜在卫浴场景存在显示、照明与防雾需求。2. 当前测试链路已确认网页证据能够入库。',
            },
          },
        ],
      }),
    });
  });

  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await seedConfiguredModel(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openWorkbenchAndRunSearch(page, '测试网页搜索成功是否入库');

  await expect(page.locator('#shared-agent-status')).toContainText('网页搜索已入库', { timeout: 30000 });
  await expect(page.locator('#shared-agent-status')).toContainText('DuckDuckGo 1 条', { timeout: 30000 });
  await expect(page.locator('#shared-agent-status')).toContainText('Wikipedia 1 条', { timeout: 30000 });
  await expect(page.locator('#discussion-stream')).toContainText('网页搜索与共享事实', { timeout: 30000 });
  expect(pageErrors).toEqual([]);
});