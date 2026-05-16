const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const docxPath = path.join('D:/projects/roundtable-braintrust', '测试数据', '卫浴镜设计和工艺标准(2).docx');

  try {
    await page.goto('http://127.0.0.1:4175/prototype-ui/', { waitUntil: 'networkidle', timeout: 30000 });
    const mammothReady = await page.evaluate(() => !!window.mammoth?.extractRawText);
    console.log('mammothReady=', mammothReady);

    await page.click('#open-knowledge-base');
    await page.waitForSelector('#knowledge-base-modal', { state: 'visible', timeout: 10000 });
    await page.click('#knowledge-scope-global');
    await page.selectOption('#knowledge-upload-category', 'reference');
    await page.locator('#knowledge-upload-input').setInputFiles(docxPath);
    await page.waitForTimeout(3500);

    const status = await page.locator('#shared-agent-status').textContent().catch(() => '');
    const count = await page.locator('#knowledge-list .knowledge-list-item').count();
    const texts = await page.locator('#knowledge-list .knowledge-list-item').allTextContents();

    console.log('status=', status);
    console.log('count=', count);
    console.log('titles=', JSON.stringify(texts, null, 2));

    await page.fill('#knowledge-search', '卫浴');
    await page.waitForTimeout(800);
    const filteredCount = await page.locator('#knowledge-list .knowledge-list-item').count();
    const filteredTexts = await page.locator('#knowledge-list .knowledge-list-item').allTextContents();
    console.log('filteredCount=', filteredCount);
    console.log('filteredTitles=', JSON.stringify(filteredTexts, null, 2));
  } catch (error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
