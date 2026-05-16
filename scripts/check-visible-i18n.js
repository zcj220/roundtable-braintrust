const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  try {
    await page.goto('http://127.0.0.1:4173/prototype-ui/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.click('#app-language-toggle', { force: true });
    const selectors = [
      '#new-topic',
      '#topic-list-title',
      '#quick-access-title',
      '#open-people-library',
      '#open-roundtable-workbench',
      '#open-knowledge-base',
      '#discussion-settings-title',
      '#seat-config-title',
      '#open-seat-picker',
      '#toggle-topics',
    ];
    const result = {};
    for (const selector of selectors) {
      result[selector] = ((await page.textContent(selector).catch(() => '')) || '').trim();
    }
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})();
