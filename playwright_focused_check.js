const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/prototype-ui/');
    
    // Click theme toggle and verify body class
    await page.click('#app-theme-toggle');
    const bodyClass = await page.evaluate(() => document.body.className);
    const themeOk = bodyClass.includes('theme-light');
    console.log('Theme Light Check:', themeOk ? 'PASS' : 'FAIL', '(Class: ' + bodyClass + ')');

    // Open People Library and Role Editor
    await page.click('#open-people-library');
    await page.click('#open-role-editor');

    // Report computed styles
    const styles = await page.evaluate(() => {
      const getStyles = (sel, props) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const s = window.getComputedStyle(el);
        const res = {};
        props.forEach(p => res[p] = s[p]);
        return res;
      };

      return {
        roleEditor: getStyles('.role-editor', ['backgroundImage', 'borderTopColor']),
        aiAssist: getStyles('.role-ai-assist-block', ['backgroundImage', 'backgroundColor']),
        compactComposer: getStyles('.compact-composer', ['position']),
        discussionStream: getStyles('#discussion-stream', ['paddingBottom'])
      };
    });

    console.log('Computed Styles:', JSON.stringify(styles, null, 2));

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await browser.close();
  }
})();
