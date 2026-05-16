import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('regression test', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/prototype-ui/');

  // 1. #app-theme-toggle
  const themeToggle = page.locator('#app-theme-toggle');
  const initialThemeText = (await themeToggle.innerText()).trim();
  const initialBodyClass = await page.evaluate(() => document.body.className);
  
  await themeToggle.click({ force: true });
  
  const finalThemeText = (await themeToggle.innerText()).trim();
  const finalBodyClass = await page.evaluate(() => document.body.className);
  
  const themePass = (initialBodyClass !== finalBodyClass) && (initialThemeText !== finalThemeText);
  console.log('THEME_TOGGLE: ' + (themePass ? 'PASS' : 'FAIL'));

  // 2. #app-language-toggle
  const langToggle = page.locator('#app-language-toggle');
  const initialBodyText = await page.innerText('body');
  
  await langToggle.click({ force: true });
  await page.waitForTimeout(1000);
  
  const finalBodyText = await page.innerText('body');
  const langPass = initialBodyText !== finalBodyText;
  console.log('LANGUAGE_TOGGLE: ' + (langPass ? 'PASS' : 'FAIL'));

  // 3. Knowledge Base Upload
  const kbTrigger = page.locator('#knowledge-upload-trigger');
  if (await kbTrigger.count() > 0) {
    await kbTrigger.click({ force: true });
  }

  const uploadInput = page.locator('#knowledge-upload-input');
  
  const pdfPath = 'test.pdf';
  const xlsxPath = 'test.xlsx';
  fs.writeFileSync(pdfPath, 'dummy pdf content');
  fs.writeFileSync(xlsxPath, 'dummy xlsx content');

  await uploadInput.setInputFiles([pdfPath, xlsxPath]);
  
  // Wait longer for items to appear in the list
  await page.waitForTimeout(3000);

  const noteStrip = page.locator('#knowledge-note-strip');
  const noteText = await noteStrip.innerText();
  const notePass = noteText.trim().length > 0;
  console.log('KNOWLEDGE_NOTE_STRIP: ' + (notePass ? 'PASS' : 'FAIL') + ' (Text: ' + noteText + ')');

  const kbList = page.locator('#knowledge-list');
  const kbListText = await kbList.innerText();
  const pdfVisible = kbListText.includes('test.pdf');
  const xlsxVisible = kbListText.includes('test.xlsx');
  const listPass = pdfVisible && xlsxVisible;
  console.log('KNOWLEDGE_LIST: ' + (listPass ? 'PASS' : 'FAIL') + ' (Content: ' + kbListText + ')');
  
  fs.unlinkSync(pdfPath);
  fs.unlinkSync(xlsxPath);
});
