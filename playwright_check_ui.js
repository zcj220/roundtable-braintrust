const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const url = 'http://127.0.0.1:4173/prototype-ui/';
  
  try {
    console.log('Navigating to ' + url);
    await page.goto(url, { waitUntil: 'networkidle' });

    async function getPanelStyles(label) {
      const styles = await page.evaluate(() => {
        const center = document.querySelector('.center-stage.panel');
        const sidebar = document.querySelector('.sidebar-left.panel');
        return {
          center: {
            bgImage: center ? getComputedStyle(center).backgroundImage : 'not found',
            bgColor: center ? getComputedStyle(center).backgroundColor : 'not found'
          },
          sidebar: {
            bgImage: sidebar ? getComputedStyle(sidebar).backgroundImage : 'not found',
            bgColor: sidebar ? getComputedStyle(sidebar).backgroundColor : 'not found'
          }
        };
      });
      console.log(label + ' Styles:', JSON.stringify(styles, null, 2));
      return styles;
    }

    console.log('--- Initial State ---');
    await getPanelStyles('Initial');

    console.log('Toggling theme...');
    await page.click('#app-theme-toggle');
    await page.waitForTimeout(500);
    await getPanelStyles('After Theme Toggle');

    async function getTexts() {
      const selectors = {
        title: '#discussion-settings-title',
        topic: '#current-topic-label',
        people: '#open-people-library',
        workbench: '#open-roundtable-workbench',
        topicList: '#topic-list-title'
      };
      const results = {};
      for (const [key, selector] of Object.entries(selectors)) {
        results[key] = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el ? el.textContent.trim() : 'not found';
        }, selector);
      }
      return results;
    }

    console.log('--- Language Check ---');
    const textsBefore = await getTexts();
    console.log('Texts before language toggle:', JSON.stringify(textsBefore, null, 2));

    console.log('Toggling language...');
    await page.click('#app-language-toggle');
    await page.waitForTimeout(500);

    const textsAfter = await getTexts();
    console.log('Texts after language toggle:', JSON.stringify(textsAfter, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
