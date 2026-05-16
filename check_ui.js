const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    console.log('Navigating...');
    const response = await page.goto('http://127.0.0.1:4173/prototype-ui/', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Status:', response.status());
    
    await page.evaluate(() => document.body.classList.add('theme-light'));

    // Try to find any interactable elements that look like People/Roles
    const possiblePeople = page.locator('button, [role="button"], a').filter({ hasText: /People|Library/i });
    if (await possiblePeople.count() > 0) {
      await possiblePeople.first().click();
      await page.waitForTimeout(500);
    }
    
    const possibleRole = page.locator('button, [role="button"], a, .role-item').filter({ hasText: /Role|Edit/i });
    if (await possibleRole.count() > 0) {
      await possibleRole.first().click();
      await page.waitForTimeout(500);
    }

    const results = await page.evaluate(() => {
      const re = document.querySelector('.role-editor');
      const ai = document.querySelector('.role-ai-assist-block');
      const cc = document.querySelector('.compact-composer');
      const ds = document.querySelector('#discussion-stream');
      
      const getBG = (el) => el ? getComputedStyle(el).backgroundColor : 'not found';
      const getPos = (el) => {
        if (!el) return 'not found';
        const s = getComputedStyle(el);
        return s.position + ' (top: ' + s.top + ', bottom: ' + s.bottom + ')';
      };
      const getPad = (el) => el ? getComputedStyle(el).paddingBottom : 'not found';

      return {
        roleEditorBg: getBG(re),
        aiAssistBg: getBG(ai),
        composerPos: getPos(cc),
        streamPadding: getPad(ds)
      };
    });

    console.log('Results:', JSON.stringify(results, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
