const DB_NAME = "roundtable-braintrust";
const DB_VERSION = 1;
const ROLE_STORE = "peopleRoles";
const PROFILE_STORE = "modelProfiles";
const APP_STATE_STORE = "appState";
const MODEL_REQUEST_TIMEOUT_MS = 70000;
const ROLE_PLANNING_TIMEOUT_MS = 35000;
const ROLE_GENERATION_TIMEOUT_MS = 55000;
const ROLE_EMERGENCY_TIMEOUT_MS = 40000;
const ROLE_IDENTITY_TIMEOUT_MS = 22000;
const MODEL_TEST_TIMEOUT_MS = 18000;
const MIN_RECOMMENDED_ROLE_COUNT = 8;
const MAX_EXEMPLAR_ROLE_RATIO = 0.25;

const modeValues = ["自由讨论", "立场内求最强答案", "客观求真", "灵感探索"];
const participationValues = ["每轮后表态", "全程旁观"];
const densityValues = ["简洁", "标准", "深入"];
const modelValues = ["系统支配", "用户支配"];
const modeHelpTexts = [
  "把一个复杂问题拆成几个角度分别讲。可以分子问题、分层次、分时间或分利益相关方展开，先讲开再由主持收回来。",
  "先把支持与反对两边最强的版本都讲完整。反对方负责提前打出最难的质疑，支持方负责把这些质疑正面回应并补强防守。",
  "不预设立场，优先区分事实、推断和猜测。最后按证据链收敛出一个最稳判断，而不是看谁声音更大。",
  "允许大胆设想和跨界联想，但要标清哪些是事实、哪些是推测。对自己的想法可以发散，对别人的想法也要判断可行性、风险和前提条件。",
];
const modeValuesEn = ["Open", "Strongest Case", "Truth-Seeking", "Ideas"];
const participationValuesEn = ["Per-Round", "Observe"];
const densityValuesEn = ["Concise", "Standard", "Deep"];
const modelValuesEn = ["System-led", "User-led"];
const modeHelpTextsEn = [
  "Break a complex issue into a few angles and let the table open them up before the host pulls the threads back together.",
  "Present the strongest version of both support and opposition. Critics should surface the hardest objections early, and supporters should answer them directly.",
  "Do not assume a stance. Separate facts, inferences, and guesses, then converge toward the most defensible judgment from the evidence chain.",
  "Allow bold ideas and cross-domain associations, but mark clearly what is factual and what is speculative, then test which ideas are worth keeping.",
];

const ROLE_COLORS = ["sky", "gold", "amber", "rose", "teal", "violet", "emerald", "coral", "slate"];

function buildBaseRoleSystemPrompt({ name, seat, description, stance, method, temper }) {
  return [
    `你现在扮演一位${name}。你长期最稳定的观察重心是：${seat}。`,
    `你的职业背景与长期经验是：${description}`,
    `你的核心倾向是：${stance}。你最常用的方法是：${method}。你的表达气质应保持：${temper}。`,
    "你不是一个抽象标签，而是一个长期在一线、研究或实务里反复处理这类问题的人。发言时先体现这个身份的人会怎么看、先抓什么、最担心什么，再给出判断。",
    "除非任务明确要求你严格停留在历史时点，否则你默认可以使用当下公开知识、现代常识和今天已经形成的专业方法，但仍要保持这个身份本来的训练背景、关注重点和说话气质。",
    "不要空泛复述任务，也不要写成百科词条。你是在参与桌边讨论，要有判断、有边界、有取舍。",
    "遇到不确定之处要直说，不要装作什么都懂；遇到别人明显跳步或想当然的地方，要直接指出。",
  ].join(" ");
}

const baseRoles = [
  {
    id: "programmer",
    name: "程序员",
    seat: "技术实现者",
    description: "负责把需求拆成代码实现、接口结构、调试路径和交付节奏。",
    traits: { stance: "强调落地", method: "编码实现", temper: "直接" },
    color: "violet",
    source: "base",
    sourceLabel: "技术",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "程序员", seat: "技术实现者", description: "长期把模糊需求拆成代码实现、接口结构、调试路径和交付节奏的工程人员。", stance: "强调落地", method: "编码实现", temper: "直接" }),
  },
  {
    id: "building-engineer",
    name: "建筑工程师",
    seat: "工程现场判断",
    description: "负责从结构安全、施工条件、材料限制和现场实施角度判断方案。",
    traits: { stance: "强调约束", method: "结构评估", temper: "稳健" },
    color: "teal",
    source: "base",
    sourceLabel: "工程",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "建筑工程师", seat: "工程现场判断", description: "长期在结构安全、施工条件、材料限制和现场实施之间做取舍的工程实践者。", stance: "强调约束", method: "结构评估", temper: "稳健" }),
  },
  {
    id: "electrical-engineer",
    name: "电气工程师",
    seat: "电力系统顾问",
    description: "负责从供电、线路、安全冗余、负载和设备匹配角度补足技术判断。",
    traits: { stance: "强调安全", method: "系统排障", temper: "冷静" },
    color: "emerald",
    source: "base",
    sourceLabel: "电气",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "电气工程师", seat: "电力系统顾问", description: "长期处理供电系统、线路负载、电气安全和设备匹配问题的电力系统工程师。", stance: "强调安全", method: "系统排障", temper: "冷静" }),
  },
  {
    id: "auditor",
    name: "审计师",
    seat: "财务核算",
    description: "负责核对成本、投入产出、预算漏洞和财务可持续性。",
    traits: { stance: "强调风险", method: "成本核算", temper: "严谨" },
    color: "amber",
    source: "base",
    sourceLabel: "财务",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "审计师", seat: "财务核算", description: "长期核查成本、预算、投入产出和财务持续性的审计与核算从业者。", stance: "强调风险", method: "成本核算", temper: "严谨" }),
  },
  {
    id: "doctor",
    name: "医生",
    seat: "医疗风险判断",
    description: "负责判断健康、安全、恢复、误伤风险和专业边界，避免拍脑袋决策。",
    traits: { stance: "强调风险", method: "临床判断", temper: "谨慎" },
    color: "rose",
    source: "base",
    sourceLabel: "医疗",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "医生", seat: "医疗风险判断", description: "长期在健康风险、禁忌、恢复周期和误伤代价之间做临床判断的医生。", stance: "强调风险", method: "临床判断", temper: "谨慎" }),
  },
  {
    id: "historian",
    name: "历史学家",
    seat: "历史背景补充",
    description: "负责补齐事件前因后果、历史背景、制度环境和路径演变，避免断章取义。",
    traits: { stance: "补充背景", method: "史料校对", temper: "审慎" },
    color: "gold",
    source: "base",
    sourceLabel: "历史",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "历史学家", seat: "历史背景补充", description: "长期研究时间线、背景条件、制度环境和路径演变，擅长用史料与时代语境校正当下判断的历史研究者。", stance: "补充背景", method: "史料校对", temper: "审慎" }),
  },
  {
    id: "physicist",
    name: "物理学家",
    seat: "机理分析者",
    description: "负责从力学、能量、运动规律和物理约束角度判断是否成立。",
    traits: { stance: "追求准确", method: "机理推导", temper: "克制" },
    color: "sky",
    source: "base",
    sourceLabel: "物理",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "物理学家", seat: "机理分析者", description: "长期用力学、能量、材料与边界条件解释现实问题的机理分析者。", stance: "追求准确", method: "机理推导", temper: "克制" }),
  },
  {
    id: "mathematician",
    name: "数学家",
    seat: "逻辑推演",
    description: "负责从数量关系、逻辑结构、概率和推导严密性角度挑错与校正。",
    traits: { stance: "追求严密", method: "逻辑推导", temper: "冷静" },
    color: "slate",
    source: "base",
    sourceLabel: "数学",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "数学家", seat: "逻辑推演", description: "长期处理数量关系、逻辑结构、概率假设与严密推导问题的数学工作者。", stance: "追求严密", method: "逻辑推导", temper: "冷静" }),
  },
  {
    id: "chemist",
    name: "化学家",
    seat: "材料反应分析",
    description: "负责从材料性质、化学反应、腐蚀风险和配方稳定性角度给判断。",
    traits: { stance: "强调安全", method: "反应分析", temper: "谨慎" },
    color: "coral",
    source: "base",
    sourceLabel: "化学",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "化学家", seat: "材料反应分析", description: "长期研究材料性质、反应条件、腐蚀风险、毒性和稳定性的化学从业者。", stance: "强调安全", method: "反应分析", temper: "谨慎" }),
  },
  {
    id: "lawyer",
    name: "法律顾问",
    seat: "法律边界判断",
    description: "负责从法律责任、合同约束、证据链和执行风险角度压住边界。",
    traits: { stance: "强调边界", method: "规则拆解", temper: "冷静" },
    color: "sky",
    source: "base",
    sourceLabel: "法律",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "法律顾问", seat: "法律边界判断", description: "长期处理法律责任、合同约束、证据链和执行风险，习惯先划清规则边界的法律顾问。", stance: "强调边界", method: "规则拆解", temper: "冷静" }),
  },
  {
    id: "police-advisor",
    name: "警察",
    seat: "侦查执行者",
    description: "负责从现场控制、调查、取证、执行和最坏情况处置角度补盲。",
    traits: { stance: "强调执行", method: "证据核验", temper: "果断" },
    color: "teal",
    source: "base",
    sourceLabel: "警务",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "警察", seat: "侦查执行者", description: "长期处理现场控制、调查取证、执行推进与最坏情况处置的侦查执行者。", stance: "强调执行", method: "证据核验", temper: "果断" }),
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
    systemPrompt: buildBaseRoleSystemPrompt({ name: "运营负责人", seat: "执行推进者", description: "长期把方案拆成节奏、动作、资源分工和执行闭环，确保事情真正跑起来的运营负责人。", stance: "强调落地", method: "执行拆解", temper: "务实" }),
  },
  {
    id: "product-manager",
    name: "产品经理",
    seat: "取舍协调者",
    description: "负责判断用户价值、优先级、版本边界和资源投入，不让讨论只停在概念层。",
    traits: { stance: "强调取舍", method: "需求规划", temper: "平衡" },
    color: "amber",
    source: "base",
    sourceLabel: "产品",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "产品经理", seat: "取舍协调者", description: "长期在用户价值、优先级、版本边界和资源投入之间做取舍的产品经理。", stance: "强调取舍", method: "需求规划", temper: "平衡" }),
  },
  {
    id: "teacher",
    name: "教师",
    seat: "结构讲解者",
    description: "负责把复杂问题拆成普通人能理解、能复述、能执行的结构。",
    traits: { stance: "澄清表达", method: "知识讲解", temper: "耐心" },
    color: "rose",
    source: "base",
    sourceLabel: "教育",
    systemPrompt: buildBaseRoleSystemPrompt({ name: "教师", seat: "结构讲解者", description: "长期把复杂问题拆成普通人能理解、能复述、能执行结构的教学型表达者。", stance: "澄清表达", method: "知识讲解", temper: "耐心" }),
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
  if (role.source === "recommended") {
    return "临时生成";
  }
  return role.sourceLabel || "常用职业";
}

function createRequestSignal(externalSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const forwardAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", forwardAbort, { once: true });
    }
  }
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    cleanup: () => {
      window.clearTimeout(timer);
      externalSignal?.removeEventListener("abort", forwardAbort);
    },
  };
}

function sanitizeGeneratedRoleName(rawName) {
  const normalized = String(rawName || "").trim()
    .replace(/注释宣誓者/g, "注释者")
    .replace(/宣誓者/g, "诠释者");
  const stripped = normalized.replace(/式[^式]{0,10}(注释者|解经者|诠释者|释经者|思想家|讲道者|神学家|导师)$/u, "").trim();
  return stripped || normalized || "临时角色";
}

function getRoleNameFingerprint(name) {
  return sanitizeGeneratedRoleName(name)
    .toLowerCase()
    .replace(/[\s·.．,，:：;；!！?？'"“”‘’()（）\-_/\\]/g, "");
}

function getPeoplePoolRoleFingerprints() {
  return new Set(
    state.peopleRoles
      .map((role) => getRoleNameFingerprint(role?.name || ""))
      .filter(Boolean)
  );
}

function getPeoplePoolRoleNamesText(limit = 40) {
  const names = state.peopleRoles
    .map((role) => sanitizeGeneratedRoleName(role?.name || ""))
    .filter(Boolean);
  return names.slice(0, limit).join("、");
}

function normalizeGeneratedRoleType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["exemplar", "figure", "leader", "person", "representative", "名人", "人物", "佼佼者", "代表人物"].includes(normalized)) {
    return "exemplar";
  }
  return "expert";
}

function getRequestedRecommendedRoleCount(summary = "") {
  const normalized = String(summary || "");
  const arabicMatch = normalized.match(/(?:^|[^\d])(8|9|10|11|12)\s*(?:个|位|名)?\s*(?:人|角色|专家|嘉宾|人物)/);
  if (arabicMatch) {
    return Math.max(8, Math.min(12, Number(arabicMatch[1])));
  }

  const chineseNumberMap = {
    八: 8,
    九: 9,
    十: 10,
    十一: 11,
    十二: 12,
  };
  const chineseMatch = normalized.match(/(八|九|十|十一|十二)\s*(?:个|位|名)?\s*(?:人|角色|专家|嘉宾|人物)/);
  if (chineseMatch) {
    return chineseNumberMap[chineseMatch[1]] || MIN_RECOMMENDED_ROLE_COUNT;
  }

  return MIN_RECOMMENDED_ROLE_COUNT;
}

function validateGeneratedRoleCandidates(candidates, targetCount = MIN_RECOMMENDED_ROLE_COUNT) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (list.length < targetCount) {
    throw new Error(`系统临时角色生成失败：返回角色少于 ${targetCount} 个。`);
  }

  const seenFingerprints = new Set();
  const duplicateInsideBatch = [];
  list.forEach((item) => {
    const fingerprint = getRoleNameFingerprint(item?.name || item?.title || "");
    if (!fingerprint) {
      return;
    }
    if (seenFingerprints.has(fingerprint)) {
      duplicateInsideBatch.push(item?.name || item?.title || "未命名角色");
      return;
    }
    seenFingerprints.add(fingerprint);
  });
  if (duplicateInsideBatch.length) {
    throw new Error(`系统临时角色生成失败：出现重复人物 ${duplicateInsideBatch.join("、")}。`);
  }

  const peoplePoolFingerprints = getPeoplePoolRoleFingerprints();
  const duplicateWithPeoplePool = list
    .map((item) => sanitizeGeneratedRoleName(item?.name || item?.title || ""))
    .filter((name) => peoplePoolFingerprints.has(getRoleNameFingerprint(name)));
  if (duplicateWithPeoplePool.length) {
    throw new Error(`系统临时角色生成失败：生成人物与当前人物池重复 ${duplicateWithPeoplePool.join("、")}。`);
  }

  const exemplarCount = list.filter((item) => normalizeGeneratedRoleType(item?.roleType || item?.roleKind || item?.personaType) === "exemplar").length;
  const maxExemplarCount = Math.max(1, Math.floor(list.length * MAX_EXEMPLAR_ROLE_RATIO));
  if (exemplarCount > maxExemplarCount) {
    throw new Error(`系统临时角色生成失败：行业佼佼者人物过多，当前为 ${exemplarCount} 个，最多允许 ${maxExemplarCount} 个。`);
  }
}

function getDisplayRoleName(role) {
  return role?.source === "recommended" ? sanitizeGeneratedRoleName(role.name) : role?.name || "";
}

function getRoleCardTitle(role) {
  if (!role) {
    return "";
  }
  const preferredTitle = role.source === "recommended"
    ? String(role.seat || role.name || "").trim()
    : String(role.name || role.seat || "").trim();
  return shortenText(preferredTitle, role.source === "recommended" ? 14 : 18);
}

function getCompactRoleDescription(role) {
  const raw = String(role?.description || "").replace(/\s+/g, " ").trim();
  if (!raw) {
    return "";
  }
  const firstClause = raw.split(/[。！？]/)[0]?.trim() || raw;
  return shortenText(firstClause, 30);
}

function canEditRole(role) {
  return !!role && role.source !== "recommended";
}

function canDeleteRole(role) {
  return !!role && role.source !== "recommended";
}

function buildRoleTraitsMarkup(role, options = {}) {
  const { compact = false } = options;
  const traitPairs = [
    [langText("立场", "Stance"), role.traits?.stance],
    [langText("专长", "Method"), role.traits?.method],
    [langText("性格", "Temper"), role.traits?.temper],
  ].filter(([, value]) => value);

  return traitPairs
    .map(([label, value]) => {
      const text = compact ? shortenText(String(value || ""), 14) : String(value || "");
      return `<span title="${escapeHtml(String(value || ""))}"><strong>${label}：</strong>${escapeHtml(text)}</span>`;
    })
    .join("");
}

function buildRoleLibraryCardMarkup(role, options = {}) {
  const { selected = false, editable = false, deletable = false, recommended = false, savedFavorite = false } = options;
  const traits = buildRoleTraitsMarkup(role);
  const favoriteAction = recommended
    ? `<button class="card-favorite ${savedFavorite ? "saved" : ""}" data-action="favorite" type="button" aria-label="${savedFavorite ? "取消收藏" : "收藏到人物库"}" title="${savedFavorite ? "取消收藏" : "收藏到人物库"}">★</button>`
    : "";
  const editAction = editable
    ? `<button class="card-action" data-action="edit" type="button">${escapeHtml(langText("修改", "Edit"))}</button>`
    : "";
  const deleteAction = deletable
    ? `<button class="card-action" data-action="delete" type="button">${escapeHtml(langText("删除", "Delete"))}</button>`
    : "";
  const footerMarkup = editAction || deleteAction || favoriteAction
    ? `<div class="card-actions-right">${editAction}${deleteAction}${favoriteAction}</div>`
    : `<span class="role-lock-note">${escapeHtml(langText("预置人物，不可修改或删除", "Built-in persona cannot be edited or deleted"))}</span>`;

  return `
    <article class="${recommended ? "picker-card" : "library-card"} ${selected ? "selected" : ""}" data-role-id="${role.id}">
      <div class="role-card-head">
        <div class="seat-chip-row">
          <span class="${recommended ? "picker-avatar" : "library-avatar"}" style="${avatarStyle(role)}">${escapeHtml(roleAvatar(role))}</span>
          <div class="role-title-stack">
            <h3 class="role-title">${escapeHtml(getDisplayRoleName(role))}</h3>
          </div>
        </div>
      </div>
      <p class="card-description">${escapeHtml(role.description || "")}</p>
      <div class="mini-tags">${traits}</div>
      <div class="role-card-footer">
        ${footerMarkup}
      </div>
    </article>
  `;
}

const RECOMMENDED_ROLE_IDENTITY_SUMMARIES = {
  "牧师": "长期在一线牧养和讲道的教会牧者，习惯把释经落到会众处境、安慰与劝勉之中。",
  "长老": "长期参与教会治理与群体辨识的资深同工，关注群体次序、生命成熟与整体方向。",
  "圣经学者": "受过原文、历史背景与释经方法训练的研究者，习惯从上下文、语义和文献脉络切入。",
  "系统神学家": "长期研究基督教教义结构与神学传统，擅长把单段经文放进整本圣经的教义脉络。",
  "马太亨利": "17 至 18 世纪英国牧师与解经家，以注重灵修应用和讲道劝勉的圣经注释传统著称。",
  "奥古斯丁": "4 至 5 世纪北非教父与主教，擅长从恩典、爱之秩序和人内在生命来理解信仰问题。",
  "约翰·加尔文": "16 世纪宗教改革时期神学家与释经者，重视经文脉络、教义边界与神主权的整体理解。",
  "马丁·路德": "16 世纪宗教改革核心人物，表达直率，常从福音、信心、良心与人的真实挣扎切入。",
  "司布真": "19 世纪英国讲道人，擅长把经文推进到讲章应用、悔改呼召、安慰与劝勉。",
  "约翰·卫斯理": "18 世纪英国布道家与牧者，强调圣洁生活、实际操练与群体更新。",
  "教师": "擅长把复杂内容拆成普通人能理解和复述结构的讲解者，关注表达清晰与知识传递。",
};

function looksLikeTaskDrivenRoleDescription(description) {
  const normalized = String(description || "").trim();
  if (!normalized) {
    return true;
  }
  return /围绕|优先|本次话题|本次讨论|当前话题|这段内容|任务目标|负责从自己的专业角度参与本次讨论/.test(normalized);
}

function buildRecommendedRoleIdentitySummary(role) {
  const knownSummary = RECOMMENDED_ROLE_IDENTITY_SUMMARIES[role?.name];
  if (knownSummary) {
    return knownSummary;
  }

  const stance = role?.traits?.stance || langText("提供关键补充视角", "offers a complementary perspective");
  const method = role?.traits?.method || langText("针对性分析", "targeted analysis");
  const temper = role?.traits?.temper || langText("冷静", "calm");
  return langText(
    `${role?.name || "该人物"}长期按“${method}”的方法处理问题，通常以“${stance}”的倾向观察局面，表达气质偏${temper}。`,
    `${role?.name || "This persona"} usually works through ${method}, tends toward ${stance}, and speaks in a ${temper} manner.`
  );
}

function normalizeRecommendedRolePersona(role) {
  if (!role || role.source !== "recommended") {
    return role;
  }

  const description = looksLikeTaskDrivenRoleDescription(role.description)
    ? buildRecommendedRoleIdentitySummary(role)
    : role.description;
  const nextRole = description === role.description ? role : { ...role, description };

  if (looksLikeInvalidDynamicRolePrompt(nextRole.systemPrompt) || description !== role.description) {
    return {
      ...nextRole,
      systemPrompt: buildFallbackGeneratedRoleSystemPrompt({
        name: nextRole.name,
        seat: nextRole.seat,
        description,
        stance: nextRole.traits?.stance || "补充关键视角",
        method: nextRole.traits?.method || "针对性分析",
        temper: nextRole.traits?.temper || "冷静",
      }),
    };
  }

  return nextRole;
}

function normalizeRecommendedRoleList(roles) {
  return Array.isArray(roles) ? roles.map((role) => normalizeRecommendedRolePersona(role)) : [];
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
    modelId: "doubao-seed-2-0-lite-260215",
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

const visibleBuiltinTemplateIds = new Set([
  "profile-siliconflow",
  "profile-volcengine",
  "profile-openai-official",
  "profile-claude",
]);

const visibleBuiltinTemplateOrder = new Map([
  ["profile-siliconflow", 0],
  ["profile-volcengine", 1],
  ["profile-openai-official", 2],
  ["profile-claude", 3],
]);

const defaultProfileMap = new Map(defaultProfiles.map((profile) => [profile.id, profile]));

const state = {
  appLanguage: "zh",
  modeIndex: 0,
  participationIndex: 0,
  densityIndex: 1,
  memoryIndex: 0,
  modelIndex: 0,
  discussionRounds: 1,
  discussionSize: 6,
  autoFollow: true,
  discussionRunning: false,
  discussionAbortController: null,
  discussionAbortRequested: false,
  awaitingUserParticipation: false,
  awaitingDiscussionContinuation: false,
  latestReportText: "",
  latestReportFileName: "",
  discussionRoundNotes: [],
  recommendedRoleGenerationMeta: null,
  aiAutoRecommendEnabled: true,
  voiceReadEnabled: false,
  topicConfirmed: false,
  seatsReady: false,
  generatingSeats: false,
  lastSummary: "",
  sharedResearchBrief: "",
  rolePlanningBrief: "",
  pendingRoleClarification: [],
  taskSupplementMode: false,
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
let pendingUserParticipationResolver = null;
let pendingDiscussionContinuationResolver = null;

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
const roleEditorAiRequirements = document.getElementById("role-editor-ai-requirements");
const roleEditorAiFeedback = document.getElementById("role-editor-ai-feedback");
const generateRoleWithAiButton = document.getElementById("generate-role-with-ai");

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
const modelProfileBackdrop = document.getElementById("model-profile-backdrop");
const modelProfileModal = document.getElementById("model-profile-modal");
const modelProfileModalTitle = document.getElementById("model-profile-modal-title");
const openModelProfileModalButton = document.getElementById("open-model-profile-modal");
const closeModelProfileModalButton = document.getElementById("close-model-profile-modal");
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
const providerTemplateSelect = document.getElementById("provider-template-select");
const profileTemplateHint = document.getElementById("profile-template-hint");
const connectedModelList = document.getElementById("connected-model-list");
const hostModelSelect = document.getElementById("host-model-select");

const toggleTopicsButton = document.getElementById("toggle-topics");
const topicList = document.getElementById("topic-list");
const currentTopicTitle = document.getElementById("current-topic-title");
const peopleCount = document.getElementById("people-count");
const peopleSummary = document.getElementById("people-summary");
const followToggle = document.getElementById("follow-toggle");
const appLanguageToggle = document.getElementById("app-language-toggle");
const currentTopicLabel = document.getElementById("current-topic-label");
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
const cycleModeButton = document.getElementById("cycle-mode");
const configMode = document.getElementById("config-mode");
const configModeTooltip = document.getElementById("config-mode-tooltip");
const configParticipation = document.getElementById("config-participation");
const configDensity = document.getElementById("config-density");
const configModel = document.getElementById("config-model");
const discussionRoundsInput = document.getElementById("discussion-rounds-input");
const discussionSizeSelect = document.getElementById("discussion-size-select");
const newTopicButton = document.getElementById("new-topic");
const startDiscussionButton = document.getElementById("start-discussion");
const stopDiscussionButton = document.getElementById("stop-discussion");
const toggleAiRoleRecommendationButton = document.getElementById("toggle-ai-role-recommendation");
const toggleVoiceReadButton = document.getElementById("toggle-voice-read");
const seatFeedback = document.getElementById("seat-feedback");
const seatStack = document.getElementById("seat-stack");
const seatConfigProgress = document.getElementById("seat-config-progress");

let dbPromise;
let roleEditorContext = null;
let modelProfileTemplateId = "";
let modelProfileEditMode = false;
let preferredReadAloudVoice = null;

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

async function loadDeletedBaseRoleIds() {
  return loadAppState("deletedBaseRoleIds", []);
}

async function rememberDeletedBaseRole(roleId) {
  const currentIds = await loadDeletedBaseRoleIds();
  if (!currentIds.includes(roleId)) {
    await saveAppState("deletedBaseRoleIds", [...currentIds, roleId]);
  }
}

async function clearDeletedBaseRole(roleId) {
  const currentIds = await loadDeletedBaseRoleIds();
  if (currentIds.includes(roleId)) {
    await saveAppState("deletedBaseRoleIds", currentIds.filter((id) => id !== roleId));
  }
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

function deriveRoleAvatar(name, preferredAvatar = "") {
  const normalizedName = String(name || "").trim();
  const cjkMatch = normalizedName.match(/[\u3400-\u4dbf\u4e00-\u9fff]/);
  if (cjkMatch?.[0]) {
    return cjkMatch[0];
  }

  const normalizedAvatar = String(preferredAvatar || "").trim();
  if (normalizedAvatar) {
    return normalizedAvatar.slice(0, 1).toUpperCase();
  }

  const latinMatch = normalizedName.match(/[A-Za-z0-9]/);
  if (latinMatch?.[0]) {
    return latinMatch[0].toUpperCase();
  }

  return "人";
}

function roleAvatar(role) {
  return deriveRoleAvatar(role.name, role.avatar);
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
  speakerRole.textContent = role || "";
  speakerDescription.textContent = description;
}

function setStatusLoadingState(active) {
  liveStatusBanner.classList.toggle("loading-dots", !!active);
  speakerName.classList.toggle("loading-dots", !!active);
}

function setSpeakerCardForRole(role, status, description) {
  setSpeakerCard(role.name, status, description, roleAvatar(role), avatarStyle(role));
}

function updateLiveStatus(message, tone = "") {
  liveStatusBanner.textContent = message;
  liveStatusBanner.className = `live-status-banner ${tone}`.trim();
}

function updateCurrentTopicTitle(title = "目前还没有任务") {
  currentTopicTitle.textContent = title;
}

function getRoundLabel() {
  return `${state.discussionRounds} 轮`;
}

function getRoundTokenBudget() {
  if (state.densityIndex === 0) {
    return { main: 620, participant: 420, challenger: 620, rebuttal: 620, judge: 900, report: 1000, charHint: "控制在 220 到 420 字内，结论要直接。" };
  }
  if (state.densityIndex === 2) {
    return { main: 1300, participant: 950, challenger: 1300, rebuttal: 1300, judge: 1650, report: 1750, charHint: "控制在 700 到 980 字内，但不要空话。" };
  }
  return { main: 900, participant: 700, challenger: 900, rebuttal: 900, judge: 1200, report: 1300, charHint: "控制在 500 到 750 字内。" };
}

function getDensityDescription() {
  if (state.densityIndex === 0) {
    return "当前是简洁档：更快、更短，适合快速判断。";
  }
  if (state.densityIndex === 2) {
    return "当前是深入档：会给更完整的依据、反驳和收束。";
  }
  return "当前是标准档：信息量和速度保持平衡。";
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
    state.sharedResearchBrief ? `共享事实包：${state.sharedResearchBrief}` : "",
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
        ${state.sharedResearchBrief ? `<div class="summary"><strong>共享事实包</strong><p>${escapeExportHtml(state.sharedResearchBrief)}</p></div>` : ""}
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
  if (state.modelIndex === 0) {
    return getConfiguredProfileById(getSeatDefaultProfileId(role)) || getPrimarySummaryProfile();
  }
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
    "这不是聊天回复，也不是裁判发言复述，而是一份由主持 AI 站在全桌视角整理出的正式结论纪要。",
    "语言要成熟、完整、克制，像一份真正给用户留档的分析报告。",
    "请明确分成 6 个部分来写，并直接写给用户看：",
    "第1点，讨论到底在回答什么问题，以及这张桌子已经达成了哪些基本共识。",
    "第2点，目前已经相对确认的结论是什么。这里要写清楚为什么这些点可以先成立。",
    "第3点，目前还不能确认、不能下死结论、还需要补证据的是什么。不要含糊，要直接点出来。",
    "第4点，桌上仍然存在的关键分歧是什么，各方分歧分别卡在什么依据、假设或价值取向上。",
    "第5点，如果主持人现在必须给用户一个综合判断，最稳妥的结论与建议应该怎么说。",
    "第6点，如果下一步继续深挖，最值得追问、验证或补充的事项是什么。",
    "写法要求：每一点都先有一个简短的小标题，然后展开成 1 到 2 段完整中文，不要只写一句话。",
    "不要使用 Markdown 标题符号，不要写成空洞套话，不要只重复谁支持谁反对。",
    "如果某些点依据不足，要明确写出“目前还不能下死结论”或“这一点仍待验证”。",
    "整体语气应当像主持人在替整张桌子做收束，而不是像裁判宣布输赢。",
    buildDiscussionContext(state.lastSummary, roundNotes, []),
    `裁判总结可作为参考材料，但不要直接照抄其口吻：${judgeText}`,
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

function getDiscussionModeDirective() {
  if (state.modeIndex === 1) {
    return [
      `讨论目标：${modeValues[state.modeIndex]}。`,
      "要求：先把各自立场内部最强、最完整、最能成立的版本讲出来，不要故意把任何一方说弱。",
      "可以有立场，但仍然必须尊重事实；如果本方证据不足，要明确承认，不允许为了维持立场硬编依据。",
    ].join("\n");
  }
  if (state.modeIndex === 2) {
    return [
      `讨论目标：${modeValues[state.modeIndex]}。`,
      "要求：优先区分事实、推断和猜测，优先校验证据链，而不是急着下漂亮结论。",
      "如果前文有偷换概念、证据不足、出处含糊或逻辑跳跃，要直接点破并收紧结论。",
    ].join("\n");
  }
  if (state.modeIndex === 3) {
    return [
      `讨论目标：${modeValues[state.modeIndex]}。`,
      "要求：允许提出探索性设想、跨界联想和大胆假说，但必须明确标注哪些是事实、哪些是推测、哪些只是灵感草案。",
      "后续角色既要评价可行与不可行，也要在合理边界内继续扩展想法，而不是只会否定。",
    ].join("\n");
  }
  return [
    `讨论目标：${modeValues[state.modeIndex]}。`,
    "要求：允许从不同角度自由展开，但必须持续围绕任务，不要闲聊跑题。",
    "可以表达判断和倾向，但要说明依据强弱，并在发现前文站不住脚时及时指出。",
  ].join("\n");
}

function getDiscussionModeContextGuidance() {
  if (state.modeIndex === 1) {
    return [
      `讨论目标：${modeValues[state.modeIndex]}。`,
      "上下文理解要求：把支持方和反对方都当成 strongest case 来看，不要把任何一边自动理解成弱版本。",
      "如果任务定义里已经体现用户终局立场，可以把反对意见当成压力测试材料，但不能忽略其中有效的难点。",
    ].join("\n");
  }
  if (state.modeIndex === 2) {
    return [
      `讨论目标：${modeValues[state.modeIndex]}。`,
      "上下文理解要求：优先区分事实、推断和猜测，优先校验证据链，而不是急着追求好听结论。",
      "如果前文出现出处含糊、证据不足、逻辑跳跃或偷换概念，要把这些地方视为需要优先处理的问题。",
    ].join("\n");
  }
  if (state.modeIndex === 3) {
    return [
      `讨论目标：${modeValues[state.modeIndex]}。`,
      "上下文理解要求：允许探索性设想、跨界联想和大胆假说，但必须区分哪些是已知事实，哪些是推测，哪些只是灵感草案。",
      "对前文的新想法既要保留扩展能力，也要保留可行性、风险和前提条件判断能力。",
    ].join("\n");
  }
  return [
    `讨论目标：${modeValues[state.modeIndex]}。`,
    "上下文理解要求：允许把一个复杂问题拆成几个子问题、几个维度或几条讨论线分别展开，但最终仍要回到同一个任务。",
    "对前文既可以顺着扩展，也可以纠偏收紧，但不要空转重复。",
  ].join("\n");
}

function getOpeningModeInstruction() {
  if (state.modeIndex === 1) {
    return [
      "开场要求：你要先说明今天不是随便争辩，而是要把支持方和反对方最强版本都摆出来，同时邀请大家先各自抛出最值得优先处理的论点与压力测试点。",
      "如果任务定义里已经体现用户终局立场，也要说明：反对意见的作用是提前做压力测试，帮助后续训练回应和反驳。",
    ].join("\n");
  }
  if (state.modeIndex === 2) {
    return [
      "开场要求：你要明确告诉用户，这场讨论不预设立场，重点是核验证据链、区分事实和推断，并邀请每位嘉宾先提出自己最想先核验的证据、疑点或解释方向。",
      "不要把这场讨论讲成观点比赛，要讲成求真过程。",
    ].join("\n");
  }
  if (state.modeIndex === 3) {
    return [
      "开场要求：你要明确告诉用户，这场讨论允许大胆设想和跨界联想，但所有设想都要标清依据强弱，并鼓励大家先抛出最值得试探的新方向。",
      "也要说明：后续角色不只会发散，还会判断哪些想法值得继续试。",
    ].join("\n");
  }
  return [
    "开场要求：你要先把今天的问题背景和讨论规则交代清楚，再邀请各位嘉宾按自己的身份先提出最想先看的线索、疑点或切入口。",
    "不要一上来就用“首先、其次、最后”把整场讨论拆成固定标准答案，也不要替每个人预写子题。",
  ].join("\n");
}

function getSpeakerModeInstruction(assignment) {
  if (state.modeIndex === 1) {
    return [
      "模式要求：先把你这一侧最强、最完整、最能成立的版本讲出来，不允许故意把任何一方说弱。",
      assignment === "challenger"
        ? "如果你承担主讲职责，要把本方 strongest case 的主论点、关键依据和最难反驳的部分讲扎实。"
        : assignment === "rebuttal"
          ? "如果你承担辩驳职责，你要默认站在主讲对面，专门拆主讲当前版本里最脆弱、最可疑、最经不起追问的地方。"
        : assignment === "neutral"
          ? "如果你承担中立评议职责，要判断双方是否都被公平表达，指出哪一边其实还没讲到 strongest case。"
          : "如果你承担旁证职责，要补足本方 strongest case 的背景、案例、约束和现实回应。",
      "如果你承担反对或质疑功能，你的任务不是为了赢而偷换概念，而是提前提出现实世界里最强的反对意见，帮助后续形成更强回应。",
      "承接前轮要求：把前面已经稳住的防守点、已经被有效击中的薄弱点、仍未回应的关键反对都当成当前攻防账本，不要把已经回应过的点重新当成没回应。",
    ].join("\n");
  }
  if (state.modeIndex === 2) {
    return [
      "模式要求：请按“能确认的事实 -> 基于事实的推断 -> 仍然不确定的空白 -> 暂时判断”这个顺序推进。",
      "如果前文给了模糊出处、似是而非的事实、跳跃推理或偷换概念，要直接点破并收紧结论。",
      assignment === "neutral"
        ? "作为中立评议者，你要主动压实证据，而不是做礼貌性总结。"
        : assignment === "rebuttal"
          ? "作为辩驳者，你要优先检查主讲刚才的证据链是否真的闭合，哪些地方只是推断冒充事实。"
        : "不要求你保持语气温和，但要求你优先服从真假和证据链，而不是服从角色偏好。",
      "承接前轮要求：把前面已经形成的共识当成本轮默认约束，优先在尚未确认的点和证据缺口上继续推进，不要把已经收住的点重新说散。",
    ].join("\n");
  }
  if (state.modeIndex === 3) {
    return [
      "模式要求：你既要提出新设想，也要判断前文设想的可行性、风险和前提条件。",
      "对自己的新想法可以大胆提出，对别人的新想法不能只会附和或只会否定，要说明为什么可能行、为什么不行，或者怎样改才可能行。",
      assignment === "challenger"
        ? "作为主讲，你应当主动提出一个值得继续追的新方向，而不是只做保守评论。"
        : assignment === "rebuttal"
          ? "作为辩驳者，你要优先指出主讲新方向里最容易翻车的前提和最可能被忽略的代价。"
        : "作为非主讲角色，你可以沿着别人的思路做变体、筛选和条件修正。",
      "承接前轮要求：把前面已经被证明值得继续试的方向、仍属探索但可保留的方向、以及已经判定风险过高的方向分开对待，不要把明显应放弃的想法重新包装成主方向。",
    ].join("\n");
  }
  return [
    "模式要求：请把一个复杂问题拆成几个子问题、层次、时间段或利益相关方中的某一条继续展开，而不是平铺重复。",
    "你可以选择顺着前文扩展，也可以选择把前文没分清的层面拆开讲，但最终要帮助用户把问题看得更开、更清楚。",
    assignment === "neutral"
      ? "作为中立评议者，你要帮助用户看清哪些讨论线已经展开、哪些还没展开。"
      : assignment === "rebuttal"
        ? "作为辩驳者，你要专门盯住主讲当前拆法里的漏洞、遗漏和不成立的跳步。"
      : "不要试图一口气把所有层面说完，优先把你这一条线讲透。",
    "承接前轮要求：把前面已经展开过的讨论线、已经形成的暂时共识和仍未展开的线区分开，优先补还没讲透的部分，而不是重复已经讲开的线。",
  ].join("\n");
}

function getModeratorLedgerInstruction() {
  if (state.modeIndex === 0) {
    return [
      "本轮小结请自然覆盖这五点：本轮新增展开了哪些问题线、目前已经形成的暂时共识、哪些线讲开了但还没讲透、哪些说法当前可暂时收掉、下一轮最值得继续深挖哪 1 到 2 条线。",
      "这五点要写进自然中文段落里，不要写成僵硬清单。",
    ].join("\n");
  }
  if (state.modeIndex === 1) {
    return [
      "本轮小结请自然覆盖这五点：本轮新增有效攻点、目前已经稳住的防守、仍未回应的关键反对、当前已被削弱或应收回的论点、下一轮最该补强的回应环节。",
      "这五点要写进自然中文段落里，不要写成僵硬清单。",
    ].join("\n");
  }
  if (state.modeIndex === 2) {
    return [
      "本轮小结请自然覆盖这五点：本轮新增确认的点、目前已经形成的稳定共识、仍属推断的点、当前站不住脚的点、下一轮最需要核验的点。",
      "这五点要写进自然中文段落里，不要写成僵硬清单。",
    ].join("\n");
  }
  if (state.modeIndex === 3) {
    return [
      "本轮小结请自然覆盖这五点：本轮新增提出的想法、目前最值得继续试的方向、已有一定依据可保留的方向、当前明显风险过高或应先放弃的方向、下一轮最值得验证的前提条件。",
      "这五点要写进自然中文段落里，不要写成僵硬清单。",
    ].join("\n");
  }
  return [
    "本轮小结请自然覆盖这五点：本轮新增提出的想法、目前最值得继续试的方向、已有一定依据可保留的方向、当前明显风险过高或应先放弃的方向、下一轮最值得验证的前提条件。",
    "这五点要写进自然中文段落里，不要写成僵硬清单。",
  ].join("\n");
}

function getModeratorNarrativeStructure() {
  if (state.modeIndex === 2) {
    return [
      "表达骨架：开头先给出本轮目前最稳的判断和主线结论；中段再交代是谁补强了什么、谁指出了什么证据缺口或逻辑问题；结尾收束成下一轮最该核验的点。",
      "语气要求：像一个压实证据链的主持人，不要写成官话，不要平均分配篇幅，不重要的边角内容可以省略。",
    ].join("\n");
  }
  if (state.modeIndex === 1) {
    return [
      "表达骨架：开头先判断这一轮哪一边的 strongest case 被讲得更完整；中段再交代哪些攻击打中了、哪些防守已经补上；结尾收束成下一轮最该补强的攻防缺口。",
      "语气要求：像在做高质量复盘，不要写成裁判判决书，也不要把双方写得平均对称。",
    ].join("\n");
  }
  if (state.modeIndex === 3) {
    return [
      "表达骨架：开头先指出本轮最值得保留的一两个新方向；中段再说明哪些变体只是可观察、哪些风险已经过高；结尾收束成下一轮最值得验证的前提。",
      "语气要求：像在做方向评审，既保留创造力，也主动筛掉噪音，不要写成散乱灵感堆砌。",
    ].join("\n");
  }
  return [
    "表达骨架：开头先讲这一轮把问题往哪几条线真正讲开了；中段再说明哪条线已经出现暂时共识、哪条线还没讲透；结尾收束成下一轮最值得继续追的 1 到 2 条线。",
    "语气要求：像一个善于收线的主持人，不要平铺重复每个人说过的话，要优先保留推进理解的内容。",
  ].join("\n");
}

function getModeratorModeInstruction() {
  if (state.modeIndex === 1) {
    return [
      "主持要求：不要只记流水账，要判断支持方和反对方是否都被公平表达。",
      "你要明确指出：哪些反对已经被回应，哪些反对仍然悬着，哪一方的 strongest case 还没有被讲完整。",
      getModeratorLedgerInstruction(),
      getModeratorNarrativeStructure(),
    ].join("\n");
  }
  if (state.modeIndex === 2) {
    return [
      "主持要求：每轮都要先把已经形成的共识收紧下来，不要让讨论越谈越散。",
      "每轮都要明确分出五类内容：本轮新增确认的点、目前已经形成的共识、仍属推断的点、当前站不住脚的点、下一轮最需要核验的点。",
      "如果大家都把话说得太满，你要主动收紧口径，而不是顺着放大。",
      "你的作用相当于维护一份逐轮更新的共识账本，让后续角色知道哪些点已经收住，哪些点还需要继续验证。",
      getModeratorLedgerInstruction(),
      getModeratorNarrativeStructure(),
    ].join("\n");
  }
  if (state.modeIndex === 3) {
    return [
      "主持要求：不要只总结谁说了什么，而要把本轮内容收束成三类：值得优先推进的想法、值得继续验证的想法、当前明显不成立或风险过高的想法。",
      "你要防止讨论发散失控，但不能把所有新路都提前压死。",
      getModeratorLedgerInstruction(),
      getModeratorNarrativeStructure(),
    ].join("\n");
  }
  return [
    "主持要求：你要把本轮讨论拆成几条已经展开的讨论线，并指出当前最值得继续追问的 1 到 2 条。",
    "不要只写流水账，要帮用户看到问题是怎样被讲开的。",
    getModeratorLedgerInstruction(),
    getModeratorNarrativeStructure(),
  ].join("\n");
}

function getJudgeLedgerInstruction() {
  if (state.modeIndex === 1) {
    return "请沿着逐轮攻防账本收束：哪些反对已经被回应、哪些防守已经稳住、哪些关键难点仍然没有解决。";
  }
  if (state.modeIndex === 2) {
    return "请沿着逐轮共识账本收束：哪些点已稳定成立、哪些仍属推断、哪些当前应排除、哪里还缺关键证据。";
  }
  if (state.modeIndex === 3) {
    return "请沿着逐轮灵感账本收束：哪些方向值得继续试、哪些方向仅可保留观察、哪些方向目前应先放弃。";
  }
  return "请沿着逐轮讨论线账本收束：哪些线已经讲透、哪些线只形成暂时共识、哪些线还值得继续展开。";
}

function getJudgeModeInstruction() {
  if (state.modeIndex === 1) {
    return [
      "裁判要求：你的重点不是判谁口才更强，而是判断支持方和反对方的 strongest case 谁更稳、哪些反对已经被回应、哪些难点仍未解决。",
      "如果任务定义里已经体现用户终局立场，你最终可以在该终局立场前提下判断当前防守是否成立，但必须把仍然存在的难点诚实写出。",
      getJudgeLedgerInstruction(),
    ].join("\n");
  }
  if (state.modeIndex === 2) {
    return [
      "裁判要求：最终判断优先服从真假和证据链，而不是服从任何角色原始立场。",
      "请以各轮已经形成的共识链为基础，尽量收敛出一个统一判断，同时明确写出少数保留意见、证据缺口，以及为什么最终这样裁定。",
      "不要把前面已经形成的共识重新打散，除非你能明确指出那份共识为什么其实站不住脚。",
      getJudgeLedgerInstruction(),
    ].join("\n");
  }
  if (state.modeIndex === 3) {
    return [
      "裁判要求：你更像研发方向评审人，而不是传统法官。",
      "最终要判断哪些想法最值得继续试、每个方向下一步需要补什么证据、哪些方向目前应该先放弃。",
      getJudgeLedgerInstruction(),
    ].join("\n");
  }
  return [
    "裁判要求：请给出一个当前最稳的综合判断，同时承认保留地带，并指出下一步最值得继续深挖哪一条讨论线。",
    "不要把自由讨论强行裁成唯一答案。",
    getJudgeLedgerInstruction(),
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

function formatFinishedRoundContext(note) {
  const userSupplements = (note.turns || []).filter((turn) => turn.role?.id === "user-round-input");
  return [
    `第 ${note.round} 轮主持小结：${note.moderatorSummary || "无"}`,
    userSupplements.length
      ? `第 ${note.round} 轮后用户补充：\n${userSupplements.map((turn) => formatTurnContext(turn)).join("\n\n")}`
      : "",
  ].filter(Boolean).join("\n\n");
}

function buildDiscussionContext(summary, roundNotes, liveTurns) {
  const finishedRounds = roundNotes.length
    ? `前面轮次记录：\n${roundNotes
        .map((note) => formatFinishedRoundContext(note))
        .join("\n\n")}`
    : "";
  const currentTurns = liveTurns.length
    ? `本轮前面已经发言的内容：\n${liveTurns.map((turn) => formatTurnContext(turn)).join("\n\n")}`
    : "";
  const sharedResearch = state.sharedResearchBrief
    ? `共享事实包（所有角色共用同一份材料，不要假装各自另查到不同外部资料）：\n${state.sharedResearchBrief}`
    : "";

  return [
    `任务定义：${summary}`,
    sharedResearch,
    getDiscussionModeDirective(),
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
  if (assignment === "rebuttal") {
    return "你是本轮辩驳者，要正面对主讲提出压力测试，优先质疑其依据、跳步、漏洞和被忽略的代价。";
  }
  if (assignment === "neutral") {
    return "你是本轮中立评议者，要拉开与主讲、辩驳者的距离，指出谁更稳、哪里证据不足、哪些判断需要收紧。";
  }
  return "你是本轮旁证成员，要补充背景、细节、案例和现实约束，但不要越位成裁判。";
}

function sanitizeDisplayedModelText(text) {
  return text
    .replace(/^here'?s a thinking process:?.*$/gim, "")
    .replace(/^thinking process:?.*$/gim, "")
    .replace(/^analyze user input:?.*$/gim, "")
    .replace(/^identify constraints:?.*$/gim, "")
    .replace(/^constraints check:?.*$/gim, "")
    .replace(/^previous speaker\s*\d+\s*[:：].*$/gim, "")
    .replace(/^task definition\s*[:：].*$/gim, "")
    .replace(/^shared facts\s*[:：].*$/gim, "")
    .replace(/^controversies\s*[:：].*$/gim, "")
    .replace(/^unverified\s*[:：].*$/gim, "")
    .replace(/^mode requirements\s*[:：].*$/gim, "")
    .replace(/^position\s*[:：].*$/gim, "")
    .replace(/^role\s*:\s*.*$/gim, "")
    .replace(/^task\s*:\s*.*$/gim, "")
    .replace(/^goal\s*:\s*.*$/gim, "")
    .replace(/^output\s*:\s*.*$/gim, "")
    .replace(/^context\s*:\s*.*$/gim, "")
    .replace(/^tone\s*:\s*.*$/gim, "")
    .replace(/^format\s*:\s*.*$/gim, "")
    .replace(/^audience\s*:\s*.*$/gim, "")
    .replace(/^you are\s+.*$/gim, "")
    .replace(/^as an?\s+.*$/gim, "")
    .replace(/^step\s*\d+\s*:.*$/gim, "")
    .replace(/^i (need to|will|should|am going to|assume).*$/gim, "")
    .replace(/^\s*[-*]?\s*(role|position|task|goal|output|context|tone|format|audience|constraints?|previous speaker(?:\s*\d+)?|previous发言|length|mode requirement|mode requirements|constraints check|task definition|shared facts|controversies|unverified)\s*[:：].*$/gim, "")
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
  discussionSizeSelect.disabled = running;
  cycleModeButton.disabled = running;
  document.getElementById("cycle-participation").disabled = running;
  document.getElementById("cycle-density").disabled = running;
  document.getElementById("cycle-model").disabled = running;
  if (hostModelSelect) {
    hostModelSelect.disabled = running || !getConfiguredProfiles().length;
  }
}

function stopDiscussionFlow() {
  if (!state.discussionRunning) {
    return;
  }
  state.discussionAbortRequested = true;
  if (pendingUserParticipationResolver) {
    pendingUserParticipationResolver({ aborted: true });
  }
  if (pendingDiscussionContinuationResolver) {
    pendingDiscussionContinuationResolver({ aborted: true });
  }
  state.discussionAbortController?.abort();
  setSpeakerCard(langText("正在结束讨论", "Stopping Discussion"), langText("等待当前请求停止", "Waiting for the current request to stop"), langText(`当前执行到 ${getRoundLabel()}，系统会在这一步结束后停止。`, `Currently at ${getRoundLabel()}. The system will stop after this step finishes.`), "系");
  updateSeatFeedback(langText("已请求结束讨论，正在停止当前角色。", "Stop requested. The system is stopping the current speaker."), "pending");
}

function createTopicSession(title = "目前还没有任务") {
  const now = Date.now();
  return {
    id: `topic-${now}`,
    title,
    summary: "目前无任务。",
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
  return "目前还没有任务";
}

function deriveTopicSummary() {
  const activeTopic = getActiveTopic();
  if (activeTopic?.status === "completed" && state.latestReportText) {
    return "本次讨论已完成，结论可下载。";
  }
  if (state.lastSummary) {
    return formatTaskSummaryForDisplay(state.lastSummary);
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
    discussionSize: state.discussionSize,
    topicConfirmed: state.topicConfirmed,
    seatsReady: state.seatsReady,
    generatingSeats: state.generatingSeats,
    lastSummary: state.lastSummary,
    sharedResearchBrief: state.sharedResearchBrief,
    rolePlanningBrief: state.rolePlanningBrief,
    pendingRoleClarification: [...state.pendingRoleClarification],
    taskSupplementMode: state.taskSupplementMode,
    latestReportText: state.latestReportText,
    latestReportFileName: state.latestReportFileName,
    discussionRoundNotes: state.discussionRoundNotes,
    recommendedRoleGenerationMeta: state.recommendedRoleGenerationMeta,
    aiAutoRecommendEnabled: state.aiAutoRecommendEnabled,
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

function ensureActiveTopicSession() {
  const currentTopic = state.topics.find((topic) => topic.id === state.activeTopicId);
  if (currentTopic) {
    return currentTopic;
  }

  const nextTopic = createTopicSession();
  state.topics = [nextTopic, ...state.topics.filter((topic) => topic.id !== nextTopic.id)];
  state.activeTopicId = nextTopic.id;
  return nextTopic;
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
  const shouldDisplayTopic = (topic) => topic.status !== "active" || !!topic.snapshot?.topicConfirmed;
  const activeTopics = state.topics.filter((topic) => topic.status === "active");
  const completedTopics = state.topics.filter((topic) => topic.status === "completed");
  const archivedTopics = state.topics.filter((topic) => topic.status === "archived");
  const orderedTopics = [
    ...activeTopics,
    ...completedTopics.sort((left, right) => right.updatedAt - left.updatedAt),
    ...archivedTopics.sort((left, right) => right.updatedAt - left.updatedAt),
  ].filter(shouldDisplayTopic);

  topicList.innerHTML = orderedTopics.length
    ? orderedTopics
        .map((topic, index) => `
          <article class="topic-card ${topic.id === state.activeTopicId ? "active" : ""} ${index > 0 ? "hidden-topic" : ""}" data-topic-id="${topic.id}">
            <div class="topic-card-head">
              <p class="topic-tag">${topic.status === "active" ? langText("进行中", "In Progress") : topic.status === "completed" ? langText("已完成", "Completed") : langText("已归档", "Archived")}</p>
              <span class="compact-link">${formatTopicTimestamp(topic.updatedAt)}</span>
            </div>
            <h3>${escapeHtml(topic.title)}</h3>
            <p>${escapeHtml(topic.summary)}</p>
            <div class="topic-card-actions">
              <button class="ghost-link compact-link" data-topic-action="open" data-topic-id="${topic.id}" type="button">${topic.status === "active" ? langText("继续", "Resume") : langText("打开", "Open")}</button>
              <button class="ghost-link compact-link danger-link" data-topic-action="delete" data-topic-id="${topic.id}" type="button">${langText("删除", "Delete")}</button>
            </div>
          </article>
        `)
        .join("")
    : `<div class="empty-panel">${escapeHtml(langText("目前无任务。确认任务后，这里才会出现任务卡片。", "No tasks yet. Task cards will appear here after a task is confirmed."))}</div>`;
}

function applyTopicSnapshot(snapshot) {
  if (!snapshot) {
    seedConversation();
    return;
  }

  clearTimeout(state.generatingTimer);
  state.modeIndex = snapshot.modeIndex ?? 0;
  state.participationIndex = Math.min(participationValues.length - 1, snapshot.participationIndex ?? 0);
  state.densityIndex = Math.min(densityValues.length - 1, Math.max(0, snapshot.densityIndex ?? 1));
  state.memoryIndex = snapshot.memoryIndex ?? 0;
  state.modelIndex = Math.min(modelValues.length - 1, Math.max(0, snapshot.modelIndex ?? 0));
  state.discussionRounds = Math.max(1, Number(snapshot.discussionRounds || 1));
  state.discussionSize = Math.min(8, Math.max(4, Number(snapshot.discussionSize || 6)));
  state.topicConfirmed = !!snapshot.topicConfirmed;
  state.seatsReady = !!snapshot.seatsReady;
  state.generatingSeats = !!snapshot.generatingSeats;
  state.lastSummary = snapshot.lastSummary || "";
  state.sharedResearchBrief = snapshot.sharedResearchBrief || "";
  state.rolePlanningBrief = snapshot.rolePlanningBrief || "";
  state.pendingRoleClarification = Array.isArray(snapshot.pendingRoleClarification) ? snapshot.pendingRoleClarification.filter(Boolean) : [];
  state.taskSupplementMode = !!snapshot.taskSupplementMode;
  state.latestReportText = snapshot.latestReportText || "";
  state.latestReportFileName = snapshot.latestReportFileName || "";
  state.discussionRoundNotes = Array.isArray(snapshot.discussionRoundNotes) ? snapshot.discussionRoundNotes : [];
  state.recommendedRoleGenerationMeta = snapshot.recommendedRoleGenerationMeta || null;
  state.aiAutoRecommendEnabled = snapshot.aiAutoRecommendEnabled !== false;
  state.seatSource = snapshot.seatSource || "recommended";
  state.recommendedRoles = normalizeRecommendedRoleList(snapshot.recommendedRoles || []);
  if (!state.aiAutoRecommendEnabled && !state.recommendedRoles.length) {
    state.seatSource = "library";
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
  refreshTaskSummaryMessages();
  setSpeakerCard(
    snapshot.speaker?.name || langText("任务整理中", "Task Intake"),
    snapshot.speaker?.role || langText("等待用户输入", "Waiting for user input"),
    snapshot.speaker?.description || langText("先整理，再确认，再生成人物。", "First organize, then confirm, then generate participants."),
    snapshot.speaker?.avatar || "系"
  );
  seatFeedback.textContent = snapshot.feedback?.text || langText("人物尚未生成", "Participants have not been generated yet");
  seatFeedback.className = `seat-feedback seat-feedback-hidden ${snapshot.feedback?.className?.replace("seat-feedback", "").trim() || ""}`.trim();
  seatPickerFeedback.textContent = seatFeedback.textContent;
  seatPickerFeedback.className = `drawer-feedback ${snapshot.feedback?.className?.replace("seat-feedback", "").trim() || ""}`.trim();
  updateLiveStatus(snapshot.liveStatus?.text || langText("等待开始讨论", "Waiting to start discussion"), snapshot.liveStatus?.className?.split(" ").slice(1).join(" ") || "");
  updateCompactSummary();
  renderAiRoleRecommendationToggle();
  updateCurrentTopicTitle(deriveTopicTitle());
  const activeTopic = getActiveTopic();
  if (activeTopic) {
    activeTopic.title = deriveTopicTitle();
    activeTopic.summary = deriveTopicSummary();
    activeTopic.updatedAt = Date.now();
  }
  renderTopicList();
  renderSeatPicker();
  renderSeatStack();
  renderAttachmentStrip();
  upgradeLegacyReportActions();
  autoResizeTextarea();
  scrollToLatest();
  void persistTopics();
  void refreshRecommendedRolePrompts(state.lastSummary);
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
    state.activeTopicId = "";
    seedConversation();
    await persistTopics();
    renderTopicList();
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
  configMode.textContent = state.appLanguage === "en" ? modeValuesEn[state.modeIndex] : modeValues[state.modeIndex];
  configModeTooltip.textContent = state.appLanguage === "en"
    ? modeHelpTextsEn[Math.min(modeHelpTextsEn.length - 1, Math.max(0, state.modeIndex || 0))]
    : modeHelpTexts[Math.min(modeHelpTexts.length - 1, Math.max(0, state.modeIndex || 0))];
  configParticipation.textContent = state.appLanguage === "en" ? participationValuesEn[state.participationIndex] : participationValues[state.participationIndex];
  configDensity.textContent = state.appLanguage === "en"
    ? densityValuesEn[Math.min(densityValuesEn.length - 1, Math.max(0, state.densityIndex || 0))]
    : densityValues[Math.min(densityValues.length - 1, Math.max(0, state.densityIndex || 0))];
  configModel.textContent = state.appLanguage === "en" ? modelValuesEn[state.modelIndex] : modelValues[state.modelIndex];
  discussionRoundsInput.value = String(state.discussionRounds);
  discussionSizeSelect.value = String(state.discussionSize);
}

function showModeTooltip() {
  cycleModeButton.classList.add("show-tooltip");
  configModeTooltip.setAttribute("aria-hidden", "false");
}

function hideModeTooltip() {
  cycleModeButton.classList.remove("show-tooltip");
  configModeTooltip.setAttribute("aria-hidden", "true");
}

function cycleSetting(stateKey, values) {
  if (state.discussionRunning) {
    return;
  }
  state[stateKey] = (state[stateKey] + 1) % values.length;
  updateCompactSummary();
}

function setAutoFollow(enabled) {
  state.autoFollow = enabled;
  followToggle.textContent = enabled
    ? t("followToggle")
    : langText("查看消息", "View Messages");
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

const UI_TEXT = {
  zh: {
    currentTopicLabel: "当前话题",
    followToggle: "跟随新消息",
    languageToggle: "EN",
    userInputPlaceholder: "直接输入你的要求。主 AI 会先在这里帮你整理、追问、确认。",
    attachFiles: "上传附件",
    sendCommand: "发送指令",
    openModelProfileModal: "新增模型",
    modalTitleCreate: "新增模型配置",
    modalTitleEdit: "修改模型配置",
    summaryPromptTitle: "请确认这是不是你要的任务定义：",
    confirm: "确认",
    supplement: "继续补充",
    connectedModelsEmpty: "还没有已接入模型。先点击“新增模型”，填好参数后保存。",
    hostAiTag: "主持AI",
    testProfile: "测试",
    editProfile: "修改",
    deleteProfile: "删除接入",
    noAvailableModels: "还没有可用模型",
    providerTemplatePlaceholder: "选择厂商模板",
    providerTemplateCreate: "+ 新建自定义接入",
    taskGoal: "任务目标",
    focus: "重点关注",
    output: "输出形式",
    taskDefinitionOutput: "给出简明任务定义",
    roleAiAssistLabel: "AI 辅助生成",
    roleAiAssistPlaceholder: "输入职业、能力或要求，比如：护士、野外求生者、擅长地理判断的人、懂欧美审美的工业设计师",
    roleAiGenerateButton: "AI 生成草稿",
    roleAiGenerateHint: "也可以先输入一个职业或要求，让 AI 帮你生成一版人物草稿，再继续修改。",
    currentTaskEmpty: "目前还没有任务",
    seedSubtitle: "任务创建开始",
    seedBody: "现在有什么需求请直接发送。我会先在这里帮你整理、追问、确认，然后再开始生成人物。",
    startDiscussion: "开始讨论",
    stopDiscussion: "结束讨论",
    openSeatPicker: "打开选角器",
    returnToList: "返回列表",
    exitLibrary: "退出人物库",
    peopleLibrarySectionLabel: "人物库",
    peopleLibraryTitle: "管理你的人物配置库",
    newPersona: "+ 新建人物",
    filterAll: "全部",
    filterFavorite: "收藏",
    filterCustom: "自定义",
    peopleSearchPlaceholder: "搜索人物名、职业、标签、用途",
    roleNameLabel: "人物名称",
    roleNamePlaceholder: "比如：文本原义派",
    roleDescriptionLabel: "人物说明",
    roleDescriptionPlaceholder: "写这个人物的身份背景、长期经验和典型关切",
    rolePromptLabel: "专有提示词",
    rolePromptPlaceholder: "写给 AI 的专属提示词，先交代身份，再说明这个人物如何观察、分析、发言和反驳",
    roleStanceLabel: "立场",
    roleColorLabel: "角色颜色",
    roleTemperLabel: "性格",
    roleSourceLabel: "来源标签",
    roleSourcePlaceholder: "比如：讲道常用 / 司法 / 医疗",
    cancelAndClose: "取消并关闭",
    saveAndClose: "保存并关闭",
    seatPickerSectionLabel: "席位配置",
    seatPickerTitle: "为本轮讨论挑选参与者",
    addCustomPersona: "+ 添加自定义人物",
    close: "关闭",
    seatSourceRecommended: "临时生成",
    seatSourceLibrary: "人物库",
    seatPickerSearchPlaceholder: "搜索人物、职业、标签、说明",
    modelProfileSectionLabel: "模型接入",
    providerTemplateLabel: "模型厂商模板",
    profileDisplayNameLabel: "自定义名称",
    profileDisplayNamePlaceholder: "比如：主程序 / 系统 / 副手一",
    profileProviderNameLabel: "Provider 名称",
    profileProviderNamePlaceholder: "比如：OpenRouter / 本地中转站",
    profileCompatibilityLabel: "兼容协议",
    profileModelIdLabel: "模型 ID",
    profileModelIdPlaceholder: "gpt-5.4 / deepseek-chat / glm-4.5",
    profileBaseUrlLabel: "Base URL",
    profileBaseUrlPlaceholder: "https://api.openai.com/v1",
    profileEndpointPathLabel: "接口路径",
    profileEndpointPathPlaceholder: "/chat/completions",
    profileApiKeyLabel: "API Key",
    profileApiKeyPlaceholder: "sk-... 或中转 token",
    modelProfileNote: "这里用于选择厂商模板并填写接入参数。Base URL 通常由模板预填，不需要你自己猜。自定义接入目前适合 OpenAI Compatible 或 Anthropic Messages；如果卖家要求额外签名、特殊请求体或自定义请求头，这版前端还不够。点击保存后，这个配置才会进入已接入模型列表。系统内置模板不能删除，自定义配置可以删除。",
    profileTestHint: "单模型测试请在已接入模型列表操作",
    resetForm: "清空表单",
    deleteConfig: "删除配置",
    saveConfig: "保存配置",
    settingsSectionLabel: "系统设置",
    settingsTitle: "模型接入与运行配置",
    connectedModelListTitle: "已接入模型列表",
    connectedModelListNote: "这里直接展示已接入模型。新增、修改或切换模板时，点击右侧“配置模型”打开弹窗操作。",
    hostModelTitle: "主持 AI",
    hostModelSelectLabel: "谁来担任主持 AI",
    hostModelNote: "这里只指定主持 AI 用哪个已接入模型。其他人物席位仍然在席位卡里各自选择模型，不在这里统一覆盖。",
    peopleLibraryCurrentTag: "当前库",
    peopleLibraryOpen: "查看",
    discussionSettingsTitle: "讨论设置",
    cycleModeLabel: "讨论目标",
    cycleParticipationLabel: "用户参与",
    cycleDensityLabel: "回答力度",
    cycleModelLabel: "模型策略",
    discussionRoundsLabel: "讨论轮次",
    discussionSizeLabel: "讨论规模",
    peopleCountSuffix: "个人物原型",
    peopleSummaryTemplate: "包含 {base} 个常用职业、{favorite} 个收藏人物和 {custom} 个自定义人物。",
    totalBadge: "总数 {count}",
    favoriteBadge: "收藏 {count}",
    customBadge: "自定义 {count}",
  },
  en: {
    currentTopicLabel: "Current Topic",
    followToggle: "Follow New Messages",
    languageToggle: "中文",
    userInputPlaceholder: "Type your request directly. The primary AI will first organize, question, and confirm it here.",
    attachFiles: "Attach Files",
    sendCommand: "Send",
    openModelProfileModal: "Add Model",
    modalTitleCreate: "Add Model Configuration",
    modalTitleEdit: "Edit Model Configuration",
    summaryPromptTitle: "Please confirm whether this is the task definition you want:",
    confirm: "Confirm",
    supplement: "Add More",
    connectedModelsEmpty: "No connected models yet. Click “Add Model”, fill in the parameters, and save.",
    hostAiTag: "Host AI",
    testProfile: "Test",
    editProfile: "Edit",
    deleteProfile: "Delete Model",
    noAvailableModels: "No available models yet",
    providerTemplatePlaceholder: "Choose provider template",
    providerTemplateCreate: "+ New custom connection",
    taskGoal: "Task Goal",
    focus: "Key Focus",
    output: "Output Format",
    taskDefinitionOutput: "Provide a concise task definition",
    roleAiAssistLabel: "AI Assist",
    roleAiAssistPlaceholder: "Describe a role, profession, or requirement, for example: nurse, wilderness survival expert, geographer with strong terrain judgment, industrial designer who understands Western aesthetics",
    roleAiGenerateButton: "Generate Draft with AI",
    roleAiGenerateHint: "You can enter a profession or requirement here and let AI draft a persona first, then refine it manually.",
    currentTaskEmpty: "No task yet",
    seedSubtitle: "Task Intake Started",
    seedBody: "Send your request directly. The primary AI will first organize, question, and confirm it here before generating participants.",
    startDiscussion: "Start",
    stopDiscussion: "Stop",
    openSeatPicker: "Pick Seats",
    returnToList: "Back to List",
    exitLibrary: "Exit Library",
    peopleLibrarySectionLabel: "Persona Library",
    peopleLibraryTitle: "Manage Your Persona Library",
    newPersona: "+ New Persona",
    filterAll: "All",
    filterFavorite: "Saved",
    filterCustom: "Custom",
    peopleSearchPlaceholder: "Search names, roles, tags, or use cases",
    roleNameLabel: "Persona Name",
    roleNamePlaceholder: "For example: literal reading advocate",
    roleDescriptionLabel: "Persona Background",
    roleDescriptionPlaceholder: "Describe this persona's background, long-term experience, and typical concerns",
    rolePromptLabel: "Persona Prompt",
    rolePromptPlaceholder: "Write the AI prompt for this persona: state the identity first, then how this persona observes, analyzes, speaks, and challenges",
    roleStanceLabel: "Stance",
    roleColorLabel: "Color",
    roleTemperLabel: "Temper",
    roleSourceLabel: "Source Tag",
    roleSourcePlaceholder: "For example: sermon use / legal / medical",
    cancelAndClose: "Cancel and Close",
    saveAndClose: "Save and Close",
    seatPickerSectionLabel: "Seat Setup",
    seatPickerTitle: "Choose Participants for This Round",
    addCustomPersona: "+ Add Custom Persona",
    close: "Close",
    seatSourceRecommended: "Generated",
    seatSourceLibrary: "Library",
    seatPickerSearchPlaceholder: "Search personas, roles, tags, or descriptions",
    modelProfileSectionLabel: "Model Connection",
    providerTemplateLabel: "Provider Template",
    profileDisplayNameLabel: "Custom Name",
    profileDisplayNamePlaceholder: "For example: main / system / assistant one",
    profileProviderNameLabel: "Provider Name",
    profileProviderNamePlaceholder: "For example: OpenRouter / local relay",
    profileCompatibilityLabel: "Protocol",
    profileModelIdLabel: "Model ID",
    profileModelIdPlaceholder: "gpt-5.4 / deepseek-chat / glm-4.5",
    profileBaseUrlLabel: "Base URL",
    profileBaseUrlPlaceholder: "https://api.openai.com/v1",
    profileEndpointPathLabel: "Endpoint Path",
    profileEndpointPathPlaceholder: "/chat/completions",
    profileApiKeyLabel: "API Key",
    profileApiKeyPlaceholder: "sk-... or relay token",
    modelProfileNote: "Use this form to choose a provider template and fill in connection parameters. The Base URL is usually prefilled by the template, so you should not need to guess it. Custom connections currently support OpenAI Compatible and Anthropic Messages. If your vendor requires extra signing, a special request body, or custom headers, this prototype is not enough yet. The configuration will only appear in the connected model list after you save it. Built-in templates cannot be deleted; custom configurations can.",
    profileTestHint: "Run single-model tests from the connected model list",
    resetForm: "Reset Form",
    deleteConfig: "Delete Config",
    saveConfig: "Save Config",
    settingsSectionLabel: "System Settings",
    settingsTitle: "Model Connection and Runtime Settings",
    connectedModelListTitle: "Connected Models",
    connectedModelListNote: "This area shows the connected models directly. To add, edit, or switch templates, use the button on the right to open the configuration modal.",
    hostModelTitle: "Host AI",
    hostModelSelectLabel: "Which model should act as the host AI",
    hostModelNote: "Only the host AI is assigned here. Other personas still choose their own model from their seat cards and are not overridden globally.",
    peopleLibraryCurrentTag: "Current Library",
    peopleLibraryOpen: "Open",
    discussionSettingsTitle: "Discussion Settings",
    cycleModeLabel: "Goal",
    cycleParticipationLabel: "User Input",
    cycleDensityLabel: "Answer Depth",
    cycleModelLabel: "Model Strategy",
    discussionRoundsLabel: "Rounds",
    discussionSizeLabel: "Participants",
    peopleCountSuffix: "personas",
    peopleSummaryTemplate: "Includes {base} built-in roles, {favorite} saved personas, and {custom} custom personas.",
    totalBadge: "Total {count}",
    favoriteBadge: "Saved {count}",
    customBadge: "Custom {count}",
  },
};

function t(key) {
  return UI_TEXT[state.appLanguage]?.[key] || UI_TEXT.zh[key] || key;
}

function langText(zhText, enText) {
  return state.appLanguage === "en" ? enText : zhText;
}

function formatUiText(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function setElementText(id, key) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = t(key);
  }
}

function setElementPlaceholder(id, key) {
  const element = document.getElementById(id);
  if (element) {
    element.placeholder = t(key);
  }
}

function localizeSelectOptions(selectElement, labelsByValue) {
  if (!selectElement) {
    return;
  }
  [...selectElement.options].forEach((option) => {
    if (labelsByValue[option.value]) {
      option.textContent = labelsByValue[option.value];
    }
  });
}

function getSummaryLabels() {
  return {
    goal: t("taskGoal"),
    focus: t("focus"),
    output: t("output"),
  };
}

function getExpandedTaskSummaryLabels() {
  return state.appLanguage === "en"
    ? {
        goal: "Task Definition",
        flow: "Discussion Focus",
        directions: "",
      }
    : {
        goal: "任务定义",
        flow: "讨论重点",
        directions: "",
      };
}

function applyLanguageToStaticUi() {
  if (currentTopicLabel) {
    currentTopicLabel.textContent = t("currentTopicLabel");
  }
  if (followToggle) {
    followToggle.textContent = t("followToggle");
  }
  if (appLanguageToggle) {
    appLanguageToggle.textContent = t("languageToggle");
  }
  if (userInput) {
    userInput.placeholder = t("userInputPlaceholder");
  }
  if (attachFilesButton) {
    attachFilesButton.textContent = t("attachFiles");
  }
  if (sendCommand) {
    sendCommand.textContent = t("sendCommand");
  }
  if (openModelProfileModalButton) {
    openModelProfileModalButton.textContent = t("openModelProfileModal");
  }
  if (startDiscussionButton) {
    startDiscussionButton.textContent = t("startDiscussion");
  }
  if (stopDiscussionButton) {
    stopDiscussionButton.textContent = t("stopDiscussion");
  }
  if (openSeatPickerButton) {
    openSeatPickerButton.textContent = t("openSeatPicker");
  }
  renderAiRoleRecommendationToggle();
  renderVoiceReadToggle();
  if (closePeopleLibrary) {
    closePeopleLibrary.textContent = roleEditor.classList.contains("hidden") ? t("exitLibrary") : t("returnToList");
  }
  setElementText("people-library-section-label", "peopleLibrarySectionLabel");
  setElementText("people-library-title", "peopleLibraryTitle");
  setElementText("open-role-editor", "newPersona");
  setElementText("people-filter-all", "filterAll");
  setElementText("people-filter-favorite", "filterFavorite");
  setElementText("people-filter-custom", "filterCustom");
  setElementPlaceholder("people-search", "peopleSearchPlaceholder");
  setElementText("role-editor-name-label", "roleNameLabel");
  setElementText("role-editor-ai-label", "roleAiAssistLabel");
  setElementPlaceholder("role-editor-ai-requirements", "roleAiAssistPlaceholder");
  setElementText("generate-role-with-ai", "roleAiGenerateButton");
  setElementPlaceholder("role-editor-name", "roleNamePlaceholder");
  setElementText("role-editor-description-label", "roleDescriptionLabel");
  setElementPlaceholder("role-editor-description", "roleDescriptionPlaceholder");
  setElementText("role-editor-prompt-label", "rolePromptLabel");
  setElementPlaceholder("role-editor-prompt", "rolePromptPlaceholder");
  setElementText("role-editor-stance-label", "roleStanceLabel");
  setElementText("role-editor-color-label", "roleColorLabel");
  setElementText("role-editor-temper-label", "roleTemperLabel");
  setElementText("role-editor-source-label-text", "roleSourceLabel");
  setElementPlaceholder("role-editor-source-label", "roleSourcePlaceholder");
  if (roleEditorAiFeedback) {
    roleEditorAiFeedback.textContent = t("roleAiGenerateHint");
    roleEditorAiFeedback.className = "drawer-feedback compact-feedback";
  }
  setElementText("cancel-role-editor", "cancelAndClose");
  setElementText("save-role-editor", "saveAndClose");
  setElementText("seat-picker-section-label", "seatPickerSectionLabel");
  setElementText("seat-picker-title", "seatPickerTitle");
  setElementText("open-seat-picker-role-editor", "addCustomPersona");
  setElementText("close-seat-picker", "close");
  setElementText("seat-source-recommended", "seatSourceRecommended");
  setElementText("seat-source-library", "seatSourceLibrary");
  setElementPlaceholder("seat-picker-search", "seatPickerSearchPlaceholder");
  setElementText("model-profile-section-label", "modelProfileSectionLabel");
  setElementText("close-model-profile-modal", "close");
  setElementText("provider-template-label", "providerTemplateLabel");
  setElementText("profile-display-name-label", "profileDisplayNameLabel");
  setElementPlaceholder("profile-display-name", "profileDisplayNamePlaceholder");
  setElementText("profile-provider-name-label", "profileProviderNameLabel");
  setElementPlaceholder("profile-provider-name", "profileProviderNamePlaceholder");
  setElementText("profile-compatibility-label", "profileCompatibilityLabel");
  setElementText("profile-model-id-label", "profileModelIdLabel");
  setElementPlaceholder("profile-model-id", "profileModelIdPlaceholder");
  setElementText("profile-base-url-label", "profileBaseUrlLabel");
  setElementPlaceholder("profile-base-url", "profileBaseUrlPlaceholder");
  setElementText("profile-endpoint-path-label", "profileEndpointPathLabel");
  setElementPlaceholder("profile-endpoint-path", "profileEndpointPathPlaceholder");
  setElementText("profile-api-key-label", "profileApiKeyLabel");
  setElementPlaceholder("profile-api-key", "profileApiKeyPlaceholder");
  setElementText("model-profile-note", "modelProfileNote");
  if (profileTestStatus && !profileTestStatus.dataset.dynamic) {
    profileTestStatus.textContent = t("profileTestHint");
  }
  setElementText("reset-model-profile", "resetForm");
  setElementText("delete-model-profile", "deleteConfig");
  setElementText("save-model-profile", "saveConfig");
  setElementText("settings-section-label", "settingsSectionLabel");
  setElementText("settings-title", "settingsTitle");
  setElementText("close-settings-drawer", "close");
  setElementText("connected-model-list-title", "connectedModelListTitle");
  setElementText("connected-model-list-note", "connectedModelListNote");
  setElementText("host-model-title", "hostModelTitle");
  setElementText("host-model-select-label", "hostModelSelectLabel");
  setElementText("host-model-note", "hostModelNote");
  setElementText("sidebar-people-library-title", "peopleLibrarySectionLabel");
  setElementText("open-people-library", "peopleLibraryOpen");
  setElementText("people-library-current-tag", "peopleLibraryCurrentTag");
  setElementText("discussion-settings-title", "discussionSettingsTitle");
  setElementText("cycle-mode-label", "cycleModeLabel");
  setElementText("cycle-participation-label", "cycleParticipationLabel");
  setElementText("cycle-density-label", "cycleDensityLabel");
  setElementText("cycle-model-label", "cycleModelLabel");
  setElementText("discussion-rounds-label", "discussionRoundsLabel");
  setElementText("discussion-size-label", "discussionSizeLabel");

  localizeSelectOptions(roleEditorStance, {
    "支持原命题": state.appLanguage === "en" ? "Support the claim" : "支持原命题",
    "强力反驳": state.appLanguage === "en" ? "Strong rebuttal" : "强力反驳",
    "中立裁决": state.appLanguage === "en" ? "Neutral judgment" : "中立裁决",
    "补充背景": state.appLanguage === "en" ? "Add context" : "补充背景",
    "强调落地": state.appLanguage === "en" ? "Stress execution" : "强调落地",
    "强调风险": state.appLanguage === "en" ? "Stress risk" : "强调风险",
    "澄清表达": state.appLanguage === "en" ? "Clarify expression" : "澄清表达",
    "自定义": state.appLanguage === "en" ? "Custom" : "自定义",
  });
  localizeSelectOptions(roleEditorTemper, {
    "稳健": state.appLanguage === "en" ? "Steady" : "稳健",
    "温厚": state.appLanguage === "en" ? "Warm" : "温厚",
    "尖锐": state.appLanguage === "en" ? "Sharp" : "尖锐",
    "克制": state.appLanguage === "en" ? "Restrained" : "克制",
    "审慎": state.appLanguage === "en" ? "Cautious" : "审慎",
    "坚决": state.appLanguage === "en" ? "Firm" : "坚决",
    "冷静": state.appLanguage === "en" ? "Calm" : "冷静",
    "谨慎": state.appLanguage === "en" ? "Prudent" : "谨慎",
    "平衡": state.appLanguage === "en" ? "Balanced" : "平衡",
    "保守": state.appLanguage === "en" ? "Conservative" : "保守",
    "耐心": state.appLanguage === "en" ? "Patient" : "耐心",
    "细腻": state.appLanguage === "en" ? "Nuanced" : "细腻",
    "高压": state.appLanguage === "en" ? "High-pressure" : "高压",
    "强硬": state.appLanguage === "en" ? "Hardline" : "强硬",
    "灵活": state.appLanguage === "en" ? "Flexible" : "灵活",
    "温柔": state.appLanguage === "en" ? "Gentle" : "温柔",
    "自定义": state.appLanguage === "en" ? "Custom" : "自定义",
  });
}

function setModelProfileModalMode(mode = "create") {
  if (!modelProfileModalTitle) {
    return;
  }
  modelProfileModalTitle.textContent = mode === "edit" ? t("modalTitleEdit") : t("modalTitleCreate");
}

function containsChinese(text) {
  return /[\u4e00-\u9fff]/.test(text || "");
}

function containsEnglishPhrase(text) {
  return /[A-Za-z]{3,}(?:\s+[A-Za-z]{2,})+/.test(text || "");
}

function extractHeadlineFromSummary(summary) {
  const labels = [getExpandedTaskSummaryLabels().goal, getSummaryLabels().goal, "任务目标", "Task Goal", "goal", "task goal"];
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(summary || "").match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*[:：]\\s*([^\\n]+)`, "i"));
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }
  return String(summary || "").split(/\n+/).find(Boolean)?.trim() || String(summary || "");
}

function sanitizeTaskSummaryBlock(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<think>[\s\S]*?<\/think>/gi, " ")
    .replace(/^[-*•\d.)\s]+/gm, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasExplicitScopeConstraint(originalContent = "") {
  return /(不涉及|不包含|不包括|不做|不用|排除|先不|暂不|不要讨论|不需要|只讨论|仅讨论|只围绕|仅围绕)/.test(normalizeRequestText(originalContent));
}

function sanitizeExpandedTaskSummary(summary, originalContent = "") {
  const cleaned = sanitizeTaskSummaryBlock(summary);
  if (!cleaned) {
    return "";
  }

  const withoutDiscussionFocus = cleaned
    .replace(/(?:^|\n)\s*(讨论重点|Discussion Focus|重点关注|关注重点|focus)\s*[:：][\s\S]*?(?=(?:\n\s*[\u4e00-\u9fa5A-Za-z ]+\s*[:：])|$)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (hasExplicitScopeConstraint(originalContent)) {
    return withoutDiscussionFocus;
  }

  return withoutDiscussionFocus
    .replace(/(?:^|\n)\s*(任务范围|关键现场与关键环节|确认提示|Task Scope|Key Scenes and Critical Steps|Confirmation Prompt)\s*[:：][^\n]*(?:\n(?:[-*]|\d+[.)]).*)?/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildFallbackExpandedTaskSummary(originalContent = "") {
  const labels = getExpandedTaskSummaryLabels();
  const summary = summarizeInput(originalContent || "");
  const parts = parseSummaryParts(summary);
  const fallbackGoal = parts.goal || (state.appLanguage === "en"
    ? "Turn the current request into an open discussion task. Clarify what the group should explore, keep the framing open, and only keep context that helps the discussion move."
    : "把当前需求整理成一条开放讨论任务，明确这次要探讨什么，保持讨论口径开放，只保留有助于展开讨论的必要上下文。");

  return `${labels.goal}：${fallbackGoal}`;
}

function formatTaskSummaryForDisplay(summary) {
  const labels = getExpandedTaskSummaryLabels();
  const goal = sanitizeSummaryFragment(extractSummaryPart(summary, [labels.goal, "任务定义", "Task Definition", "任务目标", "Task Goal"]));

  if (!goal) {
    return String(summary || "").trim();
  }

  return `${labels.goal}：${goal}`;
}

function refreshTaskSummaryMessages() {
  if (!discussionStream || !state.lastSummary) {
    return;
  }

  const displaySummary = `${t("summaryPromptTitle")} ${formatTaskSummaryForDisplay(state.lastSummary)}`;
  discussionStream.querySelectorAll(".chat-item.system").forEach((item) => {
    const sublabel = item.querySelector(".chat-meta span")?.textContent?.trim();
    if (sublabel === langText("整理后的任务定义", "Refined Task Definition")) {
      const body = item.querySelector(".chat-bubble p");
      if (body) {
        body.textContent = displaySummary;
      }
    }
  });
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

  const labels = getSummaryLabels();
  const parts = [`${labels.goal}：${shortenText(goal || normalized, 32)}`];
  if (focusSegments) {
    parts.push(`${labels.focus}：${shortenText(focusSegments, 34)}`);
  }
  if (output) {
    parts.push(`${labels.output}：${shortenText(output, 32)}`);
  }

  return parts.join("；");
}

function extractSummaryPart(summary, labels) {
  const normalized = summary.replace(/\r/g, "");
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const lineMatch = normalized.match(new RegExp(`(?:^|\\n|；|;)\\s*(?:[-*•]|\\d+[.)])?\\s*${escaped}\\s*[:：]\\s*([^\\n；;]+)`, "i"));
    if (lineMatch?.[1]) {
      return lineMatch[1].trim();
    }
  }
  return "";
}

function sanitizeSummaryFragment(content) {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<think>[\s\S]*?<\/think>/gi, " ")
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/^[-*•\d.)\s]+/, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .replace(/^(here'?s a thinking process|thinking process|analyze user input|identify constraints|role)\s*[:：-]?\s*/i, "")
    .trim();
}

function parseSummaryParts(summary) {
  const labels = getSummaryLabels();
  return {
    goal: sanitizeSummaryFragment(extractSummaryPart(summary, [labels.goal, "任务目标", "任务", "goal", "task goal", "objective", "purpose"])),
    focus: sanitizeSummaryFragment(extractSummaryPart(summary, [labels.focus, "重点关注", "关注重点", "focus", "key focus", "重点"])),
    output: sanitizeSummaryFragment(extractSummaryPart(summary, [labels.output, "输出形式", "输出", "deliverable", "output format", "format"])),
  };
}

function isWeakSummaryValue(content, kind) {
  const normalized = (content || "").trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  const weakPatterns = kind === "goal"
    ? [/^小组探讨准备$/, /^discussion prep(aration)?$/, /^task definition$/, /^analyze user input$/, /^identify constraints$/, /^role$/]
    : kind === "output"
      ? [/^给出简明任务定义$/, /^task definition$/, /^summary$/]
      : [];
  return weakPatterns.some((pattern) => pattern.test(normalized));
}

function normalizeTaskSummary(rawSummary, originalContent) {
  const cleaned = sanitizeExpandedTaskSummary(rawSummary, originalContent);
  const expandedLabels = getExpandedTaskSummaryLabels();
  const hasExpandedStructure = [expandedLabels.goal, expandedLabels.flow, expandedLabels.directions]
    .filter(Boolean)
    .some((label) => new RegExp(`(?:^|\\n)\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:：]`, "i").test(cleaned));

  if (cleaned && hasExpandedStructure) {
    return cleaned;
  }

  return buildFallbackExpandedTaskSummary(originalContent);
}

function getPrimarySummaryProfile() {
  const configuredProfiles = getConfiguredProfiles();
  const mappedMain = configuredProfiles.find((profile) => profile.id === state.mappings.main);
  return mappedMain || configuredProfiles[0] || null;
}

function getPrimarySummaryProfileName() {
  return getPrimarySummaryProfile()?.displayName || langText("未设置", "Not set");
}

function renderAiRoleRecommendationToggle() {
  if (!toggleAiRoleRecommendationButton) {
    return;
  }
  toggleAiRoleRecommendationButton.innerHTML = `
    <span class="seat-toggle-label">${escapeHtml(langText("AI 推荐人物", "AI Personas"))}</span>
    <span class="seat-toggle-track" aria-hidden="true"></span>
  `;
  toggleAiRoleRecommendationButton.classList.toggle("is-on", state.aiAutoRecommendEnabled);
  toggleAiRoleRecommendationButton.setAttribute("aria-pressed", state.aiAutoRecommendEnabled ? "true" : "false");
}

function renderVoiceReadToggle() {
  if (!toggleVoiceReadButton) {
    return;
  }
  const label = state.voiceReadEnabled
    ? langText("关闭朗读", "Turn read-aloud off")
    : langText("开启朗读", "Turn read-aloud on");
  toggleVoiceReadButton.classList.toggle("is-on", state.voiceReadEnabled);
  toggleVoiceReadButton.setAttribute("aria-pressed", state.voiceReadEnabled ? "true" : "false");
  toggleVoiceReadButton.setAttribute("aria-label", label);
  toggleVoiceReadButton.title = label;
}

function stopReadAloudPlayback() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function getPreferredReadAloudVoice() {
  if (!window.speechSynthesis) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    return null;
  }

  if (preferredReadAloudVoice && voices.some((voice) => voice.voiceURI === preferredReadAloudVoice.voiceURI)) {
    return preferredReadAloudVoice;
  }

  const preferred = state.appLanguage === "en"
    ? voices.find((voice) => /^en(-|_|$)/i.test(voice.lang) && /female|zira|aria|jenny|samantha/i.test(`${voice.name} ${voice.voiceURI}`))
      || voices.find((voice) => /^en(-|_|$)/i.test(voice.lang))
    : voices.find((voice) => /^zh(-|_|$)/i.test(voice.lang) && /xiaoxiao|xiaoyi|female|huihui/i.test(`${voice.name} ${voice.voiceURI}`))
      || voices.find((voice) => /^zh(-|_|$)/i.test(voice.lang));

  preferredReadAloudVoice = preferred || voices[0] || null;
  return preferredReadAloudVoice;
}

function sanitizeReadAloudText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/[★•]/g, " ")
    .trim()
    .slice(0, 800);
}

function readTextAloud(text, options = {}) {
  if (!state.voiceReadEnabled) {
    return;
  }

  const normalized = sanitizeReadAloudText(text);
  if (!normalized || !window.speechSynthesis) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(normalized);
  utterance.lang = state.appLanguage === "en" ? "en-US" : "zh-CN";
  utterance.rate = state.appLanguage === "en" ? 1 : 1.02;
  utterance.pitch = 1;
  const preferredVoice = getPreferredReadAloudVoice();
  if (preferredVoice) {
    utterance.voice = preferredVoice;
    utterance.lang = preferredVoice.lang || utterance.lang;
  }
  window.speechSynthesis.speak(utterance);
}

function maybeReadAppendedMessage(element) {
  if (!state.voiceReadEnabled || !element || element.classList.contains("user")) {
    return;
  }
  const body = element.querySelector(".chat-bubble p")?.textContent?.trim() || "";
  if (!body) {
    return;
  }
  readTextAloud(body);
}

function getMappedProfile(assignment) {
  const targetId = state.mappings[assignment] || "";
  return state.modelProfiles.find((profile) => profile.id === targetId && profile.configured) || null;
}

function isQwenProfile(profile) {
  const fingerprint = [profile?.modelId, profile?.displayName, profile?.providerName, profile?.baseUrl]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return fingerprint.includes("qwen") || fingerprint.includes("dashscope");
}

function isVolcengineProfile(profile) {
  const fingerprint = [profile?.modelId, profile?.displayName, profile?.providerName, profile?.baseUrl]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return fingerprint.includes("volcengine") || fingerprint.includes("volces") || fingerprint.includes("doubao");
}

function formatHttpFailureMessage(profile, response, actionLabel = "调用失败") {
  const status = response?.status || "未知";
  if (status === 404 && isVolcengineProfile(profile)) {
    return `${profile.displayName} ${actionLabel} 404。火山方舟这里最常见是 Model ID 填错了。请填官方文档里的精确 Model ID，例如 doubao-seed-2-0-lite-260215，不能填 Doubao-Seed-1.8 这类展示名；Base URL 用 https://ark.cn-beijing.volces.com/api/v3，接口路径用 /chat/completions。`;
  }
  return `${profile.displayName} ${actionLabel} ${status}`;
}

function buildOpenAiCompatibleRequestBody(profile, prompt, maxTokens, extras = {}) {
  const body = {
    model: profile.modelId,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    ...extras,
  };

  if (isQwenProfile(profile)) {
    body.chat_template_kwargs = { enable_thinking: false };
  }

  return body;
}

async function requestModelText(profile, prompt, maxTokens = 420, signal, timeoutMs = MODEL_REQUEST_TIMEOUT_MS) {
  const requestControl = createRequestSignal(signal, timeoutMs);
  let response;
  try {
    if (profile.compatibility === "anthropic") {
      response = await fetch(joinUrl(profile.baseUrl, profile.endpointPath || "/messages"), {
        method: "POST",
        signal: requestControl.signal,
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
        signal: requestControl.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${profile.apiKey}`,
        },
        body: JSON.stringify(buildOpenAiCompatibleRequestBody(profile, prompt, maxTokens, {
          temperature: 0.35,
        })),
      });
    }
  } catch (error) {
    requestControl.cleanup();
    if (requestControl.didTimeOut()) {
      throw new Error(`${profile.displayName} 响应超时。这个模型已接通，但当前请求长时间没有返回。`);
    }
    throw error;
  }
  requestControl.cleanup();

  if (!response.ok) {
    throw new Error(formatHttpFailureMessage(profile, response));
  }

  const payload = await response.json();
  const text = extractTextFromModelResponse(payload, profile.compatibility);
  if (!text) {
    throw new Error(`${profile.displayName} 返回了空内容`);
  }
  return sanitizeDisplayedModelText(text);
}

function isModelTimeoutError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /响应超时|timed out|timeout/i.test(message);
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

async function waitForUserParticipation(round, totalRounds, moderatorRole) {
  const isFinalConfiguredRound = round >= totalRounds;
  appendRoleMessage(
    moderatorRole,
    langText(`第 ${round} 轮后 · 等待用户`, `After Round ${round} · Waiting for User`),
    isFinalConfiguredRound
      ? langText(`第 ${round} 轮已经是当前预设的最后一轮。现在请用户先表态。你可以补充证据、指出谁说得不对、表达你的判断，或者说明你还想深挖哪一条线。系统会先停在这里，等你说完后再生成阶段性结论，并请你决定现在结束，还是再追加几轮。`, `Round ${round} is the last round in the current plan. It is now the user's turn. You can add evidence, point out who was off, give your own judgment, or name the thread you still want to probe. The system will pause here, then generate a stage conclusion and ask whether to stop now or add more rounds.`)
      : langText(`第 ${round} 轮讨论已经结束。现在请用户发言。你可以补充证据、表达倾向、指出谁说得不对，或者要求下一轮重点追问某个点。系统会停在这里，等你说完再继续第 ${round + 1} 轮。`, `Round ${round} is complete. It is now the user's turn. You can add evidence, express a preference, point out who was off, or tell the system what to probe in the next round. The system will pause here and continue with round ${round + 1} after you respond.`),
    "系统主持"
  );
  state.awaitingUserParticipation = true;
  setSpeakerCardForRole(moderatorRole, langText(`第 ${round} 轮后 · 等待用户`, `After Round ${round} · Waiting for User`), isFinalConfiguredRound ? langText("当前已到预设最后一轮，正在等待用户先表态，再决定是否收尾或追加轮次。", "The planned final round is complete. Waiting for the user's reaction before deciding whether to stop or add more rounds.") : langText("当前轮次已结束，正在等待用户补充意见后再继续。", "This round is complete. Waiting for the user's follow-up before continuing."));
  updateLiveStatus(langText(`第 ${round} 轮后暂停：等待用户发言`, `Paused after round ${round}: waiting for user input`), "pending");
  updateSeatFeedback(isFinalConfiguredRound ? langText(`第 ${round} 轮已结束，等待用户表态并决定是否追加轮次。`, `Round ${round} is complete. Waiting for the user's reaction and whether to add more rounds.`) : langText(`第 ${round} 轮已结束，等待用户发言。`, `Round ${round} is complete. Waiting for user input.`), "pending");

  const userTurn = await new Promise((resolve) => {
    pendingUserParticipationResolver = resolve;
  });

  pendingUserParticipationResolver = null;
  state.awaitingUserParticipation = false;

  if (!userTurn || userTurn.aborted) {
    throw new DOMException("用户结束了本轮讨论。", "AbortError");
  }

  return userTurn;
}

function parseRequestedRoundCount(rawText) {
  const normalized = String(rawText || "").trim();
  const arabicMatch = normalized.match(/([1-9])\s*轮/);
  if (arabicMatch) {
    return Number(arabicMatch[1]);
  }

  const chineseMatch = normalized.match(/([一二三四五六七八九两俩])\s*轮/);
  if (!chineseMatch) {
    return 0;
  }

  const chineseNumberMap = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    两: 2,
    俩: 2,
  };
  return chineseNumberMap[chineseMatch[1]] || 0;
}

function parseDiscussionContinuationDecision(userTurn) {
  const rawText = (userTurn?.content || "").trim();
  const normalized = rawText.replace(/\s+/g, "");
  const hasAttachments = !!userTurn?.attachments?.length;
  const wantsStop = /(结束|可以了|到这|先这样|不用继续|停止|收尾|就这样)/.test(normalized);
  const wantsContinue = hasAttachments || /(继续|再来|接着|往下|深入|补充|追问|展开|下一轮|别停)/.test(normalized);
  const additionalRounds = Math.max(1, parseRequestedRoundCount(rawText) || 1);

  return {
    continueDiscussion: wantsContinue || (!wantsStop && (!!rawText || hasAttachments)),
    additionalRounds,
    content: rawText || (hasAttachments ? "请结合我刚上传的补充材料继续下一轮讨论。" : "请围绕当前最大分歧继续追问。"),
  };
}

async function waitForDiscussionContinuationDecision(completedRounds, moderatorRole) {
  appendRoleMessage(
    moderatorRole,
    langText(`第 ${completedRounds} 轮后 · 是否继续`, `After Round ${completedRounds} · Continue?`),
    langText("本轮讨论已经达到预设轮数。现在请用户决定：如果你认为可以收束，就直接回复“结束”；如果你还想继续，就回复“继续 1 轮”“继续 2 轮”之类的说法，或者直接写你下一轮最想追问的点。若你只写新的追问点，系统默认再追加 1 轮。", "The planned rounds are complete. Decide whether to stop or continue: reply “end” to wrap up, or say something like “continue for 1 round” or “continue for 2 rounds”. You can also write the issue you want to probe next. If you only provide a new probe point, the system will add 1 more round by default."),
    "系统主持"
  );
  state.awaitingDiscussionContinuation = true;
  setSpeakerCardForRole(moderatorRole, langText(`第 ${completedRounds} 轮后 · 等待决定`, `After Round ${completedRounds} · Waiting for Decision`), langText("最终结论和报告已经给出，正在等待用户决定现在结束还是继续。", "The stage conclusion and report are ready. Waiting for the user's decision to end or continue."));
  updateLiveStatus(langText(`第 ${completedRounds} 轮后暂停：等待用户决定结束或继续`, `Paused after round ${completedRounds}: waiting for user decision`), "pending");
  updateSeatFeedback(langText("已生成阶段性结论，等待用户决定是否继续。", "A stage conclusion is ready. Waiting for the user to decide whether to continue."), "pending");

  const userTurn = await new Promise((resolve) => {
    pendingDiscussionContinuationResolver = resolve;
  });

  pendingDiscussionContinuationResolver = null;
  state.awaitingDiscussionContinuation = false;

  if (!userTurn || userTurn.aborted) {
    throw new DOMException("用户结束了当前讨论。", "AbortError");
  }

  return parseDiscussionContinuationDecision(userTurn);
}

async function runSingleDiscussionRound({
  round,
  totalRounds,
  orderedSpeakers,
  moderatorRole,
  moderatorProfile,
  roundNotes,
  budget,
  signal,
  userParticipationEnabled,
  userRoundRole,
}) {
  const summary = state.lastSummary;
  const liveTurns = [];

  for (const speakerRole of orderedSpeakers) {
    const assignment = getRoleAssignment(speakerRole);
    const isLead = assignment === "challenger" || assignment === "rebuttal";
    const discussionProfile = getRoleModelProfile(speakerRole);
    const speakerPrompt = [
      `你现在是本场讨论里的第 ${state.discussionOrder[speakerRole.id] || 1} 位发言者，第 ${round}/${totalRounds} 轮发言。`,
      getAssignmentInstruction(assignment),
      getSpeakerModeInstruction(assignment),
      "请只基于任务、主持AI前面轮次的小结，以及本轮已经出现的发言继续往下讲。不要假装看到了还没发言的人。",
      buildDiscussionContext(summary, roundNotes, liveTurns),
      rolePromptBlock(speakerRole),
      `篇幅要求：${isLead ? budget.charHint : "控制在 280 到 520 字内。"}`,
      "绝对不要输出 thinking process、analyze user input、自检步骤、constraint list 或任何内部推理过程。",
      "要求：直接输出本轮发言正文，不要自我介绍，不要使用 Markdown 标题和列表。",
    ].join("\n\n");
    setSpeakerCardForRole(speakerRole, langText(`第 ${round} 轮 · 正在思考`, `Round ${round} · Thinking`), langText("正在读取任务和前面已发言内容，并准备按顺序接续。", "Reading the task and previous turns, then preparing to continue in order."));
    updateLiveStatus(langText(`第 ${round} 轮：${speakerRole.name} 正在思考`, `Round ${round}: ${speakerRole.name} is thinking`), "pending");
    updateSeatFeedback(langText(`第 ${round} 轮：${speakerRole.name} 正在思考`, `Round ${round}: ${speakerRole.name} is thinking`), "pending");
    const speakerText = await requestModelText(discussionProfile, speakerPrompt, isLead ? budget.main : budget.participant, signal);
    setSpeakerCardForRole(speakerRole, langText(`第 ${round} 轮 · 正在发言`, `Round ${round} · Speaking`), langText("当前顺序发言已生成，马上写入讨论流。", "The current turn has been generated and will be written into the discussion stream next."));
    updateLiveStatus(langText(`第 ${round} 轮：${speakerRole.name} 正在发言`, `Round ${round}: ${speakerRole.name} is speaking`), "pending");
    appendRoleMessage(speakerRole, `第 ${round} 轮 · ${speakerRole.name}`, speakerText, discussionProfile.displayName);
    liveTurns.push({ role: speakerRole, assignmentLabel: `第 ${round} 轮 · ${speakerRole.name}`, text: speakerText });
  }

  const moderatorRoundSummaryPrompt = [
    `你现在是本场讨论的主持AI，需要在第 ${round}/${totalRounds} 轮结束后做一段主持小结。`,
    getModeratorModeInstruction(),
    "你的任务是压缩本轮重点，明确谁提出了什么、谁提出了反对或保留、哪些例子或依据最关键。",
    "这段小结既要给用户看，也要为下一轮压缩上下文，所以要信息密、语言自然、不要太长。",
    `任务定义：${summary}`,
    `本轮记录：${liveTurns.map((turn) => `${turn.assignmentLabel}\n${turn.text}`).join("\n\n")}`,
    "绝对不要输出 thinking process、英文分析草稿、自检步骤、constraint list 或任何内部推理过程。",
    "要求：控制在 260 到 420 字内，点出本轮最关键的共识、分歧和例证。",
  ].join("\n\n");
  setSpeakerCardForRole(moderatorRole, langText(`第 ${round} 轮后 · 正在思考`, `After Round ${round} · Thinking`), langText("正在压缩本轮发言，整理谁说了什么、哪里有争议。", "Compressing this round and organizing who said what and where the disagreements are."));
  updateLiveStatus(langText(`第 ${round} 轮后：主持AI 正在总结`, `After round ${round}: Host AI is summarizing`), "pending");
  const moderatorSummary = await requestModelText(moderatorProfile, moderatorRoundSummaryPrompt, Math.min(700, budget.participant), signal);
  appendRoleMessage(moderatorRole, `第 ${round} 轮小结 · 主持AI`, moderatorSummary, moderatorProfile.displayName);

  const roundNote = { round, turns: [...liveTurns], moderatorSummary };
  if (userParticipationEnabled) {
    const userTurn = await waitForUserParticipation(round, totalRounds, moderatorRole);
    roundNote.turns.push({
      role: userRoundRole,
      assignmentLabel: `第 ${round} 轮后 · 用户补充`,
      text: userTurn.content,
    });
  }

  return roundNote;
}

async function generateStageConclusion({ targetRounds, judgeRole, judgeProfile, moderatorProfile, roundNotes, budget, signal }) {
  const judgePrompt = [
    `你现在是圆桌讨论的中立裁判，需要在 ${targetRounds} 轮讨论结束后做最终总结。`,
    getJudgeModeInstruction(),
    "你要像真正的人类裁判一样写最终结论，语言自然、清楚、完整，不要写成 Markdown 标题、提纲或代码注释。",
    "请明确回答：谁的论证更站得住脚、哪些补充信息最有价值、最终建议怎么讲给人听。",
    "如果双方都有道理，也可以明确指出哪部分更强、哪部分还不能下死结论。",
    buildDiscussionContext(state.lastSummary, roundNotes, []),
    rolePromptBlock(judgeRole),
    `篇幅要求：${budget.charHint}`,
    "绝对不要输出 thinking process、英文分析草稿、自检步骤、constraint list 或任何内部推理过程。",
    "要求：直接输出最终裁判发言正文，要给人类用户看，至少写 4 段，并给出一个清晰的最终判断。",
  ].join("\n\n");
  setSpeakerCardForRole(judgeRole, langText(`第 ${targetRounds} 轮后 · 正在思考`, `After Round ${targetRounds} · Thinking`), langText("正在综合全部轮次，判断哪些说法更有依据，哪些地方仍然不能下结论。", "Reviewing all rounds to judge which claims are best supported and which points still remain unresolved."));
  updateLiveStatus(langText(`最终总结前：${judgeRole.name} 正在思考`, `Before the final summary: ${judgeRole.name} is thinking`), "pending");
  updateSeatFeedback(langText(`${judgeRole.name} 正在做最终裁判`, `${judgeRole.name} is preparing the final judgment`), "pending");
  const judgeText = await requestModelText(judgeProfile, judgePrompt, budget.judge, signal);
  setSpeakerCardForRole(judgeRole, langText(`第 ${targetRounds} 轮后 · 正在发言`, `After Round ${targetRounds} · Speaking`), langText("最终裁判已生成，马上写入讨论流。", "The final judgment has been generated and will be written into the discussion stream next."));
  updateLiveStatus(langText(`最终总结：${judgeRole.name} 正在发言`, `Final summary: ${judgeRole.name} is speaking`), "pending");
  appendRoleMessage(judgeRole, `最终总结 · ${judgeRole.name}`, judgeText, judgeProfile.displayName);

  updateLiveStatus(langText("主持 AI 正在整理本次讨论的最终文字报告", "The host AI is preparing the final written report for this discussion"), "pending");
  const reportText = await createConclusionReport(moderatorProfile, judgeText, roundNotes, signal);
  state.latestReportText = reportText;
  state.latestReportFileName = buildReportFileName();
  appendMarkup(
    createMessageMarkup({
      speakerId: "system-report",
      label: "系",
      sublabel: "主持整理版结论报告",
      body: reportText,
      avatarLabel: "系",
      avatarClass: "avatar-system",
      tone: "system",
      actions: getReportExportActionsMarkup(),
    })
  );
}

async function runDiscussionFlow() {
  if (state.discussionRunning) {
    return;
  }

  if (state.selectedIds.size < state.discussionSize) {
    updateSeatFeedback(langText(`人物还没配置完全，当前是 ${state.selectedIds.size}/${state.discussionSize}。先把席位配满再开始讨论。`, `Seat setup is incomplete: ${state.selectedIds.size}/${state.discussionSize}. Fill all seats before starting the discussion.`), "pending");
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
    updateSeatFeedback(langText("先让主 AI 整理并确认任务定义，再开始讨论。", "Let the primary AI organize and confirm the task definition before starting."), "pending");
    return;
  }
  if (!orderedSpeakers.length || !judgeRole) {
    updateSeatFeedback(langText("至少要有若干讨论人物，并给裁判分配一个人物。", "You need several discussion personas and one persona assigned as judge."), "pending");
    return;
  }
  const judgeProfile = judgeRole ? getRoleModelProfile(judgeRole) : null;
  if (!moderatorProfile || !judgeProfile || orderedSpeakers.some((role) => !getRoleModelProfile(role))) {
    updateSeatFeedback(langText("先在设置里选好主持AI，并在每个席位卡里选好模型。", "Choose a host AI in settings and assign a model to each seat card first."), "pending");
    return;
  }

  state.discussionAbortRequested = false;
  state.discussionAbortController = new AbortController();
  setDiscussionControlsState(true);
  const budget = getRoundTokenBudget();
  const existingRoundNotes = Array.isArray(state.discussionRoundNotes) ? [...state.discussionRoundNotes] : [];
  const completedRounds = getCompletedRoundCount(existingRoundNotes);
  let targetRounds = Math.max(completedRounds + 1, Number(discussionRoundsInput.value || state.discussionRounds || 1));
  let currentRound = completedRounds + 1;
  state.discussionRounds = targetRounds;
  setSpeakerCard(langText("讨论进行中", "Discussion In Progress"), langText("主持AI按顺序推进", "Host AI is advancing in order"), langText(`将按你设定的顺序逐位发言；每轮末由主持AI做压缩小结，最后由裁判定稿。${getDensityDescription()}`, `Speakers will follow your chosen order. The host AI will compress each round, and the judge will finalize the conclusion. ${getDensityDescription()}`), "系");
  updateLiveStatus(langText(`准备开始：本次先执行到第 ${targetRounds} 轮。主持AI模型为 ${moderatorProfile.displayName}。`, `Ready to start: the system will run through round ${targetRounds}. Host model: ${moderatorProfile.displayName}.`), "pending");
  updateSeatFeedback(langText(`开始讨论，当前先执行到第 ${targetRounds} 轮。主持AI：${moderatorProfile.displayName}。${getDensityDescription()}`, `Discussion started. The system will run through round ${targetRounds}. Host AI: ${moderatorProfile.displayName}. ${getDensityDescription()}`), "success");

  const roundNotes = existingRoundNotes;
  const signal = state.discussionAbortController.signal;
  const userParticipationEnabled = state.participationIndex === 0;
  const userRoundRole = {
    id: "user-round-input",
    name: "用户",
    seat: "用户补充",
    description: "本轮结束后的用户补充意见、追问、证据或倾向表达。",
    systemPrompt: "这是用户在每轮后的直接补充意见。后续角色必须认真吸收，不得忽略。",
  };

  try {
    state.sharedResearchBrief = "";
    setSpeakerCardForRole(moderatorRole, langText("开场前 · 正在整理事实包", "Before Opening · Building Shared Brief"), langText("先为整张桌子整理一份可共享的背景事实、约束和未决问题。", "Building one shared brief of facts, constraints, and unresolved questions for the whole table."));
    updateLiveStatus(langText("开场前：共享 research agent 正在整理事实包", "Before opening: the shared research agent is building the brief"), "pending");
    updateSeatFeedback(langText("正在整理共享事实包，后续所有席位会共用这一份材料。", "Building a shared brief that all seats will use."), "pending");
    try {
      state.sharedResearchBrief = await buildSharedResearchBrief(state.lastSummary, moderatorProfile, orderedSpeakers, signal);
      appendMarkup(
        createMessageMarkup({
          speakerId: "shared-research-agent",
          label: "研",
          sublabel: langText("共享事实包", "Shared Brief"),
          body: state.sharedResearchBrief,
          avatarLabel: "研",
          avatarClass: "avatar-system",
          tone: "system",
        })
      );
      void syncCurrentTopicSnapshot();
    } catch (error) {
      console.warn("shared research brief failed", error);
      state.sharedResearchBrief = "";
    }

    const openingPrompt = [
      `你现在是本场圆桌的主持人，需要在正式讨论前做开场。`,
      `任务定义：${state.lastSummary}`,
      state.sharedResearchBrief ? `共享事实包：${state.sharedResearchBrief}` : "",
      getOpeningModeInstruction(),
      rolePromptBlock(moderatorRole),
      `本次讨论顺序：${orderedSpeakers.map((role, index) => `${index + 1}.${role.name}`).join("，")}`,
      "请先说明今天讨论的主题、基本规则和切入方式，再邀请各位嘉宾按自己的身份先抛出最值得优先展开的问题、证据或解释方向。",
      "不要在开场里预先给每位嘉宾分配固定子题，也不要提前规定谁只能讲哪个角度，更不要用“首先、其次、最后”把整场讨论定死。你只负责打开讨论场，让桌上的人自己往外长。",
      "绝对不要输出 thinking process、英文分析草稿、自检步骤、constraint list 或任何内部推理过程。",
      "篇幅控制在 180 到 320 字，不要写成提纲。",
    ].join("\n\n");
    setSpeakerCardForRole(moderatorRole, langText("开场前 · 正在思考", "Before Opening · Thinking"), langText("正在整理今天这场讨论的主题、顺序和焦点。", "Organizing the topic, order, and focal tensions for today's discussion."));
    updateLiveStatus(langText(`开场：${moderatorRole.name} 正在思考`, `Opening: ${moderatorRole.name} is thinking`), "pending");
    const openingText = await requestModelText(moderatorProfile, openingPrompt, Math.min(520, budget.participant), signal);
    appendRoleMessage(moderatorRole, `开场 · ${moderatorRole.name}`, openingText, moderatorProfile.displayName);

    while (currentRound <= targetRounds) {
      if (state.discussionAbortRequested) {
        throw new DOMException("用户结束了本轮讨论。", "AbortError");
      }
      const roundNote = await runSingleDiscussionRound({
        round: currentRound,
        totalRounds: targetRounds,
        orderedSpeakers,
        moderatorRole,
        moderatorProfile,
        roundNotes,
        budget,
        signal,
        userParticipationEnabled,
        userRoundRole,
      });
      roundNotes.push(roundNote);
      state.discussionRoundNotes = [...roundNotes];
      void syncCurrentTopicSnapshot();
      currentRound += 1;
    }

    while (true) {
      await generateStageConclusion({
        targetRounds,
        judgeRole,
        judgeProfile,
        moderatorProfile,
        roundNotes,
        budget,
        signal,
      });

      const continuationDecision = await waitForDiscussionContinuationDecision(targetRounds, moderatorRole);
      if (!continuationDecision.continueDiscussion) {
        break;
      }

      roundNotes.push({
        round: `${targetRounds} 轮后续谈`,
        turns: [
          {
            role: userRoundRole,
            assignmentLabel: `第 ${targetRounds} 轮后 · 用户续谈要求`,
            text: continuationDecision.content,
          },
        ],
        moderatorSummary: `用户选择继续讨论。下一轮要重点追问：${continuationDecision.content}`,
      });
      state.discussionRoundNotes = [...roundNotes];
      void syncCurrentTopicSnapshot();
      targetRounds += Math.max(1, Number(continuationDecision.additionalRounds || 1));
      state.discussionRounds = targetRounds;
      discussionRoundsInput.value = String(targetRounds);
      setSpeakerCard(langText("继续讨论中", "Continuing Discussion"), langText("主持AI准备追加轮次", "Host AI is preparing an extra round"), langText(`用户要求继续，系统将进入第 ${targetRounds} 轮。${getDensityDescription()}`, `The user asked to continue. The system will move into round ${targetRounds}. ${getDensityDescription()}`), "系");
      updateLiveStatus(langText(`用户要求继续，准备进入第 ${targetRounds} 轮。`, `The user asked to continue. Preparing round ${targetRounds}.`), "pending");
      updateSeatFeedback(langText(`已收到继续讨论指令，正在追加第 ${targetRounds} 轮。`, `Continue instruction received. Adding round ${targetRounds}.`), "success");

      while (currentRound <= targetRounds) {
        if (state.discussionAbortRequested) {
          throw new DOMException("用户结束了本轮讨论。", "AbortError");
        }
        const roundNote = await runSingleDiscussionRound({
          round: currentRound,
          totalRounds: targetRounds,
          orderedSpeakers,
          moderatorRole,
          moderatorProfile,
          roundNotes,
          budget,
          signal,
          userParticipationEnabled,
          userRoundRole,
        });
        roundNotes.push(roundNote);
        state.discussionRoundNotes = [...roundNotes];
        void syncCurrentTopicSnapshot();
        currentRound += 1;
      }
    }

    state.discussionRounds = targetRounds;
    state.discussionRoundNotes = [...roundNotes];
    const activeTopic = getActiveTopic();
    if (activeTopic) {
      activeTopic.status = "completed";
      activeTopic.summary = "本次讨论已完成，结论可下载。";
    }
    setSpeakerCard(langText("讨论完成", "Discussion Complete"), langText("主持总结已完成", "Host wrap-up completed"), langText(`已按 ${targetRounds} 轮完成顺序讨论、逐轮主持压缩和最终裁判流程。`, `Completed ${targetRounds} round(s) of ordered discussion, host compression, and final judgment.`), "系");
    updateLiveStatus(langText("讨论完成：结论报告已生成，可下载。", "Discussion complete: the final report is ready to download."), "success");
    updateSeatFeedback(langText("本轮讨论已完成。你可以继续补充任务，或调整角色后再来一轮。", "This discussion is complete. You can add more task details or adjust personas and run another round."), "success");
    await syncCurrentTopicSnapshot();
  } catch (error) {
    console.error(error);
    const aborted = error?.name === "AbortError" || state.discussionAbortRequested;
    appendMarkup(
      createMessageMarkup({
        speakerId: "system",
        label: "系",
        sublabel: aborted ? langText("讨论已结束", "Discussion Stopped") : langText("讨论执行失败", "Discussion Failed"),
        body: aborted ? langText("你已手动结束本轮讨论。当前已生成的发言会保留，未执行的角色不会继续。", "You manually stopped this discussion. Generated turns will be kept, and unexecuted speakers will not continue.") : error.message || langText("执行多角色讨论时失败。", "The multi-person discussion failed."),
        avatarLabel: "系",
        avatarClass: "avatar-system",
        tone: "system",
      })
    );
    setSpeakerCard(aborted ? langText("讨论已结束", "Discussion Stopped") : langText("讨论中断", "Discussion Interrupted"), aborted ? langText("已按你的要求停止", "Stopped as requested") : langText("模型调用失败", "Model call failed"), aborted ? langText("当前已经执行完的发言会保留，你可以调整后重新开始。", "Completed turns will be kept. You can adjust the setup and start again.") : error.message || langText("执行多角色讨论时失败。", "The multi-person discussion failed."), "系");
    updateLiveStatus(aborted ? langText("讨论已结束：已停止后续角色发言。", "Discussion stopped: later speakers have been halted.") : langText(`讨论中断：${error.message || "模型调用失败"}`, `Discussion interrupted: ${error.message || "Model call failed"}`), aborted ? "" : "pending");
    updateSeatFeedback(aborted ? langText("讨论已结束。你可以调整轮次或席位后重新开始。", "Discussion stopped. You can adjust rounds or seats and start again.") : error.message || langText("执行多角色讨论时失败。", "The multi-person discussion failed."), "pending");
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
  const legacyText = payload.choices?.[0]?.text || payload.output?.text || payload.output_text || payload.response?.text;
  const outputBlocks = Array.isArray(payload.output)
    ? payload.output.flatMap((item) => {
        const innerContent = Array.isArray(item?.content) ? item.content : [];
        return innerContent.map((block) => block?.text || block?.content || "");
      })
    : [];
  const reasoningText = payload.choices?.[0]?.message?.reasoning_content || payload.choices?.[0]?.message?.reasoning || payload.reasoning_content;
  if (typeof content === "string") {
    const trimmedContent = content.trim();
    if (trimmedContent) {
      return trimmedContent;
    }
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item?.text || item?.content || ""))
      .join("\n")
      .trim();
  }
  if (typeof legacyText === "string") {
    return legacyText.trim();
  }
  const mergedOutputBlocks = outputBlocks.join("\n").trim();
  if (mergedOutputBlocks) {
    return mergedOutputBlocks;
  }
  if (typeof reasoningText === "string") {
    return reasoningText.trim();
  }
  return "";
}

function buildTaskSummaryPromptContent(content, attachments = [], options = {}) {
  const { treatAsSupplement = false, baseSummary = "", clarificationQuestions = [] } = options;
  const attachmentNote = attachments.length
    ? `\n附件：${attachments.map((file) => file.name).join("、")}`
    : "";

  if (!treatAsSupplement || !baseSummary) {
    return {
      promptContent: content,
      attachmentNote,
      fallbackSource: content,
    };
  }

  const clarificationBlock = clarificationQuestions.length
    ? `\n当前系统还在追问这些关键点：\n${clarificationQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n")}`
    : "";

  return {
    promptContent: [
      `当前已整理出的任务定义：${baseSummary}`,
      clarificationBlock,
      `用户这次补充的内容：${content}`,
      "要求：把这次补充并入上一版任务定义。除非用户明确推翻原任务，否则不要把任务主轴改写成一个更窄的新任务。",
    ].filter(Boolean).join("\n\n"),
    attachmentNote,
    fallbackSource: `${baseSummary}\n补充：${content}`,
  };
}

async function requestAiTaskSummary(content, attachments = [], options = {}) {
  const profile = getPrimarySummaryProfile();
  if (!profile) {
    throw new Error("还没有可用的主 AI 接入。先在设置里保存配置，并映射给主 AI。");
  }

  if (!profile.baseUrl || !profile.modelId || !profile.apiKey) {
    throw new Error(`主 AI 接入“${profile.displayName}”还没配完整，至少要有 Base URL、模型 ID 和 API Key。`);
  }

  const { treatAsSupplement = false, baseSummary = "", clarificationQuestions = [] } = options;
  const { promptContent, attachmentNote, fallbackSource } = buildTaskSummaryPromptContent(content, attachments, {
    treatAsSupplement,
    baseSummary,
    clarificationQuestions,
  });
  const labels = getExpandedTaskSummaryLabels();
  const prompt = state.appLanguage === "en"
    ? [
        "You are the primary AI in the Roundtable Braintrust workspace.",
        treatAsSupplement
          ? "The user is supplementing an existing task understanding. Merge the new detail into the current task instead of rewriting it into a narrower new task unless the user clearly changes direction."
          : "Turn the user's spoken request into a structured task understanding for confirmation instead of repeating the original wording.",
        "Output exactly the following single section and nothing else:",
        `${labels.goal}: ...`,
        "Requirements:",
        "1. Use English only.",
        "2. Remove filler words and repeated phrases.",
        "3. Write one open discussion-oriented task definition with a little helpful context folded into it when needed.",
        "4. Do not add a separate focus list, discussion agenda, plot outline, chapter checklist, or narrow subproblem unless the user explicitly asks for that.",
        "5. Default to direct organization rather than asking follow-up questions first.",
        "6. Do not invent extra exclusions, limitations, or negative scope boundaries that the user did not say.",
        `User request: ${promptContent}${attachmentNote}`,
      ].join("\n")
    : [
        "你是圆桌讨论工作台里的主 AI。",
        treatAsSupplement
          ? "用户这次是在补充上一版任务理解。你的任务是把新补充并入原任务，而不是把原任务改写成一个更窄、更偏的全新任务，除非用户明确要求换题。"
          : "你的任务是把用户口语化需求整理成一版可用于后续配人的任务理解稿，而不是复述原话。",
        "严格按下面单段结构输出，不要寒暄，不要解释过程：",
        `${labels.goal}：...`,
        "要求：",
        "1. 只用简体中文，简洁清楚。",
        "2. 去掉口语填充词和重复表达。",
        "3. 用一段开放式任务定义写清这次到底要探讨什么；必要上下文可以揉进去，但不要另起一段布置讨论重点。",
        "4. 不要把讨论提前写成重点清单、任务布置、固定剧情、关键情节清单或过窄的小子题，除非用户明确要求这么做。",
        "5. 如果这是对现有任务的补充，就保留原任务主轴，只补充缺失条件，不要擅自把范围缩成其中一个子问题。",
        "6. 默认直接整理，不要先追问。信息不够时就基于当前内容给出最佳理解，但不要擅自添加用户没说过的排除项、限制项或否定边界。",
        "7. 如果用户要的是探讨、分享、查经、小组交流、脑暴，就保持开放讨论口径，不要替用户提前收窄答案路径。",
        `用户需求：${promptContent}${attachmentNote}`,
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
        max_tokens: 520,
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
      body: JSON.stringify(buildOpenAiCompatibleRequestBody(profile, prompt, 520, {
        temperature: 0.2,
      })),
    });
  }

  if (!response.ok) {
    throw new Error(formatHttpFailureMessage(profile, response, "整理失败"));
  }

  const payload = await response.json();
  const rawSummary = extractTextFromModelResponse(payload, profile.compatibility);
  const summary = normalizeTaskSummary(rawSummary, fallbackSource);
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
  maybeReadAppendedMessage(discussionStream.lastElementChild);
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
  const compareRoleOrder = (left, right) => {
    const leftOrder = state.discussionOrder[left] ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = state.discussionOrder[right] ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return (getRoleById(left)?.name || "").localeCompare(getRoleById(right)?.name || "", "zh-CN");
  };

  const selectedRoleIds = [...state.selectedIds];
  const discussants = selectedRoleIds
    .filter((roleId) => {
      const role = getRoleById(roleId);
      return role && getRoleAssignment(role) !== "judge";
    })
    .sort(compareRoleOrder);
  const judges = selectedRoleIds
    .filter((roleId) => {
      const role = getRoleById(roleId);
      return role && getRoleAssignment(role) === "judge";
    })
    .sort((left, right) => (getRoleById(left)?.name || "").localeCompare(getRoleById(right)?.name || "", "zh-CN"));
  return [...discussants, ...judges];
}

function syncDiscussionOrder() {
  const orderedRoleIds = getOrderedSelectedRoleIds().filter((roleId) => {
    const role = getRoleById(roleId);
    return role && getRoleAssignment(role) !== "judge";
  });
  const nextOrder = {};
  orderedRoleIds.forEach((roleId, index) => {
    nextOrder[roleId] = index + 1;
  });
  state.discussionOrder = nextOrder;
}

function setDiscussionOrder(roleId, nextPosition) {
  const role = getRoleById(roleId);
  if (!role || getRoleAssignment(role) === "judge") {
    return;
  }

  const orderedRoleIds = getOrderedSelectedRoleIds()
    .filter((currentRoleId) => {
      const currentRole = getRoleById(currentRoleId);
      return currentRoleId !== roleId && currentRole && getRoleAssignment(currentRole) !== "judge";
    });
  const safeIndex = Math.max(0, Math.min(orderedRoleIds.length, nextPosition - 1));
  orderedRoleIds.splice(safeIndex, 0, roleId);
  state.discussionOrder = Object.fromEntries(orderedRoleIds.map((currentRoleId, index) => [currentRoleId, index + 1]));
}

function getRoundRoleLabel(assignment) {
  switch (assignment) {
    case "challenger":
      return langText("主讲", "Lead Speaker");
    case "rebuttal":
      return langText("辩驳者", "Rebuttal");
    case "neutral":
      return langText("中立", "Neutral");
    case "judge":
      return langText("裁判", "Judge");
    default:
      return langText("旁证", "Supporting Voice");
  }
}

function getSeatSourceLabel(role) {
  return role.source === "recommended"
    ? langText("系统临时生成", "Generated for this task")
    : role.source === "favorite"
      ? langText("收藏人物", "Saved persona")
      : role.source === "custom"
        ? langText("自定义", "Custom")
        : langText("人物库", "Persona library");
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
  if (!currentAssignments.includes("rebuttal") && /(反方|质询|辩驳|质疑|怀疑|压力测试|拆解|反对)/.test(text)) {
    return "rebuttal";
  }
  if (!currentAssignments.includes("challenger") && /(主讲|学者|讲解|解释|释经|程序员|法律|产品|运营)/.test(text)) {
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
  return ["challenger", "participant", "neutral", "rebuttal", "judge"]
    .map((value) => `<option value="${value}" ${selectedValue === value ? "selected" : ""}>${getRoundRoleLabel(value)}</option>`)
    .join("");
}

function setSeatAssignment(roleId, nextAssignment) {
  if (nextAssignment === "judge") {
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
  promote("rebuttal", (role) => /反方|质询|辩驳|质疑|压力测试|拆解/.test(`${role.name}${role.seat}${role.description}`));
  promote("neutral", (role) => /长老|历史|教师|审慎|辨识|中立/.test(`${role.name}${role.seat}`));
  promote("judge", (role) => /裁判|裁决|中立裁判/.test(`${role.name}${role.seat}`));

  state.seatAssignments = assignments;
}

function ensureRoleDefaults(role) {
  return {
    ...role,
    systemPrompt: role.systemPrompt || `你是${role.name}，你长期最稳定的观察重心是${role.seat}。请围绕“${role.description}”发言，保持${role.traits.temper}语气，优先使用${role.traits.method}的方法，并坚持${role.traits.stance}的立场。`,
  };
}

function normalizeProfile(profile) {
  const builtin = defaultProfileMap.get(profile.id);
  if (builtin) {
    return {
      ...builtin,
      ...profile,
      compatibility: profile.compatibility === "anthropic" ? "anthropic" : builtin.compatibility || "openai",
      locked: true,
      configured: !!profile.configured,
    };
  }
  return {
    compatibility: "openai",
    endpointPath: "/chat/completions",
    locked: false,
    configured: profile.configured !== false,
    ...profile,
    compatibility: profile.compatibility === "anthropic" ? "anthropic" : "openai",
  };
}

function getSelectableBuiltinProfiles(currentTemplateId = modelProfileTemplateId || profileId.value || "") {
  return defaultProfiles
    .filter((profile) => visibleBuiltinTemplateIds.has(profile.id) || profile.id === currentTemplateId)
    .sort((left, right) => {
      const leftOrder = visibleBuiltinTemplateOrder.get(left.id) ?? 999;
      const rightOrder = visibleBuiltinTemplateOrder.get(right.id) ?? 999;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.displayName.localeCompare(right.displayName, "zh-CN");
    });
}

function getProfileTemplateHint(profile = null) {
  if (profile?.id === "profile-volcengine" || isVolcengineProfile(profile || {})) {
    return "火山方舟的 Base URL 是官方公共入口模板值，通常不用改。真正要核对的是精确 Model ID：请复制详情区那串全小写、带版本号的值，例如 doubao-seed-1-8-251228，不要填页面大标题 Doubao-Seed-1.8。";
  }
  if (profile?.id === "profile-siliconflow" || /siliconflow/i.test(profile?.providerName || "")) {
    return "硅基流动本身就是聚合入口，很多 DeepSeek、Qwen、GLM、Llama 都能先在这里接。优先只换 Model ID，其他字段通常不用动。";
  }
  if (profile?.id === "profile-openai-official") {
    return "OpenAI 官方模板适合直接接官方接口，也适合作为很多 OpenAI 兼容中转的参考格式。若你买的是转发服务，通常复制它给你的 Base URL、Model ID、API Key 即可。";
  }
  if (profile?.id === "profile-claude" || profile?.compatibility === "anthropic") {
    return "Claude 官方走 Anthropic Messages 协议，不和 OpenAI Compatible 混用。只有卖家明确写着支持 Anthropic Messages 时，才选这一类。";
  }
  return "内置模板只保留四类常用入口：硅基流动、火山方舟、OpenAI 官方、Claude 官方。其他淘宝中转大多走自定义接入 + OpenAI Compatible；如果对方要求额外签名、特殊 body 或自定义 header，这版前端还不够。";
}

function updateProfileTemplateHint(profile = null) {
  if (!profileTemplateHint) {
    return;
  }
  profileTemplateHint.textContent = getProfileTemplateHint(profile);
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
  peopleCount.textContent = state.appLanguage === "en"
    ? `${state.peopleRoles.length} ${t("peopleCountSuffix")}`
    : `${state.peopleRoles.length}${t("peopleCountSuffix")}`;
  peopleSummary.textContent = formatUiText(t("peopleSummaryTemplate"), {
    base: state.peopleRoles.length - favoriteCount - customCount,
    favorite: favoriteCount,
    custom: customCount,
  });
  peopleLibraryStats.innerHTML = [
    `<span class="tiny-badge">${escapeHtml(formatUiText(t("totalBadge"), { count: state.peopleRoles.length }))}</span>`,
    `<span class="tiny-badge">${escapeHtml(formatUiText(t("favoriteBadge"), { count: favoriteCount }))}</span>`,
    `<span class="tiny-badge">${escapeHtml(formatUiText(t("customBadge"), { count: customCount }))}</span>`,
  ].join("");
}

function renderSeatStack() {
  syncDiscussionOrder();
  const selectedRoles = getOrderedSelectedRoleIds().map((roleId) => normalizeRecommendedRolePersona(getRoleById(roleId))).filter(Boolean);
  const orderedDiscussantCount = selectedRoles.filter((role) => getRoleAssignment(role) !== "judge").length;
  seatPickerCount.textContent = langText(`已选 ${selectedRoles.length} / ${state.discussionSize}`, `Selected ${selectedRoles.length} / ${state.discussionSize}`);
  if (seatConfigProgress) {
    seatConfigProgress.textContent = `${selectedRoles.length}/${state.discussionSize}`;
    seatConfigProgress.classList.toggle("warm", selectedRoles.length < state.discussionSize);
  }
  startDiscussionButton.disabled = state.discussionRunning || selectedRoles.length < state.discussionSize;

  if (!selectedRoles.length) {
    seatStack.innerHTML = `<div class="seat-empty">${escapeHtml(langText("确认任务后，系统会推荐一组人物。你也可以从人物库里手动挑选。", "Once the task is confirmed, the system will recommend a set of personas. You can also pick manually from the library."))}</div>`;
    return;
  }

  seatStack.innerHTML = selectedRoles
    .map((role) => {
      const traits = buildRoleTraitsMarkup(role, { compact: true });
      const assignment = ensureSeatAssignment(role);
      const currentProfile = getConfiguredProfileById(ensureSeatModelAssignment(role));
      const orderValue = state.discussionOrder[role.id] || 1;
      const orderOptions = Array.from({ length: Math.max(1, orderedDiscussantCount) })
        .map((_, index) => `<option value="${index + 1}" ${orderValue === index + 1 ? "selected" : ""}>${escapeHtml(langText(`顺序 ${index + 1}`, `Order ${index + 1}`))}</option>`)
        .join("");
      const orderMarkup = assignment === "judge"
        ? `<label class="seat-assignment"><span>${escapeHtml(langText("讨论顺序", "Speaking Order"))}</span><div class="seat-assignment-static">${escapeHtml(langText("最终裁判", "Final Judge"))}</div></label>`
        : `<label class="seat-assignment"><span>${escapeHtml(langText("讨论顺序", "Speaking Order"))}</span><select class="seat-order-select" data-role-id="${role.id}">${orderOptions}</select></label>`;
      return `
        <article class="seat-card selected" data-role-id="${role.id}">
          <div class="seat-card-main">
            <div class="seat-chip-row">
              <span class="seat-avatar" style="${avatarStyle(role)}">${escapeHtml(roleAvatar(role))}</span>
              <div class="role-title-stack">
                <h3 class="role-title">${escapeHtml(getDisplayRoleName(role))}</h3>
              </div>
            </div>
            <p>${escapeHtml(getCompactRoleDescription(role))}</p>
            <label class="seat-assignment">
              <span>${escapeHtml(langText("本轮扮演", "Round Role"))}</span>
              <select class="seat-assignment-select" data-role-id="${role.id}">
                ${roundRoleOptionsMarkup(assignment)}
              </select>
            </label>
            ${orderMarkup}
            <label class="seat-assignment">
              <span>${escapeHtml(langText("使用模型", "Model"))}</span>
              <select class="seat-model-select" data-role-id="${role.id}">
                ${buildSeatModelOptionsMarkup(role)}
              </select>
            </label>
            <div class="seat-traits">${traits}</div>
          </div>
          <div class="seat-actions">
            <div class="seat-action-row">
              ${canEditRole(role) || role.source === "recommended" ? `<button class="icon-button compact seat-edit seat-edit-icon" data-role-id="${role.id}" type="button" aria-label="${escapeHtml(langText("编辑人物", "Edit persona"))}" title="${escapeHtml(langText("编辑人物", "Edit persona"))}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15.2 4.8a2.6 2.6 0 0 1 3.7 3.7L9.3 18.1 5 19l.9-4.3 9.3-9.9Zm-8 10.7-.3 1.5 1.5-.3 8.8-9.3-1.2-1.2-8.8 9.3Z" fill="currentColor"></path></svg></button>` : ""}
              <button class="icon-button compact danger seat-delete" data-role-id="${role.id}" type="button" aria-label="${escapeHtml(langText("移出本轮", "Remove from this round"))}" title="${escapeHtml(langText("移出本轮", "Remove from this round"))}">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Z" fill="currentColor"></path>
                </svg>
              </button>
            </div>
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
    peopleLibraryGrid.innerHTML = `<div class="empty-panel">${escapeHtml(langText("当前筛选条件下没有人物。你可以新建一个，或者先去临时生成里收藏人物。", "No personas match the current filter. You can create one, or favorite a generated persona first."))}</div>`;
    return;
  }

  peopleLibraryGrid.innerHTML = roles
    .map((role) => buildRoleLibraryCardMarkup(role, {
      editable: canEditRole(role),
      deletable: canDeleteRole(role),
    }))
    .join("");
}

function renderSeatPicker() {
  seatSourceTabs.querySelectorAll(".tab-pill").forEach((button) => {
    button.classList.toggle("active", button.dataset.source === state.seatSource);
  });

  let roles = state.seatSource === "recommended" ? [...state.recommendedRoles] : [...state.peopleRoles];
  roles = filterRoles(roles, seatPickerSearch.value);

  if (!roles.length) {
    seatPickerGrid.innerHTML = `<div class="empty-panel">${escapeHtml(state.seatSource === "recommended"
      ? (state.aiAutoRecommendEnabled
        ? langText("当前还没有临时生成的人物。先确认任务，系统会按本次内容现生成一组针对性人物。", "No generated personas yet. Confirm the task first and the system will generate a targeted set.")
        : langText("AI 自动推荐人物当前已关闭。你可以直接从人物库里挑人上桌。", "AI persona recommendation is currently off. Pick personas directly from the library."))
      : langText("人物库里暂时没有匹配项。你可以去人物库新建或收藏人物。", "No matching personas in the library. You can create one or favorite a generated persona."))}</div>`;
    return;
  }

  seatPickerGrid.innerHTML = roles
    .map((role) => {
      const selected = state.selectedIds.has(role.id);
      const savedFavorite = role.source === "recommended"
        ? state.peopleRoles.some((item) => item.recommendedFrom === role.id && isFavoriteRole(item))
        : false;
      return buildRoleLibraryCardMarkup(role, {
        selected,
        editable: canEditRole(role) || role.source === "recommended",
        recommended: true,
        savedFavorite,
      });
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
  const configuredProfiles = getConfiguredProfiles();
  if (!hostModelSelect) {
    return;
  }
  if (!configuredProfiles.length) {
    state.mappings.main = "";
    hostModelSelect.innerHTML = `<option value="">${escapeHtml(t("noAvailableModels"))}</option>`;
    hostModelSelect.disabled = true;
    return;
  }
  if (!configuredProfiles.some((profile) => profile.id === state.mappings.main)) {
    state.mappings.main = configuredProfiles[0].id;
  }
  hostModelSelect.innerHTML = configuredProfiles
    .map((profile) => `<option value="${profile.id}" ${profile.id === state.mappings.main ? "selected" : ""}>${escapeHtml(profile.displayName)}</option>`)
    .join("");
  hostModelSelect.disabled = state.discussionRunning;
}

function renderConnectedModelList() {
  const configuredProfiles = getConfiguredProfiles();
  if (!configuredProfiles.length) {
    connectedModelList.innerHTML = `<div class="empty-panel">${escapeHtml(t("connectedModelsEmpty"))}</div>`;
    return;
  }

  connectedModelList.innerHTML = configuredProfiles
    .map((profile) => {
      const isHost = profile.id === state.mappings.main;
      return `
        <article class="connected-model-card ${isHost ? "active" : ""}">
          <div class="connected-model-main">
            <strong><span class="model-health-dot ${getProfileHealth(profile)}"></span>${escapeHtml(profile.displayName)}</strong>
            <p>${escapeHtml(profile.providerName)} · ${escapeHtml(profile.modelId)}</p>
            ${isHost ? `<div class="connected-model-host"><span class="profile-tag active">${escapeHtml(t("hostAiTag"))}</span></div>` : ""}
          </div>
          <div class="connected-model-actions">
            <button class="ghost-link" data-action="test-profile" data-profile-id="${profile.id}" type="button">${escapeHtml(t("testProfile"))}</button>
            <button class="ghost-link" data-action="edit-profile" data-profile-id="${profile.id}" type="button">${escapeHtml(t("editProfile"))}</button>
            <button class="icon-button compact danger" data-action="delete-profile" data-profile-id="${profile.id}" type="button" aria-label="${escapeHtml(t("deleteProfile"))}" title="${escapeHtml(t("deleteProfile"))}">
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
  const builtinOptions = getSelectableBuiltinProfiles()
    .map((profile) => `<option value="${profile.id}">${escapeHtml(profile.displayName)}</option>`);
  providerTemplateSelect.innerHTML = [`<option value="">${escapeHtml(t("providerTemplatePlaceholder"))}</option>`, ...builtinOptions, `<option value="custom-new">${escapeHtml(t("providerTemplateCreate"))}</option>`].join("");
  providerTemplateSelect.value = modelProfileTemplateId || "";
  updateProfileTemplateHint(defaultProfileMap.get(providerTemplateSelect.value) || null);
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
  closeModelProfileModal();
  settingsDrawer.classList.remove("open");
  settingsDrawerBackdrop.classList.remove("open");
}

function openModelProfileModal(mode = "create") {
  setModelProfileModalMode(mode);
  modelProfileBackdrop.classList.add("open");
  modelProfileModal.classList.add("open");
  modelProfileModal.setAttribute("aria-hidden", "false");
}

function closeModelProfileModal() {
  modelProfileBackdrop.classList.remove("open");
  modelProfileModal.classList.remove("open");
  modelProfileModal.setAttribute("aria-hidden", "true");
}

async function setAppLanguage(nextLanguage) {
  state.appLanguage = nextLanguage === "en" ? "en" : "zh";
  applyLanguageToStaticUi();
  updateCompactSummary();
  setModelProfileModalMode(modelProfileEditMode ? "edit" : "create");
  renderProviderTemplateSelect();
  renderConnectedModelList();
  renderModelMappings();
  renderTopicList();
  renderPeopleSummary();
  renderPeopleLibrary();
  renderSeatPicker();
  renderSeatStack();
  await saveAppState("appLanguage", state.appLanguage);
}

function resetRoleEditor() {
  roleEditorContext = null;
  roleEditorId.value = "";
  if (roleEditorAiRequirements) {
    roleEditorAiRequirements.value = "";
  }
  roleEditorName.value = "";
  roleEditorSeat.value = "讨论参与者";
  roleEditorDescription.value = "";
  roleEditorPrompt.value = "";
  roleEditorStance.value = "支持原命题";
  roleEditorTemper.value = "稳健";
  roleEditorColor.value = "sky";
  syncRoleColorPicker("sky");
  roleEditorSourceLabel.value = "";
  if (roleEditorAiFeedback) {
    roleEditorAiFeedback.textContent = t("roleAiGenerateHint");
    roleEditorAiFeedback.className = "drawer-feedback compact-feedback";
  }
}

function toggleRoleEditor(visible) {
  roleEditor.classList.toggle("hidden", !visible);
  closePeopleLibrary.textContent = visible ? t("returnToList") : t("exitLibrary");
}

function fillRoleEditor(role) {
  const preparedRole = normalizeRecommendedRolePersona(role);
  roleEditorId.value = preparedRole.id;
  roleEditorName.value = preparedRole.name;
  roleEditorSeat.value = preparedRole.seat || "讨论参与者";
  roleEditorDescription.value = preparedRole.description;
  roleEditorPrompt.value = preparedRole.systemPrompt || "";
  ensureSelectValue(roleEditorStance, preparedRole.traits?.stance || "自定义");
  ensureSelectValue(roleEditorTemper, preparedRole.traits?.temper || "自定义");
  roleEditorStance.value = preparedRole.traits?.stance || "自定义";
  roleEditorTemper.value = preparedRole.traits?.temper || "自定义";
  roleEditorColor.value = roleColor(preparedRole);
  syncRoleColorPicker(roleColor(preparedRole));
  roleEditorSourceLabel.value = preparedRole.sourceLabel || "";
}

function openRoleEditorForCreate(sourceLabel = "") {
  resetRoleEditor();
  roleEditorContext = { sourceCollection: "custom", roleId: "", replaceSelectedId: "" };
  roleEditorSourceLabel.value = sourceLabel;
  toggleRoleEditor(true);
}

function closeRoleEditorWithReturn() {
  const returnTarget = roleEditorContext?.returnTo || null;
  resetRoleEditor();
  toggleRoleEditor(false);

  if (returnTarget?.modal === "seat-picker") {
    peopleLibraryBackdrop.classList.remove("open");
    peopleLibraryModal.classList.remove("open");
    state.seatSource = returnTarget.seatSource || state.seatSource;
    renderSeatPicker();
    openSeatPicker();
  }
}

function openRoleEditorForRole(role, options = {}) {
  if (!role) {
    return;
  }

  if (role.source === "recommended") {
    const savedFavorite = state.peopleRoles.find((item) => item.recommendedFrom === role.id && isFavoriteRole(item));
    fillRoleEditor(savedFavorite || role);
  } else {
    fillRoleEditor(role);
  }

  roleEditorContext = {
    sourceCollection: options.sourceCollection || (role.source === "recommended" ? "recommended" : "people"),
    roleId: role.id,
    replaceSelectedId: options.replaceSelectedId || "",
    returnTo: options.returnTo || null,
  };
  toggleRoleEditor(true);
}

function replaceSelectedRole(oldRoleId, newRoleId) {
  if (!oldRoleId || !newRoleId || oldRoleId === newRoleId || !state.selectedIds.has(oldRoleId)) {
    return;
  }

  const previousAssignment = state.seatAssignments[oldRoleId];
  const previousOrder = state.discussionOrder[oldRoleId];
  const previousModelId = state.seatModelAssignments[oldRoleId];

  state.selectedIds.delete(oldRoleId);
  state.selectedIds.add(newRoleId);

  delete state.seatAssignments[oldRoleId];
  delete state.discussionOrder[oldRoleId];
  delete state.seatModelAssignments[oldRoleId];

  if (previousAssignment) {
    state.seatAssignments[newRoleId] = previousAssignment;
  }
  if (previousOrder) {
    state.discussionOrder[newRoleId] = previousOrder;
  }
  if (previousModelId) {
    state.seatModelAssignments[newRoleId] = previousModelId;
  }

  const replacementRole = getRoleById(newRoleId);
  if (replacementRole) {
    ensureSeatAssignment(replacementRole);
    ensureSeatModelAssignment(replacementRole);
  }
  syncDiscussionOrder();
}

function syncRoleColorPicker(value) {
  roleEditorColor.value = value;
  roleEditorColorPicker.querySelectorAll('input[name="role-color"]').forEach((input) => {
    input.checked = input.value === value;
  });
}

function resetModelProfileForm(templateValue = "") {
  profileId.value = "";
  modelProfileTemplateId = templateValue;
  modelProfileEditMode = false;
  profileDisplayName.value = "";
  profileProviderName.value = "";
  profileCompatibility.value = "openai";
  profileBaseUrl.value = "";
  profileEndpointPath.value = "/chat/completions";
  profileModelId.value = "";
  profileApiKey.value = "";
  providerTemplateSelect.value = templateValue;
  deleteModelProfileButton.disabled = true;
  updateProfileTemplateHint(null);
}

function fillModelProfileForm(profile) {
  profileId.value = profile.id || "";
  modelProfileTemplateId = profile.locked ? profile.id || "" : "";
  modelProfileEditMode = true;
  profileDisplayName.value = profile.displayName || "";
  profileProviderName.value = profile.providerName || "";
  profileCompatibility.value = profile.compatibility === "anthropic" ? "anthropic" : "openai";
  profileBaseUrl.value = profile.baseUrl || "";
  profileEndpointPath.value = profile.endpointPath || "/chat/completions";
  profileModelId.value = profile.modelId || "";
  profileApiKey.value = profile.apiKey || "";
  providerTemplateSelect.value = profile.id || "";
  deleteModelProfileButton.disabled = !!profile.locked;
  updateProfileTemplateHint(profile.locked ? (defaultProfileMap.get(profile.id) || profile) : null);
}

function fillModelProfileTemplate(profile) {
  profileId.value = "";
  modelProfileTemplateId = profile.id || "";
  modelProfileEditMode = false;
  profileDisplayName.value = profile.displayName || "";
  profileProviderName.value = profile.providerName || "";
  profileCompatibility.value = profile.compatibility === "anthropic" ? "anthropic" : "openai";
  profileBaseUrl.value = profile.baseUrl || "";
  profileEndpointPath.value = profile.endpointPath || "/chat/completions";
  profileModelId.value = profile.modelId || "";
  profileApiKey.value = "";
  providerTemplateSelect.value = modelProfileTemplateId;
  deleteModelProfileButton.disabled = true;
  updateProfileTemplateHint(profile);
}

function setProfileTestStatus(text, tone = "") {
  profileTestStatus.textContent = text;
  profileTestStatus.className = `settings-status ${tone}`.trim();
  profileTestStatus.dataset.dynamic = text === t("profileTestHint") ? "false" : "true";
}

function summaryLooksBiblical(summary) {
  return /圣经|经文|章节|属灵|解经|查经|讲章|福音|旧约|新约|创世记|出埃及记|利未记|民数记|申命记|约书亚记|士师记|路得记|撒母耳记|列王记|历代志|以斯拉记|尼希米记|以斯帖记|约伯记|诗篇|箴言|传道书|雅歌|以赛亚书|耶利米书|耶利米哀歌|以西结书|但以理书|何西阿书|约珥书|阿摩司书|俄巴底亚书|约拿书|弥迦书|那鸿书|哈巴谷书|西番雅书|哈该书|撒迦利亚书|玛拉基书|马太福音|马可福音|路加福音|约翰福音|使徒行传|罗马书|哥林多|加拉太书|以弗所书|腓立比书|歌罗西书|帖撒罗尼迦|提摩太|提多书|希伯来书|雅各书|彼得|约翰一书|犹大书|启示录/.test(summary);
}

function summaryLooksShortVideoTask(summary) {
  return /短视频|抖音|视频|脚本|拍摄|镜头|剪辑|选题|内容策划|起号|投流|完播率|发布运营|账号运营|传播/.test(summary);
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
    sourceLabel: "临时生成",
  };
}

function makeInlineRecommendedRole(role, index, createdAt) {
  return normalizeGeneratedRole(role, index, createdAt);
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

function extractJsonObject(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("{")) {
    return trimmed;
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return "";
}

function normalizeClarificationQuestions(questions) {
  if (!Array.isArray(questions)) {
    return [];
  }
  return questions
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((item) => item.replace(/^[\d一二三四五六七八九十]+[.)、\s-]*/, "").trim())
    .filter(Boolean);
}

function ensurePersonaPreferenceQuestion(questions) {
  const normalizedQuestions = normalizeClarificationQuestions(questions);
  const specialPreferenceQuestion = "你对这次想邀请的人物还有没有特殊要求？例如更偏企业家、一线操盘手、强反方，或明确不要哪类人。";
  if (normalizedQuestions.some((item) => /(人物|角色|特殊要求|偏好|企业家|操盘手|反方|不要哪类人)/.test(item))) {
    return normalizedQuestions.slice(0, 2);
  }
  if (!normalizedQuestions.length) {
    return [specialPreferenceQuestion];
  }
  return normalizedQuestions.slice(0, 2);
}

function buildFallbackRolePlanningBrief(summary) {
  return [
    `任务理解：${summary}`,
    "配人原则：让 AI 先判断这件事真正需要哪些视角、哪些现实角色、哪些关键能力，再决定请谁上桌，不按行业名词机械堆岗位。",
    "命名原则：人物名称必须说人话，优先用通俗职业名、真实人物名、广为人知的角色名，不要用抽象标签。",
    "结构原则：一桌人要互补，既要有设计、技术、成本、市场、落地这些现实角色，也可以少量混入特别贴题的代表人物。",
  ].join("\n");
}

function normalizeRolePlanningBucket(bucket, index) {
  const fallbackId = `bucket-${index + 1}`;
  return {
    bucketId: String(bucket?.bucketId || fallbackId).trim() || fallbackId,
    label: String(bucket?.label || bucket?.name || bucket?.title || `关键人物位${index + 1}`).trim(),
    reason: String(bucket?.reason || bucket?.why || bucket?.need || "这个人物位会直接影响任务推进和判断质量。").trim(),
    mustHave: bucket?.mustHave !== false,
    minCount: Math.max(1, Number(bucket?.minCount) || 1),
    allowDuplicate: bucket?.allowDuplicate !== false,
    preferredSource: String(bucket?.preferredSource || "expert").trim() || "expert",
  };
}

function buildRolePlanningBriefFromPayload(summary, payload, targetCount) {
  const requiredBuckets = Array.isArray(payload?.requiredBuckets)
    ? payload.requiredBuckets.map(normalizeRolePlanningBucket)
    : [];
  const optionalBuckets = Array.isArray(payload?.optionalBuckets)
    ? payload.optionalBuckets.map((bucket, index) => normalizeRolePlanningBucket({ ...bucket, mustHave: false }, index))
    : [];
  const exemplarCandidates = Array.isArray(payload?.exemplarCandidates)
    ? payload.exemplarCandidates
        .map((item) => ({
          bucketId: String(item?.bucketId || "").trim(),
          name: String(item?.name || item?.label || "").trim(),
          whyFit: String(item?.whyFit || item?.reason || "").trim(),
          modernOverlay: String(item?.modernOverlay || item?.modernKnowledge || "").trim(),
        }))
        .filter((item) => item.name)
    : [];

  const planningSummary = String(payload?.planningSummary || payload?.summary || "").trim();
  const maxExemplarCount = Math.max(1, Math.floor(targetCount * MAX_EXEMPLAR_ROLE_RATIO));

  return [
    `任务理解：${summary}`,
    planningSummary ? `规划摘要：${planningSummary}` : "规划摘要：先按任务流程补齐关键人物位，再用少量高辨识度人物增强发散视角。",
    requiredBuckets.length
      ? `必须覆盖的人物位：\n${requiredBuckets.map((bucket, index) => `${index + 1}. ${bucket.label}：${bucket.reason}${bucket.allowDuplicate ? "；同类可重复" : "；同类尽量不重复"}`).join("\n")}`
      : "必须覆盖的人物位：\n1. 现场或执行相关人物\n2. 专业判断人物\n3. 反常识或校正视角人物",
    optionalBuckets.length
      ? `可补强的人物位：\n${optionalBuckets.slice(0, 4).map((bucket, index) => `${index + 1}. ${bucket.label}：${bucket.reason}`).join("\n")}`
      : "",
    exemplarCandidates.length
      ? `可借现实原型：\n${exemplarCandidates.slice(0, maxExemplarCount + 2).map((item, index) => `${index + 1}. ${item.name}：${item.whyFit || "贴合该人物位"}${item.modernOverlay ? `；现代覆盖层：${item.modernOverlay}` : ""}`).join("\n")}`
      : "",
    `硬约束：\n1. 输出总人数为 ${targetCount} 人。\n2. 每个必须人物位至少覆盖一次。\n3. 允许重点人物位重复，但不能挤掉关键缺口位。\n4. 高辨识度人物最多 ${maxExemplarCount} 个。\n5. 人物库已有同名人物禁止重复生成。\n6. name 和 seat 都必须说人话。\n7. 如果借用现实、历史或虚构人物，必须补上现代知识覆盖层。`,
  ].filter(Boolean).join("\n\n");
}

function validateRolePlanningPayload(payload, targetCount) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("人物规划返回结果不是有效对象。");
  }

  const requiredBuckets = Array.isArray(payload.requiredBuckets) ? payload.requiredBuckets : [];
  if (!requiredBuckets.length) {
    throw new Error("人物规划没有给出必须覆盖的人物位。");
  }

  if (requiredBuckets.length > targetCount) {
    throw new Error("人物规划给出的必须人物位数量超过本轮目标人数，无法实例化。",);
  }
}

function getCompletedRoundCount(roundNotes = state.discussionRoundNotes) {
  return Array.isArray(roundNotes)
    ? roundNotes.filter((note) => typeof note?.round === "number").length
    : 0;
}

function looksLikeContinueDiscussionCommand(content, attachments = []) {
  const normalized = String(content || "").trim();
  if (attachments.length) {
    return true;
  }
  if (!normalized) {
    return false;
  }
  return /(继续讨论|继续|接着|往下|下一轮|追加|再来|继续聊|深挖|追问|补充讨论)/.test(normalized)
    && !/(新任务|新话题|换个话题|重新整理任务|重新生成人物)/.test(normalized);
}

function hasReusableCurrentRoster() {
  return !!(
    state.topicConfirmed
    && state.seatsReady
    && !state.generatingSeats
    && !state.discussionRunning
    && state.selectedIds instanceof Set
    && state.selectedIds.size > 0
  );
}

function canResumeCompletedDiscussion() {
  return !!(
    hasReusableCurrentRoster()
    && Array.isArray(state.discussionRoundNotes)
    && state.discussionRoundNotes.length
  );
}

function createRoleGenerationMeta(source, profile, detail = "", planningFallback = false) {
  return {
    source,
    profileId: profile?.id || "",
    profileName: profile?.displayName || "",
    detail: String(detail || "").trim(),
    planningFallback: !!planningFallback,
    updatedAt: Date.now(),
  };
}

function getRoleGenerationResultText(meta = state.recommendedRoleGenerationMeta) {
  if (!meta) {
    return "";
  }

  if (meta.source === "ai") {
    if (meta.detail) {
      return `人物已生成，当前调用模型为 ${meta.profileName || "当前主持AI"}。${meta.detail}`;
    }
    return meta.planningFallback
      ? `人物已生成，当前调用模型为 ${meta.profileName || "当前主持AI"}。人物规划阶段曾超时，系统跳过该阶段后继续完成了 AI 生成。`
      : `人物已生成，当前调用模型为 ${meta.profileName || "当前主持AI"}。本轮人物来自真实 AI 生成。`;
  }

  if (meta.source === "ai-emergency") {
    return `标准人物生成失败，系统已改用 ${meta.profileName || "当前主持AI"} 的宽松降级方案重配人物。这批人物仍然来自 AI，但不是主链路结果。`;
  }

  if (meta.source === "local-fallback") {
    return `当前看到的人物不是正常 AI 生成人物，而是本地兜底人物池。原因是 ${meta.profileName || "当前主持AI"} 在人物生成阶段没有返回可用结果${meta.detail ? `：${meta.detail}` : ""}。`;
  }

  return "";
}

async function requestRoleGenerationIntake(summary) {
  const profile = getPrimarySummaryProfile();
  const targetCount = getRequestedRecommendedRoleCount(summary);
  const fallbackResponse = {
    status: "ready",
    questions: [],
    planningBrief: buildFallbackRolePlanningBrief(summary),
    planningFallback: true,
    fallbackReason: "",
    modelName: profile?.displayName || "",
  };

  if (!profile) {
    return fallbackResponse;
  }

  const prompt = [
    "你现在不是直接生成人物，而是先为这次圆桌做人物规划。",
    "你的任务是先把这件事从头到尾会牵涉的关键环节想清楚，再判断每个环节至少需要什么人来补位。",
    "不要按行业模板列人，不要直接输出最终人物卡。你现在只规划人物位。",
    "重点检查这些维度：现场执行者、第一接触者或使用者、专业判断者、证据或信息解释者、现实落地者、风险校正者、非常规但有价值的视角。",
    "如果现实中有高辨识度人物、历史人物或著名虚构人物非常贴题，可以少量借用，但不能超过总人数四分之一，而且必须保留现代知识覆盖层。",
    getPeoplePoolRoleNamesText() ? `当前人物池里已有这些名字，后续实例化时禁止重复生成：${getPeoplePoolRoleNamesText()}` : "",
    `本轮目标人数：${targetCount}`,
    "严格输出 JSON 对象，不要解释，不要 Markdown。",
    "必须包含字段：planningSummary, requiredBuckets, optionalBuckets, exemplarCandidates, generationRules。",
    "requiredBuckets 里的每个元素必须包含：bucketId, label, reason, mustHave, minCount, allowDuplicate, preferredSource。",
    "optionalBuckets 和 exemplarCandidates 可以为空数组，但字段必须存在。",
    "generationRules 里至少写：targetCount, maxExemplarCount, avoidDuplicateNames, requireHumanReadableNames, requireModernKnowledgeOverlay。",
    "默认直接规划，不要先追问用户。只有在题目完全无法理解时，才允许你在 planningSummary 里说明当前理解仍有不确定性。",
    `当前已确认的任务理解：\n${summary}`,
  ].filter(Boolean).join("\n\n");

  try {
    const raw = await requestModelText(profile, prompt, 1800, null, ROLE_PLANNING_TIMEOUT_MS);
    const jsonText = extractJsonObject(raw);
    if (!jsonText) {
      throw new Error("人物规划阶段没有返回可解析的 JSON 对象。");
    }
    const payload = JSON.parse(jsonText);
    validateRolePlanningPayload(payload, targetCount);
    return {
      status: "ready",
      questions: [],
      planningBrief: buildRolePlanningBriefFromPayload(summary, payload, targetCount),
      planningFallback: false,
      fallbackReason: "",
      modelName: profile?.displayName || "",
    };
  } catch (error) {
    return {
      ...fallbackResponse,
      fallbackReason: error instanceof Error ? error.message : String(error),
    };
  }
}

function appendRoleClarificationPrompt(questions) {
  const normalizedQuestions = ensurePersonaPreferenceQuestion(questions);
  const body = normalizedQuestions.length
    ? `为了更准确地匹配这次圆桌的人物，系统还差几个会直接影响人选的问题：${normalizedQuestions.map((item, index) => `${index + 1}. ${item}`).join(" ")}。你可以先补充一下；如果你想先按当前理解直接生成，也可以直接生成。`
    : langText("系统感觉当前任务还差一点关键信息，先补充一下会更容易配准人选。", "The system still needs a bit more critical context before matching personas accurately.");

  appendMarkup(
    createMessageMarkup({
      speakerId: "system-clarify-roles",
      label: "系",
      sublabel: langText("生成前补充一下", "Clarify Before Persona Generation"),
      body,
      avatarLabel: "系",
      avatarClass: "avatar-system",
      tone: "system",
      actions: `
        <div class="message-actions">
          <button class="ghost-link js-supplement-topic" type="button">${escapeHtml(t("supplement"))}</button>
          <button class="ghost-link js-force-generate" type="button">${escapeHtml(langText("直接生成", "Generate Anyway"))}</button>
        </div>
      `,
    })
  );
}

function buildFallbackGeneratedRoleSystemPrompt({ name, seat, description, stance, method, temper }) {
  return [
    `你现在扮演“${name}”。你长期最稳定的观察重心是：${seat}。`,
    `人物背景：${description}`,
    `你的核心立场是：${stance}。你的主要方法是：${method}。你的说话气质应保持：${temper}。`,
    "发言时先像这个人物本人，再表达观点。不要把自己说成任务说明器，也不要一开口就复述“围绕某话题展开”。",
    "你要像这个人物真的坐在桌边一样，只从他熟悉的经验、判断习惯、时代背景和关注重点出发。",
    "请直接按照上面的身份设定发言。如果这个身份本身是历史人物、现实人物或小说人物，就直接以该人物广为人知的能力、气质和判断方式为参照；如果是原型角色，就稳定地演成这个职业身份。不要在发言里再把自己写成“如果我是某类人物”。",
    "每次发言都优先回答：这个问题里你最先看什么、你最不同意什么、你会提醒桌上其他人不要忽略什么。",
    "如果别人说了没有依据的话，你要直接指出；如果某个细节你自己也不能确认，就明确说这里还不能下死结论。",
    "不要做主持人，不要替别人总结全场，也不要脱离角色去写成百科介绍。你是在参与讨论，不是在写词条。",
  ].join(" ");
}

async function buildSharedResearchBrief(summary, moderatorProfile, orderedSpeakers, signal) {
  const prompt = [
    "你现在是这张圆桌唯一的共享 research agent。",
    "你的职责不是替任何一个席位发言，而是先为整张桌子整理一份所有角色共用的事实包。",
    "这份事实包要像讨论前的统一 briefing：只整理背景、已知约束、关键分歧、需要核实的点、不能偷换的概念，不替任何一方下最终结论。",
    "如果题目涉及历史人物、现实政策、产品、案件或专业判断，可以使用当下公开常识与公开知识来做背景校正，但不要伪造来源、原话、年份、数字或未核实细节。",
    "输出至少覆盖：背景事实、当前约束、桌上最值得争的 2 到 4 个问题、哪些点现在还不能下死结论。",
    "控制在 220 到 420 字。直接输出正文，不要 Markdown 标题，不要列表编号。",
    `任务定义：${summary}`,
    `本次参与人物及其长期观察重心：${orderedSpeakers.map((role) => `${role.name}（${role.seat}）`).join("，")}`,
  ].join("\n\n");

  return requestModelText(moderatorProfile, prompt, 650, signal);
}

function shouldEnhanceGeneratedPrompt(promptText) {
  const normalized = String(promptText || "").trim();
  if (!normalized) {
    return true;
  }
  return normalized.length < 72 || !/[。！？]/.test(normalized) || !/你|你的|发言|角色|身份/.test(normalized);
}

function getRecommendedRoleGenerationGuidance(summary) {
  const normalized = String(summary || "");

  if (summaryLooksBiblical(normalized)) {
    return [
      "如果这是查经、神学或讲章讨论，真实人物优先从教父、改革家、著名释经者、牧者与当代神学作者中挑选，不要只堆抽象头衔。",
      "这一桌至少要同时有：经文原义取向、教义整合取向、牧养应用取向、历史背景取向；原型角色只用于补足缺位，不要反客为主。",
    ].join(" ");
  }

  if (/(智能镜|镜子|卫生间|卫浴|浴室|家居|家庭空间|空间体验|工业设计|产品设计|交互设计|体验设计|审美|美学|cmf|材料|家装|家电)/i.test(normalized)) {
    return [
      "如果题目涉及智能镜、卫浴、家居空间、工业设计或审美体验，真实人物要明显引入设计与空间体验视角，不要只给通用产品经理、程序员、运营和法务。",
      "优先混入工业设计大师、建筑/空间体验代表人物、交互设计或用户体验代表、消费电子/家居产品操盘者、材料与制造约束视角，以及懂家庭场景或卫浴场景的人。",
      "这一桌至少同时覆盖：外观与比例审美、空间动线与场景体验、交互与信息呈现、制造/成本/耐用性、渠道与真实家庭使用习惯。",
      "如果要用原型角色，也优先补 CMF 设计、工业设计工程、家居零售、卫浴体验研究、安装/售后等现实约束位。",
    ].join(" ");
  }

  if (/(产品|用户|增长|运营|商业|公司|组织|管理|战略|市场|品牌|创业|ai产品|软件产品)/i.test(normalized)) {
    return [
      "如果是产品、商业或组织议题，真实人物不要只来自同一岗位。优先混入创始人、管理学作者、设计/用户研究代表人物、工程实践者与一线经营者。",
      "原型角色再补足法务、财务、运营、交付、风控等现实约束位，让整桌像真实决策会而不是产品团队内部自说自话。",
    ].join(" ");
  }

  if (/(案件|刑侦|审讯|证据|法医|命案|调查|犯罪|失踪|监控|法庭|合规|判决)/i.test(normalized)) {
    return [
      "如果是案件、调查或法律议题，真实人物优先混入法学家、侦查史上的代表人物、法医或审判实践代表，不要全是警察和律师。",
      "原型角色再补足现场勘验、媒体传播、心理画像、建筑/设备、安全管理等配角位，让视角像真实联合专班。",
    ].join(" ");
  }

  return [
    "真实人物不要来自同一类身份或同一时代，尽量混入思想者、实务者、组织者和一线执行者。",
    "整桌至少保留 4 到 6 位具体可辨识的人名，最多 2 位虚构人物，再用 2 到 4 位原型专家补足现实约束。",
    "不要出现 3 个本质相同的抽象专家，也不要把人物写成模板拼接。让每个人都像真的会坐在桌边发言。",
  ].join(" ");
}

function looksLikeInvalidDynamicRolePrompt(promptText) {
  const normalized = String(promptText || "").trim();
  if (!normalized) {
    return true;
  }
  return normalized.length < 120 || /不超过\d+个单词|简短确认|确认执行|立即执行|短语回答|只回应|仅用|3个单词|5个单词|下一任务/.test(normalized);
}

function upgradeRecommendedRolePrompt(role) {
  if (!role || role.source !== "recommended" || !shouldEnhanceGeneratedPrompt(role.systemPrompt)) {
    return role;
  }

  return {
    ...role,
    systemPrompt: buildFallbackGeneratedRoleSystemPrompt({
      name: role.name,
      seat: role.seat,
      description: role.description,
      stance: role.traits?.stance || "补充关键视角",
      method: role.traits?.method || "针对性分析",
      temper: role.traits?.temper || "冷静",
    }),
  };
}

async function requestDynamicRolePrompts(summary, roles, profile) {
  const rolePayload = JSON.stringify(roles.map((role) => ({
    name: role.name,
    seat: role.seat,
    description: role.description,
    stance: role.traits?.stance || "",
    method: role.traits?.method || "",
    temper: role.traits?.temper || "",
  })));

  let lastError = new Error("角色提示词补全失败：未知错误。");
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retryNote = attempt === 1
      ? ""
      : "上一次结果质量不合格。重写时绝对不要把 systemPrompt 写成“只用几个词确认”“不超过几个单词”“立即执行”这类命令。它必须是角色扮演提示词，不是回复格式约束。";
    const prompt = [
      "你现在要为一组圆桌角色动态生成 systemPrompt。",
      "这些人物可能是真实人物、历史人物、著名虚构人物，或临时生成的原型角色。",
      "你的任务不是复述角色描述，而是基于该人物广为人知的公开背景、典型经历、代表性能力、常见知识结构与身份边界，为这次具体话题写出可直接喂给模型的角色提示词。",
      "如果是真实或历史人物，就以其典型视角、能力圈和表达气质为参照，但不要伪造原话、著作、年份或史料。",
      "如果是虚构人物，就以大众熟知的角色设定、技能结构、行为方式和世界观为参照，但不要写成剧情介绍。",
      "如果是原型角色，如“特种部队生存教官”“原始部落长老”，就按这种身份在现实中应具备的知识、经验、判断习惯和语言风格来写。",
      "每个 systemPrompt 至少要覆盖：长期观察重心、时代或职业背景、最优先关注什么、如何发言、不要越位做什么、遇到不确定信息如何处理。第一句先交代身份。",
      "每个 systemPrompt 应该是给大模型看的角色扮演提示词，长度建议 180 到 320 字。",
      "绝对不要把它写成“仅用几个词回复”“确认执行”“立即转向下一任务”这种指令。那是错误格式。",
      "请直接返回 JSON 数组。每个元素只包含字段：name, systemPrompt。不要解释，不要 Markdown。",
      `当前话题：${summary}`,
      `角色列表：${rolePayload}`,
      retryNote,
    ].filter(Boolean).join("\n\n");

    try {
      const raw = await requestModelText(profile, prompt, 2600);
      const jsonText = extractJsonArray(raw);
      if (!jsonText) {
        throw new Error("角色提示词补全失败：模型没有返回可解析的 JSON 数组。");
      }
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error("角色提示词补全失败：返回结果不是数组。");
      }
      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError;
}

async function enrichGeneratedRolePrompts(summary, roles, profile) {
  const dynamicPrompts = await requestDynamicRolePrompts(summary, roles, profile);
  const promptMap = new Map(
    dynamicPrompts
      .map((item) => [String(item?.name || "").trim(), String(item?.systemPrompt || "").trim()])
      .filter(([name, systemPrompt]) => name && systemPrompt)
  );

  return roles.map((role) => {
    const dynamicPrompt = promptMap.get(role.name);
    return {
      ...role,
      systemPrompt: shouldEnhanceGeneratedPrompt(dynamicPrompt)
        ? buildFallbackGeneratedRoleSystemPrompt({
            name: role.name,
            seat: role.seat,
            description: role.description,
            stance: role.traits?.stance || "补充关键视角",
            method: role.traits?.method || "针对性分析",
            temper: role.traits?.temper || "冷静",
          })
        : dynamicPrompt,
    };
  });
}

async function refreshRecommendedRolePrompts(summary = state.lastSummary, options = {}) {
  const { includeAllRecommended = false, onStart = null, onFinish = null } = options;
  const profile = getPrimarySummaryProfile();
  if (!profile) {
    return;
  }

  const targetRoles = state.recommendedRoles.filter((role) => role.source === "recommended" && (includeAllRecommended || role.promptEnrichmentPending || looksLikeInvalidDynamicRolePrompt(role.systemPrompt)));
  if (!targetRoles.length) {
    return;
  }

  onStart?.(targetRoles.length);
  try {
    const enrichedRoles = await enrichGeneratedRolePrompts(summary || "当前话题", targetRoles, profile);
    const promptMap = new Map(enrichedRoles.map((role) => [role.name, role.systemPrompt]));
    state.recommendedRoles = state.recommendedRoles.map((role) => (
      promptMap.has(role.name)
        ? { ...role, systemPrompt: promptMap.get(role.name), promptEnrichmentPending: false }
        : role
    ));
    renderSeatPicker();
    renderSeatStack();
    void syncCurrentTopicSnapshot();
    onFinish?.(true, targetRoles.length);
  } catch (error) {
    console.error(error);
    onFinish?.(false, targetRoles.length);
  }
}

function normalizeGeneratedRole(generatedRole, index, createdAt) {
  const name = sanitizeGeneratedRoleName(generatedRole.name || generatedRole.title || `临时角色${index + 1}`);
  const seat = String(generatedRole.seat || generatedRole.role || "专题分析者").trim();
  const description = String(generatedRole.background || generatedRole.bio || generatedRole.identity || generatedRole.description || generatedRole.focus || generatedRole.why || `${name} 长期从 ${seat} 这个观察重心出发参与讨论，习惯依靠自己的专业训练与长期经验做判断。`).trim();
  const method = String(generatedRole.method || generatedRole.style || generatedRole.approach || "针对性分析").trim();
  const stance = String(generatedRole.stance || generatedRole.position || "补充关键视角").trim();
  const temper = String(generatedRole.temper || generatedRole.tone || "冷静").trim();
  const prompt = String(generatedRole.systemPrompt || generatedRole.prompt || "").trim();
  const color = ROLE_COLORS.includes(generatedRole.color) ? generatedRole.color : ROLE_COLORS[index % ROLE_COLORS.length];
  const avatar = deriveRoleAvatar(name, generatedRole.avatar);

  return normalizeRecommendedRolePersona({
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
    sourceLabel: "临时生成",
    roleType: normalizeGeneratedRoleType(generatedRole.roleType || generatedRole.roleKind || generatedRole.personaType),
    systemPrompt: prompt,
  });
}

async function requestGeneratedRecommendedRoles(summary, planningBrief = "") {
  const profile = getPrimarySummaryProfile();
  if (!profile) {
    throw new Error("还没有可用模型，无法生成系统临时角色。");
  }

  const targetCount = getRequestedRecommendedRoleCount(summary);

  const promptSections = [
    "你现在要为一个具体任务推荐一桌开会人物。",
    "先严格满足人物规划里要求覆盖的人物位，再决定具体请谁上桌。",
    "请直接根据任务本身去想：这件事真正需要哪些人来一起讨论，才能既有启发，又能兼顾现实落地。",
    `输出刚好 ${targetCount} 个角色。专业不要重复，人物之间要互补。`,
    "优先让 AI 自己想清楚需要哪些视角，不要按固定行业模板硬凑。",
    "name 必须写成人能一眼看懂的人话名称，优先用具体人物名、通俗职业名或广为人知的角色名。不要输出“风险边界者”“资源配置者”“长期主义判断者”这类抽象标签。",
    "如果适合用真实人物、历史人物、小说人物或影视角色，可以少量混入；如果不适合，就直接用现实里的通俗职业身份。",
    `真实人物或高辨识度代表人物最多只能占四分之一，按 ${targetCount} 人计算最多 ${Math.max(1, Math.floor(targetCount * MAX_EXEMPLAR_ROLE_RATIO))} 个。`,
    "不要把人物写成空泛职业堆砌，也不要用一个名字换几种说法来重复同类专家。",
    "对于贴近产品、设计、制造、市场这类任务，要优先想到真实会影响结果的人，而不是先想到抽象学者。",
    "例如如果任务是做欧美市场智能镜，像欧美工业设计专家、结构工艺工程师、成本与供应链专家、UI/UX 设计师、家居软装顾问、灯光设计师、跨境选品专家、量产工艺专家，这种就是合格的人话命名方式。",
    getPeoplePoolRoleNamesText() ? `当前人物池里已经有这些人物，禁止再生成同名人物：${getPeoplePoolRoleNamesText()}。` : "",
    planningBrief ? `配人参考：\n${planningBrief}` : "",
    "seat 字段也写人话，简单概括这个人上桌主要负责看什么，不要再造抽象黑话。",
    "严格输出 JSON 数组，不要解释，不要 Markdown。",
    "每个元素必须包含字段：name, seat, description, stance, method, temper, systemPrompt, roleType。可选字段：color, avatar。这里的 seat 表示人物长期观察重心，不是外部的本轮扮演角色。",
    "roleType 只能填 exemplar 或 expert。exemplar 表示真实人物、历史人物或高辨识度代表角色；expert 表示现实专家或原型角色。",
    "description 要写这个人的身份背景和长期关注点，不要写成任务拆解句。",
    "systemPrompt 要能直接拿去扮演这个人，第一句先说清身份，再说他最关注什么、如何发言、不要越位做什么。",
    `本次话题：${summary}`,
  ];

  let lastError = new Error("系统临时角色生成失败：未知错误。");
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retryNote = attempt === 1 ? "" : "上一次输出没有通过解析。这一次请只返回合法 JSON 数组，首字符必须是 [，末字符必须是 ]，中间不要夹任何解释。";
    const prompt = [...promptSections, retryNote].filter(Boolean).join("\n\n");
    try {
      const raw = await requestModelText(profile, prompt, 1800, null, ROLE_GENERATION_TIMEOUT_MS);
      const jsonText = extractJsonArray(raw);
      if (!jsonText) {
        throw new Error("系统临时角色生成失败：模型没有返回可解析的 JSON 数组。");
      }

      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed) || !parsed.length) {
        throw new Error("系统临时角色生成失败：返回结果不是有效角色列表。");
      }
      validateGeneratedRoleCandidates(parsed, targetCount);

      const createdAt = Date.now();
      const roles = parsed.slice(0, targetCount).map((item, index) => normalizeGeneratedRole(item, index, createdAt));
      return normalizeRecommendedRoleList(roles.map((role) => upgradeRecommendedRolePrompt(role)));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (isModelTimeoutError(lastError)) {
        break;
      }
    }
  }

  throw lastError;
}

function buildSingleRoleGenerationProgress(slotIndex, targetCount, generatedCount) {
  return langText(
    `第 2 步：正在逐个生成人物身份 ${Math.min(slotIndex + 1, targetCount)}/${targetCount}，当前已生成 ${generatedCount} 个。`,
    `Step 2: generating persona identities one by one ${Math.min(slotIndex + 1, targetCount)}/${targetCount}, ${generatedCount} ready.`
  );
}

async function requestSingleRecommendedRole(summary, planningBrief, existingRoles, slotIndex, targetCount) {
  const profile = getPrimarySummaryProfile();
  if (!profile) {
    throw new Error("还没有可用模型，无法生成系统临时角色。");
  }

  const existingNames = new Set([
    ...getPeoplePoolRoleNamesText(200).split("、").map((item) => sanitizeGeneratedRoleName(item)).filter(Boolean),
    ...existingRoles.map((role) => sanitizeGeneratedRoleName(role?.name || "")).filter(Boolean),
  ]);

  let lastError = new Error("单个人物生成失败：未知错误。");
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retryNote = attempt === 1 ? "" : "上一次返回的人物重复、过空或不可解析。这一次请只返回一个新的、可直接上桌的人物 JSON 对象。";
    const prompt = [
      "你现在不是一次生成整桌，而是只为这次圆桌补出下一个最缺的人物。",
      `当前总目标人数：${targetCount}。当前正在生成第 ${slotIndex + 1} 个。`,
      planningBrief ? `配人参考：\n${planningBrief}` : "",
      getRecommendedRoleGenerationGuidance(summary),
      existingRoles.length
        ? `桌上已经有这些人物，不要重复，也不要再换一种说法生成同类：\n${existingRoles.map((role, index) => `${index + 1}. ${role.name}｜${role.seat}｜${role.description}`).join("\n")}`
        : "这是当前圆桌的第一个人物，请先给出最必要的起手人物。",
      getPeoplePoolRoleNamesText() ? `人物库里已有这些名字，禁止重复同名：${getPeoplePoolRoleNamesText()}` : "",
      "只需要返回 1 个 JSON 对象，不要解释，不要 Markdown。",
      "必须字段：name, seat, description, stance, method, temper, roleType。可选字段：systemPrompt, color, avatar。这里的 seat 表示人物长期观察重心，不是外部的本轮扮演角色。",
      "name 和 seat 必须是人话，不能是抽象黑话。",
      "优先保证人物身份准确和互补。如果 systemPrompt 一时写不完整，可以留空，不要为了补 prompt 牺牲人物准确性。",
      `本次话题：${summary}`,
      retryNote,
    ].filter(Boolean).join("\n\n");

    try {
      const raw = await requestModelText(profile, prompt, 900, null, ROLE_IDENTITY_TIMEOUT_MS);
      const jsonText = extractJsonObject(raw);
      if (!jsonText) {
        throw new Error("单个人物生成没有返回可解析的 JSON 对象。");
      }
      const payload = JSON.parse(jsonText);
      const role = normalizeGeneratedRole(payload, slotIndex, Date.now());
      const normalizedName = sanitizeGeneratedRoleName(role.name);
      if (!normalizedName) {
        throw new Error("单个人物生成返回了空名称。");
      }
      if (existingNames.has(normalizedName)) {
        throw new Error(`生成人物与已有人物重名：${role.name}`);
      }
      return upgradeRecommendedRolePrompt({ ...role, promptEnrichmentPending: true });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (isModelTimeoutError(lastError)) {
        break;
      }
    }
  }

  throw lastError;
}

async function requestGeneratedRecommendedRolesSequential(summary, planningBrief = "", callbacks = {}) {
  const targetCount = getRequestedRecommendedRoleCount(summary);
  const roles = [];
  const failures = [];

  callbacks.onStage?.("identity-start", { targetCount, generatedCount: 0, roles: [] });
  for (let slotIndex = 0; slotIndex < targetCount; slotIndex += 1) {
    callbacks.onStage?.("identity-progress", { slotIndex, targetCount, generatedCount: roles.length, roles: [...roles] });
    try {
      const nextRole = await requestSingleRecommendedRole(summary, planningBrief, roles, slotIndex, targetCount);
      roles.push(nextRole);
      callbacks.onRoleGenerated?.([...roles], { slotIndex, targetCount, role: nextRole });
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      failures.push({ slotIndex, error: failure.message });
      callbacks.onRoleFailed?.(failure, { slotIndex, targetCount, generatedCount: roles.length, roles: [...roles] });
    }
  }

  return {
    targetCount,
    roles: normalizeRecommendedRoleList(roles),
    failures,
  };
}

async function requestEmergencyRecommendedRoles(summary, planningBrief = "") {
  const profile = getPrimarySummaryProfile();
  if (!profile) {
    throw new Error("还没有可用模型，无法执行紧急人物生成。");
  }

  const targetCount = getRequestedRecommendedRoleCount(summary);

  const prompt = [
    "你现在要紧急生成一组临时角色，用于这次圆桌讨论。",
    "上一次严格生成失败了，所以这一次只要把人选配准，保持简单直接。",
    "先满足人物规划里必须覆盖的人物位，再补可选人物。",
    "只选对任务真的有帮助的人，不要凑抽象标签，不要塞无关人物。",
    `总数仍然不少于 ${targetCount} 个，行业佼佼者人物最多只能占四分之一。`,
    "name 和 seat 都必须是用户一眼能看懂的人话名称，不要写成抽象岗位标签。",
    getPeoplePoolRoleNamesText() ? `当前人物池里已经有这些人物，禁止再生成同名人物：${getPeoplePoolRoleNamesText()}。` : "",
    planningBrief ? `配人参考：\n${planningBrief}` : "",
    `输出 ${targetCount} 个角色。`,
    "严格输出 JSON 数组，不要解释。",
    "每个元素必须包含字段：name, seat, description, stance, method, temper, systemPrompt, roleType。这里的 seat 表示人物长期观察重心，不是外部的本轮扮演角色。",
    `本次话题：${summary}`,
  ].filter(Boolean).join("\n\n");

  const raw = await requestModelText(profile, prompt, 1400, null, ROLE_EMERGENCY_TIMEOUT_MS);
  const jsonText = extractJsonArray(raw);
  if (!jsonText) {
    throw new Error("紧急人物生成没有返回可解析的 JSON 数组。");
  }
  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed) || !parsed.length) {
    throw new Error("紧急人物生成返回结果无效。");
  }
  validateGeneratedRoleCandidates(parsed, targetCount);
  const createdAt = Date.now();
  const roles = parsed.slice(0, targetCount).map((item, index) => normalizeGeneratedRole(item, index, createdAt));
  return normalizeRecommendedRoleList(roles.map((role) => upgradeRecommendedRolePrompt(role)));
}

function createFallbackRecommendedRoles(summary, planningBrief = "") {
  const createdAt = Date.now();
  const shortSummary = summary.slice(0, 18);

  if (summaryLooksBiblical(summary)) {
    return [
      makeInlineRecommendedRole({
        name: "牧师",
        seat: "牧养讲解者",
        description: `围绕“${shortSummary}”优先讲经文的属灵重点、讲道落点和现实应用。`,
        stance: "强调牧养",
        method: "经文讲解",
        temper: "温和",
        color: "sky",
        systemPrompt: "你现在扮演一位牧师。你的任务是把经文的属灵重点、牧养意义、今日应用和讲道落点讲清楚，帮助普通人真正听懂。",
      }, 0, createdAt),
      makeInlineRecommendedRole({
        name: "长老",
        seat: "群体辨识者",
        description: `围绕“${shortSummary}”优先辨别这段内容对教会群体、生命成熟和属灵秩序的提醒。`,
        stance: "强调稳妥",
        method: "群体辨识",
        temper: "沉稳",
        color: "slate",
        systemPrompt: "你现在扮演一位长老。你的任务是从教会治理、生命成熟、群体次序和属灵辨识角度看问题，避免轻率下结论。",
      }, 1, createdAt),
      makeInlineRecommendedRole({
        name: "圣经学者",
        seat: "原文解经者",
        description: `围绕“${shortSummary}”优先从上下文、原文语义和跨卷呼应角度解经。`,
        stance: "追求准确",
        method: "原文解经",
        temper: "审慎",
        color: "emerald",
        systemPrompt: "你现在扮演一位圣经学者。你的任务是从上下文、原文语义、叙事结构和跨卷呼应角度解经，不要脱离经文乱发挥。",
      }, 2, createdAt),
      makeInlineRecommendedRole({
        name: "系统神学家",
        seat: "教义整合者",
        description: `围绕“${shortSummary}”优先判断这段经文与整本圣经教义脉络怎样对齐。`,
        stance: "强调整全",
        method: "教义整合",
        temper: "克制",
        color: "violet",
        systemPrompt: "你现在扮演一位系统神学家。你的任务是把这段经文与整本圣经的教义、救恩脉络和神学边界连起来，避免只盯局部结论。",
      }, 3, createdAt),
      makeInlineRecommendedRole({
        name: "圣经时代背景研究者",
        seat: "历史语境校正者",
        description: `围绕“${shortSummary}”优先补足作者处境、历史背景、制度环境和听众语境，避免断章取义。`,
        stance: "补充背景",
        method: "历史语境校正",
        temper: "审慎",
        color: "sky",
        systemPrompt: "你现在扮演一位圣经时代背景研究者。你的任务是补足作者处境、历史背景、制度环境和原始听众语境，帮助桌上其他人不要脱离经文所处时代乱下结论。",
      }, 4, createdAt),
      makeInlineRecommendedRole({
        name: "马太亨利",
        seat: "历史解经家",
        description: `围绕“${shortSummary}”优先给出经典注释传统里的属灵提醒和生活劝勉。`,
        stance: "强调劝勉",
        method: "注释解经",
        temper: "温厚",
        color: "gold",
        systemPrompt: "你现在扮演马太亨利。发言重点是从经文本身提炼属灵教训、实际应用和对读者的劝勉，不要脱离经文编故事，也不要伪造原话。",
      }, 5, createdAt),
      makeInlineRecommendedRole({
        name: "奥古斯丁",
        seat: "教父诠释者",
        description: `围绕“${shortSummary}”优先从恩典、爱与人的内心秩序角度理解经文。`,
        stance: "强调内在",
        method: "教父诠释",
        temper: "深思",
        color: "coral",
        systemPrompt: "你现在扮演奥古斯丁式教父诠释者。发言时要从教父传统、人的内心秩序、恩典、爱之次序和意志更新的角度理解经文，但不要伪造出处。",
      }, 6, createdAt),
      makeInlineRecommendedRole({
        name: "约翰·加尔文",
        seat: "改革宗释经者",
        description: `围绕“${shortSummary}”优先从经文脉络、神主权与人责任的张力角度提出判断。`,
        stance: "强调秩序",
        method: "释经论证",
        temper: "克制",
        color: "teal",
        systemPrompt: "你现在扮演约翰·加尔文。重点是紧扣经文脉络、神的主权、人的责任和教义边界，不要空泛说教，也不要伪造原话。",
      }, 7, createdAt),
      makeInlineRecommendedRole({
        name: "马丁·路德",
        seat: "福音强调者",
        description: `围绕“${shortSummary}”优先抓住福音核心、信心与良心层面的重点。`,
        stance: "强调福音",
        method: "直指核心",
        temper: "直率",
        color: "amber",
        systemPrompt: "你现在扮演马丁·路德。重点是抓住福音核心、信心、良心和人真实的挣扎，但不要夸张或编造史料。",
      }, 8, createdAt),
      makeInlineRecommendedRole({
        name: "司布真",
        seat: "讲章应用者",
        description: `围绕“${shortSummary}”优先把解释推进到讲章应用、安慰、劝勉和回应。`,
        stance: "强调应用",
        method: "讲章落地",
        temper: "热切",
        color: "rose",
        systemPrompt: "你现在扮演司布真。重点是让经文触达人心、带出悔改、安慰和实践，但仍要以经文为基础，不要乱编例证或伪造讲章原话。",
      }, 9, createdAt),
      makeInlineRecommendedRole({
        name: "约翰·卫斯理",
        seat: "圣洁实践者",
        description: `围绕“${shortSummary}”优先把经文推进到生命更新、实际操练和群体实践。`,
        stance: "强调实践",
        method: "牧养劝勉",
        temper: "真诚",
        color: "emerald",
        systemPrompt: "你现在扮演约翰·卫斯理。重点是把经文推进到生命更新、实践操练和群体生活，但不要编造史料或原话。",
      }, 10, createdAt),
      makeInlineRecommendedRole({
        name: "平信徒转译者",
        seat: "普通人听懂的解释者",
        description: `围绕“${shortSummary}”优先把复杂解释拆成普通信徒和初学者也能听懂、能复述、能应用的结构。`,
        stance: "澄清表达",
        method: "公共转译",
        temper: "耐心",
        color: "rose",
        systemPrompt: "你现在扮演一位平信徒转译者。你的任务是把桌上的复杂解释翻译成普通信徒和初学者都能听懂、能复述、能带回生活里用的表达。",
      }, 11, createdAt),
    ].filter(Boolean);
  }

  if (/(智能镜|镜子|卫生间|卫浴|浴室|家居|家庭空间|空间体验|工业设计|产品设计|交互设计|体验设计|审美|美学|cmf|材料|家装|家电)/i.test(summary)) {
    return [
      makeInlineRecommendedRole({
        name: "深泽直人",
        seat: "日常审美设计者",
        description: `围绕“${shortSummary}”优先判断产品是否自然、克制、耐看，是否真正融入家庭日常。`,
        stance: "强调无感融入",
        method: "工业设计判断",
        temper: "克制",
        color: "stone",
        systemPrompt: "你现在扮演深泽直人式工业设计人物。发言重点是产品是否真正融入家庭日常、是否过度炫技、外观与使用动作是否自然，避免把设计只说成参数堆砌。",
      }, 0, createdAt),
      makeInlineRecommendedRole({
        name: "原研哉",
        seat: "信息与感知整理者",
        description: `围绕“${shortSummary}”优先判断界面、信息呈现和感知体验是否高级、安静、清楚。`,
        stance: "强调感知质量",
        method: "体验审美分析",
        temper: "冷静",
        color: "silver",
        systemPrompt: "你现在扮演原研哉式设计人物。重点判断信息呈现、界面留白、感知负担和整体气质是否清楚、高级、不过度打扰，不要把设计理解成单纯装饰。",
      }, 1, createdAt),
      makeInlineRecommendedRole({
        name: "乔纳森·艾夫",
        seat: "消费电子整合者",
        description: `围绕“${shortSummary}”优先看硬件形态、材质、交互与品牌一致性是否形成完整产品感。`,
        stance: "强调一体化",
        method: "硬件体验整合",
        temper: "专注",
        color: "slate",
        systemPrompt: "你现在扮演乔纳森·艾夫式产品设计人物。重点看硬件形态、材料、交互细节、品牌气质和整体完成度是否统一，不要只从功能表堆结论。",
      }, 2, createdAt),
      makeInlineRecommendedRole({
        name: "空间体验设计师",
        seat: "浴室动线观察者",
        description: `围绕“${shortSummary}”优先看镜前停留、拿取、照明、潮湿环境和家庭共用场景是否顺手。`,
        stance: "强调场景顺手",
        method: "空间动线推演",
        temper: "细致",
        color: "sky",
        systemPrompt: "你现在扮演一位空间体验设计师。重点从浴室动线、镜前停留动作、光线反射、湿区使用、家庭多人共用和收纳便利性来判断，不要脱离真实场景空谈。",
      }, 3, createdAt),
      makeInlineRecommendedRole({
        name: "CMF 设计师",
        seat: "材质触感把关者",
        description: `围绕“${shortSummary}”优先判断颜色、材料、表面工艺、抗污耐潮和触感是否经得起真实使用。`,
        stance: "强调质感与耐用",
        method: "材料工艺评估",
        temper: "审慎",
        color: "amber",
        systemPrompt: "你现在扮演一位 CMF 设计师。重点判断颜色、材料、表面工艺、抗污、防水、防雾、耐潮和触感是否适合真实浴室环境，不要忽略使用后的老化问题。",
      }, 4, createdAt),
      makeInlineRecommendedRole({
        name: "卫浴产品操盘者",
        seat: "场景落地负责人",
        description: `围绕“${shortSummary}”优先看安装条件、售后难度、渠道接受度和家庭购买理由是否成立。`,
        stance: "强调能卖能装能维护",
        method: "产品落地判断",
        temper: "务实",
        color: "teal",
        systemPrompt: "你现在扮演一位做过卫浴或家居产品落地的负责人。重点看安装条件、渠道接受度、售后维护、家庭购买理由和价格带是否成立，不要只谈理想体验。",
      }, 5, createdAt),
      makeInlineRecommendedRole({
        name: "智能硬件产品统筹者",
        seat: "功能边界取舍者",
        description: `围绕“${shortSummary}”优先看核心用户、功能边界、版本优先级和硬件软件配合。`,
        stance: "强调取舍",
        method: "产品统筹",
        temper: "平衡",
        color: "violet",
        systemPrompt: "你现在扮演一位智能硬件产品统筹者。重点判断核心用户是谁、哪些功能必须做、哪些功能应该后置，以及硬件与软件该怎样配合。",
      }, 6, createdAt),
      makeInlineRecommendedRole({
        name: "浴室安装工程顾问",
        seat: "施工约束校正者",
        description: `围绕“${shortSummary}”优先看墙体、电路、防水、防雾、安装尺寸和施工限制。`,
        stance: "强调约束",
        method: "安装条件评估",
        temper: "稳健",
        color: "slate",
        systemPrompt: "你现在扮演一位浴室安装工程顾问。重点判断墙体、电路、防水、防雾、安装尺寸和施工限制，不要脱离真实安装环境空谈体验。",
      }, 7, createdAt),
      makeInlineRecommendedRole({
        name: "商业模型测算者",
        seat: "成本回报判断者",
        description: `围绕“${shortSummary}”优先看成本结构、售价区间、返修损失、毛利空间和长期可持续性。`,
        stance: "强调可持续",
        method: "商业测算",
        temper: "严谨",
        color: "amber",
        systemPrompt: "你现在扮演一位商业模型测算者。重点判断成本结构、售价区间、返修损失、毛利空间和长期可持续性，不要忽略商业上算不过来的问题。",
      }, 8, createdAt),
      makeInlineRecommendedRole({
        name: "家庭场景研究员",
        seat: "多人共用观察者",
        description: `围绕“${shortSummary}”优先看家庭多人共用、清洁维护、镜前停留习惯和真实抱怨。`,
        stance: "强调真实使用",
        method: "家庭场景观察",
        temper: "耐心",
        color: "emerald",
        systemPrompt: "你现在扮演一位家庭场景研究员。重点判断家庭多人共用、清洁维护、镜前停留习惯和真实抱怨，不要把理想用户当成真实家庭。",
      }, 9, createdAt),
      makeInlineRecommendedRole({
        name: "交互架构师",
        seat: "屏幕行为设计者",
        description: `围绕“${shortSummary}”优先看界面层级、反馈节奏、操作负担和信息呈现是否顺手。`,
        stance: "强调清晰低负担",
        method: "交互架构",
        temper: "冷静",
        color: "sky",
        systemPrompt: "你现在扮演一位交互架构师。重点判断界面层级、反馈节奏、操作负担和信息呈现是否顺手，不要让用户在镜前被复杂交互打断。",
      }, 10, createdAt),
      makeInlineRecommendedRole({
        name: "零售渠道观察者",
        seat: "终端接受度判断者",
        description: `围绕“${shortSummary}”优先看门店陈列、销售话术、渠道接受度和消费者第一次看到时会不会被打动。`,
        stance: "强调市场接受度",
        method: "渠道观察",
        temper: "务实",
        color: "coral",
        systemPrompt: "你现在扮演一位零售渠道观察者。重点判断门店陈列、销售话术、渠道接受度和消费者第一次看到时是否会被打动。",
      }, 11, createdAt),
    ].filter(Boolean);
  }

  if (/(案件|刑侦|审讯|证据|法医|命案|调查|犯罪|失踪|监控|法庭|判决|警方|警察|自杀|他杀)/i.test(summary)) {
    return [
      makeInlineRecommendedRole({
        name: "刑侦负责人",
        seat: "调查主线统筹者",
        description: `长期统筹复杂案件侦查，面对“${shortSummary}”会先梳理时间线、行动链和证据缺口。`,
        stance: "强调证据链",
        method: "侦查统筹",
        temper: "冷静",
        color: "teal",
        systemPrompt: `你现在扮演一位刑侦负责人。面对“${shortSummary}”，优先梳理案发时间线、关键行动链、证据缺口和侦查优先级，不要凭印象下结论。`,
      }, 0, createdAt),
      makeInlineRecommendedRole({
        name: "法医",
        seat: "死因与损伤判断者",
        description: `长期处理非正常死亡个案，面对“${shortSummary}”会先看尸体状态、死亡时间、损伤模式和伪装可能。`,
        stance: "强调生理证据",
        method: "法医学判断",
        temper: "审慎",
        color: "rose",
        systemPrompt: `你现在扮演一位法医。面对“${shortSummary}”，优先判断死亡时间、损伤模式、尸体位置与死后移动可能，不要把推测说成已证实事实。`,
      }, 1, createdAt),
      makeInlineRecommendedRole({
        name: "现场勘验工程师",
        seat: "物证与现场条件校正者",
        description: `长期处理封闭空间、痕迹和现场重建，面对“${shortSummary}”会先看现场是否支持现有说法。`,
        stance: "强调现场一致性",
        method: "现场重建",
        temper: "稳健",
        color: "sky",
        systemPrompt: `你现在扮演一位现场勘验工程师。面对“${shortSummary}”，优先检验现场痕迹、进入路径、搬运难度与环境条件是否和现有说法一致。`,
      }, 2, createdAt),
      makeInlineRecommendedRole({
        name: "酒店与建筑动线顾问",
        seat: "空间路径分析者",
        description: `长期分析酒店、建筑和公共空间动线，面对“${shortSummary}”会先看人员移动和设施可达性。`,
        stance: "强调路径可行性",
        method: "空间动线推演",
        temper: "克制",
        color: "slate",
        systemPrompt: `你现在扮演一位酒店与建筑动线顾问。面对“${shortSummary}”，优先判断酒店结构、楼层动线、隐蔽搬运和异常行为路线是否现实可行。`,
      }, 3, createdAt),
      makeInlineRecommendedRole({
        name: "电梯与安防系统工程师",
        seat: "设备记录核验者",
        description: `长期处理电梯、监控、门禁与楼宇设备，面对“${shortSummary}”会先核对设备记录能否支撑案情。`,
        stance: "强调设备证据",
        method: "系统排查",
        temper: "严谨",
        color: "amber",
        systemPrompt: `你现在扮演一位电梯与安防系统工程师。面对“${shortSummary}”，优先检查电梯行为、监控盲区、门禁记录和设备异常，不要忽略技术系统留下的痕迹。`,
      }, 4, createdAt),
      makeInlineRecommendedRole({
        name: "法律顾问",
        seat: "证据可采与责任边界者",
        description: `长期处理刑事证据与程序问题，面对“${shortSummary}”会先看哪些说法能站进法律程序。`,
        stance: "强调程序边界",
        method: "证据审查",
        temper: "冷静",
        color: "violet",
        systemPrompt: `你现在扮演一位法律顾问。面对“${shortSummary}”，优先判断哪些说法只是舆论猜测，哪些证据在法律程序里真正站得住。`,
      }, 5, createdAt),
      makeInlineRecommendedRole({
        name: "心理画像分析师",
        seat: "行为异常解读者",
        description: `长期分析异常行为、伪装与高压情境反应，面对“${shortSummary}”会先区分行为异常与犯罪指向。`,
        stance: "强调行为解释边界",
        method: "画像分析",
        temper: "审慎",
        color: "coral",
        systemPrompt: `你现在扮演一位心理画像分析师。面对“${shortSummary}”，优先分析异常动作和言行模式，但不要把心理解释直接当成定案证据。`,
      }, 6, createdAt),
      makeInlineRecommendedRole({
        name: "媒体舆情观察者",
        seat: "叙事污染提醒者",
        description: `长期跟踪案件传播与舆论叙事，面对“${shortSummary}”会先拆出哪些说法是事实，哪些是二次加工。`,
        stance: "强调信息污染",
        method: "传播拆解",
        temper: "直接",
        color: "emerald",
        systemPrompt: `你现在扮演一位媒体舆情观察者。面对“${shortSummary}”，优先拆开警方说法、媒体二手转述和网友脑补，避免整桌被叙事污染带偏。`,
      }, 7, createdAt),
      makeInlineRecommendedRole({
        name: "跨国执法流程顾问",
        seat: "司法协作校正者",
        description: `长期处理跨国执法和司法协作，面对“${shortSummary}”会先看当地警方流程、取证边界和国际协作难点。`,
        stance: "强调制度差异",
        method: "流程核验",
        temper: "平衡",
        color: "gold",
        systemPrompt: `你现在扮演一位跨国执法流程顾问。面对“${shortSummary}”，优先判断当地警方流程、取证边界、跨国协作和信息披露限制，不要用单一国家经验硬套。`,
      }, 8, createdAt),
      makeInlineRecommendedRole({
        name: "关系网与行程分析员",
        seat: "接触链追踪者",
        description: `长期从联系人、行程和时空重叠里找线索，面对“${shortSummary}”会先看谁在什么时间真正接触过核心对象。`,
        stance: "强调接触链",
        method: "关系排查",
        temper: "耐心",
        color: "sky",
        systemPrompt: `你现在扮演一位关系网与行程分析员。面对“${shortSummary}”，优先梳理接触链、行程重叠和关键人物关系，不要忽略看似边缘但真实接近核心事件的人。`,
      }, 9, createdAt),
      makeInlineRecommendedRole({
        name: "反方质询者",
        seat: "结论压力测试者",
        description: `长期专门拆解流行结论，面对“${shortSummary}”会先质疑警方版本和民间阴谋论各自最薄弱的地方。`,
        stance: "强力质疑",
        method: "压力测试",
        temper: "尖锐",
        color: "rose",
        systemPrompt: `你现在扮演一位反方质询者。面对“${shortSummary}”，任务是同时拷问“自杀说”和“他杀说”各自最薄弱的地方，避免任何一边靠情绪取胜。`,
      }, 10, createdAt),
      makeInlineRecommendedRole({
        name: "综合裁判者",
        seat: "证据收束判断者",
        description: `长期把冲突信息收束成阶段性判断，面对“${shortSummary}”会先区分能确认、能怀疑和不能下结论的部分。`,
        stance: "中立收束",
        method: "证据归纳",
        temper: "克制",
        color: "slate",
        systemPrompt: `你现在扮演一位综合裁判者。面对“${shortSummary}”，优先把已确认事实、合理怀疑和仍无依据的部分分开，不要让整桌越谈越像推理小说。`,
      }, 11, createdAt),
    ].filter(Boolean);
  }

  if (summaryLooksShortVideoTask(summary)) {
    const isPublicInterest = /公益|公益性|公益项目|公益传播/.test(summary);
    return [
      makeInlineRecommendedRole({
        name: "短视频导演",
        seat: "内容结构负责人",
        description: `围绕“${shortSummary}”先判断视频主线、节奏、情绪曲线和信息组织方式，避免内容散掉。`,
        stance: "强调成片表达",
        method: "内容结构设计",
        temper: "直接",
        color: "teal",
        systemPrompt: `你现在扮演一位短视频导演。面对“${shortSummary}”，优先判断内容主线、镜头节奏、信息密度和情绪推进，避免把视频做成口号堆砌。`,
      }, 0, createdAt),
      makeInlineRecommendedRole({
        name: "抖音内容策划",
        seat: "选题与开头钩子负责人",
        description: `长期做抖音内容策划，面对“${shortSummary}”会先看选题角度、前三秒钩子和信息进入方式。`,
        stance: "强调停留与完播",
        method: "平台内容策划",
        temper: "敏捷",
        color: "coral",
        systemPrompt: `你现在扮演一位抖音内容策划。面对“${shortSummary}”，优先判断用户为什么会点开、前三秒怎么留人、标题封面和内容切口怎样更适配抖音。`,
      }, 1, createdAt),
      makeInlineRecommendedRole({
        name: isPublicInterest ? "公益项目负责人" : "一线业务负责人",
        seat: isPublicInterest ? "真实议题把关者" : "业务真实需求把关者",
        description: isPublicInterest
          ? `长期在公益一线推进项目，面对“${shortSummary}”会先校正议题是否真实、表达是否尊重对象、信息有没有跑偏。`
          : `长期在业务一线推进结果，面对“${shortSummary}”会先校正内容是否真的贴着现实需求。`,
        stance: "强调真实场景",
        method: "一线校正",
        temper: "务实",
        color: "emerald",
        systemPrompt: isPublicInterest
          ? `你现在扮演一位公益项目负责人。面对“${shortSummary}”，优先判断议题是否真实、表达是否尊重受助对象、内容有没有把公益变成自我感动。`
          : `你现在扮演一位一线业务负责人。面对“${shortSummary}”，优先判断内容是否真的贴着现实场景、真实用户和一线执行。`,
      }, 2, createdAt),
      makeInlineRecommendedRole({
        name: "短视频编剧",
        seat: "脚本与口播设计者",
        description: `长期把复杂信息改写成可拍、可讲、可转发的脚本，面对“${shortSummary}”会先拆脚本结构和台词密度。`,
        stance: "强调信息可讲",
        method: "脚本设计",
        temper: "细致",
        color: "violet",
        systemPrompt: `你现在扮演一位短视频编剧。面对“${shortSummary}”，优先把信息改写成可拍摄、可口播、可剪辑的脚本结构，而不是停留在抽象建议。`,
      }, 3, createdAt),
      makeInlineRecommendedRole({
        name: "摄影指导",
        seat: "拍摄落地设计者",
        description: `长期负责视频拍摄方案，面对“${shortSummary}”会先看景别、场景、设备和拍摄难度。`,
        stance: "强调可拍性",
        method: "镜头设计",
        temper: "冷静",
        color: "sky",
        systemPrompt: `你现在扮演一位摄影指导。面对“${shortSummary}”，优先判断镜头怎么拍、场景怎么选、设备需求高不高，以及哪些画面最能把信息拍清楚。`,
      }, 4, createdAt),
      makeInlineRecommendedRole({
        name: "剪辑师",
        seat: "节奏与完播优化者",
        description: `长期做短视频后期，面对“${shortSummary}”会先看节奏、信息密度、转场和完播体验。`,
        stance: "强调节奏",
        method: "剪辑优化",
        temper: "利落",
        color: "amber",
        systemPrompt: `你现在扮演一位剪辑师。面对“${shortSummary}”，优先判断怎样用节奏、删减和信息排序保住完播，而不是把所有信息都硬塞进去。`,
      }, 5, createdAt),
      makeInlineRecommendedRole({
        name: "抖音运营",
        seat: "发布与互动负责人",
        description: `长期负责抖音账号运营，面对“${shortSummary}”会先看发布时间、评论区互动、话题设置和账号节奏。`,
        stance: "强调平台分发",
        method: "账号运营",
        temper: "直接",
        color: "rose",
        systemPrompt: `你现在扮演一位抖音运营。面对“${shortSummary}”，优先判断发布节奏、互动动作、话题设置和账号运营细节，不要只讲拍完之后自然会火。`,
      }, 6, createdAt),
      makeInlineRecommendedRole({
        name: "平台机制研究员",
        seat: "流量分发校正者",
        description: `长期研究平台内容分发和账号表现，面对“${shortSummary}”会先看哪些动作会影响推荐、停留和转化。`,
        stance: "强调机制",
        method: "平台机制判断",
        temper: "审慎",
        color: "slate",
        systemPrompt: `你现在扮演一位平台机制研究员。面对“${shortSummary}”，优先判断哪些因素会影响推荐分发、停留、完播和互动，不要迷信单一爆款技巧。`,
      }, 7, createdAt),
      makeInlineRecommendedRole({
        name: "受众观察者",
        seat: "目标用户反应校正者",
        description: `长期观察短视频受众行为，面对“${shortSummary}”会先看目标观众会不会信、会不会停、会不会转发。`,
        stance: "强调受众真实反应",
        method: "行为观察",
        temper: "耐心",
        color: "sky",
        systemPrompt: `你现在扮演一位受众观察者。面对“${shortSummary}”，优先判断目标用户会怎么看、在哪一秒划走、什么表达会引发反感或误解。`,
      }, 8, createdAt),
      makeInlineRecommendedRole({
        name: isPublicInterest ? "公益传播顾问" : "传播文案策划",
        seat: isPublicInterest ? "公益表达校正者" : "传播话术设计者",
        description: isPublicInterest
          ? `长期处理公益传播表达，面对“${shortSummary}”会先看公益价值怎么表达才不廉价、不消费对象，还能让人愿意传播。`
          : `长期做传播话术与文案，面对“${shortSummary}”会先看怎样把信息说得更清楚、更愿意被转发。`,
        stance: "强调表达质量",
        method: "传播转译",
        temper: "克制",
        color: "violet",
        systemPrompt: isPublicInterest
          ? `你现在扮演一位公益传播顾问。面对“${shortSummary}”，优先判断怎样兼顾公益价值、传播效率和表达边界，避免廉价煽情与道德绑架。`
          : `你现在扮演一位传播文案策划。面对“${shortSummary}”，优先判断怎样把核心信息讲清、讲顺、讲得愿意被传播。`,
      }, 9, createdAt),
      makeInlineRecommendedRole({
        name: "资源合作负责人",
        seat: "出镜与协作整合者",
        description: `长期整合拍摄资源、场地、达人、合作方和执行排期，面对“${shortSummary}”会先看资源怎么拼起来。`,
        stance: "强调协同",
        method: "资源整合",
        temper: "稳健",
        color: "amber",
        systemPrompt: `你现在扮演一位资源合作负责人。面对“${shortSummary}”，优先判断场地、出镜、合作方、排期和协作资源怎么整起来，避免方案停在纸上。`,
      }, 10, createdAt),
      makeInlineRecommendedRole({
        name: "合规与风险顾问",
        seat: "表达边界与舆情预警者",
        description: `长期处理内容合规和舆情风险，面对“${shortSummary}”会先看表达边界、误导风险和舆论反噬点。`,
        stance: "强调边界",
        method: "风险校验",
        temper: "审慎",
        color: "rose",
        systemPrompt: `你现在扮演一位合规与风险顾问。面对“${shortSummary}”，优先判断内容表达边界、平台风险、误导点和可能引发的舆情问题。`,
      }, 11, createdAt),
    ].filter(Boolean);
  }

  return [
    makeInlineRecommendedRole({
      name: "一线实务负责人",
      seat: "现场判断者",
      description: `长期在一线推动实际结果，对“${shortSummary}”这类问题会先看真实执行障碍、关键动作和最容易卡住的环节。`,
      stance: "强调落地",
      method: "现场拆解",
      temper: "务实",
      color: "teal",
      systemPrompt: `你现在扮演一位一线实务负责人。面对“${shortSummary}”，优先判断事情在现实推进时最容易卡在哪里、谁会真的做、什么动作最关键，不要空谈。`,
    }, 0, createdAt),
    makeInlineRecommendedRole({
      name: "领域研究者",
      seat: "问题结构分析者",
      description: `长期把复杂议题拆成关键变量、核心矛盾和可验证问题，擅长先看“${shortSummary}”背后到底在解决什么。`,
      stance: "强调结构",
      method: "问题拆解",
      temper: "冷静",
      color: "slate",
      systemPrompt: `你现在扮演一位领域研究者。面对“${shortSummary}”，优先拆出真正的问题结构、关键变量和误判风险，不要被表面标签带跑。`,
    }, 1, createdAt),
    makeInlineRecommendedRole({
      name: "用户与对象观察者",
      seat: "真实需求校正者",
      description: `长期观察真实使用者、客户或对象的行为与反馈，擅长校正“${shortSummary}”里哪些需求是真的，哪些只是想当然。`,
      stance: "强调真实需求",
      method: "行为观察",
      temper: "耐心",
      color: "sky",
      systemPrompt: `你现在扮演一位用户与对象观察者。面对“${shortSummary}”，优先判断真实使用者或客户到底在乎什么、会怎么用、会为什么拒绝。`,
    }, 2, createdAt),
    makeInlineRecommendedRole({
      name: "成本与资源负责人",
      seat: "投入产出判断者",
      description: `长期核查预算、资源、投入产出与可持续性，习惯把“${shortSummary}”拉回现实账本。`,
      stance: "强调可持续",
      method: "投入产出评估",
      temper: "严谨",
      color: "amber",
      systemPrompt: `你现在扮演一位成本与资源负责人。面对“${shortSummary}”，优先看预算、资源占用、回报周期和可持续性，不要忽略账算不过来的问题。`,
    }, 3, createdAt),
    makeInlineRecommendedRole({
      name: "执行推进者",
      seat: "节奏与闭环负责人",
      description: `长期把方案拆成节奏、动作、分工和闭环，关注“${shortSummary}”怎么从想法变成连续动作。`,
      stance: "强调推进",
      method: "执行编排",
      temper: "直接",
      color: "emerald",
      systemPrompt: `你现在扮演一位执行推进者。面对“${shortSummary}”，优先判断怎样拆动作、排优先级、定责任和形成闭环，不要停在概念层。`,
    }, 4, createdAt),
    makeInlineRecommendedRole({
      name: "风险边界者",
      seat: "失败预警人",
      description: `长期识别方案里的主要风险、边界条件和最坏情况，擅长给“${shortSummary}”提前踩刹车。`,
      stance: "强调风险",
      method: "边界核验",
      temper: "审慎",
      color: "rose",
      systemPrompt: `你现在扮演一位风险边界者。面对“${shortSummary}”，优先指出哪些前提站不住、什么地方最容易翻车、最坏情况会是什么。`,
    }, 5, createdAt),
    makeInlineRecommendedRole({
      name: "反方质询者",
      seat: "强压力测试者",
      description: `长期负责把方案往最难处问，专门检验“${shortSummary}”是不是只在纸面上成立。`,
      stance: "强力质疑",
      method: "压力测试",
      temper: "尖锐",
      color: "coral",
      systemPrompt: `你现在扮演一位反方质询者。面对“${shortSummary}”，任务是提出最强质疑、最难反驳的现实问题，帮助整桌避免自我感动。`,
    }, 6, createdAt),
    makeInlineRecommendedRole({
      name: "协调决策者",
      seat: "多方取舍整合者",
      description: `长期在目标冲突、资源有限和多方意见不一致时做综合判断，擅长给“${shortSummary}”收束成可执行方案。`,
      stance: "强调取舍",
      method: "综合决策",
      temper: "平衡",
      color: "violet",
      systemPrompt: `你现在扮演一位协调决策者。面对“${shortSummary}”，优先整合不同立场，做出现实可执行的取舍，而不是把所有好处都要。`,
    }, 7, createdAt),
    makeInlineRecommendedRole({
      name: "资源配置者",
      seat: "投入顺序安排者",
      description: `长期决定资源先投在哪、后投在哪，擅长判断“${shortSummary}”到底先抓哪几个杠杆最有效。`,
      stance: "强调优先级",
      method: "资源排序",
      temper: "克制",
      color: "amber",
      systemPrompt: `你现在扮演一位资源配置者。面对“${shortSummary}”，优先判断资源该先投在哪几个杠杆最有效，避免面面俱到导致失焦。`,
    }, 8, createdAt),
    makeInlineRecommendedRole({
      name: "长期主义判断者",
      seat: "短中长期平衡者",
      description: `长期在短期结果和长期能力之间做权衡，擅长判断“${shortSummary}”哪些动作是救急，哪些动作是在搭底层能力。`,
      stance: "强调长期性",
      method: "阶段平衡",
      temper: "稳健",
      color: "slate",
      systemPrompt: `你现在扮演一位长期主义判断者。面对“${shortSummary}”，优先区分哪些动作是短期救火，哪些动作是在搭长期能力，不要只盯眼前数字。`,
    }, 9, createdAt),
    makeInlineRecommendedRole({
      name: "行业操盘手",
      seat: "同类案例对照者",
      description: `长期在相似行业里看过成功与失败案例，擅长拿“${shortSummary}”对照同类打法判断什么可借鉴、什么不能抄。`,
      stance: "强调对标",
      method: "案例对照",
      temper: "直接",
      color: "teal",
      systemPrompt: `你现在扮演一位行业操盘手。面对“${shortSummary}”，优先拿同类成功与失败案例做对照，判断哪些做法可借鉴、哪些只是表面像。`,
    }, 10, createdAt),
    makeInlineRecommendedRole({
      name: "公共沟通转译者",
      seat: "复杂方案说明者",
      description: `长期把复杂方案翻译成团队、客户或外部合作方能听懂并愿意配合的表达，擅长给“${shortSummary}”补足沟通落地。`,
      stance: "强调共识",
      method: "公共转译",
      temper: "耐心",
      color: "sky",
      systemPrompt: `你现在扮演一位公共沟通转译者。面对“${shortSummary}”，优先把复杂方案翻译成团队、客户或合作方能听懂并愿意配合的表达。`,
    }, 11, createdAt),
  ].filter(Boolean);
}

async function seedDatabase() {
  const currentRoles = await dbGetAll(ROLE_STORE);
  const baseRoleIds = new Set(baseRoles.map((role) => role.id));
  const deletedBaseRoleIds = new Set(await loadDeletedBaseRoleIds());
  const staleBaseRoles = currentRoles.filter((role) => role.source === "base" && !baseRoleIds.has(role.id));
  if (staleBaseRoles.length) {
    await Promise.all(staleBaseRoles.map((role) => dbDelete(ROLE_STORE, role.id)));
  }
  const existingBaseRolesToRefresh = currentRoles.filter((role) => role.source === "base" && baseRoleIds.has(role.id) && !deletedBaseRoleIds.has(role.id));
  if (existingBaseRolesToRefresh.length) {
    const refreshedBaseRoles = existingBaseRolesToRefresh
      .map((storedRole) => baseRoles.find((role) => role.id === storedRole.id))
      .filter(Boolean);
    await Promise.all(refreshedBaseRoles.map((role) => dbPut(ROLE_STORE, role)));
  }
  const existingRoleIds = new Set(currentRoles.map((role) => role.id));
  const missingBaseRoles = baseRoles.filter((role) => !existingRoleIds.has(role.id) && !deletedBaseRoleIds.has(role.id));
  if (missingBaseRoles.length) {
    await Promise.all(missingBaseRoles.map((role) => dbPut(ROLE_STORE, role)));
  }

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
  state.appLanguage = await loadAppState("appLanguage", "zh");
  state.voiceReadEnabled = await loadAppState("voiceReadEnabled", false);
  state.mappings = await loadAppState("modelMappings", {
    main: defaultProfiles[0].id,
    challenger: defaultProfiles[1].id,
    judge: defaultProfiles[0].id,
  });
  state.topics = await loadAppState("topicSessions", []);
  state.activeTopicId = await loadAppState("activeTopicId", "");
  if (!state.topics.length) {
    state.topics = [];
    state.activeTopicId = "";
  }
}

async function saveRole(role) {
  if (role.source === "base") {
    await clearDeletedBaseRole(role.id);
  }
  await dbPut(ROLE_STORE, role);
  await hydrateState();
  renderPeopleSummary();
  renderPeopleLibrary();
  renderSeatPicker();
  renderSeatStack();
}

async function deleteRole(roleId) {
  const role = getPeopleRoleById(roleId);
  if (role?.source === "base") {
    await rememberDeletedBaseRole(roleId);
  }
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
    updateSeatFeedback(langText("请先确认任务，等待系统生成人物后再配置席位", "Confirm the task first and wait for the system to generate personas before configuring seats."), "pending");
    return;
  }

  if (state.selectedIds.size >= state.discussionSize) {
    updateSeatFeedback(`当前讨论规模是 ${state.discussionSize} 人，请先删掉一个再加。`, "pending");
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
  const description = roleEditorDescription.value.trim();
  const existing = roleEditorId.value ? getPeopleRoleById(roleEditorId.value) : null;
  const recommendedSource = roleEditorContext?.sourceCollection === "recommended"
    ? getRecommendedRoleById(roleEditorContext.roleId)
    : null;
  const savedFavorite = recommendedSource
    ? state.peopleRoles.find((item) => item.recommendedFrom === recommendedSource.id && isFavoriteRole(item))
    : null;
  const seat = roleEditorSeat.value.trim() || existing?.seat || savedFavorite?.seat || recommendedSource?.seat || "讨论参与者";
  if (!name || !description) {
    updateSeatFeedback(langText("人物名称和人物说明都要填。", "Persona name and background are required."), "pending");
    return;
  }
  const baseRole = existing || savedFavorite || recommendedSource;

  const role = {
    ...(existing || savedFavorite || {}),
    id: existing?.id || savedFavorite?.id || `${recommendedSource ? "favorite" : "custom"}-${Date.now()}`,
    name,
    seat,
    description,
    systemPrompt: roleEditorPrompt.value.trim() || buildFallbackGeneratedRoleSystemPrompt({
      name,
      seat,
      description,
      stance: roleEditorStance.value || "自定义",
      method: baseRole?.traits?.method || "综合求证",
      temper: roleEditorTemper.value || "自定义",
    }),
    traits: {
      ...(baseRole?.traits || {}),
      stance: roleEditorStance.value || "自定义",
      method: baseRole?.traits?.method || "综合求证",
      temper: roleEditorTemper.value || "自定义",
    },
    color: roleEditorColor.value,
    source: existing?.source || savedFavorite?.source || (recommendedSource ? "favorite" : "custom"),
    sourceLabel: roleEditorSourceLabel.value.trim() || baseRole?.sourceLabel || (recommendedSource ? "收藏人物" : "自定义"),
    originalSource: existing?.originalSource || savedFavorite?.originalSource || (recommendedSource ? "recommended" : ""),
    originalSourceLabel: existing?.originalSourceLabel || savedFavorite?.originalSourceLabel || recommendedSource?.sourceLabel || "",
    recommendedFrom: existing?.recommendedFrom || savedFavorite?.recommendedFrom || recommendedSource?.id || "",
  };

  await saveRole(role);
  if (roleEditorContext?.replaceSelectedId) {
    replaceSelectedRole(roleEditorContext.replaceSelectedId, role.id);
    renderSeatPicker();
    renderSeatStack();
  }
  updateSeatFeedback(`已保存并关闭：${role.name}`, "success");
  void syncCurrentTopicSnapshot();
  closeRoleEditorWithReturn();
}

function applyAiDraftToRoleEditor(draft) {
  const preparedRole = normalizeGeneratedRole({
    ...draft,
    roleType: draft?.roleType || "expert",
    sourceLabel: draft?.sourceLabel || langText("AI 草稿", "AI Draft"),
  }, 0, Date.now());

  roleEditorId.value = "";
  roleEditorName.value = preparedRole.name;
  roleEditorSeat.value = preparedRole.seat || "讨论参与者";
  roleEditorDescription.value = preparedRole.description;
  roleEditorPrompt.value = preparedRole.systemPrompt || "";
  ensureSelectValue(roleEditorStance, preparedRole.traits?.stance || "自定义");
  ensureSelectValue(roleEditorTemper, preparedRole.traits?.temper || "自定义");
  roleEditorStance.value = preparedRole.traits?.stance || "自定义";
  roleEditorTemper.value = preparedRole.traits?.temper || "自定义";
  roleEditorColor.value = roleColor(preparedRole);
  syncRoleColorPicker(roleColor(preparedRole));
  roleEditorSourceLabel.value = draft?.sourceLabel || langText("AI 草稿", "AI Draft");
}

async function requestAiRoleEditorDraft(requirements) {
  const profile = getPrimarySummaryProfile();
  if (!profile) {
    throw new Error(langText("还没有可用模型，无法用 AI 生成人物草稿。", "No available model is configured for AI persona drafting."));
  }

  const prompt = [
    "你现在在帮助用户为人物库生成一个人物草稿。",
    "用户给你的可能只是一个职业、一个能力要求、一个人物倾向，或者几句简短描述。",
    "你的任务是把它扩成一个适合圆桌讨论的人物，但不要写成抽象黑话。",
    "如果用户只给了职业，比如护士、警察、地理学家、野外求生者，你就按这个身份在现实里会如何看问题来生成人物。",
    "如果用户给的是要求，比如擅长地理判断、懂欧美审美、会开模具、懂解剖，你就把这个要求落成一个真实可辨的人物身份。",
    "输出必须是 JSON 对象，不要解释，不要 Markdown。",
    "字段必须包含：name, seat, description, stance, method, temper, systemPrompt, sourceLabel。可选字段：color。这里的 seat 表示人物长期观察重心，不是外部的本轮扮演角色。",
    "规则：",
    "1. name 和 seat 都必须人话化；seat 只写人物长期观察重心，不要写主讲、旁证、裁判这类外部扮演角色。",
    "2. description 要写身份背景、长期经验和典型关注点。",
    "3. systemPrompt 第一段先交代身份，再写这个人物最先看什么、最不同意什么、会提醒别人忽略什么。",
    "4. 默认具备现代知识，不要写成古早背景设定。",
    getPeoplePoolRoleNamesText() ? `当前人物池已有这些名字，尽量不要重复同名：${getPeoplePoolRoleNamesText()}` : "",
    `用户要求：${requirements}`,
  ].filter(Boolean).join("\n\n");

  const raw = await requestModelText(profile, prompt, 1200);
  const jsonText = extractJsonObject(raw);
  if (!jsonText) {
    throw new Error(langText("AI 没有返回可解析的人物草稿。", "AI did not return a parseable persona draft."));
  }
  const payload = JSON.parse(jsonText);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(langText("AI 返回的人物草稿格式不正确。", "AI returned an invalid persona draft format."));
  }
  return payload;
}

async function handleGenerateRoleDraftWithAi() {
  const requirements = roleEditorAiRequirements?.value.trim() || "";
  if (!requirements) {
    if (roleEditorAiFeedback) {
      roleEditorAiFeedback.textContent = langText("先输入一个职业、能力或人物要求，再让 AI 生成。", "Enter a profession, capability, or persona requirement first.");
      roleEditorAiFeedback.className = "drawer-feedback compact-feedback pending";
    }
    return;
  }

  if (generateRoleWithAiButton) {
    generateRoleWithAiButton.disabled = true;
  }
  if (roleEditorAiFeedback) {
    roleEditorAiFeedback.textContent = langText("AI 正在生成人物草稿，请稍等。", "AI is drafting the persona now. Please wait.");
    roleEditorAiFeedback.className = "drawer-feedback compact-feedback pending";
  }

  try {
    const draft = await requestAiRoleEditorDraft(requirements);
    applyAiDraftToRoleEditor(draft);
    if (roleEditorAiFeedback) {
      roleEditorAiFeedback.textContent = langText("AI 已生成一版人物草稿，你可以继续手动修改后再保存。", "AI generated a persona draft. You can refine it manually before saving.");
      roleEditorAiFeedback.className = "drawer-feedback compact-feedback success";
    }
  } catch (error) {
    if (roleEditorAiFeedback) {
      roleEditorAiFeedback.textContent = error instanceof Error ? error.message : String(error);
      roleEditorAiFeedback.className = "drawer-feedback compact-feedback pending";
    }
  } finally {
    if (generateRoleWithAiButton) {
      generateRoleWithAiButton.disabled = false;
    }
  }
}

async function handleModelProfileSave(event) {
  event.preventDefault();
  const existingProfile = modelProfileEditMode && profileId.value ? state.modelProfiles.find((item) => item.id === profileId.value) : null;
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
    id: existingProfile?.id || `profile-${Date.now()}`,
    displayName,
    providerName,
    compatibility: profileCompatibility.value === "anthropic" ? "anthropic" : "openai",
    baseUrl,
    endpointPath,
    modelId: modelIdValue,
    apiKey,
    locked: existingProfile?.locked || false,
    configured: true,
    lastTestStatus: existingProfile?.lastTestStatus || "",
  };

  await saveModelProfile(profile);
  if (existingProfile) {
    fillModelProfileForm(profile);
  } else {
    profileId.value = profile.id;
    modelProfileEditMode = false;
    deleteModelProfileButton.disabled = true;
  }
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
    setProfileTestStatus(error?.name === "AbortError" ? "测试超时，模型接通了但长时间没有返回" : "测试失败，可能被 CORS 或网络拦截", "error");
  }
}

async function testStoredProfileConnectivity(profileIdValue) {
  const existing = state.modelProfiles.find((item) => item.id === profileIdValue);
  if (!existing) {
    return;
  }

  const profile = {
    ...existing,
    endpointPath: existing.endpointPath?.trim() || "/chat/completions",
  };

  updateSeatFeedback(`正在测试模型：${profile.displayName}`, "pending");
  try {
    let response;
    const requestControl = createRequestSignal(null, MODEL_TEST_TIMEOUT_MS);
    if (profile.compatibility === "anthropic") {
      response = await fetch(joinUrl(profile.baseUrl, profile.endpointPath || "/messages"), {
        method: "POST",
        signal: requestControl.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": profile.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: profile.modelId,
          max_tokens: 16,
          messages: [{ role: "user", content: "请只回复：通了" }],
        }),
      });
    } else {
      response = await fetch(joinUrl(profile.baseUrl, profile.endpointPath), {
        method: "POST",
        signal: requestControl.signal,
        headers: {
          "content-type": "application/json",
          ...(profile.apiKey ? { authorization: `Bearer ${profile.apiKey}` } : {}),
        },
        body: JSON.stringify(buildOpenAiCompatibleRequestBody(profile, "请只回复：通了", 16)),
      });
    }
    requestControl.cleanup();

    const nextStatus = response.ok ? "success" : "error";
    await saveModelProfile({ ...existing, lastTestStatus: nextStatus });
    updateSeatFeedback(response.ok ? `测试通过：${profile.displayName}` : formatHttpFailureMessage(profile, response, "测试失败"), response.ok ? "success" : "pending");
    if (profileId.value === profile.id) {
      setProfileTestStatus(response.ok ? "测试通过" : formatHttpFailureMessage(profile, response, "测试失败"), response.ok ? "success" : "error");
    }
  } catch (error) {
    await saveModelProfile({ ...existing, lastTestStatus: "error" });
    const timeoutMessage = error?.name === "AbortError" ? `测试超时：${profile.displayName}` : `测试失败：${profile.displayName}`;
    updateSeatFeedback(timeoutMessage, "pending");
    if (profileId.value === profile.id) {
      setProfileTestStatus(error?.name === "AbortError" ? "测试超时，模型接通了但长时间没有返回" : "测试失败，可能被 CORS 或网络拦截", "error");
    }
  }
}

function appendUserMessage(content, attachments = []) {
  ensureActiveTopicSession();
  const activeTopic = getActiveTopic();
  if (activeTopic?.status === "completed") {
    activeTopic.status = "active";
    if (!canResumeCompletedDiscussion()) {
      state.latestReportText = "";
      state.latestReportFileName = "";
      state.discussionRoundNotes = [];
    }
  }
  appendMarkup(
    createMessageMarkup({
      speakerId: "user",
      label: "我",
      sublabel: langText("刚发送", "Just Sent"),
      body: content,
      avatarLabel: "我",
      avatarClass: "avatar-user",
      tone: "user",
      attachments,
    })
  );
  setSpeakerCard(langText("补充需求中", "Updating Request"), langText("已收到新输入", "New input received"), langText("主 AI 正在重新整理任务定义。", "The primary AI is reorganizing the task definition."), "我");
  void syncCurrentTopicSnapshot();
}

function appendAiSummary(content) {
  ensureActiveTopicSession();
  const summary = content.trim();
  const displaySummary = formatTaskSummaryForDisplay(summary);
  state.lastSummary = summary;
  state.sharedResearchBrief = "";
  state.rolePlanningBrief = "";
  state.pendingRoleClarification = [];
  state.taskSupplementMode = false;
  updateCurrentTopicTitle(deriveTopicTitle());
  appendMarkup(
    createMessageMarkup({
      speakerId: "system",
      label: "系",
      sublabel: langText("整理后的任务定义", "Refined Task Definition"),
      body: `${t("summaryPromptTitle")} ${displaySummary}`,
      avatarLabel: "系",
      avatarClass: "avatar-system",
      tone: "system",
      actions: `
        <div class="message-actions">
          <button class="ghost-link js-confirm-topic" type="button">${escapeHtml(t("confirm"))}</button>
          <button class="ghost-link js-supplement-topic" type="button">${escapeHtml(t("supplement"))}</button>
        </div>
      `,
    })
  );
  setSpeakerCard(
    langText("任务整理中", "Task Intake"),
    langText("等待用户确认", "Waiting for confirmation"),
    state.aiAutoRecommendEnabled
      ? langText("确认后自动开始生成人物。", "Participant generation will start automatically after confirmation.")
      : langText("确认后不自动生成人物，直接进入人物库配席位。", "After confirmation, no personas will be auto-generated and you can assign seats from the library directly."),
    "系"
  );
  void syncCurrentTopicSnapshot();
}

function appendSupplementPrompt() {
  state.taskSupplementMode = true;
  appendMarkup(
    createMessageMarkup({
      speakerId: "system",
      label: "系",
      sublabel: langText("继续补充", "Add More Details"),
      body: langText("继续直接说即可。你可以补充更看重什么、是否允许强反方、希望加入哪些人物，以及明确说更偏企业家/一线操盘手/现实专家，还是不要历史人物、不要空泛学者。", "Continue by saying it directly. You can add what matters most, whether strong opposition is allowed, which personas you want included, and whether you prefer operators or practical experts over abstract historical figures."),
      avatarLabel: "系",
      avatarClass: "avatar-system",
      tone: "system",
    })
  );
  setSpeakerCard(langText("继续补充中", "Adding Details"), langText("等待更多条件", "Waiting for more details"), langText("可继续说明人物倾向、语气和目标。", "You can continue to specify persona leanings, tone, and goals."), "系");
  userInput.focus();
  void syncCurrentTopicSnapshot();
}

function renderSeedConversation() {
  discussionStream.innerHTML = createMessageMarkup({
    speakerId: "system",
    label: "系",
    sublabel: t("seedSubtitle"),
    body: t("seedBody"),
    avatarLabel: "系",
    avatarClass: "avatar-system",
    tone: "system",
  });
}

async function finishSeatGeneration(options = {}) {
  const { forceGeneration = false } = options;
  const currentSummary = state.lastSummary || "当前话题";
  const hostProfile = getPrimarySummaryProfile();
  const roleIntake = await requestRoleGenerationIntake(currentSummary);
  state.rolePlanningBrief = roleIntake.planningBrief || buildFallbackRolePlanningBrief(currentSummary);
  state.recommendedRoleGenerationMeta = null;

  if (!forceGeneration && roleIntake.status === "clarify" && roleIntake.questions.length) {
    const clarifyDescription = langText("这些补充会直接影响系统该邀请谁上桌。", "These clarifications will directly affect which personas the system should invite to the table.");
    state.generatingSeats = false;
    state.seatsReady = false;
    state.pendingRoleClarification = roleIntake.questions;
    setStatusLoadingState(false);
    renderSeatPicker();
    renderSeatStack();
    appendRoleClarificationPrompt(roleIntake.questions);
    setSpeakerCard(langText("等待补充关键信息", "Waiting for Clarification"), langText("先补几个关键条件", "A few key details are needed first"), clarifyDescription, "系");
    updateLiveStatus(clarifyDescription, "pending");
    updateSeatFeedback(langText("系统先追问了几个关键点，补充后会更容易配准人选。", "The system asked a few key questions first so it can match personas more accurately."), "pending");
    void syncCurrentTopicSnapshot();
    return;
  }

  state.pendingRoleClarification = [];
  state.taskSupplementMode = false;
  const generatingDescription = langText(`第 1 步：正在计算必要人物位。当前调用模型：${getPrimarySummaryProfileName()}。`, `Step 1: calculating the required persona slots with ${getPrimarySummaryProfileName()}.`);
  setStatusLoadingState(true);
  setSpeakerCard(langText("生成人物中", "Generating Personas"), "", generatingDescription, "系");
  updateLiveStatus(generatingDescription, "pending");
  updateSeatFeedback(generatingDescription, "pending");
  if (roleIntake.planningFallback) {
    appendMarkup(
      createMessageMarkup({
        speakerId: "system-role-planning-fallback",
        label: "系",
        sublabel: langText("人物规划已降级", "Persona Planning Fallback"),
        body: langText(`主持模型 ${roleIntake.modelName || getPrimarySummaryProfileName()} 在人物规划阶段没有及时返回可用结果，系统已跳过这一步并继续尝试生成人物。${roleIntake.fallbackReason ? `失败原因：${roleIntake.fallbackReason}` : ""}`, `The host model ${roleIntake.modelName || getPrimarySummaryProfileName()} did not return a usable result in time during persona planning, so the app skipped that step and continued trying to generate personas. ${roleIntake.fallbackReason ? `Reason: ${roleIntake.fallbackReason}` : ""}`),
        avatarLabel: "系",
        avatarClass: "avatar-system",
        tone: "system",
      })
    );
  }
  try {
    state.recommendedRoles = [];
    renderSeatPicker();
    renderSeatStack();
    const generationResult = await requestGeneratedRecommendedRolesSequential(currentSummary, state.rolePlanningBrief, {
      onStage: (stage, payload) => {
        if (stage === "identity-start") {
          const message = langText(`第 2 步：准备逐个生成人物身份，共 ${payload.targetCount} 个。`, `Step 2: preparing to generate ${payload.targetCount} persona identities one by one.`);
          setSpeakerCard(langText("生成人物中", "Generating Personas"), "", message, "系");
          updateLiveStatus(message, "pending");
          updateSeatFeedback(message, "pending");
          return;
        }
        if (stage === "identity-progress") {
          const message = buildSingleRoleGenerationProgress(payload.slotIndex, payload.targetCount, payload.generatedCount);
          setSpeakerCard(langText("生成人物中", "Generating Personas"), "", message, "系");
          updateLiveStatus(message, "pending");
          updateSeatFeedback(message, "pending");
        }
      },
      onRoleGenerated: (roles, payload) => {
        state.recommendedRoles = roles;
        renderSeatPicker();
        renderSeatStack();
        const message = langText(`第 2 步：已生成第 ${payload.slotIndex + 1} 个，当前共 ${roles.length}/${payload.targetCount} 个。`, `Step 2: generated persona ${payload.slotIndex + 1}, ${roles.length}/${payload.targetCount} ready.`);
        setSpeakerCard(langText("生成人物中", "Generating Personas"), "", message, "系");
        updateLiveStatus(message, "pending");
        updateSeatFeedback(message, "pending");
      },
      onRoleFailed: (error, payload) => {
        const message = langText(`第 2 步：第 ${payload.slotIndex + 1} 个生成失败，系统会继续补后面的位。当前已生成 ${payload.generatedCount} 个。`, `Step 2: persona ${payload.slotIndex + 1} failed, continuing with the remaining slots. ${payload.generatedCount} ready so far.`);
        setSpeakerCard(langText("生成人物中", "Generating Personas"), "", message, "系");
        updateLiveStatus(message, "pending");
        updateSeatFeedback(error.message, "pending");
      },
    });

    state.recommendedRoles = generationResult.roles;
    if (!state.recommendedRoles.length) {
      throw new Error(generationResult.failures.map((item) => `第 ${item.slotIndex + 1} 个失败：${item.error}`).join("；") || "没有拿到任何可用人物结果。");
    }
    const generatedCountDetail = generationResult.roles.length === generationResult.targetCount
      ? langText(`本轮共生成 ${generationResult.roles.length} 个针对性人物。`, `${generationResult.roles.length} targeted personas were generated.`)
      : langText(`本轮先生成了 ${generationResult.roles.length}/${generationResult.targetCount} 个人物，其余位稍后可重试或从人物库补齐。`, `${generationResult.roles.length}/${generationResult.targetCount} personas were generated. The remaining slots can be retried later or filled from the library.`);
    state.recommendedRoleGenerationMeta = createRoleGenerationMeta("ai", hostProfile, generatedCountDetail, roleIntake.planningFallback);
    updateSeatFeedback(generatedCountDetail, generationResult.roles.length === generationResult.targetCount ? "success" : "pending");
  } catch (error) {
    console.error(error);
    state.recommendedRoles = [];
    state.recommendedRoleGenerationMeta = null;
    state.selectedIds.clear();
    state.seatAssignments = {};
    state.discussionOrder = {};
    state.seatModelAssignments = {};
    state.generatingSeats = false;
    state.seatsReady = false;
    setStatusLoadingState(false);
    renderSeatPicker();
    renderSeatStack();
    appendMarkup(
      createMessageMarkup({
        speakerId: "system-role-generation-failed",
        label: "系",
        sublabel: langText("人物生成失败", "Persona Generation Failed"),
        body: langText(`主持模型 ${getPrimarySummaryProfileName()} 在逐个生成人物阶段没有及时返回可用结果。你可以直接重试，或调整模型配置后再生成。失败原因：${error instanceof Error ? error.message : String(error)}`, `The host model ${getPrimarySummaryProfileName()} did not return usable persona results in time during step-by-step persona generation. You can retry directly or adjust the model configuration and generate again. Reason: ${error instanceof Error ? error.message : String(error)}`),
        avatarLabel: "系",
        avatarClass: "avatar-system",
        tone: "system",
      })
    );
    setSpeakerCard(langText("人物生成失败", "Persona Generation Failed"), "", langText("这次没有拿到可用的 AI 人物结果。你可以直接重试，或先检查当前模型的响应稳定性。", "No usable AI persona roster was returned this time. You can retry directly or first check the current model's response stability."), "系");
    updateLiveStatus(langText("本次没有拿到可用的 AI 人物结果，请重试或调整模型。", "No usable AI persona roster was returned. Retry or adjust the model configuration."), "pending");
    updateSeatFeedback(langText("AI 人物生成失败，本次不再自动切本地兜底。请直接重试，或更换更稳定的模型。", "AI persona generation failed. The app will not auto-switch to a local fallback roster. Retry directly or switch to a more stable model."), "pending");
    void syncCurrentTopicSnapshot();
    return;
  }
  state.selectedIds.clear();
  state.seatAssignments = {};
  state.discussionOrder = {};
  state.seatModelAssignments = {};
  const defaultRecommended = [
    ...state.recommendedRoles.slice(0, Math.min(state.discussionSize, state.recommendedRoles.length)).map((role) => role.id),
  ].filter(Boolean);
  [...new Set(defaultRecommended)].slice(0, state.discussionSize).forEach((roleId) => state.selectedIds.add(roleId));
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
  setStatusLoadingState(false);
  renderSeatPicker();
  renderSeatStack();
  appendMarkup(
    createMessageMarkup({
      speakerId: "system",
      label: "系",
      sublabel: langText("人物生成完成", "Persona Generation Complete"),
      body: langText(`本次临时人物已经按“先人物身份、后提示词补强”的顺序生成，并已先按当前讨论规模自动选入 ${state.selectedIds.size} 个席位。你现在可以直接开始讨论，也可以去选角器里从临时生成和人物库里继续替换、增删和微调。`, `The generated personas were created in the order of identity first, prompt enrichment later, and ${state.selectedIds.size} seats have already been auto-filled for this round. You can start the discussion now, or keep swapping, removing, and tuning personas in the picker.`),
      avatarLabel: "系",
      avatarClass: "avatar-system",
      tone: "system",
    })
  );
  setSpeakerCard(langText("人物已生成", "Personas Ready"), langText("可开始配置席位", "Ready to configure seats"), langText("临时生成的人物和人物库现在都可以混合使用。", "Generated personas and library personas can now be mixed together."), "系");
  updateLiveStatus(langText(`第 3 步：人物身份已生成，正在后台补全提示词。当前已就绪 ${state.recommendedRoles.length} 个角色。`, `Step 3: persona identities are ready and prompts are being enriched in the background. ${state.recommendedRoles.length} roles are ready.`), "success");
  if (!seatFeedback.textContent.includes("临时生成失败")) {
    updateSeatFeedback(getRoleGenerationResultText() || langText("人物已生成，可从临时生成和人物库里混合选席位", "Personas are ready. You can mix generated personas and library personas when assigning seats."), state.recommendedRoleGenerationMeta?.source === "local-fallback" ? "pending" : "success");
  }
  void refreshRecommendedRolePrompts(currentSummary, {
    includeAllRecommended: true,
    onStart: () => {
      const message = langText(`第 3 步：正在后台补全人物提示词，当前已生成 ${state.recommendedRoles.length} 个身份。`, `Step 3: enriching persona prompts in the background for ${state.recommendedRoles.length} generated identities.`);
      updateLiveStatus(message, "pending");
      updateSeatFeedback(message, "pending");
    },
    onFinish: (success, count) => {
      if (success) {
        updateLiveStatus(langText(`人物生成完成：${state.recommendedRoles.length} 个身份已生成，${count} 个提示词已补强。`, `Persona generation complete: ${state.recommendedRoles.length} identities ready and ${count} prompts enriched.`), "success");
        updateSeatFeedback(langText(`已补全 ${count} 个人物的提示词，你现在可以直接开始讨论。`, `${count} persona prompts were enriched. You can start the discussion now.`), "success");
      } else {
        updateLiveStatus(langText(`人物身份已生成，但提示词补强失败。当前可先用基础提示词继续。`, `Persona identities are ready, but prompt enrichment failed. The roster can still continue with the base prompts.`), "pending");
        updateSeatFeedback(langText(`提示词补强失败，当前会先使用基础提示词。你也可以直接开始讨论。`, `Prompt enrichment failed, so the roster will use the base prompts for now. You can still start the discussion.`), "pending");
      }
    },
  });
  void syncCurrentTopicSnapshot();
}

function startSeatGeneration(options = {}) {
  const { forceGeneration = false } = options;
  if (state.generatingSeats) {
    return;
  }

  if (!state.aiAutoRecommendEnabled && !forceGeneration) {
    state.topicConfirmed = true;
    state.generatingSeats = false;
    state.seatsReady = true;
    state.rolePlanningBrief = "";
    state.pendingRoleClarification = [];
    state.taskSupplementMode = false;
    state.discussionRoundNotes = [];
    state.recommendedRoleGenerationMeta = null;
    state.recommendedRoles = [];
    state.selectedIds.clear();
    state.seatAssignments = {};
    state.discussionOrder = {};
    state.seatModelAssignments = {};
    state.seatSource = "library";
    setStatusLoadingState(false);
    renderSeatPicker();
    renderSeatStack();
    appendMarkup(
      createMessageMarkup({
        speakerId: "system-ai-role-recommendation-disabled",
        label: "系",
        sublabel: langText("已关闭 AI 自动推荐人物", "AI Persona Recommendation Disabled"),
        body: langText("本次不会自动生成人物，系统已直接切到人物库配席位。你可以从现有人物里挑选、替换和补位。", "No personas will be auto-generated for this topic. The system switched directly to library-based seat assignment so you can pick, swap, and add personas from your roster."),
        avatarLabel: "系",
        avatarClass: "avatar-system",
        tone: "system",
      })
    );
    updateLiveStatus(langText("已关闭 AI 自动推荐人物，请直接从人物库配席位。", "AI persona recommendation is off. Assign seats from the library directly."), "pending");
    updateSeatFeedback(langText("AI 自动推荐人物已关闭，当前直接使用人物库配席位。", "AI persona recommendation is off. Use the library directly for seat assignment."), "pending");
    setSpeakerCard(langText("人物库配席位", "Library Seat Assignment"), langText("未自动生成人物", "Auto-generation disabled"), langText("你现在可以直接从人物库里挑人，不会再等待 AI 生成人物。", "You can pick personas directly from the library without waiting for AI generation."), "系");
    void syncCurrentTopicSnapshot();
    return;
  }

  state.topicConfirmed = true;
  state.generatingSeats = true;
  state.seatsReady = false;
  state.rolePlanningBrief = forceGeneration ? state.rolePlanningBrief : "";
  if (forceGeneration) {
    state.pendingRoleClarification = [];
  }
  state.taskSupplementMode = false;
  state.discussionRoundNotes = [];
  state.recommendedRoleGenerationMeta = null;
  state.selectedIds.clear();
  state.seatAssignments = {};
  state.discussionOrder = {};
  state.seatModelAssignments = {};
  setStatusLoadingState(true);
  renderSeatStack();
  const generatingDescription = langText(`将按当前任务直接规划并生成人物。当前调用模型：${getPrimarySummaryProfileName()}。若主链路超时，系统会自动切到更快的降级方案。`, `The system is planning and generating personas directly from the current task with ${getPrimarySummaryProfileName()}. If the main path times out, it will automatically switch to a faster fallback.`);
  updateSeatFeedback(langText("正在生成人物，请稍候", "Generating personas, please wait."), "pending");
  updateLiveStatus(generatingDescription, "pending");
  setSpeakerCard(langText("生成人物中", "Generating Personas"), "", generatingDescription, "系");
  appendMarkup(
    createMessageMarkup({
      speakerId: "system",
      label: "系",
      sublabel: langText("已确认任务定义", "Task Definition Confirmed"),
      body: forceGeneration
        ? langText("已确认。系统将按当前理解直接生成人物，不再等待补充问题。", "Confirmed. The system will generate personas based on the current understanding without waiting for more clarification.")
        : langText("已确认。系统会直接按当前任务理解推荐一组更贴题的人物。", "Confirmed. The system will directly recommend a more task-fit persona roster."),
      avatarLabel: "系",
      avatarClass: "avatar-system",
      tone: "system",
    })
  );
  clearTimeout(state.generatingTimer);
  state.generatingTimer = setTimeout(() => {
    void finishSeatGeneration({ forceGeneration });
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
  state.sharedResearchBrief = "";
  state.rolePlanningBrief = "";
  state.pendingRoleClarification = [];
  state.taskSupplementMode = false;
  state.latestReportText = "";
  state.latestReportFileName = "";
  state.recommendedRoles = [];
  state.seatModelAssignments = {};
  state.seatAssignments = {};
  state.pendingAttachments = [];
  setStatusLoadingState(false);
  renderAiRoleRecommendationToggle();
  renderSeedConversation();
  setSpeakerCard(langText("任务整理中", "Task Intake"), langText("等待用户输入", "Waiting for user input"), langText("先整理，再确认，再生成人物。", "First organize, then confirm, then generate participants."), "系");
  updateLiveStatus(langText("目前无任务", "No task yet"), "");
  updateSeatFeedback(langText("无任务", "No task"), "");
  renderSeatStack();
  renderSeatPicker();
  renderAttachmentStrip();
  userInput.value = "";
  updateCurrentTopicTitle(t("currentTaskEmpty"));
  autoResizeTextarea();
  scrollToLatest();
  void syncCurrentTopicSnapshot();
}

function removePendingAttachment(index) {
  state.pendingAttachments.splice(index, 1);
  renderAttachmentStrip();
}

function applyDiscussionSize(nextSize) {
  state.discussionSize = Math.min(8, Math.max(4, Number(nextSize || 6)));

  if (state.selectedIds.size > state.discussionSize) {
    const overflowRoleIds = getOrderedSelectedRoleIds().slice(state.discussionSize);
    overflowRoleIds.forEach((roleId) => {
      state.selectedIds.delete(roleId);
      delete state.seatAssignments[roleId];
      delete state.discussionOrder[roleId];
      delete state.seatModelAssignments[roleId];
    });
  }

  syncDiscussionOrder();
  renderSeatStack();
  renderSeatPicker();
  updateCompactSummary();
  updateSeatFeedback(langText(`讨论规模已调整为 ${state.discussionSize} 人。当前建议按这个人数配置席位。`, `Discussion size changed to ${state.discussionSize}. Configure seats to match this size.`), "success");
}

confirmCancel.addEventListener("click", () => closeConfirmDialog(false));
confirmAccept.addEventListener("click", () => closeConfirmDialog(true));
confirmBackdrop.addEventListener("click", () => closeConfirmDialog(false));

function bindEvents() {
  openPeopleLibraryButton.addEventListener("click", () => {
    renderPeopleLibrary();
    openPeopleLibrary();
  });

  closePeopleLibrary.addEventListener("click", () => {
    if (!roleEditor.classList.contains("hidden")) {
      closeRoleEditorWithReturn();
      return;
    }
    closePeopleLibraryModal();
  });
  peopleLibraryBackdrop.addEventListener("click", () => {
    if (!roleEditor.classList.contains("hidden")) {
      closeRoleEditorWithReturn();
      return;
    }
    closePeopleLibraryModal();
  });

  openSeatPickerButton.addEventListener("click", () => {
    state.seatSource = state.seatsReady && state.aiAutoRecommendEnabled && state.recommendedRoles.length ? "recommended" : "library";
    renderSeatPicker();
    openSeatPicker();
    updateSeatFeedback(
      state.seatsReady && state.aiAutoRecommendEnabled && state.recommendedRoles.length
        ? langText("在这里给本轮讨论挑人。临时生成和人物库是两个来源。", "Choose personas for this discussion here. Generated personas and the library are two separate sources.")
        : state.aiAutoRecommendEnabled
          ? langText("人物还没生成。你现在可以先浏览人物库，确认任务后会出现临时生成。", "Personas have not been generated yet. You can browse the library first; generated personas will appear after task confirmation.")
          : langText("AI 自动推荐人物已关闭。你现在直接从人物库里挑人即可。", "AI persona recommendation is off. Pick personas directly from the library."),
      state.seatsReady && state.aiAutoRecommendEnabled && state.recommendedRoles.length ? "success" : "pending"
    );
  });

  toggleAiRoleRecommendationButton?.addEventListener("click", () => {
    state.aiAutoRecommendEnabled = !state.aiAutoRecommendEnabled;
    if (!state.aiAutoRecommendEnabled) {
      state.seatSource = "library";
    }
    renderAiRoleRecommendationToggle();
    renderSeatPicker();
    updateSeatFeedback(
      state.aiAutoRecommendEnabled
        ? langText("AI 自动推荐人物已开启。确认任务后，系统会先理解任务再给一组临时推荐。", "AI persona recommendation is on. After confirmation, the system will understand the task and generate a temporary roster.")
        : langText("AI 自动推荐人物已关闭。确认任务后不会自动生成人物，直接从人物库配席位。", "AI persona recommendation is off. No personas will be auto-generated after confirmation; you will assign seats from the library directly."),
      "pending"
    );
    void syncCurrentTopicSnapshot();
  });

  toggleVoiceReadButton?.addEventListener("click", async () => {
    state.voiceReadEnabled = !state.voiceReadEnabled;
    renderVoiceReadToggle();
    await saveAppState("voiceReadEnabled", state.voiceReadEnabled);
    if (state.voiceReadEnabled) {
      updateSeatFeedback(langText("已开启朗读。后续系统新消息会自动朗读。", "Read-aloud enabled. New system messages will be spoken automatically."), "success");
      return;
    }
    stopReadAloudPlayback();
    updateSeatFeedback(langText("已关闭朗读。", "Read-aloud disabled."), "");
  });

  openSeatPickerRoleEditor.addEventListener("click", () => {
    closeSeatPickerModal();
    openRoleEditorForCreate("自定义补位");
    roleEditorContext = {
      ...(roleEditorContext || {}),
      returnTo: { modal: "seat-picker", seatSource: state.seatSource },
    };
    openPeopleLibrary();
  });

  closeSeatPicker.addEventListener("click", closeSeatPickerModal);
  seatPickerBackdrop.addEventListener("click", closeSeatPickerModal);

  openSettingsDrawer.addEventListener("click", openSettings);
  closeSettingsDrawer.addEventListener("click", closeSettings);
  settingsDrawerBackdrop.addEventListener("click", closeSettings);
  openModelProfileModalButton.addEventListener("click", () => {
    resetModelProfileForm("custom-new");
    setProfileTestStatus(langText("正在新建自定义接入", "Creating a new custom connection"), "");
    openModelProfileModal("create");
  });
  closeModelProfileModalButton.addEventListener("click", closeModelProfileModal);
  modelProfileBackdrop.addEventListener("click", closeModelProfileModal);
  appLanguageToggle?.addEventListener("click", () => {
    void setAppLanguage(state.appLanguage === "zh" ? "en" : "zh");
  });

  openRoleEditorButton.addEventListener("click", () => {
    openRoleEditorForCreate();
  });

  roleEditorColorPicker.addEventListener("change", (event) => {
    const input = event.target.closest('input[name="role-color"]');
    if (!input) {
      return;
    }
    syncRoleColorPicker(input.value);
  });

  cancelRoleEditor.addEventListener("click", () => {
    closeRoleEditorWithReturn();
  });

  generateRoleWithAiButton?.addEventListener("click", handleGenerateRoleDraftWithAi);

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

  peopleLibraryGrid.addEventListener("click", async (event) => {
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
    if (!action) {
      openRoleEditorForRole(role, { sourceCollection: "people" });
      return;
    }
    if (action === "edit") {
      openRoleEditorForRole(role, { sourceCollection: "people" });
      return;
    }
    if (action === "delete") {
      if (!canDeleteRole(role)) {
        updateSeatFeedback(langText("预置人物不能删除。", "Built-in personas cannot be deleted."), "pending");
        return;
      }
      const confirmed = await openConfirmDialog({
        title: "删除人物",
        message: `删除“${role.name}”后，这个人物会从人物库中移除。`,
        confirmText: "删除",
      });
      if (!confirmed) {
        return;
      }
      await deleteRole(roleId);
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
    if (action === "edit") {
      const role = getRoleById(card.dataset.roleId);
      closeSeatPickerModal();
      openPeopleLibrary();
      openRoleEditorForRole(role, {
        sourceCollection: role?.source === "recommended" ? "recommended" : "people",
        returnTo: { modal: "seat-picker", seatSource: state.seatSource },
      });
      return;
    }
    toggleSeatSelection(card.dataset.roleId);
  });

  seatStack.addEventListener("click", (event) => {
    const editButton = event.target.closest(".seat-edit");
    if (editButton) {
      const role = getRoleById(editButton.dataset.roleId);
      openPeopleLibrary();
      openRoleEditorForRole(role, {
        sourceCollection: role?.source === "recommended" ? "recommended" : "people",
        replaceSelectedId: editButton.dataset.roleId,
      });
      return;
    }
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
      updateSeatFeedback(langText(`已为 ${getRoleById(modelSelect.dataset.roleId)?.name || "人物"} 切换模型：${getConfiguredProfileById(modelSelect.value)?.displayName || "未设置"}`, `Switched model for ${getRoleById(modelSelect.dataset.roleId)?.name || "persona"}: ${getConfiguredProfileById(modelSelect.value)?.displayName || "Not set"}`), "success");
      void syncCurrentTopicSnapshot();
      return;
    }

    const orderSelect = event.target.closest(".seat-order-select");
    if (orderSelect) {
      setDiscussionOrder(orderSelect.dataset.roleId, Number(orderSelect.value || 1));
      renderSeatStack();
      updateSeatFeedback(langText(`已调整讨论顺序：${getRoleById(orderSelect.dataset.roleId)?.name || "人物"} -> 第 ${orderSelect.value} 位`, `Updated speaking order: ${getRoleById(orderSelect.dataset.roleId)?.name || "persona"} -> position ${orderSelect.value}`), "success");
      void syncCurrentTopicSnapshot();
      return;
    }

    const select = event.target.closest(".seat-assignment-select");
    if (!select) {
      return;
    }
    setSeatAssignment(select.dataset.roleId, select.value);
    if (select.value === "judge" || !getRoleByAssignment("judge")) {
      ensureCoreAssignments();
    }
    renderSeatStack();
    const role = getRoleById(select.dataset.roleId);
    updateSeatFeedback(langText(`已设置 ${role?.name || "人物"} 本轮扮演：${getRoundRoleLabel(select.value)}`, `Set ${role?.name || "persona"} as: ${getRoundRoleLabel(select.value)}`), "success");
    void syncCurrentTopicSnapshot();
  });

  modelProfileForm.addEventListener("submit", handleModelProfileSave);
  resetModelProfile.addEventListener("click", () => {
    resetModelProfileForm("custom-new");
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
  providerTemplateSelect.addEventListener("change", () => {
    if (providerTemplateSelect.value === "custom-new" || !providerTemplateSelect.value) {
      resetModelProfileForm(providerTemplateSelect.value || "custom-new");
      setProfileTestStatus("正在新建自定义接入", "");
      return;
    }

    const profile = defaultProfileMap.get(providerTemplateSelect.value);
    if (!profile) {
      resetModelProfileForm("custom-new");
      setProfileTestStatus("正在新建自定义接入", "");
      return;
    }
    fillModelProfileTemplate(profile);
    setProfileTestStatus("已载入厂商模板。点击保存会新增一条接入，不会覆盖已有配置。", "");
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
      openModelProfileModal("edit");
      return;
    }
    if (button.dataset.action === "test-profile") {
      testStoredProfileConnectivity(profile.id);
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
      if (hasReusableCurrentRoster()) {
        setSpeakerCard(langText("沿用当前人物", "Reusing Current Roster"), langText("同一话题不再重配", "No regeneration for the same topic"), langText("当前话题的人物已经确定，系统将沿用这批人物继续讨论，不会重新推荐。", "The roster for this topic is already set. The system will reuse it and will not regenerate personas."), "系");
        updateSeatFeedback(langText("当前话题的人物已经确定，不会重新生成人物。", "The roster for this topic is already set, so personas will not be regenerated."), "success");
        void syncCurrentTopicSnapshot();
        return;
      }
      startSeatGeneration();
      return;
    }
    if (event.target.closest(".js-force-generate")) {
      startSeatGeneration({ forceGeneration: true });
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

    if (state.awaitingDiscussionContinuation && pendingDiscussionContinuationResolver) {
      pendingDiscussionContinuationResolver({
        content: content || langText("继续，请结合我刚上传的材料往下讨论。", "Continue. Please incorporate the materials I just uploaded into the next part of the discussion."),
        attachments,
      });
      setSpeakerCard(langText("等待决定中", "Decision Pending"), langText("已收到用户指令", "User instruction received"), langText("主持AI 正在判断现在结束，还是追加下一轮讨论。", "The host AI is deciding whether to stop now or add another round."), "系");
      updateSeatFeedback(langText("已收到用户决定，正在处理。", "User decision received. Processing."), "success");
      updateLiveStatus(langText("已收到用户决定，正在处理。", "User decision received. Processing."), "pending");
      return;
    }

    if (state.awaitingUserParticipation && pendingUserParticipationResolver) {
      pendingUserParticipationResolver({
        content: content || langText("我上传了附件，请结合这些内容继续下一轮讨论。", "I uploaded attachments. Please incorporate them into the next round of discussion."),
        attachments,
      });
      setSpeakerCard(langText("继续讨论中", "Continuing Discussion"), langText("已收到用户补充", "User follow-up received"), langText("主持AI 会把你的补充带入下一轮讨论。", "The host AI will carry your follow-up into the next round."), "系");
      updateSeatFeedback(langText("已收到用户补充，正在继续讨论。", "User follow-up received. Continuing discussion."), "success");
      updateLiveStatus(langText("已收到用户补充，正在继续讨论。", "User follow-up received. Continuing discussion."), "pending");
      return;
    }

    if (canResumeCompletedDiscussion() && looksLikeContinueDiscussionCommand(content, attachments)) {
      const continuationDecision = parseDiscussionContinuationDecision({ content, attachments });
      if (continuationDecision.continueDiscussion) {
        const completedRounds = getCompletedRoundCount();
        state.discussionRounds = Math.max(completedRounds, state.discussionRounds, Number(discussionRoundsInput.value || state.discussionRounds || 1)) + Math.max(1, Number(continuationDecision.additionalRounds || 1));
        discussionRoundsInput.value = String(state.discussionRounds);
        state.discussionRoundNotes = [
          ...state.discussionRoundNotes,
          {
            round: `${completedRounds} 轮后续谈`,
            turns: [
              {
                role: {
                  id: "user-round-input",
                  name: "用户",
                  seat: "用户续谈",
                  description: "讨论完成后由用户发出的继续讨论要求。",
                  systemPrompt: "这是用户要求继续讨论的补充说明。",
                },
                assignmentLabel: `第 ${completedRounds} 轮后 · 用户续谈要求`,
                text: continuationDecision.content,
              },
            ],
            moderatorSummary: `用户要求继续讨论，下一轮重点：${continuationDecision.content}`,
          },
        ];
        setSpeakerCard(langText("继续讨论中", "Continuing Discussion"), langText("沿用当前人物继续", "Continuing with the current roster"), langText(`已识别为同一任务续谈，不会重新生成人物。主持AI：${getPrimarySummaryProfileName()}。`, `The system recognized this as a continuation of the same task, so it will reuse the current roster. Host AI: ${getPrimarySummaryProfileName()}.`), "系");
        updateSeatFeedback(langText(`已识别为同一任务续谈，不会重新生成人物，准备追加到第 ${state.discussionRounds} 轮。`, `Continuation detected for the same task. The system will reuse the current roster and extend to round ${state.discussionRounds}.`), "success");
        updateLiveStatus(langText(`继续讨论：沿用当前人物，准备进入第 ${state.discussionRounds} 轮。`, `Continuing discussion with the current roster. Preparing round ${state.discussionRounds}.`), "pending");
        void syncCurrentTopicSnapshot();
        runDiscussionFlow();
        return;
      }
    }

    if (hasReusableCurrentRoster() && looksLikeContinueDiscussionCommand(content, attachments)) {
      state.discussionRoundNotes = [
        ...state.discussionRoundNotes,
        {
          round: `${getCompletedRoundCount()} 轮后续谈`,
          turns: [
            {
              role: {
                id: "user-round-input",
                name: "用户",
                seat: "用户续谈",
                description: "同一话题中由用户发出的继续讨论要求。",
                systemPrompt: "这是用户要求继续讨论的补充说明。",
              },
              assignmentLabel: langText("同题续谈要求", "Continuation request for the same topic"),
              text: content || langText("请沿用当前人物继续讨论。", "Please continue with the current roster."),
            },
          ],
          moderatorSummary: `用户要求继续讨论，沿用当前人物：${content || "继续讨论"}`,
        },
      ];
      state.discussionRounds = Math.max(1, Number(discussionRoundsInput.value || state.discussionRounds || 1)) + 1;
      discussionRoundsInput.value = String(state.discussionRounds);
      setSpeakerCard(langText("继续讨论中", "Continuing Discussion"), langText("沿用当前人物继续", "Continuing with the current roster"), langText(`已识别为同一话题续谈，将沿用当前人物进入第 ${state.discussionRounds} 轮。`, `This was recognized as a continuation of the same topic. The current roster will be reused for round ${state.discussionRounds}.`), "系");
      updateSeatFeedback(langText("已识别为同题续谈，将沿用当前人物继续，不会重新生成人物。", "Same-topic continuation detected. The current roster will be reused without regenerating personas."), "success");
      updateLiveStatus(langText("继续讨论：沿用当前人物。", "Continuing discussion with the current roster."), "pending");
      void syncCurrentTopicSnapshot();
      runDiscussionFlow();
      return;
    }

    setSpeakerCard(langText("主 AI 整理中", "Primary AI Processing"), langText("正在调用真实模型", "Calling the live model"), langText("会先用你已接入的主 AI 整理任务，再回来让你确认。", "The connected primary AI will first organize the task and then return for your confirmation."), "系");
    sendCommand.disabled = true;
    try {
      const treatAsSupplement = !!state.lastSummary && (state.taskSupplementMode || state.pendingRoleClarification.length > 0);
      const summary = await requestAiTaskSummary(content || langText("已收到附件，请结合附件整理任务定义", "Attachments received. Please organize the task definition using them."), attachments, {
        treatAsSupplement,
        baseSummary: state.lastSummary,
        clarificationQuestions: state.pendingRoleClarification,
      });
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
          sublabel: langText("主 AI 整理失败", "Primary AI Failed"),
          body: error.message || langText("主 AI 整理失败，请检查模型接入后重试。", "The primary AI failed to organize the task. Check the model connection and try again."),
          avatarLabel: "系",
          avatarClass: "avatar-system",
          tone: "system",
        })
      );
      setSpeakerCard(langText("主 AI 调用失败", "Primary AI Failed"), langText("请检查主 AI 接入", "Check the primary AI connection"), error.message || langText("当前无法调用真实模型整理任务定义。", "The live model could not organize the task definition right now."), "系");
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

  cycleModeButton.addEventListener("click", () => cycleSetting("modeIndex", modeValues));
  cycleModeButton.addEventListener("mouseenter", showModeTooltip);
  cycleModeButton.addEventListener("mouseleave", hideModeTooltip);
  cycleModeButton.addEventListener("focus", showModeTooltip);
  cycleModeButton.addEventListener("blur", hideModeTooltip);
  document.getElementById("cycle-participation").addEventListener("click", () => cycleSetting("participationIndex", participationValues));
  document.getElementById("cycle-density").addEventListener("click", () => cycleSetting("densityIndex", densityValues));
  document.getElementById("cycle-model").addEventListener("click", () => cycleSetting("modelIndex", modelValues));
  hostModelSelect?.addEventListener("change", async () => {
    if (state.discussionRunning) {
      return;
    }
    state.mappings.main = hostModelSelect.value;
    await saveAppState("modelMappings", state.mappings);
    renderConnectedModelList();
    renderModelMappings();
    updateSeatFeedback(langText(`已切换主持AI：${getConfiguredProfileById(hostModelSelect.value)?.displayName || "未设置"}`, `Host AI changed to: ${getConfiguredProfileById(hostModelSelect.value)?.displayName || "Not set"}`), "success");
  });
  discussionRoundsInput.addEventListener("change", () => {
    const nextValue = Math.min(9, Math.max(1, Number(discussionRoundsInput.value || 1)));
    state.discussionRounds = nextValue;
    updateCompactSummary();
    void syncCurrentTopicSnapshot();
  });
  discussionSizeSelect.addEventListener("change", () => {
    applyDiscussionSize(discussionSizeSelect.value);
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
  applyLanguageToStaticUi();
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
  if (activeTopic?.snapshot?.topicConfirmed) {
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
