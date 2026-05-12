import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const appUrl = process.env.ROUNDTRIP_APP_URL || 'http://127.0.0.1:4176/prototype-ui/index.html';
const browserPath = process.env.ROUNDTRIP_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function printResult(label, value) {
  console.log(`${label}:${value}`);
}

function createTempFixtures() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roundtable-acceptance-'));
  const textPath = path.join(tempDir, 'notes.txt');
  const imagePath = path.join(tempDir, 'evidence.png');

  fs.writeFileSync(textPath, '这是一份用于验收项目记忆与附件证据写入的测试文本。\n其中包含一条需要后续追问的说明。', 'utf8');
  fs.writeFileSync(imagePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn2eKQAAAAASUVORK5CYII=', 'base64'));
  return { tempDir, textPath, imagePath };
}

async function readAppState(page, key) {
  return page.evaluate(async ({ key }) => {
    const request = indexedDB.open('roundtable-braintrust');
    const db = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const transaction = db.transaction('appState', 'readonly');
    const store = transaction.objectStore('appState');
    const value = await new Promise((resolve, reject) => {
      const getRequest = store.get(key);
      getRequest.onsuccess = () => resolve(getRequest.result ? getRequest.result.value : undefined);
      getRequest.onerror = () => reject(getRequest.error);
    });
    db.close();
    return value;
  }, { key });
}

async function run() {
  const { textPath, imagePath, tempDir } = createTempFixtures();
  const browser = await chromium.launch({
    headless: true,
    executablePath: browserPath,
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#shared-agent-status');

    const initialStatus = await page.locator('#shared-agent-status').textContent();
    const initialUserMemory = await page.locator('#user-memory-panel').innerText();
    assert(initialStatus?.includes('等待执行共享 Agent'), '初始 Agent 状态未正确渲染');
    assert(initialUserMemory?.includes('上传 0 个附件'), '初始用户记忆未正确渲染');

    await page.click('#refresh-user-memory');
    await page.waitForFunction(() => document.querySelector('#shared-agent-status')?.textContent?.includes('已刷新用户记忆'));
    printResult('USER_MEMORY_REFRESH', 'PASS');

    await page.setInputFiles('#attachment-input', [textPath, imagePath]);
    await page.waitForFunction(() => document.querySelectorAll('.attachment-pill').length === 2);
    await page.waitForFunction(() => document.querySelector('#user-memory-panel')?.textContent?.includes('上传 2 个附件'));
    printResult('ATTACHMENT_QUEUE', 'PASS');

    await page.fill('#user-input', '验收当前项目记忆和附件证据是否落库');
    await page.click('#send-command');
    await page.waitForFunction(() => document.body.textContent.includes('主 AI 整理失败'));
    printResult('SEND_WITHOUT_MODEL', 'PASS');

    await page.click('#refresh-project-memory');
    await page.waitForFunction(() => document.querySelector('#shared-agent-status')?.textContent?.includes('已刷新项目记忆'));
    const projectMemoryText = await page.locator('#project-memory-panel').innerText();
    assert(projectMemoryText.includes('notes.txt') || projectMemoryText.includes('evidence.png'), '项目记忆面板未显示附件证据');
    printResult('PROJECT_MEMORY_REFRESH', 'PASS');

    await page.click('#run-shared-research-agent');
    await page.waitForFunction(() => document.querySelector('#shared-agent-status')?.textContent?.includes('还没有可用的主持模型'));
    printResult('SHARED_RESEARCH_GUARD', 'PASS');

    await page.click('#run-web-search-agent');
    await page.waitForFunction(() => document.querySelector('#shared-agent-status')?.textContent?.includes('还没有可用的主持模型'));
    printResult('WEB_SEARCH_GUARD', 'PASS');

    await page.click('#run-multimodal-agent');
    await page.waitForFunction(() => document.querySelector('#shared-agent-status')?.textContent?.includes('还没有可用的主持模型'));
    printResult('MULTIMODAL_GUARD', 'PASS');

    const activeTopicId = await readAppState(page, 'activeTopicId');
    const userMemory = await readAppState(page, 'userMemory');
    const topicSessions = await readAppState(page, 'topicSessions');
    const projectArtifacts = await readAppState(page, `projectArtifacts:${activeTopicId}`);

    assert(activeTopicId, '未持久化活动话题 ID');
    assert(Array.isArray(topicSessions) && topicSessions.length >= 1, '未持久化话题列表');
    assert(Array.isArray(projectArtifacts) && projectArtifacts.length === 2, '附件未写入项目证据存储');
    assert(userMemory?.usage?.attachmentsUploaded === 2, '用户记忆中的附件计数未更新');
    printResult('IDB_PERSISTENCE', 'PASS');

    await page.click('#new-topic');
    await page.waitForFunction(() => document.querySelector('#project-memory-panel')?.textContent?.includes('当前项目还没有确认后的任务定义'));
    const afterNewTopicArtifacts = await page.evaluate(async () => {
      const request = indexedDB.open('roundtable-braintrust');
      const db = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const transaction = db.transaction('appState', 'readonly');
      const store = transaction.objectStore('appState');
      const activeTopicId = await new Promise((resolve, reject) => {
        const getRequest = store.get('activeTopicId');
        getRequest.onsuccess = () => resolve(getRequest.result?.value || '');
        getRequest.onerror = () => reject(getRequest.error);
      });
      const artifacts = await new Promise((resolve, reject) => {
        const getRequest = store.get(`projectArtifacts:${activeTopicId}`);
        getRequest.onsuccess = () => resolve(getRequest.result?.value || []);
        getRequest.onerror = () => reject(getRequest.error);
      });
      db.close();
      return artifacts;
    });
    assert(Array.isArray(afterNewTopicArtifacts) && afterNewTopicArtifacts.length === 0, '新建话题后项目证据未重置');
    printResult('NEW_TOPIC_RESET', 'PASS');

    assert(pageErrors.length === 0, `页面运行时错误: ${pageErrors.join(' | ')}`);
    printResult('RUNTIME_ERRORS', 'NONE');

    fs.rmSync(tempDir, { recursive: true, force: true });
    await context.close();
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(`VALIDATION_FAILED:${error.message}`);
  process.exitCode = 1;
});