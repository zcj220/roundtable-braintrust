const { chromium } = require('playwright');
const path = require('path');

const ROOT = 'D:/projects/roundtable-braintrust';
const FILES = [
  {
    path: path.join(ROOT, '测试数据', 'G00881.pdf'),
    search: 'G00881',
    titleExpect: 'G00881',
  },
  {
    path: path.join(ROOT, '测试数据', '卫浴镜设计和工艺标准(2).docx'),
    search: '卫浴镜设计',
    titleExpect: '卫浴镜设计和工艺标准',
  },
  {
    path: path.join(ROOT, '测试数据', '2023.11.02.WRA.23.THEB.6.6.New development mirrors Mirrotic order request.xlsx'),
    search: 'Mirrotic order request',
    titleExpect: 'Mirrotic order request',
  },
];

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];

  try {
    await page.goto('http://127.0.0.1:4175/prototype-ui/', { waitUntil: 'networkidle', timeout: 30000 });

    await page.click('#open-knowledge-base');
    await page.waitForSelector('#knowledge-base-modal', { state: 'visible', timeout: 10000 });
    await page.click('#knowledge-scope-global');
    await page.selectOption('#knowledge-upload-category', 'reference');

    await page.locator('#knowledge-upload-input').setInputFiles(FILES.map((item) => item.path));

    await page.waitForFunction(() => {
      const list = document.querySelectorAll('#knowledge-list .knowledge-list-item');
      return list.length >= 1;
    }, { timeout: 45000 });

    await wait(2500);

    for (const item of FILES) {
      await page.fill('#knowledge-search', item.search);
      await wait(700);
      const rows = page.locator('#knowledge-list .knowledge-list-item');
      const count = await rows.count();
      if (count < 1) {
        results.push({ file: path.basename(item.path), ok: false, reason: 'not found in filtered list' });
        continue;
      }

      const firstRow = rows.first();
      const rowText = (await firstRow.textContent() || '').trim();
      const matchedTitle = rowText.includes(item.titleExpect);
      await firstRow.click();
      await wait(500);
      const detailText = (await page.locator('#knowledge-detail').textContent() || '').trim();
      const hasDetail = detailText.length > 80;

      results.push({
        file: path.basename(item.path),
        ok: matchedTitle && hasDetail,
        matchedTitle,
        hasDetail,
        detailPreview: detailText.slice(0, 140).replace(/\s+/g, ' '),
      });
    }

    await page.fill('#knowledge-search', '');
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.click('#open-knowledge-base');
    await page.waitForSelector('#knowledge-base-modal', { state: 'visible', timeout: 10000 });
    await page.click('#knowledge-scope-global');
    await wait(1000);

    const persistedChecks = [];
    for (const item of FILES) {
      await page.fill('#knowledge-search', item.search);
      await wait(500);
      const rowText = ((await page.locator('#knowledge-list .knowledge-list-item').first().textContent().catch(() => '')) || '').trim();
      persistedChecks.push({
        file: path.basename(item.path),
        persisted: rowText.includes(item.titleExpect),
      });
    }

    console.log(JSON.stringify({ results, persistedChecks }, null, 2));
  } catch (error) {
    console.error('VERIFY_KNOWLEDGE_UPLOAD_ERROR');
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
