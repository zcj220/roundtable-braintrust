const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const appUrl = process.env.ROUNDTRIP_APP_URL || 'http://127.0.0.1:4176/prototype-ui/index.html';
const browserPath = process.env.ROUNDTRIP_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

test.use({
  launchOptions: {
    executablePath: browserPath,
  },
});

function createTempFixtures() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roundtable-acceptance-'));
  const textPath = path.join(tempDir, 'notes.txt');
  const imagePath = path.join(tempDir, 'evidence.png');

  fs.writeFileSync(textPath, '这是一份用于验收项目记忆与附件证据写入的测试文本。\n其中包含一条需要后续追问的说明。', 'utf8');
  fs.writeFileSync(imagePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn2eKQAAAAASUVORK5CYII=', 'base64'));
  return { tempDir, textPath, imagePath };
}

async function readAppState(page, key) {
  return page.evaluate(async ({ targetKey }) => {
    const request = indexedDB.open('roundtable-braintrust');
    const db = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const transaction = db.transaction('appState', 'readonly');
    const store = transaction.objectStore('appState');
    const value = await new Promise((resolve, reject) => {
      const getRequest = store.get(targetKey);
      getRequest.onsuccess = () => resolve(getRequest.result ? getRequest.result.value : undefined);
      getRequest.onerror = () => reject(getRequest.error);
    });

    db.close();
    return value;
  }, { targetKey: key });
}

test('memory agent acceptance', async ({ page }) => {
  const { tempDir, textPath, imagePath } = createTempFixtures();

  try {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#shared-agent-status');

    await expect(page.locator('#shared-agent-status')).toContainText('等待执行共享 Agent');
    await expect(page.locator('#user-memory-panel')).toContainText('上传 0 个附件');

    await page.click('#refresh-user-memory');
    await expect(page.locator('#shared-agent-status')).toContainText('已刷新用户记忆');

    await page.setInputFiles('#attachment-input', [textPath, imagePath]);
    await expect(page.locator('.attachment-pill')).toHaveCount(2);
    await expect(page.locator('#user-memory-panel')).toContainText('上传 2 个附件');

    await page.fill('#user-input', '验收当前项目记忆和附件证据是否落库');
    await page.click('#send-command');
    await expect(page.locator('body')).toContainText('主 AI 整理失败');

    await page.click('#refresh-project-memory');
    await expect(page.locator('#shared-agent-status')).toContainText('已刷新项目记忆');
    await expect(page.locator('#project-memory-panel')).toContainText(/notes.txt|evidence.png/);

    await page.click('#run-shared-research-agent');
    await expect(page.locator('#shared-agent-status')).toContainText('还没有可用的主持模型');

    await page.click('#run-web-search-agent');
    await expect(page.locator('#shared-agent-status')).toContainText('还没有可用的主持模型');

    await page.click('#run-multimodal-agent');
    await expect(page.locator('#shared-agent-status')).toContainText('还没有可用的多模态模型');

    const activeTopicId = await readAppState(page, 'activeTopicId');
    const userMemory = await readAppState(page, 'userMemory');
    const topicSessions = await readAppState(page, 'topicSessions');
    const projectArtifacts = await readAppState(page, `projectArtifacts:${activeTopicId}`);

    expect(activeTopicId).toBeTruthy();
    expect(Array.isArray(topicSessions)).toBeTruthy();
    expect(topicSessions.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(projectArtifacts)).toBeTruthy();
    expect(projectArtifacts).toHaveLength(2);
    expect(userMemory.usage.attachmentsUploaded).toBe(2);

    await page.click('#new-topic');
    await expect(page.locator('#project-memory-panel')).toContainText('当前项目还没有确认后的任务定义');

    const newTopicId = await readAppState(page, 'activeTopicId');
    const newTopicArtifacts = await readAppState(page, `projectArtifacts:${newTopicId}`);
    expect(newTopicArtifacts === undefined || Array.isArray(newTopicArtifacts)).toBeTruthy();
    expect((newTopicArtifacts || []).length).toBe(0);
    expect(pageErrors).toEqual([]);

    console.log('ACCEPTANCE:USER_MEMORY_REFRESH=PASS');
    console.log('ACCEPTANCE:ATTACHMENT_QUEUE=PASS');
    console.log('ACCEPTANCE:SEND_WITHOUT_MODEL=PASS');
    console.log('ACCEPTANCE:PROJECT_MEMORY_REFRESH=PASS');
    console.log('ACCEPTANCE:SHARED_RESEARCH_GUARD=PASS');
    console.log('ACCEPTANCE:WEB_SEARCH_GUARD=PASS');
    console.log('ACCEPTANCE:MULTIMODAL_GUARD=PASS');
    console.log('ACCEPTANCE:IDB_PERSISTENCE=PASS');
    console.log('ACCEPTANCE:NEW_TOPIC_RESET=PASS');
    console.log('ACCEPTANCE:RUNTIME_ERRORS=NONE');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});