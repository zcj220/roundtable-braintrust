const { chromium } = require('playwright');
(async () => {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        console.log('Navigating...');
        await page.goto('http://127.0.0.1:4173/prototype-ui/', { timeout: 15000 });

        console.log('--- Step 1: Language Toggle ---');
        await page.click('#app-language-toggle');
        const elements = ['#new-topic', '#topic-list-title', '#quick-access-title', '#seat-config-title', '#speaker-name', '#speaker-role', '#speaker-avatar'];
        for (const s of elements) {
            const txt = (await page.textContent(s) || '').trim();
            const hasZH = /[\u4e00-\u9fa5]/.test(txt);
            console.log(s + ': \"' + txt + '\" ' + (hasZH ? '[FAIL]' : '[OK]'));
        }

        console.log('--- Step 2: New Topic ---');
        await page.click('#new-topic');
        const title = (await page.textContent('#current-topic-title') || '').trim();
        console.log('#current-topic-title: \"' + title + '\" ' + (/[\u4e00-\u9fa5]/.test(title) ? '[FAIL]' : '[OK]'));

        console.log('--- Step 3-5: Persona Creation & Bilingual Check ---');
        await page.click('#open-people-library');
        await page.click('#open-role-editor');
        const inputs = await page.verify_prototype.js('input, textarea');
        if (inputs.length >= 8) {
            await inputs[0].fill('测试双语人物ZH');
            await inputs[1].fill('Bilingual Persona EN');
            await inputs[2].fill('这是中文说明');
            await inputs[3].fill('This is the English description.');
            await inputs[4].fill('请用中文视角发言');
            await inputs[5].fill('Speak from the English point of view.');
            await inputs[6].fill('自定义来源');
            await inputs[7].fill('Custom Source');
            const saveBtn = await page.button:has-text(\"Save\"), button:has-text(\"保存\"), #save-role;
            if (saveBtn) await saveBtn.click();
        }
        await page.waitForTimeout(1000);
        const bodyEN = await page.textContent('body');
        console.log('EN Library: ' + (bodyEN.includes('Bilingual Persona EN') ? '[OK]' : '[FAIL]'));
        
        await page.click('#app-language-toggle');
        await page.waitForTimeout(1000);
        const bodyZH = await page.textContent('body');
        console.log('ZH Library: ' + (bodyZH.includes('测试双语人物ZH') ? '[OK]' : '[FAIL]'));

    } catch (err) { console.log('ERROR: ' + err.message); }
    if (browser) await browser.close();
})();
