const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const url = 'http://127.0.0.1:4173/prototype-ui/';
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.click('#app-language-toggle'); // Should be in English now
    await page.waitForTimeout(500);
    const text = await page.evaluate(() => document.querySelector('#topic-list-title')?.textContent.trim());
    console.log('Topic List Title in English:', text);
  } finally {
    await browser.close();
  }
})();
