const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const appUrl = process.env.ROUNDTRIP_APP_URL || 'http://127.0.0.1:4176/prototype-ui/index.html';
const browserPath = process.env.ROUNDTRIP_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const apiKey = process.env.ROUNDTRIP_API_KEY || '';
const baseUrl = process.env.ROUNDTRIP_BASE_URL || 'https://api.siliconflow.cn/v1';
const modelId = process.env.ROUNDTRIP_MODEL_ID || 'deepseek-ai/DeepSeek-V3.2';
const profileId = 'profile-siliconflow';

function modelSupportsVision(modelId) {
  return /(gpt-4o|gpt-4\.1|vision|vl|qvq|qwen2\.5-vl|internvl|minicpm-v|llava|claude-3|claude-sonnet-4|gemini)/i.test(String(modelId || ''));
}

test.use({
  launchOptions: {
    executablePath: browserPath,
  },
});

test.setTimeout(240000);

function createTempImage() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roundtable-online-'));
  const imagePath = path.join(tempDir, 'evidence.png');
  fs.writeFileSync(imagePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn2eKQAAAAASUVORK5CYII=', 'base64'));
  return { tempDir, imagePath };
}

async function seedConfiguredModel(page) {
  await page.evaluate(async ({ baseUrl, apiKey, modelId, profileId }) => {
    const request = indexedDB.open('roundtable-braintrust', 1);
    const db = await new Promise((resolve, reject) => {
      request.onupgradeneeded = () => {
        const nextDb = request.result;
        if (!nextDb.objectStoreNames.contains('peopleRoles')) {
          nextDb.createObjectStore('peopleRoles', { keyPath: 'id' });
        }
        if (!nextDb.objectStoreNames.contains('modelProfiles')) {
          nextDb.createObjectStore('modelProfiles', { keyPath: 'id' });
        }
        if (!nextDb.objectStoreNames.contains('appState')) {
          nextDb.createObjectStore('appState', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise((resolve, reject) => {
      const tx = db.transaction(['modelProfiles', 'appState'], 'readwrite');
      tx.objectStore('modelProfiles').put({
        id: profileId,
        displayName: '硅基流动',
        providerName: 'SiliconFlow',
        compatibility: 'openai',
        baseUrl,
        endpointPath: '/chat/completions',
        modelId,
        apiKey,
        configured: true,
        locked: true,
        lastTestStatus: 'success',
        lastTestLatencyMs: 1200,
      });
      tx.objectStore('appState').put({
        key: 'modelMappings',
        value: {
          main: profileId,
          challenger: profileId,
          judge: profileId,
        },
      });
      tx.objectStore('appState').put({ key: 'topicSessions', value: [] });
      tx.objectStore('appState').put({ key: 'activeTopicId', value: '' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  }, { baseUrl, apiKey, modelId, profileId });
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

test('online shared agents with configured siliconflow model', async ({ page }) => {
  if (!apiKey) {
    test.skip(true, 'ROUNDTRIP_API_KEY 未提供');
  }

  const { tempDir, imagePath } = createTempImage();
  try {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
    await seedConfiguredModel(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#shared-agent-status');

    await page.click('#new-topic');
    await page.waitForTimeout(500);

    await page.fill('#shared-agent-query', '围绕智能镜在卫浴场景中的产品设计，整理背景事实、真实约束、核心分歧与还不能下结论的点。');
    await page.click('#run-shared-research-agent');
    await expect(page.locator('#shared-agent-status')).toContainText('共享事实包已更新', { timeout: 120000 });
    await expect(page.locator('#discussion-stream')).toContainText('共享事实包', { timeout: 10000 });
    const firstSharedBrief = await page.locator('#project-memory-panel').innerText();
    expect(firstSharedBrief.length).toBeGreaterThan(20);

    await page.fill('#shared-agent-sources', 'https://www.hansgrohe.com');
    await page.click('#run-web-search-agent');
    await expect(page.locator('#shared-agent-status')).toContainText('网页搜索结果已并入共享事实包', { timeout: 120000 });
    await expect(page.locator('#discussion-stream')).toContainText('网页搜索与共享事实', { timeout: 10000 });

    const researchTopicId = await readAppState(page, 'activeTopicId');
    const researchTopicSessions = await readAppState(page, 'topicSessions');
    const researchTopic = (researchTopicSessions || []).find((topic) => topic.id === researchTopicId);
    expect(researchTopic?.snapshot?.sharedResearchBrief || '').not.toEqual('');

    await page.setInputFiles('#attachment-input', imagePath);
    await expect(page.locator('.attachment-pill')).toHaveCount(1);
    await page.fill('#user-input', '这是图片证据，请入库并结合图片做分析。');
    await page.click('#send-command');
    await expect(page.locator('#discussion-stream')).toContainText('整理后的任务定义', { timeout: 120000 });

    await page.click('#run-multimodal-agent');
    if (modelSupportsVision(modelId)) {
      await expect(page.locator('#shared-agent-status')).toContainText('图片解析已完成', { timeout: 120000 });
      await expect(page.locator('#discussion-stream')).toContainText('图片证据解析', { timeout: 10000 });
    } else {
      await expect(page.locator('#shared-agent-status')).toContainText('不支持图片解析', { timeout: 120000 });
    }

    const activeTopicId = await readAppState(page, 'activeTopicId');
    const topicSessions = await readAppState(page, 'topicSessions');
    const projectArtifacts = await readAppState(page, `projectArtifacts:${activeTopicId}`);
    const activeTopic = (topicSessions || []).find((topic) => topic.id === activeTopicId);

    expect(activeTopicId).toBeTruthy();
    expect(Array.isArray(projectArtifacts)).toBeTruthy();
    expect(projectArtifacts.length).toBeGreaterThanOrEqual(1);
    expect((activeTopic?.snapshot?.projectMemory?.agentNotes || []).length).toBeGreaterThanOrEqual(2);
    expect(pageErrors).toEqual([]);

    console.log('ONLINE_ACCEPTANCE:SHARED_RESEARCH=PASS');
    console.log('ONLINE_ACCEPTANCE:WEB_SEARCH=PASS');
    console.log(`ONLINE_ACCEPTANCE:MULTIMODAL=${modelSupportsVision(modelId) ? 'PASS' : 'UNSUPPORTED_MODEL'}`);
    console.log('ONLINE_ACCEPTANCE:PROJECT_PERSISTENCE=PASS');
    console.log('ONLINE_ACCEPTANCE:RUNTIME_ERRORS=NONE');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});