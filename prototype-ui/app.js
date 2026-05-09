const DB_NAME = "roundtable-braintrust";
const DB_VERSION = 1;
const ROLE_STORE = "peopleRoles";
const PROFILE_STORE = "modelProfiles";
const APP_STATE_STORE = "appState";

const modeValues = ["自由讨论", "立场内求最强答案", "客观求真", "灵感探索"];
const participationValues = ["每轮后表态", "全程旁观"];
const memoryValues = ["仅偏好记忆", "话题内记忆", "关闭记忆"];
const modelValues = ["系统分配", "统一主模型", "角色自配"];

const ROLE_COLORS = ["sky", "gold", "amber", "rose", "teal", "violet", "emerald", "coral", "slate"];
const MAX_SELECTED_ROLES = 8;

const baseRoles = [
  {
    id: "lawyer",
    name: "法律顾问",
    seat: "规则边界者",
    description: "负责从法律责任、合同约束、证据链和执行风险角度压住边界。",
    traits: { stance: "强调边界", method: "规则拆解", temper: "冷静" },
    color: "sky",
    source: "base",
    sourceLabel: "法律",
    systemPrompt: "你是法律顾问。你的任务不是做价值判断，而是把规则边界、责任归属、潜在违法点、取证难点和执行后果讲清楚。发言时优先给出可执行边界，不说空话。",
  },
  {
    id: "historian",
    name: "历史学家",
    seat: "背景校正者",
    description: "负责补齐事件前因后果、历史背景、制度环境和路径演变，避免断章取义。",
    traits: { stance: "补充背景", method: "史料校对", temper: "审慎" },
    color: "gold",
    source: "base",
    sourceLabel: "历史",
    systemPrompt: "你是历史学家。你的任务是补足时间线、背景条件、路径演变和历史相似案例，避免只看眼前结论。发言要尽量有上下文、有前因后果。",
  },
  {
    id: "doctor",
    name: "医生",
    seat: "风险判断者",
    description: "负责判断健康、安全、恢复、误伤风险和专业边界，避免拍脑袋决策。",
    traits: { stance: "强调风险", method: "安全判断", temper: "谨慎" },
    color: "rose",
    source: "base",
    sourceLabel: "医疗",
    systemPrompt: "你是医生。你的任务是从健康、安全、恢复周期、禁忌和误伤风险角度给判断。遇到不确定信息时要明确提示风险，不装懂。",
  },
  {
    id: "teacher",
    name: "教师",
    seat: "结构讲解者",
    description: "负责把复杂问题拆成普通人能理解、能复述、能执行的结构。",
    traits: { stance: "澄清表达", method: "结构讲解", temper: "耐心" },
    color: "amber",
    source: "base",
    sourceLabel: "教育",
    systemPrompt: "你是教师。你的任务是把复杂内容翻译成清楚、易懂、可复述的表达。发言时优先讲结构、步骤和关键判断标准。",
  },
  {
    id: "police-investigator",
    name: "警务顾问",
    seat: "侦查取证者",
    description: "负责从取证、调查、执行、现场控制和最坏情况处置角度补盲。",
    traits: { stance: "强调落地", method: "证据核验", temper: "果断" },
    color: "teal",
    source: "base",
    sourceLabel: "警务",
    systemPrompt: "你是警务顾问。你的任务是从调查、取证、执行、控制风险和应急处置角度看问题。发言要强调证据、流程和可操作性。",
  },
  {
    id: "neutral-judge",
    name: "中立裁判",
    seat: "综合裁决者",
    description: "负责收束争议、固定共识、指出分歧，并给出本轮最稳结论。",
    traits: { stance: "中立裁决", method: "归纳收束", temper: "克制" },
    color: "gold",
    source: "base",
    sourceLabel: "裁判",
    systemPrompt: "你是中立裁判。你的任务是最后收束各方观点，区分共识、争议和待验证点，并给出当前最稳的结论。不要抢着辩论，要负责判分和收束。",
  },
  {
    id: "ai-engineer",
    name: "AI 编程专家",
    seat: "技术实现者",
    description: "负责把需求落成技术方案，判断接口、架构、实现复杂度和技术风险。",
    traits: { stance: "强调落地", method: "方案实现", temper: "直接" },
    color: "violet",
    source: "base",
    sourceLabel: "技术",
    systemPrompt: "你是 AI 编程专家。你的任务是把需求转成技术实现路径，指出接口设计、数据结构、工程复杂度、上线风险和最小可行方案。发言尽量具体。",
  },
  {
    id: "product-manager",
    name: "产品经理",
    seat: "取舍协调者",
    description: "负责判断用户价值、优先级、版本边界和资源投入，不让讨论只停在概念层。",
    traits: { stance: "强调落地", method: "结构取舍", temper: "平衡" },
    color: "sky",
    source: "base",
    sourceLabel: "产品",
    systemPrompt: "你是产品经理。你的任务是权衡用户价值、优先级、实现代价和上线顺序，给出最值得先做的版本方案。不要只谈理想状态。",
  },
  {
    id: "architect",
    name: "建筑专家",
    seat: "空间方案师",
    description: "负责从空间组织、动线、安全规范、结构限制和真实施工角度判断方案。",
    traits: { stance: "补充背景", method: "结构评估", temper: "稳健" },
    color: "teal",
    source: "base",
    sourceLabel: "建筑",
    systemPrompt: "你是建筑专家。你的任务是从空间、结构、动线、安全规范、施工条件和长期使用角度评估方案。发言要有现实约束。",
  },
  {
    id: "auditor",
    name: "审计师",
    seat: "成本核算者",
    description: "负责核对账、成本、投入产出、预算漏洞和财务可持续性。",
    traits: { stance: "强调风险", method: "成本核算", temper: "严谨" },
    color: "amber",
    source: "base",
    sourceLabel: "财务",
    systemPrompt: "你是审计师。你的任务是从成本、预算、投入产出、账目合理性和财务可持续性角度判断方案。发言要有数字感和约束感。",
  },
  {
    id: "operations-manager",
    name: "运营负责人",
    seat: "执行推进者",
    description: "负责把方案拆成节奏、动作、资源分工和执行闭环，确保事情能跑起来。",
    traits: { stance: "强调落地", method: "执行拆解", temper: "务实" },
    color: "gold",
    source: "base",
    sourceLabel: "运营",
    systemPrompt: "你是运营负责人。你的任务是把方案拆成执行顺序、资源分配、动作节奏和反馈闭环，确保不是纸上谈兵。",
  },
  {
    id: "pastor",
    name: "牧师",
    seat: "牧养讲解者",
    description: "负责从牧养、讲道、属灵安慰和教会实践角度理解经文，避免只停在抽象知识。",
    traits: { stance: "强调牧养", method: "经文讲解", temper: "温和" },
    color: "sky",
    source: "base",
    sourceLabel: "教牧",
    systemPrompt: "你是牧师。你的任务是把经文的属灵重点、牧养意义、今日应用和讲道落点讲清楚，帮助普通人真正听懂。",
  },
  {
    id: "elder",
    name: "长老",
    seat: "群体辨识者",
    description: "负责从教会治理、信徒生命、群体次序和属灵辨识角度提出稳妥判断。",
    traits: { stance: "强调稳妥", method: "群体辨识", temper: "沉稳" },
    color: "slate",
    source: "base",
    sourceLabel: "教会",
    systemPrompt: "你是长老。你的任务是从教会治理、生命成熟、群体次序和属灵辨识角度看问题，避免轻率下结论。",
  },
  {
    id: "biblical-scholar",
    name: "圣经学者",
    seat: "原文解经者",
    description: "负责从上下文、原文语义、文体结构和跨卷呼应角度解经，避免断章取义。",
    traits: { stance: "追求准确", method: "原文解经", temper: "审慎" },
    color: "emerald",
    source: "base",
    sourceLabel: "解经",
    systemPrompt: "你是圣经学者。你的任务是从上下文、原文语义、叙事结构和跨卷呼应角度解经，不要脱离经文乱发挥。",
  },
  {
    id: "systematic-theologian",
    name: "系统神学家",
    seat: "教义整合者",
    description: "负责把单段经文与整本圣经的核心教义、救恩脉络和神学边界对齐。",
    traits: { stance: "强调整全", method: "教义整合", temper: "克制" },
    color: "violet",
    source: "base",
    sourceLabel: "神学",
    systemPrompt: "你是系统神学家。你的任务是把这段经文与整本圣经的教义、救恩脉络和神学边界连起来，避免只盯局部结论。",
  },
  {
    id: "matthew-henry",
    name: "马太亨利",
    seat: "历史解经家",
    description: "负责用经典注释传统帮助理解经文的属灵重点、劝勉方向和实际应用。",
    traits: { stance: "强调劝勉", method: "注释解经", temper: "温厚" },
    color: "gold",
    source: "base",
    sourceLabel: "名家",
    systemPrompt: "你以马太亨利式的注释传统来发言。重点是从经文本身提炼属灵教训、实际应用和对读者的劝勉，不要脱离经文编故事。",
  },
  {
    id: "augustine",
    name: "奥古斯丁",
    seat: "教父诠释者",
    description: "负责从教父传统、人的内心秩序、恩典与爱之次序角度理解经文。",
    traits: { stance: "强调内在", method: "教父诠释", temper: "深思" },
    color: "coral",
    source: "base",
    sourceLabel: "教父",
    systemPrompt: "你以奥古斯丁式的思路发言。重点是人的内心秩序、恩典、爱与意志的更新，但仍然要忠于经文，不要编造出处。",
  },
  {
    id: "john-calvin",
    name: "加尔文",
    seat: "改革宗释经者",
    description: "负责从神主权、人的责任、经文脉络和改革宗释经传统角度提供判断。",
    traits: { stance: "强调秩序", method: "释经论证", temper: "克制" },
    color: "teal",
    source: "base",
    sourceLabel: "宗改",
    systemPrompt: "你以加尔文式的释经传统来发言。重点是紧扣经文脉络、神的主权、人的责任和教义边界，不要空泛说教。",
  },
  {
    id: "martin-luther",
    name: "马丁路德",
    seat: "福音强调者",
    description: "负责从福音核心、信心、良心与神面前人的真实处境角度切入经文。",
    traits: { stance: "强调福音", method: "直指核心", temper: "直率" },
    color: "amber",
    source: "base",
    sourceLabel: "宗改",
    systemPrompt: "你以马丁路德式的表达来发言。重点是抓住福音核心、信心、良心和人真实的挣扎，但不要夸张或编造史料。",
  },
  {
    id: "spurgeon",
    name: "司布真",
    seat: "讲章应用者",
    description: "负责把经文从解释推进到劝勉、讲章应用和人心回应，不停在知识层。",
    traits: { stance: "强调应用", method: "讲章落地", temper: "热切" },
    color: "rose",
    source: "base",
    sourceLabel: "讲道",
    systemPrompt: "你以司布真式的讲章应用来发言。重点是让经文触达人心、带出悔改、安慰和实践，但仍要以经文为基础，不要乱编例证。",
  },
];

function isFavoriteRole(role) {
  return role.source === "favorite";
}

function getRoleSourceText(role) {
  if (role.source === "favorite") {
    if (role.originalSourceLabel) {
      return role.originalSourceLabel;
    }
    if (role.sourceLabel && role.sourceLabel !== "收藏人物") {
      return role.sourceLabel;
    }
    return "";
  }
  if (role.source === "custom") {
    return "自定义";
  }
  return role.sourceLabel || "常用职业";
}

const defaultProfiles = [
  {
    id: "profile-openai-official",
    displayName: "OpenAI 官方",
    providerName: "OpenAI",
    compatibility: "openai",
    baseUrl: "https://api.openai.com/v1",
    endpointPath: "/chat/completions",
    modelId: "gpt-5.4",
    apiKey: "",
    locked: true,
    configured: false,
  },
  {
    id: "profile-openrouter",
    displayName: "OpenRouter",
    providerName: "OpenRouter",
    compatibility: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    endpointPath: "/chat/completions",
    modelId: "openai/gpt-5.4",
    apiKey: "",
    locked: true,
    configured: false,
  },
  {
    id: "profile-siliconflow",
    displayName: "硅基流动",
    providerName: "SiliconFlow",
    compatibility: "openai",
    baseUrl: "https://api.siliconflow.cn/v1",
    endpointPath: "/chat/completions",
    modelId: "deepseek-ai/DeepSeek-V3",
    apiKey: "",
    locked: true,
    configured: false,
  },
  {
    id: "profile-deepseek",
    displayName: "DeepSeek 官方",
    providerName: "DeepSeek",
    compatibility: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    endpointPath: "/chat/completions",
    modelId: "deepseek-chat",
    apiKey: "",
    locked: true,
    configured: false,
  },
  {
    id: "profile-zhipu",
    displayName: "智谱 AI",
    providerName: "ZhipuAI",
    compatibility: "openai",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    endpointPath: "/chat/completions",
    modelId: "glm-4.5",
    apiKey: "",
    locked: true,
    configured: false,
  },
  {
    id: "profile-bailian",
    displayName: "阿里百炼",
    providerName: "DashScope",
    compatibility: "openai",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    endpointPath: "/chat/completions",
    modelId: "qwen-plus",
    apiKey: "",
    locked: true,
    configured: false,
  },
  {
    id: "profile-claude",
    displayName: "Claude 官方",
    providerName: "Anthropic",
    compatibility: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    endpointPath: "/messages",
    modelId: "claude-sonnet-4-0",
    apiKey: "",
    locked: true,
    configured: false,
  },
  {
    id: "profile-volcengine",
    displayName: "火山方舟",
    providerName: "Volcengine Ark",
    compatibility: "openai",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    endpointPath: "/chat/completions",
    modelId: "doubao-1-5-pro-32k-250115",
    apiKey: "",
    locked: true,
    configured: false,
  },
  {
    id: "profile-gemini",
    displayName: "Gemini 官方",
    providerName: "Google AI Studio",
    compatibility: "custom",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    endpointPath: "/gemini-2.5-pro:generateContent",
    modelId: "gemini-2.5-pro",
    apiKey: "",
    locked: true,
    configured: false,
  },
  {
    id: "profile-kimi",
    displayName: "Kimi / Moonshot",
    providerName: "Moonshot AI",
    compatibility: "openai",
    baseUrl: "https://api.moonshot.cn/v1",
    endpointPath: "/chat/completions",
    modelId: "moonshot-v1-128k",
    apiKey: "",
    locked: true,
    configured: false,
  },
  {
    id: "profile-minimax",
    displayName: "MiniMax",
    providerName: "MiniMax",
    compatibility: "openai",
    baseUrl: "https://api.minimaxi.com/v1",
    endpointPath: "/chat/completions",
    modelId: "MiniMax-Text-01",
    apiKey: "",
    locked: true,
    configured: false,
  },
  {
    id: "profile-together",
    displayName: "Together AI",
    providerName: "Together AI",
    compatibility: "openai",
    baseUrl: "https://api.together.xyz/v1",
    endpointPath: "/chat/completions",
    modelId: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    apiKey: "",
    locked: true,
    configured: false,
  },
];

const defaultProfileMap = new Map(defaultProfiles.map((profile) => [profile.id, profile]));

const state = {
  modeIndex: 0,
  participationIndex: 0,
  densityIndex: 1,
  memoryIndex: 0,
  modelIndex: 0,
  discussionRounds: 1,
  autoFollow: true,
  discussionRunning: false,
  discussionAbortController: null,
  discussionAbortRequested: false,
  latestReportText: "",
  latestReportFileName: "",
  topicConfirmed: false,
  seatsReady: false,
  generatingSeats: false,
  lastSummary: "",
  generatingTimer: null,
  peopleFilter: "all",
  seatSource: "recommended",
  peopleRoles: [],
  modelProfiles: [],
  recommendedRoles: [],
  mappings: { main: "", challenger: "", judge: "" },
  selectedIds: new Set(),
  seatAssignments: {},
  discussionOrder: {},
  seatModelAssignments: {},
  topics: [],
  activeTopicId: "",
  pendingAttachments: [],
};

let pendingConfirmResolver = null;

const peopleLibraryBackdrop = document.getElementById("people-library-backdrop");
const peopleLibraryModal = document.getElementById("people-library-modal");
const closePeopleLibrary = document.getElementById("close-people-library");
const openPeopleLibraryButton = document.getElementById("open-people-library");
const peopleLibraryStats = document.getElementById("people-library-stats");
const peopleFilterTabs = document.getElementById("people-filter-tabs");
const peopleSearch = document.getElementById("people-search");
const peopleLibraryGrid = document.getElementById("people-library-grid");
const openRoleEditorButton = document.getElementById("open-role-editor");
const roleEditor = document.getElementById("role-editor");
const cancelRoleEditor = document.getElementById("cancel-role-editor");
const saveRoleEditorButton = document.getElementById("save-role-editor");
const roleEditorId = document.getElementById("role-editor-id");
const roleEditorName = document.getElementById("role-editor-name");
const roleEditorSeat = document.getElementById("role-editor-seat");
const roleEditorDescription = document.getElementById("role-editor-description");
const roleEditorPrompt = document.getElementById("role-editor-prompt");
const roleEditorStance = document.getElementById("role-editor-stance");
const roleEditorTemper = document.getElementById("role-editor-temper");
const roleEditorColor = document.getElementById("role-editor-color");
const roleEditorColorPicker = document.getElementById("role-editor-color-picker");
const roleEditorSourceLabel = document.getElementById("role-editor-source-label");

const seatPickerBackdrop = document.getElementById("seat-picker-backdrop");
const seatPickerModal = document.getElementById("seat-picker-modal");
const closeSeatPicker = document.getElementById("close-seat-picker");
const openSeatPickerButton = document.getElementById("open-seat-picker");
const openSeatPickerRoleEditor = document.getElementById("open-seat-picker-role-editor");
const seatPickerCount = document.getElementById("seat-picker-count");
const seatPickerFeedback = document.getElementById("seat-picker-feedback");
const seatSourceTabs = document.getElementById("seat-source-tabs");
const seatPickerSearch = document.getElementById("seat-picker-search");
const seatPickerGrid = document.getElementById("seat-picker-grid");

const confirmBackdrop = document.getElementById("confirm-backdrop");
const confirmModal = document.getElementById("confirm-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmCancel = document.getElementById("confirm-cancel");
const confirmAccept = document.getElementById("confirm-accept");

const settingsDrawer = document.getElementById("settings-drawer");
const settingsDrawerBackdrop = document.getElementById("settings-drawer-backdrop");
const openSettingsDrawer = document.getElementById("open-settings-drawer");
const closeSettingsDrawer = document.getElementById("close-settings-drawer");
const modelProfileForm = document.getElementById("model-profile-form");
const profileId = document.getElementById("profile-id");
const profileDisplayName = document.getElementById("profile-display-name");
const profileProviderName = document.getElementById("profile-provider-name");
const profileCompatibility = document.getElementById("profile-compatibility");
const profileBaseUrl = document.getElementById("profile-base-url");
const profileEndpointPath = document.getElementById("profile-endpoint-path");
const profileModelId = document.getElementById("profile-model-id");
const profileApiKey = document.getElementById("profile-api-key");
const profileTestStatus = document.getElementById("profile-test-status");
const resetModelProfile = document.getElementById("reset-model-profile");
const deleteModelProfileButton = document.getElementById("delete-model-profile");
const testModelProfileButton = document.getElementById("test-model-profile");
const providerTemplateSelect = document.getElementById("provider-template-select");
const connectedModelList = document.getElementById("connected-model-list");

const toggleTopicsButton = document.getElementById("toggle-topics");
const topicList = document.getElementById("topic-list");
const currentTopicTitle = document.getElementById("current-topic-title");
const peopleCount = document.getElementById("people-count");
const peopleSummary = document.getElementById("people-summary");
const followToggle = document.getElementById("follow-toggle");
const discussionStream = document.getElementById("discussion-stream");
const attachFilesButton = document.getElementById("attach-files");
const attachmentInput = document.getElementById("attachment-input");
const composerAttachments = document.getElementById("composer-attachments");
const userInput = document.getElementById("user-input");
const sendCommand = document.getElementById("send-command");
const speakerAvatar = document.getElementById("speaker-avatar");
const speakerName = document.getElementById("speaker-name");
const speakerRole = document.getElementById("speaker-role");
const speakerDescription = document.getElementById("speaker-description");
const liveStatusBanner = document.getElementById("live-status-banner");
const configMode = document.getElementById("config-mode");
const configParticipation = document.getElementById("config-participation");
const configMemory = document.getElementById("config-memory");
const configModel = document.getElementById("config-model");
const discussionRoundsInput = document.getElementById("discussion-rounds-input");
const newTopicButton = document.getElementById("new-topic");
const startDiscussionButton = document.getElementById("start-discussion");
const stopDiscussionButton = document.getElementById("stop-discussion");
const seatFeedback = document.getElementById("seat-feedback");
const seatStack = document.getElementById("seat-stack");

let dbPromise;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ROLE_STORE)) {
        db.createObjectStore(ROLE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PROFILE_STORE)) {
        db.createObjectStore(PROFILE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(APP_STATE_STORE)) {
        db.createObjectStore(APP_STATE_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getDb() {
  if (!dbPromise) {
    dbPromise = openDatabase();
  }
  return dbPromise;
}

async function dbGetAll(storeName) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGet(storeName, key) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbPut(storeName, value) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    transaction.oncomplete = () => resolve(value);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function dbDelete(storeName, key) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function saveAppState(key, value) {
  await dbPut(APP_STATE_STORE, { key, value });
}

async function loadAppState(key, fallback) {
  const record = await dbGet(APP_STATE_STORE, key);
  return record ? record.value : fallback;
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function roleColor(role) {
  if (role.color && ROLE_COLORS.includes(role.color)) {
    return role.color;
  }
  return ROLE_COLORS[hashString(role.id || role.name) % ROLE_COLORS.length];
}

function avatarStyle(role) {
  const color = roleColor(role);
  return `--avatar-a: var(--avatar-${color}-a); --avatar-b: var(--avatar-${color}-b);`;
}

function roleAvatar(role) {
  return (role.avatar || role.name.slice(0, 1) || "人").slice(0, 1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setSpeakerCard(title, role, description, avatar = "系", avatarInlineStyle = "") {
  speakerAvatar.textContent = avatar;
  if (avatarInlineStyle) {
    speakerAvatar.setAttribute("style", avatarInlineStyle);
  } else {
    speakerAvatar.removeAttribute("style");
  }
  speakerName.textContent = title;
  speakerRole.textContent = role;
  speakerDescription.textContent = description;
}

function setSpeakerCardForRole(role, status, description) {
  setSpeakerCard(role.name, status, description, roleAvatar(role), avatarStyle(role));
}

function updateLiveStatus(message, tone = "") {
  liveStatusBanner.textContent = message;
  liveStatusBanner.className = `live-status-banner ${tone}`.trim();
}

function updateCurrentTopicTitle(title = "未命名任务") {
  currentTopicTitle.textContent = title;
}

function getRoundLabel() {
  return `${state.discussionRounds} 轮`;
}

function getRoundTokenBudget() {
  if (state.modeIndex === 1) {
    return { main: 1100, participant: 820, challenger: 1100, judge: 1400, report: 1500, charHint: "控制在 650 到 900 字内。" };
  }
  if (state.modeIndex === 3) {
    return { main: 1200, participant: 900, challenger: 1200, judge: 1500, report: 1600, charHint: "控制在 700 到 950 字内，但要保持自然。" };
  }
  if (state.modeIndex === 2) {
    return { main: 950, participant: 720, challenger: 950, judge: 1250, report: 1350, charHint: "控制在 550 到 800 字内，尽量基于依据推进。" };
  }
  return { main: 900, participant: 700, challenger: 900, judge: 1200, report: 1300, charHint: "控制在 500 到 750 字内。" };
}

function buildReportFileName() {
  const rawTitle = deriveTopicTitle().replace(/[\\/:*?"<>|]/g, "-").trim() || "roundtable-report";
  return `${rawTitle}-讨论结论报告.txt`;
}

function buildExportBaseName() {
  return buildReportFileName().replace(/\.txt$/i, "") || "roundtable-report";
}

function downloadBlob(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadTextFile(fileName, content) {
  downloadBlob(fileName, new Blob([content], { type: "text/plain;charset=utf-8" }));
}

function escapeExportHtml(value) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function getDiscussionMessagesForExport() {
  return [...discussionStream.querySelectorAll(".chat-item")].map((item) => ({
    label: item.querySelector(".chat-meta strong")?.textContent?.trim() || "",
    sublabel: item.querySelector(".chat-meta span")?.textContent?.trim() || "",
    body: [...item.querySelectorAll(".chat-bubble p, .attachment-pill")].map((node) => node.textContent.trim()).filter(Boolean).join("\n"),
  }));
}

function buildFullExportText() {
  const parts = [
    `话题：${deriveTopicTitle()}`,
    `任务定义：${state.lastSummary || "尚未确认"}`,
    "",
    "讨论过程：",
    ...getDiscussionMessagesForExport().flatMap((message, index) => [
      `${index + 1}. ${message.label}${message.sublabel ? ` · ${message.sublabel}` : ""}`,
      message.body || "",
      "",
    ]),
  ];

  if (state.latestReportText) {
    parts.push("最终结论：", state.latestReportText, "");
  }

  return parts.join("\n").trim();
}

function buildFullExportHtml() {
  const messageMarkup = getDiscussionMessagesForExport()
    .map((message, index) => `
      <article class="export-message">
        <h3>${index + 1}. ${escapeHtml(message.label)}${message.sublabel ? ` <span>${escapeHtml(message.sublabel)}</span>` : ""}</h3>
        <p>${escapeExportHtml(message.body || "")}</p>
      </article>
    `)
    .join("");

  return `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(buildExportBaseName())}</title>
        <style>
          body { font-family: "Microsoft YaHei UI", "Noto Sans SC", sans-serif; color: #111827; line-height: 1.7; padding: 32px; }
          h1, h2, h3 { font-family: "Noto Serif SC", "Source Han Serif SC", serif; }
          h1 { margin: 0 0 12px; font-size: 28px; }
          h2 { margin: 28px 0 12px; font-size: 20px; }
          h3 { margin: 0 0 8px; font-size: 15px; }
          h3 span { color: #6b7280; font-weight: 400; }
          .summary, .report, .export-message { border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; }
          .summary, .report { background: #f8fafc; }
          p { margin: 0; white-space: normal; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(deriveTopicTitle())}</h1>
        <div class="summary"><strong>任务定义</strong><p>${escapeExportHtml(state.lastSummary || "尚未确认")}</p></div>
        <h2>讨论过程</h2>
        ${messageMarkup}
        <h2>最终结论</h2>
        <div class="report"><p>${escapeExportHtml(state.latestReportText || "暂无最终结论")}</p></div>
      </body>
    </html>
  `;
}

function downloadDocxFile(fileName, htmlContent) {
  if (window.htmlDocx?.asBlob) {
    downloadBlob(fileName, window.htmlDocx.asBlob(htmlContent));
    return;
  }
  downloadBlob(fileName.replace(/\.docx$/i, ".html"), new Blob([htmlContent], { type: "text/html;charset=utf-8" }));
}

function exportPdfDocument(title, htmlContent) {
  const preview = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!preview) {
    updateSeatFeedback("浏览器拦截了 PDF 导出窗口，请允许弹窗后再试。", "pending");
    return;
  }
  preview.document.open();
  preview.document.write(htmlContent);
  preview.document.close();
  preview.document.title = title;
  preview.focus();
  preview.print();
}

function getConfiguredProfileById(profileId) {
  return state.modelProfiles.find((profile) => profile.id === profileId && profile.configured) || null;
}

function getSeatDefaultProfileId(role) {
  const assignment = getRoleAssignment(role);
  const fallbackId = assignment === "judge"
    ? state.mappings.judge
    : assignment === "challenger"
      ? state.mappings.challenger
      : state.mappings.main;
  return getConfiguredProfileById(fallbackId)?.id || getConfiguredProfiles()[0]?.id || "";
}

function ensureSeatModelAssignment(role) {
  if (!role) {
    return "";
  }
  const currentId = state.seatModelAssignments[role.id];
  if (currentId && getConfiguredProfileById(currentId)) {
    return currentId;
  }
  const fallbackId = getSeatDefaultProfileId(role);
  state.seatModelAssignments[role.id] = fallbackId;
  return fallbackId;
}

function sanitizeSeatModelAssignments() {
  const validIds = new Set(getConfiguredProfiles().map((profile) => profile.id));
  state.seatModelAssignments = Object.fromEntries(
    Object.entries(state.seatModelAssignments).filter(([, profileId]) => validIds.has(profileId))
  );
}

function buildSeatModelOptionsMarkup(role) {
  const configuredProfiles = getConfiguredProfiles();
  const selectedId = ensureSeatModelAssignment(role);
  if (!configuredProfiles.length) {
    return '<option value="">未设置模型</option>';
  }
  return configuredProfiles
    .map((profile) => `<option value="${profile.id}" ${selectedId === profile.id ? "selected" : ""}>${escapeHtml(profile.displayName)}</option>`)
    .join("");
}

function getRoleModelProfile(role) {
  return getConfiguredProfileById(ensureSeatModelAssignment(role)) || getPrimarySummaryProfile();
}

function openConfirmDialog({ title, message, confirmText = "确认", cancelText = "取消" }) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmAccept.textContent = confirmText;
  confirmCancel.textContent = cancelText;
  confirmBackdrop.classList.add("open");
  confirmModal.classList.add("open");
  confirmModal.setAttribute("aria-hidden", "false");
  return new Promise((resolve) => {
    pendingConfirmResolver = resolve;
  });
}

function closeConfirmDialog(confirmed) {
  confirmBackdrop.classList.remove("open");
  confirmModal.classList.remove("open");
  confirmModal.setAttribute("aria-hidden", "true");
  if (pendingConfirmResolver) {
    pendingConfirmResolver(confirmed);
    pendingConfirmResolver = null;
  }
}

function getReportExportActionsMarkup() {
  return `
    <div class="message-actions">
      <button class="ghost-link js-export-txt" type="button">导出 TXT</button>
      <button class="ghost-link js-export-docx" type="button">导出 DOCX</button>
      <button class="ghost-link js-export-pdf" type="button">导出 PDF</button>
    </div>
  `;
}

function upgradeLegacyReportActions() {
  discussionStream.querySelectorAll(".js-download-report").forEach((button) => {
    const container = button.closest(".message-actions");
    if (container) {
      container.outerHTML = getReportExportActionsMarkup();
    }
  });
}

function getActiveTopic() {
  return state.topics.find((topic) => topic.id === state.activeTopicId) || null;
}

async function createConclusionReport(mainProfile, judgeText, roundNotes, signal) {
  const budget = getRoundTokenBudget();
  const prompt = [
    "你现在要把本次圆桌讨论整理成一份给用户直接阅读的最终文字报告。",
    "这不是聊天回复，而是一份可下载的结论稿。语言要成熟、完整、自然，像一篇真正的分析纪要。",
    "请用这样的结构自然写出：",
    "一、通过今天的讨论，我们形成了哪些关键认识。",
    "二、各方争议最后是怎么收束的。",
    "三、目前最稳的结论是什么。",
    "四、如果用户继续深挖，下一步最值得追问什么。",
    "不要使用 Markdown 标题符号，不要写成条款体。每一部分都写成完整的自然中文段落。",
    "如果某些点仍然没有足够依据，要明确说“目前还不能下死结论”。",
    buildDiscussionContext(state.lastSummary, roundNotes, []),
    `最终裁判意见：${judgeText}`,
    `篇幅要求：${budget.charHint}`,
  ].join("\n\n");

  return requestModelText(mainProfile, prompt, budget.report, signal);
}

function discussionEvidenceRules() {
  return [
    "证据要求：只能使用你能合理确认的事实。不要编造考古发现、历史文献、论文、年份、数据、引文和法条。",
    "如果某个细节你不能确认，就直接说“这里我没有足够依据”，不要装作知道。",
    "如果前面任何一位发言者用了没有依据的内容，不管是不是你这一方，都要明确指出那部分站不住脚。",
    "可以引用任务里已有信息、常识性历史背景和前文发言，但要区分“能确认”和“推测”。",
  ].join("\n");
}

function formatTurnContext(turn) {
  return [
    `角色：${turn.role.name}`,
    `席位：${turn.assignmentLabel}`,
    `职责：${turn.role.description}`,
    `角色提示：${turn.role.systemPrompt || "无"}`,
    `发言内容：${turn.text}`,
  ].join("\n");
}

function buildDiscussionContext(summary, roundNotes, liveTurns) {
  const finishedRounds = roundNotes.length
    ? `前面轮次记录：\n${roundNotes
        .map((note) => `第 ${note.round} 轮\n${note.moderatorSummary || note.turns.map((turn) => formatTurnContext(turn)).join("\n\n")}`)
        .join("\n\n")}`
    : "";
  const currentTurns = liveTurns.length
    ? `本轮前面已经发言的内容：\n${liveTurns.map((turn) => formatTurnContext(turn)).join("\n\n")}`
    : "";

  return [
    `任务定义：${summary}`,
    finishedRounds,
    currentTurns,
    discussionEvidenceRules(),
  ].filter(Boolean).join("\n\n");
}

function getRoleAssignment(role) {
  return state.seatAssignments[role.id] || "participant";
}

function getAssignmentInstruction(assignment) {
  if (assignment === "challenger") {
    return "你是本轮主讲，要提出最核心的主论点、主要依据和最值得展开的解释。";
  }
  if (assignment === "neutral") {
    return "你是本轮中立评议者，要指出前面发言里哪些更稳、哪些证据不足、哪些判断需要收紧。";
  }
  return "你是本轮旁证成员，要补充背景、细节、案例和现实约束，但不要越位成裁判。";
}

function sanitizeDisplayedModelText(text) {
  return text
    .replace(/^[（(][^\n）)]{0,40}[）)]\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function setDiscussionControlsState(running) {
  state.discussionRunning = running;
  startDiscussionButton.disabled = running;
  stopDiscussionButton.disabled = !running;
  discussionRoundsInput.disabled = running;
}

function stopDiscussionFlow() {
  if (!state.discussionRunning) {
    return;
  }
  state.discussionAbortRequested = true;
  state.discussionAbortController?.abort();
  setSpeakerCard("正在结束讨论", "等待当前请求停止", `当前执行到 ${getRoundLabel()}，系统会在这一步结束后停止。`, "系");
  updateSeatFeedback("已请求结束讨论，正在停止当前角色。", "pending");
}

function createTopicSession(title = "未命名任务") {
  const now = Date.now();
  return {
    id: `topic-${now}`,
    title,
    summary: "刚创建，等待补充任务定义。",
    status: "active",
    updatedAt: now,
    snapshot: null,
  };
}

function deriveTopicTitle() {
  if (state.lastSummary) {
    return shortenText(extractHeadlineFromSummary(state.lastSummary), 24);
  }
  const firstUserMessage = discussionStream.querySelector('.chat-item.user .chat-bubble p');
  if (firstUserMessage?.textContent?.trim()) {
    return shortenText(firstUserMessage.textContent.trim(), 24);
  }
  return "未命名任务";
}

function deriveTopicSummary() {
  const activeTopic = getActiveTopic();
  if (activeTopic?.status === "completed" && state.latestReportText) {
    return "本次讨论已完成，结论可下载。";
  }
  if (state.lastSummary) {
    return state.lastSummary;
  }
  return seatFeedback.textContent.trim() || speakerDescription.textContent.trim() || "等待补充任务定义。";
}

function formatTopicTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildCurrentTopicSnapshot() {
  return {
    modeIndex: state.modeIndex,
    participationIndex: state.participationIndex,
    densityIndex: state.densityIndex,
    memoryIndex: state.memoryIndex,
    modelIndex: state.modelIndex,
    discussionRounds: state.discussionRounds,
    topicConfirmed: state.topicConfirmed,
    seatsReady: state.seatsReady,
    generatingSeats: state.generatingSeats,
    lastSummary: state.lastSummary,
    latestReportText: state.latestReportText,
    latestReportFileName: state.latestReportFileName,
    seatSource: state.seatSource,
    recommendedRoles: state.recommendedRoles,
    selectedIds: [...state.selectedIds],
    seatAssignments: { ...state.seatAssignments },
    discussionOrder: { ...state.discussionOrder },
    seatModelAssignments: { ...state.seatModelAssignments },
    pendingAttachments: [],
    userInput: userInput.value,
    discussionHtml: discussionStream.innerHTML,
    speaker: {
      avatar: speakerAvatar.textContent,
      name: speakerName.textContent,
      role: speakerRole.textContent,
      description: speakerDescription.textContent,
    },
    feedback: {
      text: seatFeedback.textContent,
      className: seatFeedback.className,
    },
    liveStatus: {
      text: liveStatusBanner.textContent,
      className: liveStatusBanner.className,
    },
  };
}

async function persistTopics() {
  await saveAppState("topicSessions", state.topics);
  await saveAppState("activeTopicId", state.activeTopicId);
}

async function syncCurrentTopicSnapshot() {
  if (!state.activeTopicId) {
    return;
  }
  const topic = state.topics.find((item) => item.id === state.activeTopicId);
  if (!topic) {
    return;
  }
  topic.title = deriveTopicTitle();
  topic.summary = deriveTopicSummary();
  topic.updatedAt = Date.now();
  topic.snapshot = buildCurrentTopicSnapshot();
  updateCurrentTopicTitle(topic.title);
  await persistTopics();
  renderTopicList();
}

function renderTopicList() {
  const activeTopics = state.topics.filter((topic) => topic.status === "active");
  const completedTopics = state.topics.filter((topic) => topic.status === "completed");
  const archivedTopics = state.topics.filter((topic) => topic.status === "archived");
  const orderedTopics = [
    ...activeTopics,
    ...completedTopics.sort((left, right) => right.updatedAt - left.updatedAt),
    ...archivedTopics.sort((left, right) => right.updatedAt - left.updatedAt),
  ];

  topicList.innerHTML = orderedTopics.length
    ? orderedTopics
        .map((topic, index) => `
          <article class="topic-card ${topic.id === state.activeTopicId ? "active" : ""} ${index > 0 ? "hidden-topic" : ""}" data-topic-id="${topic.id}">
            <div class="topic-card-head">
              <p class="topic-tag">${topic.status === "active" ? "进行中" : topic.status === "completed" ? "已完成" : "已归档"}</p>
              <span class="compact-link">${formatTopicTimestamp(topic.updatedAt)}</span>
            </div>
            <h3>${escapeHtml(topic.title)}</h3>
            <p>${escapeHtml(topic.summary)}</p>
            <div class="topic-card-actions">
              <button class="ghost-link compact-link" data-topic-action="open" data-topic-id="${topic.id}" type="button">${topic.status === "active" ? "继续" : "打开"}</button>
              <button class="ghost-link compact-link danger-link" data-topic-action="delete" data-topic-id="${topic.id}" type="button">删除</button>
            </div>
          </article>
        `)
        .join("")
    : '<div class="empty-panel">还没有历史任务。先创建一个新话题。</div>';
}

function applyTopicSnapshot(snapshot) {
  if (!snapshot) {
    seedConversation();
    return;
  }

  clearTimeout(state.generatingTimer);
  state.modeIndex = snapshot.modeIndex ?? 0;
  state.participationIndex = Math.min(participationValues.length - 1, snapshot.participationIndex ?? 0);
  state.densityIndex = snapshot.densityIndex ?? 1;
  state.memoryIndex = snapshot.memoryIndex ?? 0;
  state.modelIndex = snapshot.modelIndex ?? 0;
  state.discussionRounds = Math.max(1, Number(snapshot.discussionRounds || 1));
  state.topicConfirmed = !!snapshot.topicConfirmed;
  state.seatsReady = !!snapshot.seatsReady;
  state.generatingSeats = !!snapshot.generatingSeats;
  state.lastSummary = snapshot.lastSummary || "";
  state.latestReportText = snapshot.latestReportText || "";
  state.latestReportFileName = snapshot.latestReportFileName || "";
  state.seatSource = snapshot.seatSource || "recommended";
  state.recommendedRoles = snapshot.recommendedRoles || [];
  if (state.lastSummary && state.recommendedRoles.length < 8) {
    state.recommendedRoles = createFallbackRecommendedRoles(state.lastSummary);
  }
  state.selectedIds = new Set(snapshot.selectedIds || []);
  state.seatAssignments = snapshot.seatAssignments || {};
  state.discussionOrder = snapshot.discussionOrder || {};
  state.seatModelAssignments = snapshot.seatModelAssignments || {};
  sanitizeSeatModelAssignments();
  ensureCoreAssignments();
  syncDiscussionOrder();
  state.pendingAttachments = snapshot.pendingAttachments || [];
  userInput.value = snapshot.userInput || "";
  discussionStream.innerHTML = snapshot.discussionHtml || "";
  setSpeakerCard(
    snapshot.speaker?.name || "任务整理中",
    snapshot.speaker?.role || "等待用户输入",
    snapshot.speaker?.description || "先整理，再确认，再生成人物。",
    snapshot.speaker?.avatar || "系"
  );
  seatFeedback.textContent = snapshot.feedback?.text || "人物尚未生成";
  seatFeedback.className = `seat-feedback seat-feedback-hidden ${snapshot.feedback?.className?.replace("seat-feedback", "").trim() || ""}`.trim();
  seatPickerFeedback.textContent = seatFeedback.textContent;
  seatPickerFeedback.className = `drawer-feedback ${snapshot.feedback?.className?.replace("seat-feedback", "").trim() || ""}`.trim();
  updateLiveStatus(snapshot.liveStatus?.text || "等待开始讨论", snapshot.liveStatus?.className?.split(" ").slice(1).join(" ") || "");
  updateCompactSummary();
  updateCurrentTopicTitle(deriveTopicTitle());
  renderSeatPicker();
  renderSeatStack();
  renderAttachmentStrip();
  upgradeLegacyReportActions();
  autoResizeTextarea();
  scrollToLatest();
}

async function handleNewTopic() {
  const currentTopic = state.topics.find((topic) => topic.id === state.activeTopicId);
  if (currentTopic?.snapshot?.discussionHtml?.includes('chat-item user')) {
    currentTopic.status = "archived";
  }

  const nextTopic = createTopicSession();
  state.topics = [nextTopic, ...state.topics.filter((topic) => topic.id !== nextTopic.id)];
  state.activeTopicId = nextTopic.id;
  seedConversation();
  await syncCurrentTopicSnapshot();
}

async function activateTopic(topicId) {
  const topic = state.topics.find((item) => item.id === topicId);
  if (!topic) {
    return;
  }
  state.topics.forEach((item) => {
    if (item.id !== topicId && item.status === "active") {
      item.status = "archived";
    }
  });
  if (topic.status !== "completed") {
    topic.status = "active";
  }
  state.activeTopicId = topicId;
  applyTopicSnapshot(topic.snapshot);
  await persistTopics();
  renderTopicList();
}

async function deleteTopic(topicId) {
  const topic = state.topics.find((item) => item.id === topicId);
  if (!topic) {
    return;
  }

  const confirmed = await openConfirmDialog({
    title: "删除任务",
    message: `删除任务“${topic.title}”？这会同时移除这条任务里的讨论记录和导出结果。`,
    confirmText: "删除",
  });
  if (!confirmed) {
    return;
  }

  state.topics = state.topics.filter((item) => item.id !== topicId);

  if (!state.topics.length) {
    const nextTopic = createTopicSession();
    state.topics = [nextTopic];
    state.activeTopicId = nextTopic.id;
    seedConversation();
    await syncCurrentTopicSnapshot();
    return;
  }

  if (state.activeTopicId === topicId) {
    const nextActive = state.topics.find((item) => item.status === "active") || state.topics[0];
    await activateTopic(nextActive.id);
    return;
  }

  await persistTopics();
  renderTopicList();
}

function updateCompactSummary() {
  configMode.textContent = modeValues[state.modeIndex];
  configParticipation.textContent = participationValues[state.participationIndex];
  configMemory.textContent = memoryValues[state.memoryIndex];
  configModel.textContent = modelValues[state.modelIndex];
  discussionRoundsInput.value = String(state.discussionRounds);
}

function cycleSetting(stateKey, values) {
  state[stateKey] = (state[stateKey] + 1) % values.length;
  updateCompactSummary();
}

function setAutoFollow(enabled) {
  state.autoFollow = enabled;
  followToggle.textContent = enabled ? "跟随新消息" : "查看消息";
  followToggle.classList.toggle("cool", enabled);
}

function isNearBottom(element) {
  return element.scrollHeight - element.scrollTop - element.clientHeight < 40;
}

function scrollToLatest() {
  discussionStream.scrollTop = discussionStream.scrollHeight;
  setAutoFollow(true);
}

function autoResizeTextarea() {
  userInput.style.height = "auto";
  const nextHeight = Math.min(userInput.scrollHeight, 140);
  userInput.style.height = `${nextHeight}px`;
  userInput.style.overflowY = userInput.scrollHeight > 140 ? "auto" : "hidden";
}

function normalizeRequestText(content) {
  return content.replace(/\s+/g, " ").replace(/[，、]+/g, "，").trim();
}

function shortenText(content, maxLength = 88) {
  return content.length <= maxLength ? content : `${content.slice(0, maxLength)}...`;
}

function cleanRequestClause(content) {
  return content
    .replace(/^(帮我那个|帮我先|帮我|我需要先|我需要|我想先|我想|请你先|请你|请|麻烦你先|麻烦你)/, "")
    .replace(/^(然后|另外|还有|再就是|最后)/, "")
    .replace(/^(啊|呀|吧|呢|一下|一下啊)+/, "")
    .replace(/(我希望能行|我希望可以|我希望最后|希望能|希望可以)$/g, "")
    .trim();
}

function pickFirstMatchingSegment(segments, patterns) {
  return segments.find((segment) => patterns.some((pattern) => pattern.test(segment))) || "";
}

function extractHeadlineFromSummary(summary) {
  const match = summary.match(/任务目标：([^；。]+)/);
  return match?.[1]?.trim() || summary;
}

function summarizeInput(content) {
  const normalized = normalizeRequestText(content);
  if (!normalized) {
    return "";
  }

  const segments = normalized
    .split(/[。！？；，,]+/)
    .map((segment) => cleanRequestClause(segment.trim().replace(/^[-:：]+/, "")))
    .filter(Boolean);

  const goalSegments = segments.filter((segment) => /(查|查询|看|研究|围绕|分析|整理|写|形成|准备|梳理)/.test(segment));
  const goal = goalSegments.slice(0, 2).join("，") || segments[0] || normalized;
  const output = pickFirstMatchingSegment(segments, [/形成/, /写成/, /整理成/, /输出/, /讲稿/, /报告/, /方案/, /结论/]);
  const focusSegments = segments
    .filter((segment) => segment !== output)
    .filter((segment) => /(属灵|亮光|历史|背景|角度|经文|重点|风险|落地|语境|证据|结构|人物)/.test(segment))
    .slice(0, 3)
    .join("；");

  const parts = [`任务目标：${shortenText(goal || normalized, 32)}`];
  if (focusSegments) {
    parts.push(`重点关注：${shortenText(focusSegments, 34)}`);
  }
  if (output) {
    parts.push(`输出形式：${shortenText(output, 32)}`);
  }

  return parts.join("；");
}

function getPrimarySummaryProfile() {
  const configuredProfiles = getConfiguredProfiles();
  const mappedMain = configuredProfiles.find((profile) => profile.id === state.mappings.main);
  return mappedMain || configuredProfiles[0] || null;
}

function getMappedProfile(assignment) {
  const targetId = state.mappings[assignment] || "";
  return state.modelProfiles.find((profile) => profile.id === targetId && profile.configured) || null;
}

async function requestModelText(profile, prompt, maxTokens = 420, signal) {
  let response;
  if (profile.compatibility === "anthropic") {
    response = await fetch(joinUrl(profile.baseUrl, profile.endpointPath || "/messages"), {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": profile.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: profile.modelId,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } else {
    response = await fetch(joinUrl(profile.baseUrl, profile.endpointPath || "/chat/completions"), {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${profile.apiKey}`,
      },
      body: JSON.stringify({
        model: profile.modelId,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.35,
        max_tokens: maxTokens,
      }),
    });
  }

  if (!response.ok) {
    throw new Error(`${profile.displayName} 调用失败 ${response.status}`);
  }

  const payload = await response.json();
  const text = extractTextFromModelResponse(payload, profile.compatibility);
  if (!text) {
    throw new Error(`${profile.displayName} 返回了空内容`);
  }
  return sanitizeDisplayedModelText(text);
}

function getRoleByAssignment(assignment) {
  const entry = Object.entries(state.seatAssignments).find(([, value]) => value === assignment);
  return entry ? getRoleById(entry[0]) : null;
}

function rolePromptBlock(role) {
  if (!role) {
    return "未配置该席位人物。";
  }
  return [
    `人物：${role.name}`,
    `席位：${role.seat}`,
    `说明：${role.description}`,
    `立场：${role.traits.stance}`,
    `风格：${role.traits.temper}`,
    `提示词：${role.systemPrompt || "无"}`,
  ].join("\n");
}

function appendRoleMessage(role, assignmentLabel, body, modelName) {
  appendMarkup(
    createMessageMarkup({
      speakerId: role?.id || assignmentLabel,
      label: role?.name || assignmentLabel,
      sublabel: `${assignmentLabel}${modelName ? ` · ${modelName}` : ""}`,
      body,
      avatarLabel: role ? roleAvatar(role) : assignmentLabel.slice(0, 1),
      avatarClass: "avatar-system",
      avatarStyleText: role ? avatarStyle(role) : "",
      tone: "system",
    })
  );
}

async function runDiscussionFlow() {
  if (state.discussionRunning) {
    return;
  }

  const judgeRole = getRoleByAssignment("judge");
  const orderedSpeakers = getOrderedSelectedRoleIds()
    .map((roleId) => getRoleById(roleId))
    .filter((role) => role && getRoleAssignment(role) !== "judge");
  const moderatorProfile = getPrimarySummaryProfile();
  const moderatorRole = {
    id: "host-ai",
    name: "主持AI",
    seat: "讨论主持者",
    description: "负责开场、控制节奏、每轮小结、压缩上下文，并在最后整理给用户的结论稿。",
    traits: { stance: "保持中立主持", method: "总结压缩", temper: "清晰" },
    systemPrompt: "你是主持AI。你的职责是主持、压缩和组织讨论，而不是替代嘉宾发言。",
    color: "sky",
    avatar: "主",
  };

  if (!state.lastSummary) {
    updateSeatFeedback("先让主 AI 整理并确认任务定义，再开始讨论。", "pending");
    return;
  }
  if (!orderedSpeakers.length || !judgeRole) {
    updateSeatFeedback("至少要有若干讨论人物，并给裁判分配一个人物。", "pending");
    return;
  }
  const judgeProfile = judgeRole ? getRoleModelProfile(judgeRole) : null;
  if (!moderatorProfile || !judgeProfile || orderedSpeakers.some((role) => !getRoleModelProfile(role))) {
    updateSeatFeedback("先接入至少一个可用模型，并在每个席位卡里选好模型。", "pending");
    return;
  }

  state.discussionAbortRequested = false;
  state.discussionAbortController = new AbortController();
  setDiscussionControlsState(true);
  const budget = getRoundTokenBudget();
  const totalRounds = Math.max(1, Number(discussionRoundsInput.value || state.discussionRounds || 1));
  state.discussionRounds = totalRounds;
  setSpeakerCard("讨论进行中", "主持AI按顺序推进", `将按你设定的顺序逐位发言；每轮末由主持AI做压缩小结，最后由裁判定稿。`, "系");
  updateLiveStatus(`准备开始：本次共 ${totalRounds} 轮。`, "pending");
  updateSeatFeedback(`开始讨论，当前执行 ${totalRounds} 轮`, "success");

  const roundNotes = [];
  const signal = state.discussionAbortController.signal;

  try {
    const openingPrompt = [
      `你现在是本场圆桌的主持人，需要在正式讨论前做开场。`,
      `任务定义：${state.lastSummary}`,
      rolePromptBlock(moderatorRole),
      `本次讨论顺序：${orderedSpeakers.map((role, index) => `${index + 1}.${role.name}`).join("，")}`,
      "请用自然中文先说明：今天讨论的主题是什么、会怎么讨论、大家重点会围绕哪些争议点展开。",
      "篇幅控制在 180 到 320 字，不要写成提纲。",
    ].join("\n\n");
    setSpeakerCardForRole(moderatorRole, `开场前 · 正在思考`, `正在整理今天这场讨论的主题、顺序和焦点。`);
    updateLiveStatus(`开场：${moderatorRole.name} 正在思考`, "pending");
    const openingText = await requestModelText(moderatorProfile, openingPrompt, Math.min(520, budget.participant), signal);
    appendRoleMessage(moderatorRole, `开场 · ${moderatorRole.name}`, openingText, moderatorProfile.displayName);

    for (let round = 1; round <= totalRounds; round += 1) {
      if (state.discussionAbortRequested) {
        throw new DOMException("用户结束了本轮讨论。", "AbortError");
      }

      const summary = state.lastSummary;
      const liveTurns = [];
      for (const speakerRole of orderedSpeakers) {
        const assignment = getRoleAssignment(speakerRole);
        const isLead = assignment === "challenger";
        const discussionProfile = getRoleModelProfile(speakerRole);
        const speakerPrompt = [
          `你现在是本场讨论里的第 ${state.discussionOrder[speakerRole.id] || 1} 位发言者，第 ${round}/${totalRounds} 轮发言。`,
          getAssignmentInstruction(assignment),
          "请只基于任务、主持AI前面轮次的小结，以及本轮已经出现的发言继续往下讲。不要假装看到了还没发言的人。",
          buildDiscussionContext(summary, roundNotes, liveTurns),
          rolePromptBlock(speakerRole),
          `篇幅要求：${isLead ? budget.charHint : "控制在 280 到 520 字内。"}`,
          "要求：直接输出本轮发言正文，不要自我介绍，不要使用 Markdown 标题和列表。",
        ].join("\n\n");
        setSpeakerCardForRole(speakerRole, `第 ${round} 轮 · 正在思考`, `正在读取任务和前面已发言内容，并准备按顺序接续。`);
        updateLiveStatus(`第 ${round} 轮：${speakerRole.name} 正在思考`, "pending");
        updateSeatFeedback(`第 ${round} 轮：${speakerRole.name} 正在思考`, "pending");
        const speakerText = await requestModelText(discussionProfile, speakerPrompt, isLead ? budget.main : budget.participant, signal);
        setSpeakerCardForRole(speakerRole, `第 ${round} 轮 · 正在发言`, `当前顺序发言已生成，马上写入讨论流。`);
        updateLiveStatus(`第 ${round} 轮：${speakerRole.name} 正在发言`, "pending");
        appendRoleMessage(speakerRole, `第 ${round} 轮 · ${speakerRole.name}`, speakerText, discussionProfile.displayName);
        liveTurns.push({ role: speakerRole, assignmentLabel: `第 ${round} 轮 · ${speakerRole.name}`, text: speakerText });
      }

      const moderatorRoundSummaryPrompt = [
        `你现在是本场讨论的主持AI，需要在第 ${round}/${totalRounds} 轮结束后做一段主持小结。`,
        "你的任务是压缩本轮重点，明确谁提出了什么、谁提出了反对或保留、哪些例子或依据最关键。",
        "这段小结既要给用户看，也要为下一轮压缩上下文，所以要信息密、语言自然、不要太长。",
        `任务定义：${summary}`,
        `本轮记录：${liveTurns.map((turn) => `${turn.assignmentLabel}\n${turn.text}`).join("\n\n")}`,
        "要求：控制在 260 到 420 字内，点出本轮最关键的共识、分歧和例证。",
      ].join("\n\n");
      setSpeakerCardForRole(moderatorRole, `第 ${round} 轮后 · 正在思考`, `正在压缩本轮发言，整理谁说了什么、哪里有争议。`);
      updateLiveStatus(`第 ${round} 轮后：主持AI 正在总结`, "pending");
      const moderatorSummary = await requestModelText(moderatorProfile, moderatorRoundSummaryPrompt, Math.min(700, budget.participant), signal);
      appendRoleMessage(moderatorRole, `第 ${round} 轮小结 · 主持AI`, moderatorSummary, moderatorProfile.displayName);

      roundNotes.push({ round, turns: [...liveTurns], moderatorSummary });
    }

    const judgePrompt = [
      `你现在是圆桌讨论的中立裁判，需要在 ${totalRounds} 轮讨论结束后做最终总结。`,
      "你要像真正的人类裁判一样写最终结论，语言自然、清楚、完整，不要写成 Markdown 标题、提纲或代码注释。",
      "请明确回答：谁的论证更站得住脚、哪些补充信息最有价值、最终建议怎么讲给人听。",
      "如果双方都有道理，也可以明确指出哪部分更强、哪部分还不能下死结论。",
      buildDiscussionContext(state.lastSummary, roundNotes, []),
      rolePromptBlock(judgeRole),
      `篇幅要求：${budget.charHint}`,
      "要求：直接输出最终裁判发言正文，要给人类用户看，至少写 4 段，并给出一个清晰的最终判断。",
    ].join("\n\n");
    setSpeakerCardForRole(judgeRole, `第 ${totalRounds} 轮后 · 正在思考`, `正在综合全部轮次，判断哪些说法更有依据，哪些地方仍然不能下结论。`);
    updateLiveStatus(`最终总结前：${judgeRole.name} 正在思考`, "pending");
    updateSeatFeedback(`${judgeRole.name} 正在做最终裁判`, "pending");
    const judgeText = await requestModelText(judgeProfile, judgePrompt, budget.judge, signal);
    setSpeakerCardForRole(judgeRole, `第 ${totalRounds} 轮后 · 正在发言`, `最终裁判已生成，马上写入讨论流。`);
    updateLiveStatus(`最终总结：${judgeRole.name} 正在发言`, "pending");
    appendRoleMessage(judgeRole, `最终总结 · ${judgeRole.name}`, judgeText, judgeProfile.displayName);

    updateLiveStatus(`正在整理本次讨论的最终文字报告`, "pending");
    const reportText = await createConclusionReport(moderatorProfile, judgeText, roundNotes, signal);
    state.latestReportText = reportText;
    state.latestReportFileName = buildReportFileName();
    appendMarkup(
      createMessageMarkup({
        speakerId: "system-report",
        label: "系",
        sublabel: "本次讨论结论报告",
        body: reportText,
        avatarLabel: "系",
        avatarClass: "avatar-system",
        tone: "system",
        actions: getReportExportActionsMarkup(),
      })
    );

    state.discussionRounds = totalRounds;
    const activeTopic = getActiveTopic();
    if (activeTopic) {
      activeTopic.status = "completed";
      activeTopic.summary = "本次讨论已完成，结论可下载。";
    }
    setSpeakerCard("讨论完成", "主持总结已完成", `已按 ${totalRounds} 轮完成顺序讨论、逐轮主持压缩和最终裁判流程。`, "系");
    updateLiveStatus(`讨论完成：结论报告已生成，可下载。`, "success");
    updateSeatFeedback("本轮讨论已完成。你可以继续补充任务，或调整角色后再来一轮。", "success");
    await syncCurrentTopicSnapshot();
  } catch (error) {
    console.error(error);
    const aborted = error?.name === "AbortError" || state.discussionAbortRequested;
    appendMarkup(
      createMessageMarkup({
        speakerId: "system",
        label: "系",
        sublabel: aborted ? "讨论已结束" : "讨论执行失败",
        body: aborted ? "你已手动结束本轮讨论。当前已生成的发言会保留，未执行的角色不会继续。" : error.message || "执行多角色讨论时失败。",
        avatarLabel: "系",
        avatarClass: "avatar-system",
        tone: "system",
      })
    );
    setSpeakerCard(aborted ? "讨论已结束" : "讨论中断", aborted ? "已按你的要求停止" : "模型调用失败", aborted ? "当前已经执行完的发言会保留，你可以调整后重新开始。" : error.message || "执行多角色讨论时失败。", "系");
    updateLiveStatus(aborted ? "讨论已结束：已停止后续角色发言。" : `讨论中断：${error.message || "模型调用失败"}`, aborted ? "" : "pending");
    updateSeatFeedback(aborted ? "讨论已结束。你可以调整轮次或席位后重新开始。" : error.message || "执行多角色讨论时失败。", "pending");
    await syncCurrentTopicSnapshot();
  } finally {
    state.discussionAbortController = null;
    state.discussionAbortRequested = false;
    setDiscussionControlsState(false);
  }
}

function extractTextFromModelResponse(payload, compatibility) {
  if (compatibility === "anthropic") {
    const textBlocks = (payload.content || [])
      .filter((item) => item.type === "text" && item.text)
      .map((item) => item.text.trim())
      .filter(Boolean);
    return textBlocks.join("\n").trim();
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item?.text || ""))
      .join("\n")
      .trim();
  }
  return "";
}

async function requestAiTaskSummary(content, attachments = []) {
  const profile = getPrimarySummaryProfile();
  if (!profile) {
    throw new Error("还没有可用的主 AI 接入。先在设置里保存配置，并映射给主 AI。");
  }

  if (!profile.baseUrl || !profile.modelId || !profile.apiKey) {
    throw new Error(`主 AI 接入“${profile.displayName}”还没配完整，至少要有 Base URL、模型 ID 和 API Key。`);
  }

  const attachmentNote = attachments.length
    ? `\n附件：${attachments.map((file) => file.name).join("、")}`
    : "";
  const prompt = [
    "你是圆桌讨论工作台里的主 AI。",
    "你的任务是把用户口语化需求整理成一份待确认的任务定义，而不是复述原话。",
    "严格输出三行，每行只保留一句：",
    "任务目标：...",
    "重点关注：...",
    "输出形式：...",
    "要求：",
    "1. 用中文，简洁清楚。",
    "2. 去掉口语填充词和重复表达。",
    "3. 不要寒暄，不要解释过程，不要额外加第四行。",
    `用户需求：${content}${attachmentNote}`,
  ].join("\n");

  let response;
  if (profile.compatibility === "anthropic") {
    response = await fetch(joinUrl(profile.baseUrl, profile.endpointPath || "/messages"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": profile.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: profile.modelId,
        max_tokens: 220,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } else {
    response = await fetch(joinUrl(profile.baseUrl, profile.endpointPath || "/chat/completions"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${profile.apiKey}`,
      },
      body: JSON.stringify({
        model: profile.modelId,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 220,
      }),
    });
  }

  if (!response.ok) {
    throw new Error(`主 AI 整理失败 ${response.status}`);
  }

  const payload = await response.json();
  const summary = extractTextFromModelResponse(payload, profile.compatibility);
  if (!summary) {
    throw new Error("主 AI 返回了空结果");
  }
  return summary;
}

function joinUrl(baseUrl, endpointPath) {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
  return `${normalizedBase}${normalizedPath}`;
}

function createMessageMarkup({ speakerId, label, sublabel = "", body, avatarLabel, avatarClass = "avatar-system", avatarStyleText = "", tone = "system", actions = "", attachments = [] }) {
  const attachmentMarkup = attachments.length
    ? `<div class="chat-attachments">${attachments
        .map((file) => `<span class="attachment-pill">${escapeHtml(file.name)} · ${Math.max(1, Math.round((file.size || 0) / 1024))} KB</span>`)
        .join("")}</div>`
    : "";

  return `
    <article class="chat-item ${tone}" data-speaker-id="${speakerId}">
      <div class="avatar-badge ${avatarClass}" ${avatarStyleText ? `style="${escapeHtml(avatarStyleText)}"` : ""}>${avatarLabel}</div>
      <div class="chat-content">
        <div class="chat-meta">
          <strong>${label}</strong>
          ${sublabel ? `<span>${sublabel}</span>` : ""}
        </div>
        <div class="chat-bubble">
          <p>${escapeHtml(body)}</p>
          ${attachmentMarkup}
          ${actions}
        </div>
      </div>
    </article>
  `;
}

function appendMarkup(markup) {
  discussionStream.insertAdjacentHTML("beforeend", markup);
  if (state.autoFollow) {
    scrollToLatest();
  }
}

function getPeopleRoleById(roleId) {
  return state.peopleRoles.find((role) => role.id === roleId);
}

function getRecommendedRoleById(roleId) {
  return state.recommendedRoles.find((role) => role.id === roleId);
}

function getRoleById(roleId) {
  return getPeopleRoleById(roleId) || getRecommendedRoleById(roleId);
}

function getOrderedSelectedRoleIds() {
  return [...state.selectedIds].sort((left, right) => {
    const leftOrder = state.discussionOrder[left] ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = state.discussionOrder[right] ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
}

function syncDiscussionOrder() {
  const orderedRoleIds = getOrderedSelectedRoleIds();
  const nextOrder = {};
  orderedRoleIds.forEach((roleId, index) => {
    nextOrder[roleId] = index + 1;
  });
  state.discussionOrder = nextOrder;
}

function setDiscussionOrder(roleId, nextPosition) {
  const orderedRoleIds = getOrderedSelectedRoleIds().filter((currentRoleId) => currentRoleId !== roleId);
  const safeIndex = Math.max(0, Math.min(orderedRoleIds.length, nextPosition - 1));
  orderedRoleIds.splice(safeIndex, 0, roleId);
  state.discussionOrder = Object.fromEntries(orderedRoleIds.map((currentRoleId, index) => [currentRoleId, index + 1]));
}

const ROUND_ROLE_LABELS = {
  challenger: "主讲",
  participant: "旁证",
  neutral: "中立评议",
  judge: "裁判",
};

function getSeatSourceLabel(role) {
  return role.source === "recommended"
    ? "系统临时生成"
    : role.source === "favorite"
      ? "收藏人物"
      : role.source === "custom"
        ? "自定义"
        : "人物库";
}

function suggestSeatAssignment(role) {
  const text = `${role.id} ${role.name} ${role.seat} ${Object.values(role.traits || {}).join(" ")}`.toLowerCase();
  const currentAssignments = Object.values(state.seatAssignments);

  if (!currentAssignments.includes("judge") && /(judge|裁判|收束|裁决)/.test(text)) {
    return "judge";
  }
  if (!currentAssignments.includes("neutral") && /(中立|平衡|长老|教师|历史|神学|审慎|辨识)/.test(text)) {
    return "neutral";
  }
  if (!currentAssignments.includes("challenger") && /(主讲|牧师|学者|讲解|解释|释经|calvin|luther|spurgeon|henry|法律)/.test(text)) {
    return "challenger";
  }
  return "participant";
}

function ensureSeatAssignment(role) {
  if (!state.seatAssignments[role.id]) {
    state.seatAssignments[role.id] = suggestSeatAssignment(role);
  }
  return state.seatAssignments[role.id];
}

function roundRoleOptionsMarkup(selectedValue) {
  return Object.entries(ROUND_ROLE_LABELS)
    .map(([value, label]) => `<option value="${value}" ${selectedValue === value ? "selected" : ""}>${label}</option>`)
    .join("");
}

function setSeatAssignment(roleId, nextAssignment) {
  if (nextAssignment !== "participant") {
    Object.keys(state.seatAssignments).forEach((currentRoleId) => {
      if (currentRoleId !== roleId && state.seatAssignments[currentRoleId] === nextAssignment) {
        state.seatAssignments[currentRoleId] = "participant";
      }
    });
  }

  state.seatAssignments[roleId] = nextAssignment;
}

function ensureCoreAssignments() {
  const selectedRoleIds = [...state.selectedIds];
  if (!selectedRoleIds.length) {
    return;
  }

  const assignments = Object.fromEntries(selectedRoleIds.map((roleId) => [roleId, state.seatAssignments[roleId] || "participant"]));
  const findAssigned = (assignment) => Object.entries(assignments).find(([, value]) => value === assignment)?.[0] || "";
  const promote = (assignment, matcher) => {
    if (findAssigned(assignment)) {
      return;
    }
    const preferred = selectedRoleIds.find((roleId) => {
      if (Object.values(assignments).includes(assignment) || assignments[roleId] !== "participant") {
        return false;
      }
      const role = getRoleById(roleId);
      return role ? matcher(role) : false;
    });
    const fallback = selectedRoleIds.find((roleId) => assignments[roleId] === "participant");
    const target = preferred || fallback;
    if (target) {
      assignments[target] = assignment;
    }
  };

  promote("challenger", (role) => /学者|主讲|释经|神学|法律|马丁路德|加尔文|奥古斯丁|马太亨利|司布真/.test(`${role.name}${role.seat}`));
  promote("neutral", (role) => /长老|历史|教师|审慎|辨识|中立/.test(`${role.name}${role.seat}`));
  promote("judge", (role) => /裁判|裁决|中立裁判/.test(`${role.name}${role.seat}`));

  state.seatAssignments = assignments;
}

function ensureRoleDefaults(role) {
  return {
    ...role,
    systemPrompt: role.systemPrompt || `你是${role.name}，你的席位定位是${role.seat}。请围绕“${role.description}”发言，保持${role.traits.temper}语气，优先使用${role.traits.method}的方法，并坚持${role.traits.stance}的立场。`,
  };
}

function normalizeProfile(profile) {
  const builtin = defaultProfileMap.get(profile.id);
  if (builtin) {
    return { ...builtin, ...profile, locked: true, configured: !!profile.configured };
  }
  return {
    compatibility: "openai",
    endpointPath: "/chat/completions",
    locked: false,
    configured: profile.configured !== false,
    ...profile,
  };
}

function getConfiguredProfiles() {
  return state.modelProfiles.filter((profile) => profile.configured);
}

function getProfileHealth(profile) {
  if (!profile.configured) {
    return "inactive";
  }
  if (!profile.apiKey || !profile.baseUrl || !profile.modelId) {
    return "error";
  }
  if (profile.lastTestStatus === "success") {
    return "success";
  }
  if (profile.lastTestStatus === "error") {
    return "error";
  }
  return "warning";
}

function ensureSelectValue(selectElement, value) {
  if (!value) {
    return;
  }
  const hasOption = [...selectElement.options].some((option) => option.value === value);
  if (!hasOption) {
    selectElement.append(new Option(value, value));
  }
}

function filterRoles(list, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return list;
  }

  return list.filter((role) => [role.name, role.seat, role.description, role.systemPrompt || "", role.sourceLabel || "", ...Object.values(role.traits)].join(" ").toLowerCase().includes(normalized));
}

function renderPeopleSummary() {
  const favoriteCount = state.peopleRoles.filter(isFavoriteRole).length;
  const customCount = state.peopleRoles.filter((role) => role.source === "custom").length;
  peopleCount.textContent = `${state.peopleRoles.length} 个人物原型`;
  peopleSummary.textContent = `包含 ${state.peopleRoles.length - favoriteCount - customCount} 个常用职业、${favoriteCount} 个收藏人物和 ${customCount} 个自定义人物。`;
  peopleLibraryStats.innerHTML = [
    `<span class="tiny-badge">总数 ${state.peopleRoles.length}</span>`,
    `<span class="tiny-badge">收藏 ${favoriteCount}</span>`,
    `<span class="tiny-badge">自定义 ${customCount}</span>`,
  ].join("");
}

function renderSeatStack() {
  syncDiscussionOrder();
  const selectedRoles = getOrderedSelectedRoleIds().map((roleId) => getRoleById(roleId)).filter(Boolean);
  const orderedDiscussantCount = selectedRoles.filter((role) => getRoleAssignment(role) !== "judge").length;
  seatPickerCount.textContent = `已选 ${selectedRoles.length} / ${MAX_SELECTED_ROLES}`;

  if (!selectedRoles.length) {
    seatStack.innerHTML = '<div class="seat-empty">确认任务后，系统会推荐一组人物。你也可以从人物库里手动挑选。</div>';
    return;
  }

  seatStack.innerHTML = selectedRoles
    .map((role) => {
      const traits = Object.values(role.traits).map((trait) => `<span>${escapeHtml(trait)}</span>`).join("");
      const assignment = ensureSeatAssignment(role);
      const currentProfile = getConfiguredProfileById(ensureSeatModelAssignment(role));
      const orderValue = state.discussionOrder[role.id] || 1;
      const orderOptions = Array.from({ length: Math.max(1, orderedDiscussantCount) })
        .map((_, index) => `<option value="${index + 1}" ${orderValue === index + 1 ? "selected" : ""}>顺序 ${index + 1}</option>`)
        .join("");
      const orderMarkup = assignment === "judge"
        ? `<label class="seat-assignment"><span>讨论顺序</span><div class="seat-assignment-static">最终裁判</div></label>`
        : `<label class="seat-assignment"><span>讨论顺序</span><select class="seat-order-select" data-role-id="${role.id}">${orderOptions}</select></label>`;
      return `
        <article class="seat-card selected" data-role-id="${role.id}">
          <div class="seat-card-main">
            <div class="seat-chip-row">
              <span class="seat-avatar" style="${avatarStyle(role)}">${escapeHtml(roleAvatar(role))}</span>
              <div>
                <p class="seat-role">${escapeHtml(role.seat)}</p>
                <h3>${escapeHtml(role.name)}</h3>
              </div>
            </div>
            <p>${escapeHtml(role.description)}</p>
            <label class="seat-assignment">
              <span>本轮扮演</span>
              <select class="seat-assignment-select" data-role-id="${role.id}">
                ${roundRoleOptionsMarkup(assignment)}
              </select>
            </label>
            ${orderMarkup}
            <label class="seat-assignment">
              <span>使用模型</span>
              <select class="seat-model-select" data-role-id="${role.id}">
                ${buildSeatModelOptionsMarkup(role)}
              </select>
            </label>
            <div class="seat-traits">${traits}</div>
          </div>
          <div class="seat-actions">
            <div class="seat-meta-stack">
              <span class="seat-source">${escapeHtml(getSeatSourceLabel(role))}</span>
              <span class="seat-model">${escapeHtml(currentProfile?.displayName || "未设置模型")}</span>
            </div>
            <button class="icon-button compact danger seat-delete" data-role-id="${role.id}" type="button" aria-label="移出本轮" title="移出本轮">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Z" fill="currentColor"></path>
              </svg>
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPeopleLibrary() {
  let roles = [...state.peopleRoles];
  if (state.peopleFilter === "favorite") {
    roles = roles.filter(isFavoriteRole);
  }
  if (state.peopleFilter === "custom") {
    roles = roles.filter((role) => role.source === "custom");
  }
  roles = filterRoles(roles, peopleSearch.value);

  peopleFilterTabs.querySelectorAll(".tab-pill").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.peopleFilter);
  });

  if (!roles.length) {
    peopleLibraryGrid.innerHTML = '<div class="empty-panel">当前筛选条件下没有人物。你可以新建一个，或者先去系统临时生成里收藏人物。</div>';
    return;
  }

  peopleLibraryGrid.innerHTML = roles
    .map((role) => {
      const traits = Object.values(role.traits).map((trait) => `<span>${escapeHtml(trait)}</span>`).join("");
      const sourceText = getRoleSourceText(role);
      const sourceBadge = sourceText ? `<span class="card-source ${isFavoriteRole(role) ? "favorite" : ""}">${escapeHtml(sourceText)}</span>` : "";
      return `
        <article class="library-card" data-role-id="${role.id}">
          <div class="role-card-head">
            <div class="seat-chip-row">
              <span class="library-avatar" style="${avatarStyle(role)}">${escapeHtml(roleAvatar(role))}</span>
              <div>
                <p class="seat-role">${escapeHtml(role.seat)}</p>
                <h3>${escapeHtml(role.name)}</h3>
              </div>
            </div>
            ${sourceBadge}
          </div>
          <p class="card-description">${escapeHtml(role.description)}</p>
          <div class="mini-tags">${traits}</div>
          <div class="role-card-footer">
            <div class="card-actions-right">
              <button class="card-action" data-action="edit" type="button">修改</button>
              <button class="card-action" data-action="delete" type="button">删除</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSeatPicker() {
  seatSourceTabs.querySelectorAll(".tab-pill").forEach((button) => {
    button.classList.toggle("active", button.dataset.source === state.seatSource);
  });

  let roles = state.seatSource === "recommended" ? [...state.recommendedRoles] : [...state.peopleRoles];
  roles = filterRoles(roles, seatPickerSearch.value);

  if (!roles.length) {
    seatPickerGrid.innerHTML = `<div class="empty-panel">${state.seatSource === "recommended" ? "当前还没有系统临时生成的人物。先确认任务，系统会按本次内容现生成一组针对性人物。" : "人物库里暂时没有匹配项。你可以去人物库新建或收藏人物。"}</div>`;
    return;
  }

  seatPickerGrid.innerHTML = roles
    .map((role) => {
      const traits = Object.values(role.traits).map((trait) => `<span>${escapeHtml(trait)}</span>`).join("");
      const selected = state.selectedIds.has(role.id);
      const savedFavorite = role.source === "recommended"
        ? state.peopleRoles.some((item) => item.recommendedFrom === role.id && isFavoriteRole(item))
        : false;
      const favoriteAction = role.source === "recommended"
        ? `<button class="card-favorite ${savedFavorite ? "saved" : ""}" data-action="favorite" type="button" aria-label="${savedFavorite ? "取消收藏" : "收藏到人物库"}" title="${savedFavorite ? "取消收藏" : "收藏到人物库"}">★</button>`
        : "";
      return `
        <article class="picker-card ${selected ? "selected" : ""}" data-role-id="${role.id}">
          <div class="role-card-head">
            <div class="seat-chip-row">
              <span class="picker-avatar" style="${avatarStyle(role)}">${escapeHtml(roleAvatar(role))}</span>
              <div>
                <p class="seat-role">${escapeHtml(role.seat)}</p>
                <h3>${escapeHtml(role.name)}</h3>
              </div>
            </div>
          </div>
          <p class="card-description">${escapeHtml(role.description)}</p>
          <div class="mini-tags">${traits}</div>
          <div class="role-card-footer">
            ${favoriteAction}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAttachmentStrip() {
  if (!state.pendingAttachments.length) {
    composerAttachments.classList.add("hidden");
    composerAttachments.innerHTML = "";
    return;
  }

  composerAttachments.classList.remove("hidden");
  composerAttachments.innerHTML = state.pendingAttachments
    .map((file, index) => `<button class="attachment-pill" data-attachment-index="${index}" type="button">${escapeHtml(file.name)} · 移除</button>`)
    .join("");
}

function renderModelMappings() {
  sanitizeSeatModelAssignments();
}

function renderConnectedModelList() {
  const configuredProfiles = getConfiguredProfiles();
  if (!configuredProfiles.length) {
    connectedModelList.innerHTML = '<div class="empty-panel">还没有已接入模型。先从上面的厂商模板里选一个，填好参数后点击“保存配置”。</div>';
    return;
  }

  connectedModelList.innerHTML = configuredProfiles
    .map((profile) => {
      return `
        <article class="connected-model-card">
          <div class="connected-model-main">
            <strong><span class="model-health-dot ${getProfileHealth(profile)}"></span>${escapeHtml(profile.displayName)}</strong>
            <p>${escapeHtml(profile.providerName)} · ${escapeHtml(profile.modelId)}</p>
          </div>
          <div class="connected-model-actions">
            <button class="ghost-link" data-action="edit-profile" data-profile-id="${profile.id}" type="button">修改</button>
            <button class="icon-button compact danger" data-action="delete-profile" data-profile-id="${profile.id}" type="button" aria-label="删除接入" title="删除接入">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Z" fill="currentColor"></path>
              </svg>
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderProviderTemplateSelect() {
  const builtinOptions = state.modelProfiles
    .filter((profile) => profile.locked)
    .map((profile) => `<option value="${profile.id}">${escapeHtml(profile.displayName)}</option>`);
  const customOptions = state.modelProfiles
    .filter((profile) => !profile.locked)
    .map((profile) => `<option value="${profile.id}">${escapeHtml(profile.displayName)} · 自定义</option>`);

  providerTemplateSelect.innerHTML = ['<option value="">选择厂商模板</option>', ...builtinOptions, ...customOptions, '<option value="custom-new">+ 新建自定义接入</option>'].join("");
  providerTemplateSelect.value = profileId.value || "";
}

function updateSeatFeedback(message, tone = "") {
  seatFeedback.textContent = message;
  seatFeedback.className = `seat-feedback seat-feedback-hidden ${tone}`.trim();
  seatPickerFeedback.textContent = message;
  seatPickerFeedback.className = `drawer-feedback ${tone}`.trim();
}

function openPeopleLibrary() {
  peopleLibraryBackdrop.classList.add("open");
  peopleLibraryModal.classList.add("open");
}

function closePeopleLibraryModal() {
  peopleLibraryBackdrop.classList.remove("open");
  peopleLibraryModal.classList.remove("open");
  toggleRoleEditor(false);
}

function openSeatPicker() {
  seatPickerBackdrop.classList.add("open");
  seatPickerModal.classList.add("open");
}

function closeSeatPickerModal() {
  seatPickerBackdrop.classList.remove("open");
  seatPickerModal.classList.remove("open");
}

function openSettings() {
  settingsDrawer.classList.add("open");
  settingsDrawerBackdrop.classList.add("open");
}

function closeSettings() {
  settingsDrawer.classList.remove("open");
  settingsDrawerBackdrop.classList.remove("open");
}

function resetRoleEditor() {
  roleEditorId.value = "";
  roleEditorName.value = "";
  roleEditorSeat.value = "主解释者";
  roleEditorDescription.value = "";
  roleEditorPrompt.value = "";
  roleEditorStance.value = "支持原命题";
  roleEditorTemper.value = "稳健";
  roleEditorColor.value = "sky";
  syncRoleColorPicker("sky");
  roleEditorSourceLabel.value = "";
}

function toggleRoleEditor(visible) {
  roleEditor.classList.toggle("hidden", !visible);
}

function fillRoleEditor(role) {
  roleEditorId.value = role.id;
  roleEditorName.value = role.name;
  ensureSelectValue(roleEditorSeat, role.seat);
  roleEditorSeat.value = role.seat;
  roleEditorDescription.value = role.description;
  roleEditorPrompt.value = role.systemPrompt || "";
  ensureSelectValue(roleEditorStance, role.traits.stance);
  ensureSelectValue(roleEditorTemper, role.traits.temper);
  roleEditorStance.value = role.traits.stance;
  roleEditorTemper.value = role.traits.temper;
  roleEditorColor.value = roleColor(role);
  syncRoleColorPicker(roleColor(role));
  roleEditorSourceLabel.value = role.sourceLabel || "";
}

function syncRoleColorPicker(value) {
  roleEditorColor.value = value;
  roleEditorColorPicker.querySelectorAll('input[name="role-color"]').forEach((input) => {
    input.checked = input.value === value;
  });
}

function resetModelProfileForm() {
  profileId.value = "";
  profileDisplayName.value = "";
  profileProviderName.value = "";
  profileCompatibility.value = "openai";
  profileBaseUrl.value = "";
  profileEndpointPath.value = "/chat/completions";
  profileModelId.value = "";
  profileApiKey.value = "";
  providerTemplateSelect.value = "custom-new";
  deleteModelProfileButton.disabled = true;
}

function fillModelProfileForm(profile) {
  profileId.value = profile.id || "";
  profileDisplayName.value = profile.displayName || "";
  profileProviderName.value = profile.providerName || "";
  profileCompatibility.value = profile.compatibility || "openai";
  profileBaseUrl.value = profile.baseUrl || "";
  profileEndpointPath.value = profile.endpointPath || "/chat/completions";
  profileModelId.value = profile.modelId || "";
  profileApiKey.value = profile.apiKey || "";
  providerTemplateSelect.value = profile.id || "";
  deleteModelProfileButton.disabled = !!profile.locked;
}

function setProfileTestStatus(text, tone = "") {
  profileTestStatus.textContent = text;
  profileTestStatus.className = `settings-status ${tone}`.trim();
}

function summaryLooksBiblical(summary) {
  return /圣经|经文|章节|属灵|解经|查经|讲章|福音|旧约|新约|创世记|出埃及记|利未记|民数记|申命记|约书亚记|士师记|路得记|撒母耳记|列王记|历代志|以斯拉记|尼希米记|以斯帖记|约伯记|诗篇|箴言|传道书|雅歌|以赛亚书|耶利米书|耶利米哀歌|以西结书|但以理书|何西阿书|约珥书|阿摩司书|俄巴底亚书|约拿书|弥迦书|那鸿书|哈巴谷书|西番雅书|哈该书|撒迦利亚书|玛拉基书|马太福音|马可福音|路加福音|约翰福音|使徒行传|罗马书|哥林多|加拉太书|以弗所书|腓立比书|歌罗西书|帖撒罗尼迦|提摩太|提多书|希伯来书|雅各书|彼得|约翰一书|犹大书|启示录/.test(summary);
}

function makeRecommendedRole(roleId, createdAt, description) {
  const sourceRole = baseRoles.find((role) => role.id === roleId);
  if (!sourceRole) {
    return null;
  }
  return {
    ...sourceRole,
    id: `recommended-${createdAt}-${roleId}`,
    description: description || sourceRole.description,
    source: "recommended",
    sourceLabel: "系统临时生成",
  };
}

function extractJsonArray(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) {
    return trimmed;
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return "";
}

function normalizeGeneratedRole(generatedRole, index, createdAt) {
  const name = String(generatedRole.name || generatedRole.title || `临时角色${index + 1}`).trim();
  const seat = String(generatedRole.seat || generatedRole.role || "专题分析者").trim();
  const description = String(generatedRole.description || generatedRole.focus || generatedRole.why || `${name} 负责从自己的专业角度参与本次讨论。`).trim();
  const method = String(generatedRole.method || generatedRole.style || generatedRole.approach || "针对性分析").trim();
  const stance = String(generatedRole.stance || generatedRole.position || "补充关键视角").trim();
  const temper = String(generatedRole.temper || generatedRole.tone || "冷静").trim();
  const prompt = String(generatedRole.systemPrompt || generatedRole.prompt || `${name}，请围绕本次话题从“${description}”出发发言。`).trim();
  const color = ROLE_COLORS.includes(generatedRole.color) ? generatedRole.color : ROLE_COLORS[index % ROLE_COLORS.length];
  const avatar = String(generatedRole.avatar || name.slice(0, 1) || "人").slice(0, 1);

  return {
    id: `recommended-${createdAt}-${index}`,
    name,
    seat,
    description,
    traits: {
      stance,
      method,
      temper,
    },
    color,
    avatar,
    source: "recommended",
    sourceLabel: "系统临时生成",
    systemPrompt: prompt,
  };
}

async function requestGeneratedRecommendedRoles(summary) {
  const profile = getPrimarySummaryProfile();
  if (!profile) {
    throw new Error("还没有可用模型，无法生成系统临时角色。");
  }

  const promptSections = [
    "你现在要为一次特定话题的圆桌讨论生成一组临时角色。",
    "这些角色不是人物库里的通用职业，而是只为本次话题服务的临时推荐。",
    "请根据话题本身去想，哪些人最该来，不要机械套模板。",
    "优先混合三种角色来源：一类是针对这个行业或问题的虚拟复合专家；一类是相关领域历史上著名的人物、思想代表、经典作者或标志性实有人物；一类是公众非常熟悉、且与本次问题视角高度匹配的著名虚构人物。",
    "只要贴题，就不要保守。不要全给职业头衔，也不要全给抽象专家，要让这桌人一看就有辨识度、有冲突、有记忆点。",
    "如果话题明显适合引入历史名人或著名虚构人物，就至少放进 3 到 5 个这类角色；如果不适合，再以高匹配的虚拟专家为主。",
    "例如：案件讨论要考虑刑侦、法医、现场环境、法律、建筑/设备、安全、媒体传播、心理等；野外求生要考虑生存、急救、地形、气象、后勤等。",
    "输出 12 到 13 个角色，优先让视角互补，避免塞入明显无关的人。",
    "生成时要避免同质化：不要重复 3 个本质一样的专家；每个角色都应该提供一种别人替代不了的看法。",
    "严格输出 JSON 数组，不要解释，不要 Markdown。",
    "每个元素必须包含字段：name, seat, description, stance, method, temper, systemPrompt。可选字段：color, avatar。",
    "systemPrompt 要明确该角色本次该怎么看问题，description 要说明为什么这个角色适合这个话题。",
    `本次话题：${summary}`,
  ];

  let lastError = new Error("系统临时角色生成失败：未知错误。");
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retryNote = attempt === 1 ? "" : "上一次输出没有通过解析。这一次请只返回合法 JSON 数组，首字符必须是 [，末字符必须是 ]，中间不要夹任何解释。";
    const prompt = [...promptSections, retryNote].filter(Boolean).join("\n\n");
    try {
      const raw = await requestModelText(profile, prompt, 1800);
      const jsonText = extractJsonArray(raw);
      if (!jsonText) {
        throw new Error("系统临时角色生成失败：模型没有返回可解析的 JSON 数组。");
      }

      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed) || !parsed.length) {
        throw new Error("系统临时角色生成失败：返回结果不是有效角色列表。");
      }

      const createdAt = Date.now();
      return parsed.slice(0, 12).map((item, index) => normalizeGeneratedRole(item, index, createdAt));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError;
}

function createFallbackRecommendedRoles(summary) {
  const createdAt = Date.now();
  const shortSummary = summary.slice(0, 18);

  if (summaryLooksBiblical(summary)) {
    return [
      makeRecommendedRole("pastor", createdAt, `围绕“${shortSummary}”优先讲经文的属灵重点、讲道落点和现实应用。`),
      makeRecommendedRole("elder", createdAt, `围绕“${shortSummary}”优先辨别这段内容对教会群体、生命成熟和属灵秩序的提醒。`),
      makeRecommendedRole("biblical-scholar", createdAt, `围绕“${shortSummary}”优先从上下文、原文语义和跨卷呼应角度解经。`),
      makeRecommendedRole("systematic-theologian", createdAt, `围绕“${shortSummary}”优先判断这段经文与整本圣经教义脉络怎样对齐。`),
      makeRecommendedRole("historian", createdAt, `围绕“${shortSummary}”补足作者处境、历史背景和制度语境，避免断章取义。`),
      makeRecommendedRole("matthew-henry", createdAt, `围绕“${shortSummary}”优先给出经典注释传统里的属灵提醒和生活劝勉。`),
      makeRecommendedRole("augustine", createdAt, `围绕“${shortSummary}”优先从恩典、爱与人的内心秩序角度理解经文。`),
      makeRecommendedRole("john-calvin", createdAt, `围绕“${shortSummary}”优先从经文脉络、神主权与人责任的张力角度提出判断。`),
      makeRecommendedRole("martin-luther", createdAt, `围绕“${shortSummary}”优先抓住福音核心、信心与良心层面的重点。`),
      makeRecommendedRole("spurgeon", createdAt, `围绕“${shortSummary}”优先把解释推进到讲章应用、安慰、劝勉和回应。`),
      makeRecommendedRole("neutral-judge", createdAt, "负责在多种解经和应用路径之间收束争议，固定共识与待验证点。"),
    ].filter(Boolean);
  }

  return [
    makeRecommendedRole("lawyer", createdAt, `围绕“${shortSummary}”优先看责任边界、合规约束和执行风险。`),
    makeRecommendedRole("historian", createdAt, `围绕“${shortSummary}”补足前因后果、历史路径和背景条件，防止断章取义。`),
    makeRecommendedRole("doctor", createdAt, `围绕“${shortSummary}”优先看安全性、误伤代价、恢复周期和专业边界。`),
    makeRecommendedRole("teacher", createdAt, `围绕“${shortSummary}”优先把复杂问题拆成普通人能听懂的结构。`),
    makeRecommendedRole("product-manager", createdAt, `围绕“${shortSummary}”优先看用户价值、优先级和版本边界。`),
    makeRecommendedRole("ai-engineer", createdAt, `围绕“${shortSummary}”优先看实现路径、接口设计和工程风险。`),
    makeRecommendedRole("police-investigator", createdAt, `围绕“${shortSummary}”优先看调查、取证、流程控制和最坏情况处置。`),
    makeRecommendedRole("architect", createdAt, `围绕“${shortSummary}”优先看结构限制、空间组织和真实落地条件。`),
    makeRecommendedRole("auditor", createdAt, `围绕“${shortSummary}”优先看成本、预算、账目合理性和可持续性。`),
    makeRecommendedRole("neutral-judge", createdAt, "负责在多职业观点之间收束争议，固定共识和待验证点。"),
  ].filter(Boolean);
}

async function seedDatabase() {
  const currentRoles = await dbGetAll(ROLE_STORE);
  const baseRoleIds = new Set(baseRoles.map((role) => role.id));
  const staleBaseRoles = currentRoles.filter((role) => role.source === "base" && !baseRoleIds.has(role.id));
  if (staleBaseRoles.length) {
    await Promise.all(staleBaseRoles.map((role) => dbDelete(ROLE_STORE, role.id)));
  }
  await Promise.all(baseRoles.map((role) => dbPut(ROLE_STORE, role)));

  const currentProfiles = await dbGetAll(PROFILE_STORE);
  const existingProfileIds = new Set(currentProfiles.map((profile) => profile.id));
  const missingProfiles = defaultProfiles.filter((profile) => !existingProfileIds.has(profile.id));
  if (missingProfiles.length) {
    await Promise.all(missingProfiles.map((profile) => dbPut(PROFILE_STORE, profile)));
  }

  const currentMappings = await loadAppState("modelMappings", null);
  if (!currentMappings) {
    await saveAppState("modelMappings", {
      main: defaultProfiles[0].id,
      challenger: defaultProfiles[1].id,
      judge: defaultProfiles[0].id,
    });
  }
}

async function hydrateState() {
  state.peopleRoles = (await dbGetAll(ROLE_STORE)).map(ensureRoleDefaults);
  state.modelProfiles = (await dbGetAll(PROFILE_STORE)).map(normalizeProfile);
  state.mappings = await loadAppState("modelMappings", {
    main: defaultProfiles[0].id,
    challenger: defaultProfiles[1].id,
    judge: defaultProfiles[0].id,
  });
  state.topics = await loadAppState("topicSessions", []);
  state.activeTopicId = await loadAppState("activeTopicId", "");
  if (!state.topics.length) {
    const initialTopic = createTopicSession();
    state.topics = [initialTopic];
    state.activeTopicId = initialTopic.id;
  }
}

async function saveRole(role) {
  await dbPut(ROLE_STORE, role);
  await hydrateState();
  renderPeopleSummary();
  renderPeopleLibrary();
  renderSeatPicker();
}

async function deleteRole(roleId) {
  await dbDelete(ROLE_STORE, roleId);
  state.selectedIds.delete(roleId);
  delete state.seatAssignments[roleId];
  delete state.discussionOrder[roleId];
  delete state.seatModelAssignments[roleId];
  syncDiscussionOrder();
  await hydrateState();
  renderPeopleSummary();
  renderPeopleLibrary();
  renderSeatPicker();
  renderSeatStack();
}

async function saveModelProfile(profile) {
  await dbPut(PROFILE_STORE, profile);
  await hydrateState();
  renderConnectedModelList();
  renderModelMappings();
  renderProviderTemplateSelect();
}

async function toggleLibraryFavorite(roleId) {
  const role = getPeopleRoleById(roleId);
  if (!role) {
    return;
  }

  if (isFavoriteRole(role)) {
    if (role.originalSource === "recommended" || role.recommendedFrom) {
      await deleteRole(role.id);
      updateSeatFeedback(`已取消收藏：${role.name}`, "");
      return;
    }

    const restoredRole = {
      ...role,
      source: role.originalSource || "custom",
      sourceLabel: role.originalSourceLabel || role.sourceLabel || "自定义",
      originalSource: "",
      originalSourceLabel: "",
    };
    await saveRole(restoredRole);
    updateSeatFeedback(`已取消收藏：${role.name}`, "");
    return;
  }

  const nextRole = {
    ...role,
    source: "favorite",
    originalSource: role.source,
    originalSourceLabel: role.sourceLabel || "",
  };
  await saveRole(nextRole);
  updateSeatFeedback(`已收藏：${role.name}`, "success");
}

async function deleteModelProfile(profileIdValue) {
  const profile = state.modelProfiles.find((item) => item.id === profileIdValue);
  if (profile?.locked) {
    const builtin = defaultProfileMap.get(profile.id);
    await dbPut(PROFILE_STORE, { ...builtin, configured: false, apiKey: "", lastTestStatus: "" });
  } else {
    await dbDelete(PROFILE_STORE, profileIdValue);
  }
  if (state.mappings.main === profileIdValue) {
    state.mappings.main = "";
  }
  if (state.mappings.challenger === profileIdValue) {
    state.mappings.challenger = "";
  }
  if (state.mappings.judge === profileIdValue) {
    state.mappings.judge = "";
  }
  Object.keys(state.seatModelAssignments).forEach((roleId) => {
    if (state.seatModelAssignments[roleId] === profileIdValue) {
      delete state.seatModelAssignments[roleId];
    }
  });
  await saveAppState("modelMappings", state.mappings);
  await hydrateState();
  renderConnectedModelList();
  renderModelMappings();
  renderProviderTemplateSelect();
}

async function favoriteRecommendedRole(roleId) {
  const role = getRecommendedRoleById(roleId);
  if (!role) {
    return;
  }

  const existingFavorite = state.peopleRoles.find((item) => item.recommendedFrom === roleId && isFavoriteRole(item));
  if (existingFavorite) {
    updateSeatFeedback(`这个人物已经在你的人物库里：${role.name}`, "success");
    return;
  }

  const confirmed = await openConfirmDialog({
    title: "加入人物库",
    message: `把“${role.name}”永久加入你的人物库？后面你可以继续修改这个人物。`,
    confirmText: "加入",
  });
  if (!confirmed) {
    return;
  }

  const savedRole = {
    ...role,
    id: `favorite-${Date.now()}`,
    source: "favorite",
    originalSource: "recommended",
    originalSourceLabel: role.sourceLabel || "",
    recommendedFrom: role.id,
  };

  await saveRole(savedRole);

  renderSeatStack();
  updateSeatFeedback(`已收藏到人物库：${role.name}`, "success");
}

function toggleSeatSelection(roleId) {
  if (state.selectedIds.has(roleId)) {
    state.selectedIds.delete(roleId);
    delete state.seatAssignments[roleId];
    delete state.discussionOrder[roleId];
    delete state.seatModelAssignments[roleId];
    syncDiscussionOrder();
    renderSeatPicker();
    renderSeatStack();
    updateSeatFeedback(`已移出席位：${getRoleById(roleId)?.name || "人物"}`, "");
    void syncCurrentTopicSnapshot();
    return;
  }

  if (!state.seatsReady) {
    updateSeatFeedback("请先确认任务，等待系统生成人物后再配置席位", "pending");
    return;
  }

  if (state.selectedIds.size >= MAX_SELECTED_ROLES) {
    updateSeatFeedback(`最多保留 ${MAX_SELECTED_ROLES} 个席位，请先删掉一个再加。`, "pending");
    return;
  }

  state.selectedIds.add(roleId);
  syncDiscussionOrder();
  const role = getRoleById(roleId);
  if (role) {
    state.seatAssignments[roleId] = suggestSeatAssignment(role);
    ensureSeatModelAssignment(role);
  }
  ensureCoreAssignments();
  renderSeatPicker();
  renderSeatStack();
  updateSeatFeedback(`已加入席位：${getRoleById(roleId)?.name || "人物"}`, "success");
  void syncCurrentTopicSnapshot();
}

async function handleRoleEditorSave() {
  const name = roleEditorName.value.trim();
  const seat = roleEditorSeat.value.trim();
  const description = roleEditorDescription.value.trim();
  if (!name || !seat || !description) {
    updateSeatFeedback("人物名称、席位定位、人物说明都要填。", "pending");
    return;
  }

  const existing = roleEditorId.value ? getPeopleRoleById(roleEditorId.value) : null;
  const role = {
    name,
    seat,
    description,
    systemPrompt: roleEditorPrompt.value.trim() || `${name}要以${seat}身份发言，重点是${description}`,
    traits: {
      stance: roleEditorStance.value || "自定义",
      method: existing?.traits.method || "综合求证",
      temper: roleEditorTemper.value || "自定义",
    },
    color: roleEditorColor.value,
    source: existing?.source || "custom",
    sourceLabel: roleEditorSourceLabel.value.trim() || existing?.sourceLabel || "自定义",
  };

  await saveRole(role);
  resetRoleEditor();
  toggleRoleEditor(false);
}

async function handleModelProfileSave(event) {
  event.preventDefault();
  const displayName = profileDisplayName.value.trim();
  const providerName = profileProviderName.value.trim();
  const baseUrl = profileBaseUrl.value.trim();
  const endpointPath = profileEndpointPath.value.trim() || "/chat/completions";
  const modelIdValue = profileModelId.value.trim();
  const apiKey = profileApiKey.value.trim();

  if (!displayName || !providerName || !baseUrl || !modelIdValue) {
    setProfileTestStatus("基础字段还没填完整", "error");
    return;
  }

  const profile = {
    id: profileId.value || `profile-${Date.now()}`,
    displayName,
    providerName,
    compatibility: profileCompatibility.value,
    baseUrl,
    endpointPath,
    modelId: modelIdValue,
    apiKey,
    locked: state.modelProfiles.find((item) => item.id === profileId.value)?.locked || false,
    configured: true,
    lastTestStatus: state.modelProfiles.find((item) => item.id === profileId.value)?.lastTestStatus || "",
  };

  await saveModelProfile(profile);
  fillModelProfileForm(profile);
  setProfileTestStatus(profile.locked ? "已保存，这个接入现在会出现在下面的已接入模型列表" : "已保存到已接入模型列表，可继续用于角色映射", "success");
}

async function testProfileConnectivity() {
  const existing = profileId.value ? state.modelProfiles.find((item) => item.id === profileId.value) : null;
  const profile = {
    id: profileId.value || `profile-${Date.now()}`,
    displayName: profileDisplayName.value.trim() || profileProviderName.value.trim() || "未命名配置",
    providerName: profileProviderName.value.trim() || "自定义 Provider",
    compatibility: profileCompatibility.value,
    baseUrl: profileBaseUrl.value.trim(),
    endpointPath: profileEndpointPath.value.trim() || "/chat/completions",
    modelId: profileModelId.value.trim(),
    apiKey: profileApiKey.value.trim(),
    locked: existing?.locked || false,
    configured: !!existing?.configured,
  };

  if (!profile.baseUrl || !profile.modelId) {
    setProfileTestStatus("先填 Base URL 和模型 ID", "error");
    return;
  }

  setProfileTestStatus("测试中...", "");

  try {
    let response;
    if (profile.compatibility === "anthropic") {
      response = await fetch(joinUrl(profile.baseUrl, profile.endpointPath || "/messages"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": profile.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: profile.modelId,
          max_tokens: 1,
          messages: [{ role: "user", content: "1" }],
        }),
      });
    } else {
      response = await fetch(joinUrl(profile.baseUrl, profile.endpointPath), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(profile.apiKey ? { authorization: `Bearer ${profile.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: profile.modelId,
          messages: [{ role: "user", content: "1" }],
          max_tokens: 1,
        }),
      });
    }

    if (!response.ok) {
      if (existing) {
        await saveModelProfile({ ...existing, ...profile, lastTestStatus: "error" });
      }
      setProfileTestStatus(`测试失败 ${response.status}`, "error");
      return;
    }

    if (existing) {
      await saveModelProfile({ ...existing, ...profile, lastTestStatus: "success" });
    }
    setProfileTestStatus("测试通过", "success");
  } catch (error) {
    console.error(error);
    if (existing) {
      await saveModelProfile({ ...existing, ...profile, lastTestStatus: "error" });
    }
    setProfileTestStatus("测试失败，可能被 CORS 或网络拦截", "error");
  }
}

function appendUserMessage(content, attachments = []) {
  const activeTopic = getActiveTopic();
  if (activeTopic?.status === "completed") {
    activeTopic.status = "active";
    state.latestReportText = "";
    state.latestReportFileName = "";
  }
  appendMarkup(
    createMessageMarkup({
      speakerId: "user",
      label: "我",
      sublabel: "刚发送",
      body: content,
      avatarLabel: "我",
      avatarClass: "avatar-user",
      tone: "user",
      attachments,
    })
  );
  setSpeakerCard("补充需求中", "已收到新输入", "主 AI 正在重新整理任务定义。", "我");
  void syncCurrentTopicSnapshot();
}

function appendAiSummary(content) {
  const summary = content.trim();
  state.lastSummary = summary;
  updateCurrentTopicTitle(deriveTopicTitle());
  appendMarkup(
    createMessageMarkup({
      speakerId: "system",
      label: "系",
      sublabel: "整理后的任务定义",
      body: `请确认这是不是你要的任务定义：${summary}`,
      avatarLabel: "系",
      avatarClass: "avatar-system",
      tone: "system",
      actions: `
        <div class="message-actions">
          <button class="ghost-link js-confirm-topic" type="button">确认</button>
          <button class="ghost-link js-supplement-topic" type="button">继续补充</button>
        </div>
      `,
    })
  );
  setSpeakerCard("任务整理中", "等待用户确认", "确认后自动开始生成人物。", "系");
  void syncCurrentTopicSnapshot();
}

function appendSupplementPrompt() {
  appendMarkup(
    createMessageMarkup({
      speakerId: "system",
      label: "系",
      sublabel: "继续补充",
      body: "继续直接说即可。你可以补充更看重什么、是否允许强反方，以及希望加入哪些人物。",
      avatarLabel: "系",
      avatarClass: "avatar-system",
      tone: "system",
    })
  );
  setSpeakerCard("继续补充中", "等待更多条件", "可继续说明人物倾向、语气和目标。", "系");
  userInput.focus();
  void syncCurrentTopicSnapshot();
}

function renderSeedConversation() {
  discussionStream.innerHTML = createMessageMarkup({
    speakerId: "system",
    label: "系",
    sublabel: "任务创建开始",
    body: "现在有什么需求请直接发送。我会先在这里帮你整理、追问、确认，然后再开始生成人物。",
    avatarLabel: "系",
    avatarClass: "avatar-system",
    tone: "system",
  });
}

async function finishSeatGeneration() {
  try {
    state.recommendedRoles = await requestGeneratedRecommendedRoles(state.lastSummary || "当前话题");
    updateSeatFeedback(`系统已按本次话题临时生成 ${state.recommendedRoles.length} 个推荐角色。`, "success");
  } catch (error) {
    console.error(error);
    state.recommendedRoles = createFallbackRecommendedRoles(state.lastSummary || "当前话题");
    updateSeatFeedback("临时角色生成失败，已切回本地推荐池。你也可以继续调整或重试。", "pending");
  }
  state.selectedIds.clear();
  state.seatAssignments = {};
  state.discussionOrder = {};
  state.seatModelAssignments = {};
  const defaultRecommended = [
    ...state.recommendedRoles.slice(0, Math.min(4, state.recommendedRoles.length)).map((role) => role.id),
    state.recommendedRoles.find((role) => role.id.includes("neutral-judge"))?.id,
  ].filter(Boolean);
  [...new Set(defaultRecommended)].slice(0, 5).forEach((roleId) => state.selectedIds.add(roleId));
  syncDiscussionOrder();
  [...state.selectedIds].forEach((roleId) => {
    const role = getRoleById(roleId);
    if (role) {
      state.seatAssignments[roleId] = suggestSeatAssignment(role);
      ensureSeatModelAssignment(role);
    }
  });
  ensureCoreAssignments();
  state.generatingSeats = false;
  state.seatsReady = true;
  renderSeatPicker();
  renderSeatStack();
  appendMarkup(
    createMessageMarkup({
      speakerId: "system",
      label: "系",
      sublabel: "人物生成完成",
      body: "本次系统临时人物已经生成。你现在可以去选角器里从系统临时生成和人物库里混合挑选，也可以把临时人物收藏进人物库。",
      avatarLabel: "系",
      avatarClass: "avatar-system",
      tone: "system",
    })
  );
  setSpeakerCard("人物已生成", "可开始配置席位", "系统临时生成的人物和人物库现在都可以混合使用。", "系");
  updateLiveStatus(`已临时生成 ${state.recommendedRoles.length} 个针对性角色，可继续挑选和调整。`, "success");
  if (!seatFeedback.textContent.includes("临时生成失败")) {
    updateSeatFeedback("人物已生成，可从系统临时生成和人物库里混合选席位", "success");
  }
  void syncCurrentTopicSnapshot();
}

function startSeatGeneration() {
  if (state.generatingSeats) {
    return;
  }
  state.topicConfirmed = true;
  state.generatingSeats = true;
  state.seatsReady = false;
  state.selectedIds.clear();
  state.seatAssignments = {};
  state.discussionOrder = {};
  state.seatModelAssignments = {};
  renderSeatStack();
  updateSeatFeedback("正在生成人物，请稍候", "pending");
  updateLiveStatus("正在根据当前任务生成推荐角色。", "pending");
  setSpeakerCard("正在生成人物", "系统自动匹配中", "会根据你的内容先给一组推荐人物。", "系");
  appendMarkup(
    createMessageMarkup({
      speakerId: "system",
      label: "系",
      sublabel: "已确认任务定义",
      body: "已确认。系统正在按本次任务临时生成人物，并尽量给出更有针对性的角色组合。",
      avatarLabel: "系",
      avatarClass: "avatar-system",
      tone: "system",
    })
  );
  clearTimeout(state.generatingTimer);
  state.generatingTimer = setTimeout(() => {
    void finishSeatGeneration();
  }, 900);
  void syncCurrentTopicSnapshot();
}

function seedConversation() {
  clearTimeout(state.generatingTimer);
  state.selectedIds.clear();
  state.topicConfirmed = false;
  state.seatsReady = false;
  state.generatingSeats = false;
  state.lastSummary = "";
  state.latestReportText = "";
  state.latestReportFileName = "";
  state.recommendedRoles = [];
  state.seatModelAssignments = {};
  state.seatAssignments = {};
  state.pendingAttachments = [];
  renderSeedConversation();
  setSpeakerCard("任务整理中", "等待用户输入", "先整理，再确认，再生成人物。", "系");
  updateLiveStatus("等待开始讨论", "");
  updateSeatFeedback("人物尚未生成", "");
  renderSeatStack();
  renderSeatPicker();
  renderAttachmentStrip();
  userInput.value = "";
  updateCurrentTopicTitle("未命名任务");
  autoResizeTextarea();
  scrollToLatest();
  void syncCurrentTopicSnapshot();
}

function removePendingAttachment(index) {
  state.pendingAttachments.splice(index, 1);
  renderAttachmentStrip();
}

confirmCancel.addEventListener("click", () => closeConfirmDialog(false));
confirmAccept.addEventListener("click", () => closeConfirmDialog(true));
confirmBackdrop.addEventListener("click", () => closeConfirmDialog(false));

function bindEvents() {
  openPeopleLibraryButton.addEventListener("click", () => {
    renderPeopleLibrary();
    openPeopleLibrary();
  });

  closePeopleLibrary.addEventListener("click", closePeopleLibraryModal);
  peopleLibraryBackdrop.addEventListener("click", closePeopleLibraryModal);

  openSeatPickerButton.addEventListener("click", () => {
    state.seatSource = state.seatsReady ? "recommended" : "library";
    renderSeatPicker();
    openSeatPicker();
    updateSeatFeedback(
      state.seatsReady ? "在这里给本轮讨论挑人。系统临时生成和人物库是两个来源。" : "人物还没生成。你现在可以先浏览人物库，确认任务后会出现系统临时生成。",
      state.seatsReady ? "success" : "pending"
    );
  });

  openSeatPickerRoleEditor.addEventListener("click", () => {
    closeSeatPickerModal();
    resetRoleEditor();
    roleEditorSourceLabel.value = "自定义补位";
    toggleRoleEditor(true);
    openPeopleLibrary();
  });

  closeSeatPicker.addEventListener("click", closeSeatPickerModal);
  seatPickerBackdrop.addEventListener("click", closeSeatPickerModal);

  openSettingsDrawer.addEventListener("click", openSettings);
  closeSettingsDrawer.addEventListener("click", closeSettings);
  settingsDrawerBackdrop.addEventListener("click", closeSettings);

  openRoleEditorButton.addEventListener("click", () => {
    resetRoleEditor();
    toggleRoleEditor(true);
  });

  roleEditorColorPicker.addEventListener("change", (event) => {
    const input = event.target.closest('input[name="role-color"]');
    if (!input) {
      return;
    }
    syncRoleColorPicker(input.value);
  });

  cancelRoleEditor.addEventListener("click", () => {
    resetRoleEditor();
    toggleRoleEditor(false);
  });

  saveRoleEditorButton.addEventListener("click", handleRoleEditorSave);

  peopleFilterTabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".tab-pill");
    if (!tab) {
      return;
    }
    state.peopleFilter = tab.dataset.filter;
    renderPeopleLibrary();
  });

  peopleSearch.addEventListener("input", renderPeopleLibrary);
  seatPickerSearch.addEventListener("input", renderSeatPicker);

  peopleLibraryGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".library-card");
    if (!card) {
      return;
    }
    const roleId = card.dataset.roleId;
    const role = getPeopleRoleById(roleId);
    if (!role) {
      return;
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "edit") {
      fillRoleEditor(role);
      toggleRoleEditor(true);
      return;
    }
    if (action === "delete") {
      deleteRole(roleId);
    }
  });

  seatSourceTabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".tab-pill");
    if (!tab) {
      return;
    }
    state.seatSource = tab.dataset.source;
    renderSeatPicker();
  });

  seatPickerGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".picker-card");
    if (!card) {
      return;
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "favorite") {
      favoriteRecommendedRole(card.dataset.roleId);
      return;
    }
    toggleSeatSelection(card.dataset.roleId);
  });

  seatStack.addEventListener("click", (event) => {
    const button = event.target.closest(".seat-delete");
    if (!button) {
      return;
    }
    state.selectedIds.delete(button.dataset.roleId);
    delete state.seatAssignments[button.dataset.roleId];
    delete state.discussionOrder[button.dataset.roleId];
    syncDiscussionOrder();
    renderSeatStack();
    renderSeatPicker();
    updateSeatFeedback(`已移出席位：${getRoleById(button.dataset.roleId)?.name || "人物"}`, "");
    void syncCurrentTopicSnapshot();
  });

  seatStack.addEventListener("change", (event) => {
    const modelSelect = event.target.closest(".seat-model-select");
    if (modelSelect) {
      state.seatModelAssignments[modelSelect.dataset.roleId] = modelSelect.value;
      renderSeatStack();
      updateSeatFeedback(`已为 ${getRoleById(modelSelect.dataset.roleId)?.name || "人物"} 切换模型：${getConfiguredProfileById(modelSelect.value)?.displayName || "未设置"}`, "success");
      void syncCurrentTopicSnapshot();
      return;
    }

    const orderSelect = event.target.closest(".seat-order-select");
    if (orderSelect) {
      setDiscussionOrder(orderSelect.dataset.roleId, Number(orderSelect.value || 1));
      renderSeatStack();
      updateSeatFeedback(`已调整讨论顺序：${getRoleById(orderSelect.dataset.roleId)?.name || "人物"} -> 第 ${orderSelect.value} 位`, "success");
      void syncCurrentTopicSnapshot();
      return;
    }

    const select = event.target.closest(".seat-assignment-select");
    if (!select) {
      return;
    }
    setSeatAssignment(select.dataset.roleId, select.value);
    ensureCoreAssignments();
    renderSeatStack();
    const role = getRoleById(select.dataset.roleId);
    updateSeatFeedback(`已设置 ${role?.name || "人物"} 本轮扮演：${ROUND_ROLE_LABELS[select.value]}`, "success");
    void syncCurrentTopicSnapshot();
  });

  modelProfileForm.addEventListener("submit", handleModelProfileSave);
  resetModelProfile.addEventListener("click", () => {
    resetModelProfileForm();
    setProfileTestStatus("已清空表单", "");
  });
  deleteModelProfileButton.addEventListener("click", () => {
    if (!profileId.value) {
      setProfileTestStatus("当前还没有选中已保存配置", "error");
      return;
    }
    deleteModelProfile(profileId.value);
    resetModelProfileForm();
    setProfileTestStatus("配置已删除", "");
  });
  testModelProfileButton.addEventListener("click", testProfileConnectivity);
  providerTemplateSelect.addEventListener("change", () => {
    if (providerTemplateSelect.value === "custom-new" || !providerTemplateSelect.value) {
      resetModelProfileForm();
      setProfileTestStatus("正在新建自定义接入", "");
      return;
    }

    const profile = state.modelProfiles.find((item) => item.id === providerTemplateSelect.value);
    if (!profile) {
      resetModelProfileForm();
      setProfileTestStatus("正在新建自定义接入", "");
      return;
    }
    fillModelProfileForm(profile);
    setProfileTestStatus(profile.locked ? "已载入系统内置接入，可填写密钥后直接使用" : "已载入自定义接入，可继续修改或删除", "");
  });

  connectedModelList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }
    const profile = state.modelProfiles.find((item) => item.id === button.dataset.profileId);
    if (!profile) {
      return;
    }
    if (button.dataset.action === "edit-profile") {
      fillModelProfileForm(profile);
      setProfileTestStatus("已载入这个接入配置，可继续修改", "");
      return;
    }
    if (button.dataset.action === "delete-profile") {
      deleteModelProfile(profile.id);
      if (profileId.value === profile.id) {
        resetModelProfileForm();
      }
      setProfileTestStatus(profile.locked ? "已从已接入列表移除，可随时重新配置" : "配置已删除", "");
    }
  });

  attachFilesButton.addEventListener("click", () => {
    attachmentInput.click();
  });

  attachmentInput.addEventListener("change", () => {
    const files = Array.from(attachmentInput.files || []);
    state.pendingAttachments = state.pendingAttachments.concat(files);
    attachmentInput.value = "";
    renderAttachmentStrip();
  });

  composerAttachments.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-attachment-index]");
    if (!chip) {
      return;
    }
    removePendingAttachment(Number(chip.dataset.attachmentIndex));
  });

  userInput.addEventListener("input", autoResizeTextarea);

  followToggle.addEventListener("click", () => {
    if (state.autoFollow) {
      setAutoFollow(false);
      return;
    }
    scrollToLatest();
  });

  discussionStream.addEventListener("scroll", () => {
    setAutoFollow(isNearBottom(discussionStream));
  });

  discussionStream.addEventListener("click", (event) => {
    if (event.target.closest(".js-confirm-topic")) {
      startSeatGeneration();
      return;
    }
    if (event.target.closest(".js-export-txt") || event.target.closest(".js-download-report")) {
      downloadTextFile(`${buildExportBaseName()}-完整讨论.txt`, buildFullExportText());
      return;
    }
    if (event.target.closest(".js-export-docx")) {
      downloadDocxFile(`${buildExportBaseName()}-完整讨论.docx`, buildFullExportHtml());
      return;
    }
    if (event.target.closest(".js-export-pdf")) {
      exportPdfDocument(`${buildExportBaseName()}-完整讨论`, buildFullExportHtml());
      return;
    }
    if (event.target.closest(".js-supplement-topic")) {
      appendSupplementPrompt();
    }
  });

  sendCommand.addEventListener("click", async () => {
    const content = userInput.value.trim();
    if (!content && !state.pendingAttachments.length) {
      return;
    }
    const attachments = [...state.pendingAttachments];
    appendUserMessage(content || "我上传了附件，请结合附件继续整理。", state.pendingAttachments);
    state.pendingAttachments = [];
    renderAttachmentStrip();
    userInput.value = "";
    autoResizeTextarea();
    setSpeakerCard("主 AI 整理中", "正在调用真实模型", "会先用你已接入的主 AI 整理任务，再回来让你确认。", "系");
    sendCommand.disabled = true;
    try {
      const summary = await requestAiTaskSummary(content || "已收到附件，请结合附件整理任务定义", attachments);
      appendAiSummary(summary);
    } catch (error) {
      console.error(error);
      if (!userInput.value && !state.pendingAttachments.length) {
        state.pendingAttachments = attachments;
        renderAttachmentStrip();
        userInput.value = content;
        autoResizeTextarea();
      }
      appendMarkup(
        createMessageMarkup({
          speakerId: "system",
          label: "系",
          sublabel: "主 AI 整理失败",
          body: error.message || "主 AI 整理失败，请检查模型接入后重试。",
          avatarLabel: "系",
          avatarClass: "avatar-system",
          tone: "system",
        })
      );
      setSpeakerCard("主 AI 调用失败", "请检查主 AI 接入", error.message || "当前无法调用真实模型整理任务定义。", "系");
    } finally {
      sendCommand.disabled = false;
    }
  });

  newTopicButton.addEventListener("click", () => {
    handleNewTopic();
  });

  openSeatPickerRoleEditor.addEventListener("click", () => {
    closeSeatPickerModal();
    resetRoleEditor();
    roleEditorSourceLabel.value = "自定义补位";
    toggleRoleEditor(true);
    openPeopleLibrary();
  });

  toggleTopicsButton.addEventListener("click", () => {
    topicList.classList.toggle("expanded");
    toggleTopicsButton.textContent = topicList.classList.contains("expanded") ? "收起" : "更多";
  });

  topicList.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-topic-action]");
    if (actionButton) {
      if (actionButton.dataset.topicAction === "open") {
        activateTopic(actionButton.dataset.topicId);
        return;
      }
      if (actionButton.dataset.topicAction === "delete") {
        deleteTopic(actionButton.dataset.topicId);
        return;
      }
    }

    const card = event.target.closest(".topic-card[data-topic-id]");
    if (!card) {
      return;
    }
    activateTopic(card.dataset.topicId);
  });

  document.getElementById("cycle-mode").addEventListener("click", () => cycleSetting("modeIndex", modeValues));
  document.getElementById("cycle-participation").addEventListener("click", () => cycleSetting("participationIndex", participationValues));
  document.getElementById("cycle-memory").addEventListener("click", () => cycleSetting("memoryIndex", memoryValues));
  document.getElementById("cycle-model").addEventListener("click", () => cycleSetting("modelIndex", modelValues));
  discussionRoundsInput.addEventListener("change", () => {
    const nextValue = Math.min(9, Math.max(1, Number(discussionRoundsInput.value || 1)));
    state.discussionRounds = nextValue;
    updateCompactSummary();
    void syncCurrentTopicSnapshot();
  });
  startDiscussionButton.addEventListener("click", () => {
    runDiscussionFlow();
  });
  stopDiscussionButton.addEventListener("click", () => {
    stopDiscussionFlow();
  });
}

async function init() {
  await seedDatabase();
  await hydrateState();
  document.body.classList.remove("theme-light");
  updateCompactSummary();
  renderTopicList();
  renderPeopleSummary();
  renderPeopleLibrary();
  renderSeatPicker();
  renderSeatStack();
  renderConnectedModelList();
  renderModelMappings();
  renderProviderTemplateSelect();
  renderAttachmentStrip();
  const activeTopic = state.topics.find((topic) => topic.id === state.activeTopicId);
  if (activeTopic?.snapshot) {
    applyTopicSnapshot(activeTopic.snapshot);
  } else {
    seedConversation();
  }
  autoResizeTextarea();
  bindEvents();
}

init().catch((error) => {
  console.error(error);
  setProfileTestStatus(`初始化失败：${error.message}`, "error");
});
