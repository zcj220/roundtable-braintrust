const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://127.0.0.1:4173/prototype-ui/');
    
    // Set theme-light on body
    await page.evaluate(() => {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark'); // Just in case
    });

    // Click #open-people-library then #open-role-editor
    await page.click('#open-people-library');
    await page.click('#open-role-editor');

    // Function to get computed styles
    const getStyles = async (selector, properties) => {
      return await page.evaluate(({selector, properties}) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const style = window.getComputedStyle(el);
        const result = {};
        properties.forEach(prop => result[prop] = style[prop]);
        return result;
      }, {selector, properties});
    };

    const roleEditorStyles = await getStyles('.role-editor', ['display', 'backgroundImage', 'borderTopColor']);
    const aiAssistStyles = await getStyles('.role-ai-assist-block', ['backgroundImage', 'backgroundColor']);
    const composerStyles = await getStyles('.compact-composer', ['position', 'bottom']);
    
    // Discussion stream paddingBottom at normal viewport
    const dsPaddingNormal = await page.evaluate(() => {
      const el = document.querySelector('#discussion-stream');
      return el ? window.getComputedStyle(el).paddingBottom : 'N/A';
    });

    // Resize to short viewport
    await page.setViewportSize({ width: 1280, height: 540 });
    const dsPaddingShort = await page.evaluate(() => {
      const el = document.querySelector('#discussion-stream');
      return el ? window.getComputedStyle(el).paddingBottom : 'N/A';
    });

    console.log(JSON.stringify({
      roleEditorStyles,
      aiAssistStyles,
      composerStyles,
      dsPaddingNormal,
      dsPaddingShort
    }, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();