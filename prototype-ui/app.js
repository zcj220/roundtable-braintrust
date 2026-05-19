const DB_NAME = "roundtable-braintrust";
const DB_VERSION = 1;
const ROLE_STORE = "peopleRoles";
const PROFILE_STORE = "modelProfiles";
const APP_STATE_STORE = "appState";
const MODEL_REQUEST_TIMEOUT_MS = 120000;
const JUDGE_REQUEST_TIMEOUT_MS = 180000;
const ROLE_PLANNING_TIMEOUT_MS = 45000;
const ROLE_GENERATION_TIMEOUT_MS = 120000;
const ROLE_EMERGENCY_TIMEOUT_MS = 120000;
const ROLE_IDENTITY_TIMEOUT_MS = 120000;
const MODEL_TEST_TIMEOUT_MS = 18000;
const MIN_RECOMMENDED_ROLE_COUNT = 8;
const MAX_EXEMPLAR_ROLE_RATIO = 0.5;

const modeValues = ["自由讨论", "立场内求最强答案", "客观求真", "灵感探索"];
const participationValues = ["每轮后表态", "全程旁观"];
const densityValues = ["简洁", "标准", "深入"];
const modelValues = ["系统切换", "手动切换"];
const modeHelpTexts = [
  "把一个复杂问题拆成几个角度分别讲。可以分子问题、分层次、分时间或分利益相关方展开，先讲开再由主持收回来。",
  "先把支持与反对两边最强的版本都讲完整。反对方负责提前打出最难的质疑，支持方负责把这些质疑正面回应并补强防守。",
  "不预设立场，优先区分事实、推断和猜测。双方以证据为主展开讨论，最后由裁判依据证据链和论证质量明确判出输赢，必须有胜负结论。",
  "允许大胆设想和跨界联想，但要标清哪些是事实、哪些是推测。对自己的想法可以发散，对别人的想法也要判断可行性、风险和前提条件。",
];
const modeValuesEn = ["Open", "Strongest Case", "Truth-Seeking", "Ideas"];
const participationValuesEn = ["Per-Round", "Observe"];
const densityValuesEn = ["Concise", "Standard", "Deep"];
const modelValuesEn = ["System Switching", "Manual Switching"];
const modeHelpTextsEn = [
  "Break a complex issue into a few angles and let the table open them up before the host pulls the threads back together.",
  "Present the strongest version of both support and opposition. Critics should surface the hardest objections early, and supporters should answer them directly.",
  "Do not assume a stance. Separate facts, inferences, and guesses. Both sides argue from evidence, and the judge must declare a clear winner based on the strength of the evidence chain and reasoning quality.",
  "Allow bold ideas and cross-domain associations, but mark clearly what is factual and what is speculative, then test which ideas are worth keeping.",
];

const ROLE_COLORS = ["sky", "gold", "amber", "rose", "teal", "violet", "emerald", "coral", "slate"];

const ROLE_VOICE_AGE_BUCKETS = {
  child: { labelZh: "儿童", labelEn: "Child", sampleAges: [8, 10, 12] },
  teen: { labelZh: "少年", labelEn: "Teen", sampleAges: [14, 16, 17] },
  young: { labelZh: "青年", labelEn: "Young Adult", sampleAges: [22, 26, 32] },
  middle: { labelZh: "中年", labelEn: "Middle Aged", sampleAges: [40, 45, 52] },
  senior: { labelZh: "老年", labelEn: "Senior", sampleAges: [61, 68, 75] },
};

const HOST_VOICE_ROLE = {
  id: "host-ai",
  name: "主持AI",
  nameEn: "Host AI",
  gender: "female",
  age: "35岁",
  seat: "讨论主持者",
  seatEn: "Discussion Host",
  description: "负责开场、控制节奏、每轮小结、压缩上下文，并在最后整理给用户的结论稿。",
  descriptionEn: "Opens the discussion, manages pacing, summarizes each round, compresses context, and prepares the final conclusion for the user.",
  traits: { stance: "保持中立主持", method: "总结压缩", temper: "清晰" },
  traitsEn: { stance: "Neutral facilitation", method: "Summary compression", temper: "Clear" },
};

const BUILTIN_PROFILE_DISPLAY_NAMES = {
  "profile-openai-official": { zh: "OpenAI 官方", en: "OpenAI Official" },
  "profile-openrouter": { zh: "OpenRouter", en: "OpenRouter" },
  "profile-siliconflow": { zh: "硅基流动", en: "SiliconFlow" },
  "profile-deepseek": { zh: "DeepSeek 官方", en: "DeepSeek Official" },
  "profile-zhipu": { zh: "智谱 AI", en: "Zhipu AI" },
  "profile-bailian": { zh: "阿里百炼", en: "Alibaba Bailian" },
  "profile-claude": { zh: "Claude 官方", en: "Claude Official" },
  "profile-volcengine": { zh: "火山方舟", en: "Volcengine Ark" },
  "profile-google-ai-studio": { zh: "Google AI Studio", en: "Google AI Studio" },
  "profile-moonshot": { zh: "Moonshot AI", en: "Moonshot AI" },
  "profile-minimax": { zh: "MiniMax", en: "MiniMax" },
  "profile-together": { zh: "Together AI", en: "Together AI" },
};

function getLocalizedProfileDisplayName(profile) {
  if (!profile) {
    return "";
  }
  const builtinLabel = BUILTIN_PROFILE_DISPLAY_NAMES[profile.id];
  if (builtinLabel) {
    return langText(builtinLabel.zh, builtinLabel.en);
  }
  return profile.displayName || "";
}

function getStableStringHash(value) {
  return Array.from(String(value || "")).reduce((total, char) => ((total << 5) - total + char.charCodeAt(0)) | 0, 0);
}

function normalizeRoleGender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (/^(male|man|m|男|男性)$/.test(normalized)) {
    return "male";
  }
  if (/^(female|woman|f|女|女性)$/.test(normalized)) {
    return "female";
  }
  if (/^(nonbinary|non-binary|nb|中性|非二元)$/.test(normalized)) {
    return "nonbinary";
  }
  return "";
}

function normalizeRoleAge(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  // Chinese age strings: collapse all spaces (e.g. "45 岁" → "45岁")
  if (/[\u4e00-\u9fff]/.test(s)) return s.replace(/\s+/g, "");
  // English age strings: normalize to single space
  return s.replace(/\s+/g, " ");
}

function extractNumericAge(value) {
  const match = String(value || "").match(/(\d{1,2})/);
  return match ? Number(match[1]) : null;
}

function detectVoiceAgeBucketFromText(text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return "";
  }

  const ageMatch = normalized.match(/(\d{1,2})\s*岁/);
  if (ageMatch) {
    const age = Number(ageMatch[1]);
    if (age <= 12) {
      return "child";
    }
    if (age <= 17) {
      return "teen";
    }
    if (age <= 39) {
      return "young";
    }
    if (age <= 59) {
      return "middle";
    }
    return "senior";
  }

  if (/(儿童|小孩|孩子|孩童)/.test(normalized)) {
    return "child";
  }
  if (/(少年|青少年|高中生|初中生|柯南)/.test(normalized)) {
    return "teen";
  }
  if (/(青年|年轻|大学生|新锐|刚入行)/.test(normalized)) {
    return "young";
  }
  if (/(中年|资深|负责人|工程师|经理|顾问|主理人|教授|医生|法医|牧师|创始人)/.test(normalized)) {
    return "middle";
  }
  if (/(老年|老人|年迈|退休|长老|教父)/.test(normalized)) {
    return "senior";
  }
  return "";
}

function getRoleVoiceAgeBucket(role) {
  const explicitBucket = detectVoiceAgeBucketFromText(normalizeRoleAge(role?.age));
  if (explicitBucket) {
    return explicitBucket;
  }
  const fallbackText = `${role?.name || ""} ${role?.seat || ""} ${role?.description || ""}`;
  return detectVoiceAgeBucketFromText(fallbackText) || "middle";
}

function buildAgeFromBucket(bucket, seedText) {
  const bucketConfig = ROLE_VOICE_AGE_BUCKETS[bucket] || ROLE_VOICE_AGE_BUCKETS.middle;
  const samples = bucketConfig.sampleAges;
  const index = Math.abs(getStableStringHash(seedText || bucket)) % samples.length;
  return `${samples[index]}岁`;
}

function getDiscussionSpeakerRoleById(speakerId) {
  if (!speakerId) {
    return null;
  }
  if (speakerId === HOST_VOICE_ROLE.id || speakerId === "system" || speakerId === "shared-research-agent") {
    return HOST_VOICE_ROLE;
  }
  return getRoleById(speakerId) || null;
}

function buildReadAloudProfile(role) {
  const gender = normalizeRoleGender(role?.gender) || inferRoleGender(role);
  const bucket = role ? getRoleVoiceAgeBucket(role) : "middle";
  let rate = state.appLanguage === "en" ? 0.96 : 0.92;
  let pitch = gender === "male" ? 0.88 : 1.08;

  if (bucket === "child") {
    pitch += 0.12;
    rate += 0.06;
  } else if (bucket === "teen") {
    pitch += 0.06;
    rate += 0.03;
  } else if (bucket === "senior") {
    pitch -= 0.08;
    rate -= 0.06;
  } else if (bucket === "middle") {
    rate -= 0.01;
  }

  return {
    gender,
    rate: Math.max(0.8, Math.min(1.08, rate)),
    pitch: Math.max(0.72, Math.min(1.28, pitch)),
  };
}

function inferRoleGender(role) {
  const explicit = normalizeRoleGender(role?.gender || role?.sex || role?.genderLabel);
  if (explicit) {
    return explicit;
  }
  const text = `${role?.name || ""} ${role?.seat || ""} ${role?.description || ""}`;
  if (/(女士|女性|女王|王后|母亲|妈妈|姐姐|妹妹|女孩|少女|赫敏|神奇女侠|花木兰|居里夫人)/.test(text)) {
    return "female";
  }
  if (/(先生|男性|父亲|爸爸|哥哥|弟弟|男孩|柯南|奥古斯丁|加尔文|路德|司布真|卫斯理|乔纳森·艾夫|深泽直人|原研哉)/.test(text)) {
    return "male";
  }
  return Math.abs(getStableStringHash(text)) % 2 === 0 ? "male" : "female";
}

function inferRoleAge(role) {
  const explicit = normalizeRoleAge(role?.age || role?.ageLabel || role?.ageText || role?.ageRange);
  if (explicit) {
    return explicit;
  }
  const text = `${role?.name || ""} ${role?.seat || ""} ${role?.description || ""}`;
  return buildAgeFromBucket(getRoleVoiceAgeBucket(role), text);
}

function getRoleGenderLabel(role) {
  const normalized = normalizeRoleGender(role?.gender) || inferRoleGender(role);
  if (normalized === "female") {
    return langText("女", "Female");
  }
  if (normalized === "male") {
    return langText("男", "Male");
  }
  if (normalized === "nonbinary") {
    return langText("中性", "Non-binary");
  }
  return langText("未设定", "Unspecified");
}

function ensureRoleIdentityMeta(role) {
  if (!role) {
    return role;
  }
  const englishMeta = BUILT_IN_ROLE_ENGLISH[role.id] || null;
  return {
    ...role,
    nameEn: role?.nameEn || role?.i18n?.en?.name || englishMeta?.name || buildEnglishRoleNameFallback(role?.name || "") || "",
    seatEn: role?.seatEn || role?.i18n?.en?.seat || englishMeta?.seat || buildEnglishRoleNameFallback(role?.seat || "") || "",
    descriptionEn: role?.descriptionEn || role?.i18n?.en?.description || englishMeta?.description || buildFallbackRoleDescriptionEn(role),
    systemPromptEn: role?.systemPromptEn || role?.i18n?.en?.systemPrompt || englishMeta?.systemPrompt || buildFallbackRoleSystemPromptEn(role),
    sourceLabelEn: role?.sourceLabelEn || role?.i18n?.en?.sourceLabel || translateRoleSourceLabel(role?.sourceLabel || role?.originalSourceLabel || "", role?.source),
    gender: normalizeRoleGender(role?.gender) || inferRoleGender(role),
    age: normalizeRoleAge(role?.age) || inferRoleAge(role),
  };
}

function buildBaseRoleSystemPrompt({ name, seat, description, stance, method, temper }) {
  return [
    `你现在扮演一位${name}。你长期最稳定的观察重心是：${seat}。`,
    `你的职业背景与长期经验是：${description}`,
    `你的核心倾向是：${stance}。你最常用的方法是：${method}。你的表达气质应保持：${temper}。`,
    "你不是一个抽象标签，而是一个长期在一线、研究或实务里反复处理这类问题的人。发言时先体现这个身份的人会怎么看、先抓什么、最担心什么，再给出判断。",
    "每次正式发言都优先完成四件事：先点出你最先看的关键信号，再给出你的判断，再说出你最担心的风险，最后指出桌上其他人最容易忽略的一点。",
    "如果你同意别人，也要说清你同意的是哪一部分、为什么成立；如果你反对别人，也要明确反对的是哪个具体判断、哪条证据不够、哪种代价被低估。",
    "不要把自己写成任务解释器、流程播报员或百科词条作者。你是在桌边参与讨论，要像真人一样提出判断、质疑、保留和建议。",
    "除非任务明确要求你严格停留在历史时点，否则你默认可以使用当下公开知识、现代常识和今天已经形成的专业方法，但仍要保持这个身份本来的训练背景、关注重点和说话气质。",
    "不要空泛复述任务，也不要写成百科词条。你是在参与桌边讨论，要有判断、有边界、有取舍。",
    "遇到不确定之处要直说，不要装作什么都懂；遇到别人明显跳步或想当然的地方，要直接指出。",
  ].join(" ");
}

function buildBaseRoleSystemPromptEn({ name, seat, description }) {
  return [
    `You are now playing the role of a ${name}. Your most stable observation focus is ${seat}.`,
    `Your professional background and long-term experience are: ${description}`,
    "You are not an abstract label. You are someone who has handled this kind of problem repeatedly in real practice, research, or delivery.",
    "When you speak, start from what this identity would notice first, what matters most, and what concerns you most before giving judgment.",
    "In each turn, do four things in order: identify the first critical signal, state your judgment, name the main risk, and point out what others at the table are likely missing.",
    "If you agree with someone, specify exactly which part stands and why. If you disagree, name the exact claim, evidence gap, or underestimated trade-off you are pushing back on.",
    "Do not turn into a narrator, prompt explainer, or encyclopedia entry. Stay as a real participant in the discussion.",
    "Be direct about uncertainty. If someone is making a leap or relying on wishful thinking, point it out clearly.",
  ].join(" ");
}

function buildFallbackRoleDescriptionEn(role) {
  if (!role) {
    return "";
  }
  const name = String(role?.nameEn || buildEnglishRoleNameFallback(role?.name || "") || "This persona").trim();
  const seat = String(role?.seatEn || buildEnglishRoleNameFallback(role?.seat || "") || "a focused perspective").trim();
  const stance = String(role?.traitsEn?.stance || translateTraitValue(role?.traits?.stance) || "a clear perspective").trim();
  const method = String(role?.traitsEn?.method || translateTraitValue(role?.traits?.method) || "targeted analysis").trim();
  const temper = String(role?.traitsEn?.temper || translateTraitValue(role?.traits?.temper) || "calm").trim();
  return `${name} joins the discussion from the ${seat} perspective, usually works through ${method}, leans toward ${stance}, and speaks in a ${temper} tone.`;
}

function buildFallbackRoleSystemPromptEn(role) {
  if (!role) {
    return "";
  }
  const name = String(role?.nameEn || buildEnglishRoleNameFallback(role?.name || "") || "Persona").trim();
  const seat = String(role?.seatEn || buildEnglishRoleNameFallback(role?.seat || "") || "discussion perspective").trim();
  const description = String(role?.descriptionEn || buildFallbackRoleDescriptionEn(role) || "").trim();
  return buildBaseRoleSystemPromptEn({ name, seat, description });
}

const BUILT_IN_ROLE_ENGLISH = {
  programmer: {
    name: "Programmer",
    seat: "Technical Implementer",
    description: "Breaks requirements into code delivery, interface structure, debugging paths, and execution rhythm.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Programmer", seat: "Technical Implementer", description: "An engineer who regularly turns vague requirements into code delivery, interface structure, debugging paths, and execution rhythm." }),
  },
  "building-engineer": {
    name: "Building Engineer",
    seat: "On-site Engineering Judge",
    description: "Evaluates plans through structural safety, construction conditions, material limits, and on-site implementation.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Building Engineer", seat: "On-site Engineering Judge", description: "An engineering practitioner who balances structural safety, construction conditions, material constraints, and on-site execution." }),
  },
  "electrical-engineer": {
    name: "Electrical Engineer",
    seat: "Power Systems Advisor",
    description: "Complements technical judgment through power supply, wiring, safety redundancy, load, and equipment fit.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Electrical Engineer", seat: "Power Systems Advisor", description: "A power systems engineer who regularly handles supply systems, wiring loads, electrical safety, and equipment matching." }),
  },
  auditor: {
    name: "Auditor",
    seat: "Financial Review",
    description: "Checks cost, return on investment, budget leakage, and financial sustainability.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Auditor", seat: "Financial Review", description: "An audit and accounting professional focused on cost review, budgets, return on investment, and financial sustainability." }),
  },
  doctor: {
    name: "Doctor",
    seat: "Medical Risk Review",
    description: "Judges health, safety, recovery, accidental harm, and professional boundaries to avoid reckless decisions.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Doctor", seat: "Medical Risk Review", description: "A clinician who routinely weighs health risk, contraindications, recovery windows, and the cost of harm." }),
  },
  historian: {
    name: "Historian",
    seat: "Historical Context",
    description: "Supplies causes, background, institutional context, and path evolution to avoid decontextualized conclusions.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Historian", seat: "Historical Context", description: "A researcher who studies timelines, background conditions, institutions, and path evolution, and uses sources to correct present-day judgment." }),
  },
  physicist: {
    name: "Physicist",
    seat: "Mechanism Analyst",
    description: "Tests whether something holds through mechanics, energy, motion, and physical constraints.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Physicist", seat: "Mechanism Analyst", description: "An analyst who explains real-world problems through mechanics, energy, materials, and boundary conditions." }),
  },
  mathematician: {
    name: "Mathematician",
    seat: "Logical Reasoning",
    description: "Checks quantity, logical structure, probability, and rigor of inference.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Mathematician", seat: "Logical Reasoning", description: "A professional who works on quantitative relations, logical structure, probability assumptions, and rigorous inference." }),
  },
  chemist: {
    name: "Chemist",
    seat: "Material Reaction Analysis",
    description: "Judges through material properties, chemical reactions, corrosion risk, and formulation stability.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Chemist", seat: "Material Reaction Analysis", description: "A chemistry professional who studies material properties, reaction conditions, corrosion risk, toxicity, and stability." }),
  },
  lawyer: {
    name: "Legal Advisor",
    seat: "Legal Boundary Review",
    description: "Holds the line on legal liability, contract constraints, evidence chains, and execution risk.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Legal Advisor", seat: "Legal Boundary Review", description: "A legal advisor who regularly handles liability, contract constraints, evidence chains, and execution risk by clarifying boundaries first." }),
  },
  "police-advisor": {
    name: "Police Officer",
    seat: "Field Investigation Executor",
    description: "Covers scene control, investigation, evidence collection, execution, and worst-case response.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Police Officer", seat: "Field Investigation Executor", description: "An operator experienced in scene control, investigation, evidence handling, execution, and worst-case response." }),
  },
  "operations-manager": {
    name: "Operations Lead",
    seat: "Execution Driver",
    description: "Breaks plans into cadence, actions, resource allocation, and operating loops so the work actually runs.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Operations Lead", seat: "Execution Driver", description: "An operations lead who turns plans into cadence, actions, resource allocation, and execution loops." }),
  },
  "product-manager": {
    name: "Product Manager",
    seat: "Trade-off Coordinator",
    description: "Judges user value, priority, release boundaries, and resource investment so discussion does not stay abstract.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Product Manager", seat: "Trade-off Coordinator", description: "A product manager who makes trade-offs across user value, priorities, release boundaries, and resource investment." }),
  },
  teacher: {
    name: "Teacher",
    seat: "Structured Explainer",
    description: "Breaks complex issues into structures that ordinary people can understand, repeat, and act on.",
    systemPrompt: buildBaseRoleSystemPromptEn({ name: "Teacher", seat: "Structured Explainer", description: "An educator who turns complex issues into structures people can understand, repeat, and execute." }),
  },
};

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
].map((role) => ensureRoleIdentityMeta(role));

function isFavoriteRole(role) {
  return role.source === "favorite";
}

function getRoleSourceText(role) {
  if (role.source === "favorite") {
    if (role.originalSourceLabel) {
      return state.appLanguage === "en" ? translateRoleSourceLabel(role.originalSourceLabel, role.originalSource || "favorite") : role.originalSourceLabel;
    }
    if (role.sourceLabel && role.sourceLabel !== "收藏人物") {
      return state.appLanguage === "en" ? (role.sourceLabelEn || translateRoleSourceLabel(role.sourceLabel, role.source)) : role.sourceLabel;
    }
    return "";
  }
  if (role.source === "custom") {
    return state.appLanguage === "en" ? "Custom" : "自定义";
  }
  if (role.source === "recommended") {
    return state.appLanguage === "en" ? "Generated" : "临时生成";
  }
  return state.appLanguage === "en"
    ? (role.sourceLabelEn || translateRoleSourceLabel(role.sourceLabel || "", role.source))
    : (role.sourceLabel || "常用职业");
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

function looksLikePersonalRoleName(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }
  if (/^[\u4e00-\u9fff]{2,4}$/u.test(normalized)) {
    return true;
  }
  return /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}$/.test(normalized);
}

function looksLikeProfessionalRoleLabel(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }
  return /(专家|工程师|研究员|顾问|设计师|经理|负责人|教师|医生|律师|警察|法医|程序员|学家|主持人|讲解者|研究者|诠释者|释经者|转译者|调查员|分析师|架构师|记者|编辑|检察官|审计师|咨询师|策划|采购|运营|产品经理|导演|教练|技师|科学家|长老|牧师|学者)$/u.test(normalized);
}

function convertSeatToRoleLabel(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[，。；、]/g, " ")
    .split(/\s+/)[0]
    .trim();
  if (!normalized) {
    return "专题分析专家";
  }
  if (looksLikeProfessionalRoleLabel(normalized)) {
    return normalized;
  }
  if (/者$/u.test(normalized)) {
    return normalized.replace(/者$/u, "专家");
  }
  if (normalized.length <= 12) {
    return `${normalized}专家`;
  }
  return `${normalized.slice(0, 10)}专家`;
}

function getRecommendedRolePublicName(role) {
  const roleType = normalizeGeneratedRoleType(role?.roleType || role?.roleKind || role?.personaType);
  const rawName = sanitizeGeneratedRoleName(role?.name || role?.title || "");
  const rawSeat = String(role?.seat || role?.role || "").trim();
  if (roleType === "exemplar") {
    return rawName || rawSeat || "临时人物";
  }
  if (looksLikeProfessionalRoleLabel(rawName)) {
    return rawName;
  }
  if (rawSeat && looksLikeProfessionalRoleLabel(rawSeat)) {
    return rawSeat;
  }
  if (looksLikePersonalRoleName(rawName)) {
    return convertSeatToRoleLabel(rawSeat || rawName);
  }
  return convertSeatToRoleLabel(rawSeat || rawName);
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
  if (!role) {
    return "";
  }
  if (role?.source === "recommended") {
    return getLocalizedRoleText(role, "name") || getRecommendedRolePublicName(role);
  }
  return getLocalizedRoleText(role, "name");
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
  const raw = String(getLocalizedRoleText(role, "description") || "").replace(/\s+/g, " ").trim();
  if (!raw) {
    return "";
  }
  const firstClause = raw.split(/[。！？]/)[0]?.trim() || raw;
  return shortenText(firstClause, 30);
}

function getRoleLocaleField(role, field) {
  if (!role) {
    return "";
  }
  const fallback = String(role?.[field] || "").trim();
  const english = String(role?.[`${field}En`] || role?.i18n?.en?.[field] || "").trim();
  if (state.appLanguage === "en") {
    if (english) {
      return english;
    }
    if (field === "name" || field === "seat") {
      return buildEnglishRoleNameFallback(fallback) || fallback;
    }
    if (field === "description") {
      return buildFallbackRoleDescriptionEn(role) || fallback;
    }
    if (field === "systemPrompt") {
      return buildFallbackRoleSystemPromptEn(role) || fallback;
    }
    return fallback;
  }
  return fallback || english;
}

function getLocalizedRoleText(role, field) {
  return getRoleLocaleField(role, field);
}

function getActiveRoleName(role) {
  return getLocalizedRoleText(role, "name") || role?.name || "";
}

function getActiveRoleSeat(role) {
  return getLocalizedRoleText(role, "seat") || role?.seat || "";
}

function getActiveRoleDescription(role) {
  return getLocalizedRoleText(role, "description") || role?.description || "";
}

function getActiveRoleSystemPrompt(role) {
  return getLocalizedRoleText(role, "systemPrompt") || role?.systemPrompt || role?.systemPromptEn || "";
}

function getModelOutputLanguageInstruction() {
  return state.appLanguage === "en"
    ? "All user-visible output must be written in natural English. Do not reply in Chinese."
    : "所有面向用户的输出都必须使用自然中文，不要输出英文。";
}

function formatRoundSpeakerLabel(round, role) {
  return langText(`第 ${round} 轮 · ${getActiveRoleName(role)}`, `Round ${round} · ${getActiveRoleName(role)}`);
}

function formatModeratorSummaryLabel(round, role) {
  return langText(`第 ${round} 轮小结 · ${getActiveRoleName(role)}`, `Round ${round} Summary · ${getActiveRoleName(role)}`);
}

function formatOpeningMessageLabel(role) {
  return langText(`开场 · ${getActiveRoleName(role)}`, `Opening · ${getActiveRoleName(role)}`);
}

function formatFinalJudgeLabel(role) {
  return langText(`最终总结 · ${getActiveRoleName(role)}`, `Final Judgment · ${getActiveRoleName(role)}`);
}

function localizeChatSpeakerLabel(rawLabel) {
  if (rawLabel === "系") {
    return langText("系", "System");
  }
  if (rawLabel === "我") {
    return langText("我", "You");
  }
  if (rawLabel === "研") {
    return langText("研", "Research");
  }
  if (rawLabel === "网") {
    return langText("网", "Web");
  }
  if (rawLabel === "主持AI") {
    return langText("主持AI", "Host AI");
  }
  return rawLabel;
}

function canEditRole(role) {
  return !!role && role.source !== "recommended";
}

function canDeleteRole(role) {
  return !!role && role.source !== "recommended";
}

function localizeAge(age) {
  if (!age) return age;
  if (state.appLanguage !== "en") return age;
  return String(age).replace(/(\d+)\s*\u5c81/, "$1 yrs");
}

function getLocalizedTraitDisplay(role, traitKey) {
  const rawValue = String(role?.traits?.[traitKey] || "").trim();
  if (!rawValue) {
    return "";
  }
  if (state.appLanguage !== "en") {
    return rawValue;
  }
  const explicitEnglish = String(role?.traitsEn?.[traitKey] || "").trim();
  if (explicitEnglish) {
    return explicitEnglish;
  }
  const translated = translateTraitValue(rawValue);
  if (translated && translated !== rawValue) {
    return translated;
  }
  if (!containsChinese(rawValue)) {
    return rawValue;
  }
  if (traitKey === "stance") {
    return "Custom stance";
  }
  if (traitKey === "method") {
    return "Custom method";
  }
  if (traitKey === "temper") {
    return "Custom temper";
  }
  return "Custom";
}

function buildRoleTraitsMarkup(role, options = {}) {
  const { compact = false } = options;
  const traitPairs = [
    [langText("性别", "Gender"), getRoleGenderLabel(role)],
    [langText("年龄", "Age"), localizeAge(normalizeRoleAge(role?.age) || inferRoleAge(role))],
    [langText("立场", "Stance"), getLocalizedTraitDisplay(role, "stance")],
    [langText("专长", "Method"), getLocalizedTraitDisplay(role, "method")],
    [langText("性格", "Temper"), getLocalizedTraitDisplay(role, "temper")],
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
      <p class="card-description">${escapeHtml(getLocalizedRoleText(role, "description") || "")}</p>
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
    return ensureRoleIdentityMeta(role);
  }

  const publicName = getRecommendedRolePublicName(role);
  const description = looksLikeTaskDrivenRoleDescription(role.description)
    ? buildRecommendedRoleIdentitySummary(role)
    : role.description;
  const nextRole = (description === role.description && publicName === role.name)
    ? role
    : { ...role, name: publicName, description };

  if (looksLikeInvalidDynamicRolePrompt(nextRole.systemPrompt) || description !== role.description) {
    return ensureRoleIdentityMeta({
      ...nextRole,
      systemPrompt: buildFallbackGeneratedRoleSystemPrompt({
        name: nextRole.name,
        seat: nextRole.seat,
        description,
        stance: nextRole.traits?.stance || "补充关键视角",
        method: nextRole.traits?.method || "针对性分析",
        temper: nextRole.traits?.temper || "冷静",
      }),
    });
  }

  return ensureRoleIdentityMeta(nextRole);
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
    modelId: "deepseek-ai/DeepSeek-V3.2",
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

const USER_MEMORY_KEY = "userMemory";
const PROJECT_ARTIFACTS_KEY_PREFIX = "projectArtifacts:";
const GLOBAL_KNOWLEDGE_KEY = "knowledgeEntries:global";
const PROJECT_KNOWLEDGE_KEY_PREFIX = "knowledgeEntries:project:";
const KNOWLEDGE_CATEGORY_CONFIG_KEY = "knowledgeCategories";
const KNOWLEDGE_VECTOR_SIZE = 256;
const KNOWLEDGE_CHUNK_SIZE = 320;
const KNOWLEDGE_CHUNK_OVERLAP = 48;
const KNOWLEDGE_TEXT_EXTENSIONS = new Set(["txt", "md", "markdown", "json", "csv", "xml", "html", "htm", "yaml", "yml", "js", "jsx", "ts", "tsx", "css", "py", "java", "sql"]);
const KNOWLEDGE_BINARY_FORMATS = new Map([
  ["pdf", "pdf"],
  ["docx", "docx"],
  ["xlsx", "spreadsheet"],
  ["xls", "spreadsheet"],
]);
const SHARED_AGENT_IDS = [
  "user-memory-agent",
  "project-memory-agent",
  "shared-research-agent",
  "web-search-agent",
  "multimodal-evidence-agent",
];

const DEFAULT_KNOWLEDGE_CATEGORIES = [
  { id: "company", label: "公司", labelEn: "Company" },
  { id: "product", label: "产品", labelEn: "Product" },
  { id: "process", label: "流程", labelEn: "Process" },
  { id: "reference", label: "参考", labelEn: "Reference" },
  { id: "project", label: "项目", labelEn: "Project" },
];

function buildDefaultKnowledgeCategories() {
  return DEFAULT_KNOWLEDGE_CATEGORIES.map((category) => ({ ...category }));
}

function normalizeKnowledgeCategories(records) {
  const source = Array.isArray(records) && records.length ? records : buildDefaultKnowledgeCategories();
  const seenIds = new Set();
  const normalized = source
    .filter(Boolean)
    .map((record, index) => {
      if (typeof record === "string") {
        return {
          id: `knowledge-category-${index + 1}`,
          label: record,
          labelEn: record,
        };
      }
      const label = String(record.label || record.name || record.id || "").trim();
      const id = String(record.id || "").trim() || `knowledge-category-${index + 1}`;
      if (!label || seenIds.has(id)) {
        return null;
      }
      seenIds.add(id);
      return {
        id,
        label,
        labelEn: String(record.labelEn || record.label || record.name || id).trim() || label,
      };
    })
    .filter(Boolean);

  return normalized.length ? normalized : buildDefaultKnowledgeCategories();
}

function buildEmptyUserMemory() {
  return {
    version: 1,
    lastUpdatedAt: 0,
    preferredLanguage: "zh",
    preferredModeIndex: 0,
    preferredParticipationIndex: 0,
    preferredDensityIndex: 1,
    preferredDiscussionSize: 6,
    preferredModelIndex: 0,
    preferredHostProfileId: "",
    pinnedRoleIds: [],
    usage: {
      discussionsStarted: 0,
      attachmentsUploaded: 0,
      researchRuns: 0,
      multimodalRuns: 0,
    },
    selectedRoleCounts: {},
    hostProfileCounts: {},
  };
}

function buildEmptyProjectMemory() {
  return {
    version: 1,
    topicId: "",
    title: "",
    taskSummary: "",
    sharedFacts: "",
    roundSummaries: [],
    keyEvidence: [],
    unresolvedQuestions: [],
    agentNotes: [],
    updatedAt: 0,
  };
}

function buildEmptyDiscussionState() {
  return {
    phase: "idle",
    round: 0,
    totalRounds: 0,
    speakerRoleId: "",
    nextRoleId: "",
    retrievalStatus: "idle",
    knowledgeGate: {
      shouldUseLocalKnowledge: false,
      shouldUseWebSearch: false,
      retrievalStrategy: "context_only",
      preferredCategories: [],
      preferredKeywords: [],
      localKnowledgeNeeded: [],
      decisionReasons: [],
      webSearchReasons: [],
      skippedSignals: [],
      evidenceGaps: [],
      localHitCount: 0,
      rationaleSummary: "",
    },
    nextSpeakerPackage: null,
    handoff: null,
    updatedAt: 0,
  };
}

function normalizeDiscussionState(runtimeState) {
  const base = buildEmptyDiscussionState();
  const nextState = runtimeState && typeof runtimeState === "object" ? runtimeState : {};
  return {
    ...base,
    ...nextState,
    round: Math.max(0, Number(nextState.round ?? base.round) || 0),
    totalRounds: Math.max(0, Number(nextState.totalRounds ?? base.totalRounds) || 0),
    speakerRoleId: String(nextState.speakerRoleId || base.speakerRoleId || "").trim(),
    nextRoleId: String(nextState.nextRoleId || base.nextRoleId || "").trim(),
    retrievalStatus: String(nextState.retrievalStatus || base.retrievalStatus || "idle").trim() || "idle",
    knowledgeGate: {
      ...base.knowledgeGate,
      ...(nextState.knowledgeGate && typeof nextState.knowledgeGate === "object" ? nextState.knowledgeGate : {}),
      preferredCategories: normalizeClarificationQuestions(nextState?.knowledgeGate?.preferredCategories || []),
      preferredKeywords: normalizeClarificationQuestions(nextState?.knowledgeGate?.preferredKeywords || []),
      localKnowledgeNeeded: normalizeClarificationQuestions(nextState?.knowledgeGate?.localKnowledgeNeeded || []),
      decisionReasons: normalizeClarificationQuestions(nextState?.knowledgeGate?.decisionReasons || []),
      webSearchReasons: normalizeClarificationQuestions(nextState?.knowledgeGate?.webSearchReasons || []),
      skippedSignals: normalizeClarificationQuestions(nextState?.knowledgeGate?.skippedSignals || []),
      evidenceGaps: normalizeClarificationQuestions(nextState?.knowledgeGate?.evidenceGaps || []),
      shouldUseLocalKnowledge: !!nextState?.knowledgeGate?.shouldUseLocalKnowledge,
      shouldUseWebSearch: !!nextState?.knowledgeGate?.shouldUseWebSearch,
      retrievalStrategy: String(nextState?.knowledgeGate?.retrievalStrategy || base.knowledgeGate.retrievalStrategy || "context_only").trim() || "context_only",
      localHitCount: Math.max(0, Number(nextState?.knowledgeGate?.localHitCount || 0) || 0),
      rationaleSummary: String(nextState?.knowledgeGate?.rationaleSummary || "").trim(),
    },
    nextSpeakerPackage: nextState?.nextSpeakerPackage && typeof nextState.nextSpeakerPackage === "object"
      ? {
        packageVersion: String(nextState.nextSpeakerPackage.packageVersion || "v1").trim() || "v1",
        targetRoleId: String(nextState.nextSpeakerPackage.targetRoleId || "").trim(),
        targetRoleName: String(nextState.nextSpeakerPackage.targetRoleName || "").trim(),
        sourceRoleId: String(nextState.nextSpeakerPackage.sourceRoleId || "").trim(),
        sourceRoleName: String(nextState.nextSpeakerPackage.sourceRoleName || "").trim(),
        discussionStateLabel: String(nextState.nextSpeakerPackage.discussionStateLabel || "").trim(),
        taskSummary: String(nextState.nextSpeakerPackage.taskSummary || "").trim(),
        historyDigest: String(nextState.nextSpeakerPackage.historyDigest || "").trim(),
        liveContextDigest: String(nextState.nextSpeakerPackage.liveContextDigest || "").trim(),
        retrievalStrategy: String(nextState.nextSpeakerPackage.retrievalStrategy || "context_only").trim() || "context_only",
        handoffFocus: String(nextState.nextSpeakerPackage.handoffFocus || "").trim(),
        handoffSummary: String(nextState.nextSpeakerPackage.handoffSummary || "").trim(),
        handoffKeywords: normalizeClarificationQuestions(nextState.nextSpeakerPackage.handoffKeywords || []),
        localKnowledgeHits: normalizeClarificationQuestions(nextState.nextSpeakerPackage.localKnowledgeHits || []),
        localKnowledgeQuery: String(nextState.nextSpeakerPackage.localKnowledgeQuery || "").trim(),
        webSearchSummary: String(nextState.nextSpeakerPackage.webSearchSummary || "").trim(),
        webSearchQueries: normalizeClarificationQuestions(nextState.nextSpeakerPackage.webSearchQueries || []),
        decisionReasons: normalizeClarificationQuestions(nextState.nextSpeakerPackage.decisionReasons || []),
        decisionRationale: String(nextState.nextSpeakerPackage.decisionRationale || "").trim(),
        preferredCategories: normalizeClarificationQuestions(nextState.nextSpeakerPackage.preferredCategories || []),
        preferredKeywords: normalizeClarificationQuestions(nextState.nextSpeakerPackage.preferredKeywords || []),
        evidenceGaps: normalizeClarificationQuestions(nextState.nextSpeakerPackage.evidenceGaps || []),
        preparedInput: nextState.nextSpeakerPackage.preparedInput && typeof nextState.nextSpeakerPackage.preparedInput === "object"
          ? {
            identityBlock: String(nextState.nextSpeakerPackage.preparedInput.identityBlock || "").trim(),
            taskBlock: String(nextState.nextSpeakerPackage.preparedInput.taskBlock || "").trim(),
            historyBlock: String(nextState.nextSpeakerPackage.preparedInput.historyBlock || "").trim(),
            liveContextBlock: String(nextState.nextSpeakerPackage.preparedInput.liveContextBlock || "").trim(),
            retrievalBlock: String(nextState.nextSpeakerPackage.preparedInput.retrievalBlock || "").trim(),
            packageBlock: String(nextState.nextSpeakerPackage.preparedInput.packageBlock || "").trim(),
            roleBlock: String(nextState.nextSpeakerPackage.preparedInput.roleBlock || "").trim(),
            outputBlock: String(nextState.nextSpeakerPackage.preparedInput.outputBlock || "").trim(),
          }
          : null,
      }
      : null,
    handoff: nextState?.handoff && typeof nextState.handoff === "object"
      ? {
        next_role_id: String(nextState.handoff.next_role_id || "").trim(),
        next_role_focus: String(nextState.handoff.next_role_focus || "").trim(),
        local_knowledge_needed: normalizeClarificationQuestions(nextState.handoff.local_knowledge_needed || []),
        web_search_needed: normalizeClarificationQuestions(nextState.handoff.web_search_needed || []),
        preferred_categories: normalizeClarificationQuestions(nextState.handoff.preferred_categories || []),
        preferred_keywords: normalizeClarificationQuestions(nextState.handoff.preferred_keywords || []),
        avoid_categories: normalizeClarificationQuestions(nextState.handoff.avoid_categories || []),
        missing_evidence_types: normalizeClarificationQuestions(nextState.handoff.missing_evidence_types || []),
        current_round_summary: String(nextState.handoff.current_round_summary || "").trim(),
        recommended_counterpoints: normalizeClarificationQuestions(nextState.handoff.recommended_counterpoints || []),
      }
      : null,
    updatedAt: Number(nextState.updatedAt || Date.now()) || Date.now(),
  };
}

function setDiscussionRuntimeState(patch = {}) {
  state.discussionState = normalizeDiscussionState({
    ...state.discussionState,
    ...patch,
    updatedAt: Date.now(),
  });
  renderDiscussionStatusPanel();
}

function formatDiscussionPhaseLabel(phase) {
  const phaseMap = {
    idle: langText("空闲", "Idle"),
    topic_ready: langText("话题就绪", "Topic Ready"),
    shared_brief_preparing: langText("整理事实包", "Shared Brief"),
    retrieval_pending: langText("检索中", "Retrieving"),
    retrieval_ready: langText("检索完成", "Retrieval Ready"),
    speaker_preparing: langText("角色准备中", "Preparing"),
    speaker_speaking: langText("角色发言中", "Speaking"),
    handoff_planning: langText("交接规划", "Handoff"),
    speaker_resume_ready: langText("下一位可接续", "Resume Ready"),
    round_summary_pending: langText("等待轮次总结", "Round Summary"),
    round_complete: langText("本轮完成", "Round Complete"),
    discussion_complete: langText("讨论完成", "Completed"),
  };
  return phaseMap[phase] || langText("运行中", "Running");
}

function formatDiscussionRetrievalStatusLabel(status) {
  const statusMap = {
    idle: langText("未触发检索", "No retrieval"),
    context_only: langText("仅靠上下文", "Context only"),
    local_only: langText("只使用本地知识", "Local only"),
    local_first_web_supplement: langText("先本地后网页", "Local then web"),
    web_first: langText("优先网页补查", "Web first"),
    knowledge_gate_ready: langText("知识门控已完成", "Gate ready"),
    handoff_ready: langText("交接已就绪", "Handoff ready"),
    shared_brief_pending: langText("共享事实包整理中", "Shared brief pending"),
  };
  return statusMap[status] || String(status || langText("未触发检索", "No retrieval"));
}

function buildDiscussionStatusDetailMarkup({ runtimeState, nextSpeakerPackage, knowledgeHits, evidenceGaps }) {
  if (!shouldExposeInternalWorkflow()) {
    return "";
  }
  const sections = [];
  const decisionReasons = uniqueStrings(normalizeClarificationQuestions([
    ...(runtimeState.knowledgeGate?.decisionReasons || []),
    ...(nextSpeakerPackage?.decisionReasons || []),
  ])).slice(0, 4);
  const webSearchReasons = uniqueStrings(normalizeClarificationQuestions(runtimeState.knowledgeGate?.webSearchReasons || [])).slice(0, 3);
  const skippedSignals = uniqueStrings(normalizeClarificationQuestions(runtimeState.knowledgeGate?.skippedSignals || [])).slice(0, 2);
  if (runtimeState.knowledgeGate?.rationaleSummary || nextSpeakerPackage?.decisionRationale || decisionReasons.length || webSearchReasons.length || skippedSignals.length) {
    sections.push(`
      <section class="discussion-status-detail-section">
        <div class="discussion-status-detail-title">${escapeHtml(langText("检索决策", "Retrieval Decision"))}</div>
        <div class="discussion-status-detail-copy">${escapeHtml(nextSpeakerPackage?.decisionRationale || runtimeState.knowledgeGate?.rationaleSummary || "")}</div>
        ${decisionReasons.length ? `<div class="discussion-status-detail-list">${decisionReasons.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div>` : ""}
        ${webSearchReasons.length ? `<div class="discussion-status-detail-list">${webSearchReasons.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div>` : ""}
        ${skippedSignals.length ? `<div class="discussion-status-detail-list">${skippedSignals.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div>` : ""}
      </section>
    `);
  }
  if (nextSpeakerPackage?.handoffSummary || runtimeState.handoff?.current_round_summary) {
    sections.push(`
      <section class="discussion-status-detail-section">
        <div class="discussion-status-detail-title">${escapeHtml(langText("交接摘要", "Handoff Summary"))}</div>
        <div class="discussion-status-detail-copy">${escapeHtml(nextSpeakerPackage?.handoffSummary || runtimeState.handoff?.current_round_summary || "")}</div>
      </section>
    `);
  }
  if (knowledgeHits.length) {
    sections.push(`
      <section class="discussion-status-detail-section">
        <div class="discussion-status-detail-title">${escapeHtml(langText("本地知识命中", "Local Knowledge Hits"))}</div>
        <div class="discussion-status-detail-list">${knowledgeHits.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div>
      </section>
    `);
  }
  if (nextSpeakerPackage?.webSearchSummary) {
    sections.push(`
      <section class="discussion-status-detail-section">
        <div class="discussion-status-detail-title">${escapeHtml(langText("网页补充摘要", "Web Supplement"))}</div>
        <div class="discussion-status-detail-copy">${escapeHtml(nextSpeakerPackage.webSearchSummary)}</div>
      </section>
    `);
  }
  if (evidenceGaps.length) {
    sections.push(`
      <section class="discussion-status-detail-section">
        <div class="discussion-status-detail-title">${escapeHtml(langText("证据缺口", "Evidence Gaps"))}</div>
        <div class="discussion-status-detail-list">${evidenceGaps.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div>
      </section>
    `);
  }
  return sections.join("");
}

function renderDiscussionStatusPanel() {
  if (!discussionStatusPanel) {
    return;
  }
  // 讨论状态面板属于内部运行元数据（检索策略、命中条数等），对用户无实际意义，始终隐藏
  discussionStatusPanel.classList.add("hidden");
  discussionStatusExpanded = false;
}

function getLatestSpeakerTurn(roundNotes = [], liveTurns = []) {
  const liveCandidate = [...(liveTurns || [])].reverse().find((turn) => turn?.role?.id && turn.role.id !== "user-round-input");
  if (liveCandidate) {
    return liveCandidate;
  }
  const latestRound = [...(roundNotes || [])].reverse().find((note) => Array.isArray(note?.turns) && note.turns.length);
  if (!latestRound) {
    // 第 1 轮第 1 位发言者：使用主持人开场生成的 handoff 作为初始 previousTurn
    return state.openingHandoffTurn || null;
  }
  return [...latestRound.turns].reverse().find((turn) => turn?.role?.id && turn.role.id !== "user-round-input") || null;
}

function buildSpeakerKnowledgeQuery({ summary, speakerRole, previousTurn, knowledgeGate }) {
  return [
    summary,
    getActiveRoleName(speakerRole),
    getActiveRoleSeat(speakerRole),
    previousTurn?.handoff?.next_role_focus || "",
    previousTurn?.handoff?.current_round_summary || "",
    ...(previousTurn?.handoff?.local_knowledge_needed || []),
    ...(knowledgeGate?.preferredKeywords || []),
    ...(knowledgeGate?.evidenceGaps || []),
  ].filter(Boolean).join("\n");
}

function collectLocalKnowledgeHitsForSpeaker({ summary, speakerRole, previousTurn, knowledgeGate }) {
  if (!state.knowledgeEnabled) {
    return { query: "", hits: [] };
  }
  const query = buildSpeakerKnowledgeQuery({ summary, speakerRole, previousTurn, knowledgeGate });
  if (!query.trim()) {
    return { query: "", hits: [] };
  }
  const result = filterKnowledgeEntries(getKnowledgeScopeEntries(), {
    queryOverride: query,
    categoryOverride: "all",
  });
  const rawHits = (result.entries || []).slice(0, 3);
  // 锚点补丁：若命中的不是第1块，附加第1块文本作为文档定义锚点，防止 AI 误读项目性质
  const hits = rawHits.map((entry) => {
    const chunkIdx = entry.searchChunkIndex || 1;
    if (chunkIdx <= 1) return entry;
    const chunks = Array.isArray(entry.chunks) ? entry.chunks : [];
    const anchorChunk = chunks.find((c) => (c.chunkIndex || 1) === 1);
    if (!anchorChunk?.text) return entry;
    const anchorText = summarizeText(anchorChunk.text, 150);
    return {
      ...entry,
      searchSnippet: `[文档定义·第1段] ${anchorText}\n[命中段落·第${chunkIdx}段] ${entry.searchSnippet || ""}`,
    };
  });
  return { query, hits };
}

async function prepareNextSpeakerPackage({ summary, speakerRole, previousTurn, knowledgeGate, speakerSearchDigest, liveTurns, roundNotes }) {
  const localKnowledge = collectLocalKnowledgeHitsForSpeaker({ summary, speakerRole, previousTurn, knowledgeGate });
  const nextPackage = {
    packageVersion: "v1",
    targetRoleId: speakerRole?.id || "",
    targetRoleName: getActiveRoleName(speakerRole),
    sourceRoleId: previousTurn?.role?.id || "",
    sourceRoleName: previousTurn?.role ? getActiveRoleName(previousTurn.role) : "",
    discussionStateLabel: "",
    taskSummary: String(summary || "").trim(),
    historyDigest: "",
    liveContextDigest: "",
    retrievalStrategy: String(knowledgeGate?.retrievalStrategy || "context_only").trim(),
    handoffFocus: String(previousTurn?.handoff?.next_role_focus || "").trim(),
    handoffSummary: String(previousTurn?.handoff?.current_round_summary || previousTurn?.text || "").trim(),
    handoffKeywords: normalizeClarificationQuestions(previousTurn?.handoff?.preferred_keywords || []),
    localKnowledgeHits: [],
    localKnowledgeQuery: String(localKnowledge.query || "").trim(),
    webSearchSummary: summarizeText(speakerSearchDigest || previousTurn?.searchDigest || "", 220),
    webSearchQueries: normalizeClarificationQuestions(previousTurn?.handoff?.web_search_needed || []),
    decisionReasons: normalizeClarificationQuestions(knowledgeGate?.decisionReasons || []),
    decisionRationale: String(knowledgeGate?.rationaleSummary || "").trim(),
    preferredCategories: normalizeClarificationQuestions(knowledgeGate?.preferredCategories || []),
    preferredKeywords: normalizeClarificationQuestions(knowledgeGate?.preferredKeywords || []),
    evidenceGaps: normalizeClarificationQuestions([
      ...(previousTurn?.handoff?.missing_evidence_types || []),
      ...(knowledgeGate?.evidenceGaps || []),
    ]),
    preparedInput: null,
  };
  if (localKnowledge.hits.length) {
    nextPackage.localKnowledgeHits = localKnowledge.hits.map((entry) => `${entry.title}｜${getKnowledgeCategoryLabel(entry.category)}${entry.description ? `｜[说明] ${summarizeText(entry.description, 50)}` : ""}｜${entry.searchSnippet || summarizeText(entry.summary || entry.textPreview || "", 72)}`);
    await recordKnowledgeRetrievalHits(localKnowledge.query, localKnowledge.hits, "next_speaker_package");
    appendSharedEvidenceEntries(buildKnowledgeEvidenceEntries(localKnowledge.hits, localKnowledge.query, "next_speaker_package"));
    renderRoundtableEvidenceWorkspace();
  }
  return nextPackage;
}

function buildPreparedTurnInput({
  round,
  totalRounds,
  speakerRole,
  nextRole,
  assignment,
  summary,
  roundNotes,
  liveTurns,
  compressedHistory,
  knowledgeGate,
  nextSpeakerPackage,
  orderedSpeakers,
  budgetHint,
}) {
  const discussionContextBlock = buildDiscussionContext(summary, roundNotes, liveTurns, compressedHistory);
  const retrievalLines = [
    `检索策略：${formatRetrievalStrategyLabel(knowledgeGate?.retrievalStrategy || "context_only")}`,
    knowledgeGate?.rationaleSummary ? `策略说明：${knowledgeGate.rationaleSummary}` : "",
    knowledgeGate?.decisionReasons?.length ? `触发依据：${knowledgeGate.decisionReasons.join("；")}` : "",
    knowledgeGate?.webSearchReasons?.length ? `补网页原因：${knowledgeGate.webSearchReasons.join("；")}` : "",
    knowledgeGate?.skippedSignals?.length ? `当前跳过：${knowledgeGate.skippedSignals.join("；")}` : "",
    knowledgeGate?.preferredCategories?.length ? `优先目录：${knowledgeGate.preferredCategories.join("、")}` : "",
    knowledgeGate?.preferredKeywords?.length ? `优先关键词：${knowledgeGate.preferredKeywords.join("、")}` : "",
    knowledgeGate?.localKnowledgeNeeded?.length ? `已命中的本地知识：${knowledgeGate.localKnowledgeNeeded.join("；")}` : "",
    knowledgeGate?.evidenceGaps?.length ? `当前证据缺口：${knowledgeGate.evidenceGaps.join("；")}` : "",
  ].filter(Boolean).join("\n");
  const packageBlock = nextSpeakerPackage
    ? buildNextSpeakerPackagePromptBlock(nextSpeakerPackage)
    : "";
  const preparedInput = {
    identityBlock: [
      `你现在是本场讨论里的第 ${state.discussionOrder[speakerRole.id] || 1} 位发言者，第 ${round}/${totalRounds} 轮发言。`,
      `当前讨论状态：${buildDiscussionStateLabel(round, totalRounds, speakerRole, orderedSpeakers)}`,
      getAssignmentInstruction(assignment),
      getSpeakerModeInstruction(assignment),
      getModelOutputLanguageInstruction(),
    ].filter(Boolean).join("\n\n"),
    taskBlock: [
      "请只基于任务、共享事实包、前面轮次压缩记忆和本轮已经出现的发言继续往下讲。不要假装看到了还没发言的人。",
      `任务定义：${summary}`,
      state.sharedResearchBrief ? `共享事实包：\n${state.sharedResearchBrief}` : "",
    ].filter(Boolean).join("\n\n"),
    historyBlock: compressedHistory ? `轮次压缩记忆：\n${compressedHistory}` : "",
    liveContextBlock: discussionContextBlock,
    retrievalBlock: retrievalLines,
    packageBlock,
    roleBlock: rolePromptBlock(speakerRole),
    outputBlock: [
      nextRole
        ? [
            `下一位角色：${getActiveRoleName(nextRole)}`,
            `下一位席位：${getActiveRoleSeat(nextRole)}`,
            `下一位职责：${getActiveRoleDescription(nextRole)}`,
          ].join("\n")
        : langText("下一位角色：无，本轮到你后将进入主持收束。", "Next role: none. After you, the host will compress the round."),
      nextRole
        ? `你这次必须完成两件事：第一，以「${getActiveRoleName(speakerRole)}」的身份正式发言；第二，发言结束后立刻切换身份，站在下一位发言者「${getActiveRoleName(nextRole)}」（${getActiveRoleDescription(nextRole) || getActiveRoleSeat(nextRole)}）的角度，为系统写一份资料准备需求（handoff），描述下一位最需要先查哪些本地知识、优先哪些类别、是否需要补查网页公开资料。这份 handoff 只给系统用，用户看不到，不要直接替下一位发言。`
        : "你这次只需正式发言，本轮最后一位发言后将进入主持收束，handoff 字段填空数组即可。",
      "严格输出 JSON 对象，不要 Markdown，不要解释，不要补充多余文字。",
      "JSON 必须包含字段：speaker_message, speaker_claims, speaker_risks, speaker_open_questions, handoff。",
      "handoff 必须包含字段：next_role_id, next_role_focus, local_knowledge_needed, web_search_needed, preferred_categories, preferred_keywords, avoid_categories, missing_evidence_types, current_round_summary, recommended_counterpoints。",
      "speaker_message 只写当前角色面向用户的正式发言正文，不要泄露 handoff 内容。handoff 只写给系统和下一位的资料准备信息，不要把下一位的正式发言写出来。",
      "speaker_message 不要以『我是…』『大家好，我是…』等方式开头自我介绍，其他人已经知道你是谁，直接切入你的论点或观察。",
      "如果没有足够依据，就在 speaker_message 里明确承认；不要为了凑 JSON 字段而编造证据。数组字段没有内容时返回空数组。",
      `speaker_message 篇幅要求：${budgetHint}`,
      "绝对不要输出 thinking process、analyze user input、自检步骤、constraint list 或任何内部推理过程。",
    ].filter(Boolean).join("\n\n"),
  };
  if (nextSpeakerPackage) {
    nextSpeakerPackage.discussionStateLabel = buildDiscussionStateLabel(round, totalRounds, speakerRole, orderedSpeakers);
    nextSpeakerPackage.historyDigest = summarizeText(compressedHistory || "", 180);
    nextSpeakerPackage.liveContextDigest = summarizeText(discussionContextBlock || "", 220);
    nextSpeakerPackage.preparedInput = preparedInput;
  }
  return preparedInput;
}

function hasMeaningfulNextSpeakerPackage(nextSpeakerPackage) {
  return !!(
    (nextSpeakerPackage?.retrievalStrategy && nextSpeakerPackage.retrievalStrategy !== "context_only")
    || nextSpeakerPackage?.handoffFocus
    || nextSpeakerPackage?.handoffSummary
    || nextSpeakerPackage?.decisionRationale
    || nextSpeakerPackage?.decisionReasons?.length
    || nextSpeakerPackage?.localKnowledgeHits?.length
    || nextSpeakerPackage?.webSearchSummary
    || nextSpeakerPackage?.evidenceGaps?.length
  );
}

function formatRetrievalStrategyLabel(strategy) {
  if (strategy === "local_first_web_supplement") {
    return langText("本地优先，网页补充", "Local first, web supplement");
  }
  if (strategy === "local_only") {
    return langText("仅本地知识", "Local knowledge only");
  }
  if (strategy === "web_first") {
    return langText("网页优先", "Web first");
  }
  return langText("仅上下文", "Context only");
}

function buildNextSpeakerPackagePromptBlock(nextSpeakerPackage) {
  if (!nextSpeakerPackage) {
    return "";
  }
  return [
    `当前角色准备包目标：${nextSpeakerPackage.targetRoleName || langText("未命名角色", "Unnamed Role")}`,
    nextSpeakerPackage.discussionStateLabel ? `当前轮次状态：${nextSpeakerPackage.discussionStateLabel}` : "",
    nextSpeakerPackage.retrievalStrategy ? `系统检索策略：${formatRetrievalStrategyLabel(nextSpeakerPackage.retrievalStrategy)}` : "",
    nextSpeakerPackage.decisionRationale ? `策略说明：${nextSpeakerPackage.decisionRationale}` : "",
    nextSpeakerPackage.decisionReasons?.length ? `触发依据：${nextSpeakerPackage.decisionReasons.join("；")}` : "",
    nextSpeakerPackage.sourceRoleName ? `上一位角色：${nextSpeakerPackage.sourceRoleName}` : "",
    nextSpeakerPackage.handoffFocus ? `上一位交接重点：${nextSpeakerPackage.handoffFocus}` : "",
    nextSpeakerPackage.handoffSummary ? `上一位交接摘要：${nextSpeakerPackage.handoffSummary}` : "",
    nextSpeakerPackage.handoffKeywords?.length ? `上一位 handoff 关键词：${nextSpeakerPackage.handoffKeywords.join("、")}` : "",
    nextSpeakerPackage.historyDigest ? `历史压缩摘要：${nextSpeakerPackage.historyDigest}` : "",
    nextSpeakerPackage.liveContextDigest ? `当前轮次现场摘要：${nextSpeakerPackage.liveContextDigest}` : "",
    nextSpeakerPackage.localKnowledgeQuery ? `本地检索查询：${nextSpeakerPackage.localKnowledgeQuery}` : "",
    nextSpeakerPackage.localKnowledgeHits?.length ? `系统补充的本地知识命中：\n${nextSpeakerPackage.localKnowledgeHits.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
    nextSpeakerPackage.webSearchQueries?.length ? `建议补查网页线索：${nextSpeakerPackage.webSearchQueries.join("；")}` : "",
    nextSpeakerPackage.webSearchSummary ? `系统补充的网页摘要：${nextSpeakerPackage.webSearchSummary}` : "",
    nextSpeakerPackage.preferredCategories?.length ? `优先目录：${nextSpeakerPackage.preferredCategories.join("、")}` : "",
    nextSpeakerPackage.preferredKeywords?.length ? `优先关键词：${nextSpeakerPackage.preferredKeywords.join("、")}` : "",
    nextSpeakerPackage.evidenceGaps?.length ? `当前仍缺的证据：${nextSpeakerPackage.evidenceGaps.join("；")}` : "",
  ].filter(Boolean).join("\n");
}

function buildNextSpeakerPackageMessageBody(nextSpeakerPackage) {
  if (!nextSpeakerPackage) {
    return "";
  }
  return [
    `系统正在为 ${nextSpeakerPackage.targetRoleName || langText("下一位角色", "the next role")} 组装准备包。`,
    nextSpeakerPackage.retrievalStrategy ? `检索策略：${formatRetrievalStrategyLabel(nextSpeakerPackage.retrievalStrategy)}` : "",
    nextSpeakerPackage.decisionRationale ? `策略说明：${nextSpeakerPackage.decisionRationale}` : "",
    nextSpeakerPackage.sourceRoleName ? `上一位来源：${nextSpeakerPackage.sourceRoleName}` : "",
    nextSpeakerPackage.handoffFocus ? `交接重点：${nextSpeakerPackage.handoffFocus}` : "",
    nextSpeakerPackage.localKnowledgeHits?.length ? `本地知识命中：${nextSpeakerPackage.localKnowledgeHits.join("；")}` : "",
    nextSpeakerPackage.webSearchSummary ? `网页摘要：${nextSpeakerPackage.webSearchSummary}` : "",
    nextSpeakerPackage.evidenceGaps?.length ? `证据缺口：${nextSpeakerPackage.evidenceGaps.join("；")}` : "",
  ].filter(Boolean).join("\n");
}

function buildHandoffMessageBody({ round, speakerRole, nextRole, handoff, knowledgeGate }) {
  return [
    `第 ${round} 轮交接：${getActiveRoleName(speakerRole)} 已完成本轮发言，系统开始为下一位准备资料。`,
    nextRole ? `下一位角色：${getActiveRoleName(nextRole)}（${getActiveRoleSeat(nextRole)}）` : "下一位角色：本轮发言已到末位，接下来进入主持压缩。",
    handoff?.next_role_focus ? `下一位重点：${handoff.next_role_focus}` : "",
    handoff?.current_round_summary ? `当前轮次交接摘要：${handoff.current_round_summary}` : "",
    handoff?.local_knowledge_needed?.length ? `建议优先看的本地知识：${handoff.local_knowledge_needed.join("、")}` : "",
    handoff?.web_search_needed?.length ? `建议补查的网页线索：${handoff.web_search_needed.join("；")}` : "",
    handoff?.recommended_counterpoints?.length ? `建议下一位优先反打：${handoff.recommended_counterpoints.join("；")}` : "",
    knowledgeGate?.preferredCategories?.length ? `知识门控目录：${knowledgeGate.preferredCategories.join("、")}` : "",
    knowledgeGate?.preferredKeywords?.length ? `知识门控关键词：${knowledgeGate.preferredKeywords.join("、")}` : "",
    knowledgeGate?.evidenceGaps?.length ? `当前证据缺口：${knowledgeGate.evidenceGaps.join("；")}` : "",
  ].filter(Boolean).join("\n");
}

const state = {
  appLanguage: "zh",
  appTheme: "dark",
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
  judgeLog: [],
  roleBackgroundContext: "",
  discussionState: buildEmptyDiscussionState(),
  recommendedRoleGenerationMeta: null,
  aiAutoRecommendEnabled: true,
  knowledgeEnabled: true,
  voiceReadEnabled: false,
  topicConfirmed: false,
  seatsReady: false,
  generatingSeats: false,
  lastSummary: "",
  sharedResearchBrief: "",
  openingHandoffTurn: null,
  sharedEvidenceEntries: [],
  autoTranslateEvidence: true,
  pendingRoleClarification: [],
  taskSupplementMode: false,
  generatingTimer: null,
  recommendedRoleGenerationSession: 0,
  peopleFilter: "all",
  seatSource: "recommended",
  peopleRoles: [],
  modelProfiles: [],
  recommendedRoles: [],
  mappings: { main: "", challenger: "", judge: "", multimodal: "" },
  selectedIds: new Set(),
  seatAssignments: {},
  seatLayoutCustomized: false,
  discussionOrder: {},
  ttsVoiceAssignments: {},
  seatModelAssignments: {},
  topics: [],
  activeTopicId: "",
  pendingAttachments: [],
  userMemory: buildEmptyUserMemory(),
  projectMemory: buildEmptyProjectMemory(),
  projectArtifacts: [],
  globalKnowledgeEntries: [],
  projectKnowledgeEntries: [],
  knowledgeCategories: buildDefaultKnowledgeCategories(),
  sharedAgentQuery: "",
  sharedAgentSources: "",
  sharedAgentStatus: { text: "", tone: "" },
  knowledgeScope: "global",
  projectUsesGlobalKnowledge: true,
};

let pendingConfirmResolver = null;
let pendingUserParticipationResolver = null;
let pendingDiscussionContinuationResolver = null;
let pendingContinuationButtonCard = null;
let activeRoundtableEvidenceId = "";
let activeRoundtableEvidenceFilter = "all";
let activeKnowledgeEntryId = "";
let activeKnowledgePreviewMode = "normalized";
let discussionStatusExpanded = false;
const pendingEvidenceAnalysisIds = new Set();

const peopleLibraryBackdrop = document.getElementById("people-library-backdrop");
const peopleLibraryModal = document.getElementById("people-library-modal");
const closePeopleLibrary = document.getElementById("close-people-library");
const openPeopleLibraryButton = document.getElementById("open-people-library");
const roundtableWorkbenchBackdrop = document.getElementById("roundtable-workbench-backdrop");
const roundtableWorkbenchModal = document.getElementById("roundtable-workbench-modal");
const closeRoundtableWorkbenchButton = document.getElementById("close-roundtable-workbench");
const openRoundtableWorkbenchButton = document.getElementById("open-roundtable-workbench");
const roundtableEvidenceList = document.getElementById("roundtable-evidence-list");
const roundtableEvidenceDetail = document.getElementById("roundtable-evidence-detail");
const roundtableEvidenceFilterSelect = document.getElementById("roundtable-evidence-filter");
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
const roleEditorNameEn = document.getElementById("role-editor-name-en");
const roleEditorSeat = document.getElementById("role-editor-seat");
const roleEditorGender = document.getElementById("role-editor-gender");
const roleEditorAge = document.getElementById("role-editor-age");
const roleEditorDescription = document.getElementById("role-editor-description");
const roleEditorDescriptionEn = document.getElementById("role-editor-description-en");
const roleEditorPrompt = document.getElementById("role-editor-prompt");
const roleEditorPromptEn = document.getElementById("role-editor-prompt-en");
const roleEditorStance = document.getElementById("role-editor-stance");
const roleEditorTemper = document.getElementById("role-editor-temper");
const roleEditorColor = document.getElementById("role-editor-color");
const roleEditorColorPicker = document.getElementById("role-editor-color-picker");
const roleEditorSourceLabel = document.getElementById("role-editor-source-label");
const roleEditorSourceLabelEn = document.getElementById("role-editor-source-label-en");
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
const multimodalModelSelect = document.getElementById("multimodal-model-select");

const toggleTopicsButton = document.getElementById("toggle-topics");
const topicList = document.getElementById("topic-list");
const currentTopicTitle = document.getElementById("current-topic-title");
const peopleCount = document.getElementById("people-count");
const peopleSummary = document.getElementById("people-summary");
const followToggle = document.getElementById("follow-toggle");
const appLanguageToggle = document.getElementById("app-language-toggle");
const appThemeToggle = document.getElementById("app-theme-toggle");
const currentTopicLabel = document.getElementById("current-topic-label");
const discussionStream = document.getElementById("discussion-stream");
const chatShell = document.querySelector(".chat-shell");
const composerShell = document.querySelector(".composer-shell");
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
const discussionStatusPanel = document.getElementById("discussion-status-panel");
const discussionStatusPhase = document.getElementById("discussion-status-phase");
const discussionStatusTarget = document.getElementById("discussion-status-target");
const discussionStatusRound = document.getElementById("discussion-status-round");
const discussionStatusStrategy = document.getElementById("discussion-status-strategy");
const discussionStatusRetrieval = document.getElementById("discussion-status-retrieval");
const discussionStatusKnowledge = document.getElementById("discussion-status-knowledge");
const discussionStatusGaps = document.getElementById("discussion-status-gaps");
const discussionStatusSummary = document.getElementById("discussion-status-summary");
const discussionStatusToggle = document.getElementById("discussion-status-toggle");
const discussionStatusDetail = document.getElementById("discussion-status-detail");
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
const regeneratePersonasButton = document.getElementById("regenerate-personas");
const toggleAiRoleRecommendationButton = document.getElementById("toggle-ai-role-recommendation");
const toggleKnowledgeEnabledButton = document.getElementById("toggle-knowledge-enabled");
const toggleVoiceReadButton = document.getElementById("toggle-voice-read");
const seatFeedback = document.getElementById("seat-feedback");
const seatStack = document.getElementById("seat-stack");
const seatConfigProgress = document.getElementById("seat-config-progress");
const refreshUserMemoryButton = document.getElementById("refresh-user-memory");
const refreshProjectMemoryButton = document.getElementById("refresh-project-memory");
const userMemoryPanel = document.getElementById("user-memory-panel");
const projectMemoryPanel = document.getElementById("project-memory-panel");
const sharedAgentQueryInput = document.getElementById("shared-agent-query");
const sharedAgentSourcesInput = document.getElementById("shared-agent-sources");
const runSharedResearchAgentButton = document.getElementById("run-shared-research-agent");
const runWebSearchAgentButton = document.getElementById("run-web-search-agent");
const runMultimodalAgentButton = document.getElementById("run-multimodal-agent");
const sharedAgentStatus = document.getElementById("shared-agent-status");
const knowledgeBaseBackdrop = document.getElementById("knowledge-base-backdrop");
const knowledgeBaseModal = document.getElementById("knowledge-base-modal");
const openKnowledgeBaseButton = document.getElementById("open-knowledge-base");
const closeKnowledgeBaseButton = document.getElementById("close-knowledge-base");
const knowledgeUploadTrigger = document.getElementById("knowledge-upload-trigger");
const knowledgeUploadInput = document.getElementById("knowledge-upload-input");
const knowledgeList = document.getElementById("knowledge-list");
const knowledgeDetail = document.getElementById("knowledge-detail");
const knowledgeSummaryStrip = document.getElementById("knowledge-summary-strip");
const knowledgeSelectionPanel = document.getElementById("knowledge-selection-panel");
const knowledgeEditorPanel = document.getElementById("knowledge-editor-panel");
const knowledgeSearchInputField = document.getElementById("knowledge-search");
const knowledgeCategoryFilterSelect = document.getElementById("knowledge-category-filter");
const knowledgeUploadCategorySelect = document.getElementById("knowledge-upload-category");
const knowledgeCategoryAddButton = document.getElementById("knowledge-category-add");
const knowledgeCategoryRenameButton = document.getElementById("knowledge-category-rename");
const knowledgeCategoryDeleteButton = document.getElementById("knowledge-category-delete");

let dbPromise;
let roleEditorContext = null;
let modelProfileTemplateId = "";
let modelProfileEditMode = false;
let preferredReadAloudVoices = new Map();
let readAloudQueue = [];
let activeReadAloudUtterance = null;
let activeReadAloudElement = null;
let readAloudPaused = false;
let launcherHeartbeatTimer = null;

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

function normalizeUserMemory(memory) {
  const base = buildEmptyUserMemory();
  return {
    ...base,
    ...(memory || {}),
    usage: {
      ...base.usage,
      ...(memory?.usage || {}),
    },
    selectedRoleCounts: { ...(memory?.selectedRoleCounts || {}) },
    hostProfileCounts: { ...(memory?.hostProfileCounts || {}) },
    pinnedRoleIds: Array.isArray(memory?.pinnedRoleIds) ? memory.pinnedRoleIds.filter(Boolean) : [],
  };
}

function normalizeProjectMemory(memory) {
  const base = buildEmptyProjectMemory();
  return {
    ...base,
    ...(memory || {}),
    roundSummaries: Array.isArray(memory?.roundSummaries) ? memory.roundSummaries.filter(Boolean) : [],
    keyEvidence: Array.isArray(memory?.keyEvidence) ? memory.keyEvidence.filter(Boolean) : [],
    unresolvedQuestions: Array.isArray(memory?.unresolvedQuestions) ? memory.unresolvedQuestions.filter(Boolean) : [],
    agentNotes: Array.isArray(memory?.agentNotes) ? memory.agentNotes.filter(Boolean) : [],
  };
}

function normalizeProjectArtifacts(records) {
  return Array.isArray(records)
    ? records.filter(Boolean).map((record) => ({
        id: record.id || `artifact-${Date.now()}`,
        topicId: record.topicId || state.activeTopicId || "",
        name: record.name || "附件",
        type: record.type || "application/octet-stream",
        size: Number(record.size || 0),
        kind: record.kind || (String(record.type || "").startsWith("image/") ? "image" : "file"),
        dataUrl: record.dataUrl || "",
        textPreview: record.textPreview || "",
        analysisText: record.analysisText || "",
        createdAt: Number(record.createdAt || Date.now()),
      }))
    : [];
}

function getProjectArtifactsKey(topicId) {
  return `${PROJECT_ARTIFACTS_KEY_PREFIX}${topicId}`;
}

function getProjectKnowledgeKey(topicId) {
  return `${PROJECT_KNOWLEDGE_KEY_PREFIX}${topicId}`;
}

async function loadProjectArtifacts(topicId) {
  if (!topicId) {
    return [];
  }
  return normalizeProjectArtifacts(await loadAppState(getProjectArtifactsKey(topicId), []));
}

async function saveProjectArtifacts(topicId, artifacts) {
  if (!topicId) {
    return;
  }
  await saveAppState(getProjectArtifactsKey(topicId), normalizeProjectArtifacts(artifacts));
}

async function deleteProjectArtifacts(topicId) {
  if (!topicId) {
    return;
  }
  await dbDelete(APP_STATE_STORE, getProjectArtifactsKey(topicId));
}

function normalizeKnowledgeEntries(records) {
  return Array.isArray(records)
    ? records.filter(Boolean).map((record) => ({
        id: record.id || `knowledge-${Date.now()}`,
        topicId: record.topicId || "",
        scope: record.scope === "project" ? "project" : "global",
        title: record.title || record.name || langText("未命名文档", "Untitled Document"),
        name: record.name || record.title || langText("未命名文档", "Untitled Document"),
        type: record.type || "application/octet-stream",
        size: Number(record.size || 0),
        category: record.category || "reference",
        description: record.description || "",
        tags: Array.isArray(record.tags) ? record.tags.filter(Boolean) : [],
        summary: record.summary || "",
        textPreview: record.textPreview || "",
        normalizedFormat: record.normalizedFormat || detectKnowledgeNormalizedFormat(record.name || record.title || "", record.type || "").normalizedFormat,
        conversionStatus: record.conversionStatus || ((record.textPreview || "").trim() ? "ready" : "limited"),
        chunks: normalizeKnowledgeChunks(record.chunks, record.textPreview || ""),
        originalDataUrl: record.originalDataUrl || "",
        retrievalCount: Number(record.retrievalCount || 0),
        lastRetrievedAt: Number(record.lastRetrievedAt || 0),
        retrievalLog: normalizeKnowledgeRetrievalLog(record.retrievalLog),
        sourceUrl: record.sourceUrl || "",
        storedAt: Number(record.storedAt || record.createdAt || Date.now()),
        createdAt: Number(record.createdAt || Date.now()),
      }))
    : [];
}

function normalizeKnowledgeRetrievalLog(records) {
  return Array.isArray(records)
    ? records
      .filter(Boolean)
      .map((record) => ({
        timestamp: Number(record.timestamp || 0),
        query: summarizeText(String(record.query || "").trim(), 120),
        context: String(record.context || "shared_brief").trim() || "shared_brief",
        snippet: summarizeText(String(record.snippet || "").trim(), 160),
        score: Number(record.score || 0),
        chunkIndex: Number(record.chunkIndex || 0),
      }))
      .filter((record) => record.timestamp)
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, 12)
    : [];
}

function normalizeKnowledgeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\t+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanKnowledgeLine(line) {
  return String(line || "")
    .replace(/[ \t]+/g, " ")
    .replace(/[│┃]/g, "|")
    .replace(/^[|\s]+|[|\s]+$/g, "")
    .trim();
}

function buildKnowledgeLineComparisonKey(line) {
  return cleanKnowledgeLine(String(line || "")
    .replace(/^##\s*/, "")
    .replace(/^\|\s*/, ""))
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[：:;；,.，。!！?？、()（）\[\]【】<>《》]/g, "")
    .trim();
}

function shouldSkipRepeatedStructuredLine(structuredLines, candidateLine, isTableLine = false) {
  if (!candidateLine) {
    return false;
  }
  const recentLines = structuredLines.filter(Boolean).slice(-6);
  if (!recentLines.length) {
    return false;
  }
  if (recentLines[recentLines.length - 1] === candidateLine) {
    return true;
  }
  const candidateKey = buildKnowledgeLineComparisonKey(candidateLine);
  if (!candidateKey) {
    return false;
  }
  const recentKeys = recentLines.map((line) => buildKnowledgeLineComparisonKey(line));
  if (candidateLine.startsWith("## ") && recentKeys.slice(-3).includes(candidateKey)) {
    return true;
  }
  if (!isTableLine && candidateKey.length >= 10 && recentKeys.includes(candidateKey)) {
    return true;
  }
  return false;
}

function normalizeSpreadsheetRowCells(row) {
  const cells = Array.isArray(row) ? row.map((cell) => cleanKnowledgeLine(cell)) : [];
  const firstNonEmpty = cells.findIndex(Boolean);
  if (firstNonEmpty === -1) {
    return [];
  }
  let lastNonEmpty = cells.length - 1;
  while (lastNonEmpty >= firstNonEmpty && !cells[lastNonEmpty]) {
    lastNonEmpty -= 1;
  }
  return cells.slice(firstNonEmpty, lastNonEmpty + 1).map((cell) => cell || " ");
}

function isKnowledgeHeadingLine(line) {
  const cleaned = cleanKnowledgeLine(line);
  if (!cleaned || cleaned.length > 48) {
    return false;
  }
  return /^((第[一二三四五六七八九十百0-9]+[章节部分篇])|([0-9]+(\.[0-9]+){0,3})|([一二三四五六七八九十]+、))/.test(cleaned)
    || /^(目录|概述|摘要|结论|附录|说明|设计和工艺标准)$/i.test(cleaned);
}

function looksLikeKnowledgeTableLine(line) {
  const cleaned = cleanKnowledgeLine(line);
  if (!cleaned) {
    return false;
  }
  return cleaned.includes("|") || /([□●○]{2,}|\t|\s{2,})/.test(line);
}

function buildStructuredKnowledgeText(rawText) {
  const normalized = normalizeKnowledgeText(rawText);
  if (!normalized) {
    return "";
  }
  const structuredLines = [];
  let previousWasTable = false;
  normalized.split("\n").forEach((line) => {
    const cleaned = cleanKnowledgeLine(line);
    if (!cleaned) {
      if (structuredLines[structuredLines.length - 1] !== "") {
        structuredLines.push("");
      }
      previousWasTable = false;
      return;
    }
    const tableLike = looksLikeKnowledgeTableLine(line);
    const prefixed = tableLike
      ? `| ${cleaned}`
      : isKnowledgeHeadingLine(cleaned)
        ? `## ${cleaned.replace(/^#+\s*/, "")}`
        : cleaned;
    if (shouldSkipRepeatedStructuredLine(structuredLines, prefixed, tableLike)) {
      previousWasTable = tableLike;
      return;
    }
    if (tableLike && previousWasTable) {
      structuredLines.push(prefixed);
    } else if (structuredLines[structuredLines.length - 1] && !isKnowledgeHeadingLine(cleaned) && !tableLike) {
      structuredLines[structuredLines.length - 1] = `${structuredLines[structuredLines.length - 1]} ${prefixed}`.trim();
    } else {
      structuredLines.push(prefixed);
    }
    previousWasTable = tableLike;
  });
  return structuredLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function splitKnowledgeBlocks(text) {
  const structured = buildStructuredKnowledgeText(text);
  if (!structured) {
    return [];
  }
  const blocks = [];
  let currentHeading = "";
  let currentLines = [];
  const flush = () => {
    const body = currentLines.join("\n").trim();
    if (!body && !currentHeading) {
      currentLines = [];
      return;
    }
    blocks.push({
      heading: currentHeading,
      text: [currentHeading, body].filter(Boolean).join("\n"),
    });
    currentLines = [];
  };
  structured.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      return;
    }
    if (trimmed.startsWith("## ")) {
      flush();
      currentHeading = trimmed.replace(/^##\s*/, "").trim();
      currentLines = [];
      return;
    }
    currentLines.push(trimmed.startsWith("| ") ? trimmed.replace(/^\|\s*/, "") : trimmed);
  });
  flush();
  return blocks;
}

function detectKnowledgeNormalizedFormat(fileName = "", fileType = "") {
  const extension = String(fileName).match(/\.([A-Za-z0-9]+)$/)?.[1]?.toLowerCase() || "";
  if (KNOWLEDGE_TEXT_EXTENSIONS.has(extension)) {
    if (["md", "markdown"].includes(extension)) {
      return { supported: true, normalizedFormat: "markdown", extension };
    }
    if (extension === "json") {
      return { supported: true, normalizedFormat: "json", extension };
    }
    if (extension === "csv") {
      return { supported: true, normalizedFormat: "csv", extension };
    }
    if (["html", "htm", "xml"].includes(extension)) {
      return { supported: true, normalizedFormat: "html", extension };
    }
    if (["yaml", "yml"].includes(extension)) {
      return { supported: true, normalizedFormat: "yaml", extension };
    }
    if (["js", "jsx", "ts", "tsx", "css", "py", "java", "sql"].includes(extension)) {
      return { supported: true, normalizedFormat: "source_code", extension };
    }
    return { supported: true, normalizedFormat: "plain_text", extension };
  }
  if (KNOWLEDGE_BINARY_FORMATS.has(extension)) {
    return { supported: true, normalizedFormat: KNOWLEDGE_BINARY_FORMATS.get(extension), extension };
  }
  if (/^text\//i.test(fileType) || /^application\/(json|xml)/i.test(fileType)) {
    return { supported: true, normalizedFormat: "plain_text", extension };
  }
  if (fileType === "application/pdf") {
    return { supported: true, normalizedFormat: "pdf", extension: extension || "pdf" };
  }
  if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return { supported: true, normalizedFormat: "docx", extension: extension || "docx" };
  }
  if (/spreadsheetml|ms-excel/i.test(fileType)) {
    return { supported: true, normalizedFormat: "spreadsheet", extension: extension || "xlsx" };
  }
  return { supported: false, normalizedFormat: extension ? extension.toUpperCase() : langText("未支持", "Unsupported"), extension };
}

function getKnowledgeConversionStatusLabel(status) {
  switch (status) {
    case "ready":
      return langText("已标准化", "Ready");
    case "unsupported":
      return langText("未纳入检索", "Not Searchable");
    default:
      return langText("整理受限", "Limited");
  }
}

function buildKnowledgeTerms(text) {
  const normalized = normalizeKnowledgeText(text).toLowerCase();
  if (!normalized) {
    return [];
  }
  const terms = [];
  let currentAscii = "";
  for (const char of normalized) {
    if (/^[a-z0-9_]$/i.test(char)) {
      currentAscii += char;
      continue;
    }
    if (currentAscii) {
      terms.push(currentAscii);
      if (currentAscii.length >= 4) {
        for (let index = 0; index <= currentAscii.length - 3; index += 1) {
          terms.push(currentAscii.slice(index, index + 3));
        }
      }
      currentAscii = "";
    }
    if (char >= "\u4e00" && char <= "\u9fff") {
      terms.push(char);
    }
  }
  if (currentAscii) {
    terms.push(currentAscii);
    if (currentAscii.length >= 4) {
      for (let index = 0; index <= currentAscii.length - 3; index += 1) {
        terms.push(currentAscii.slice(index, index + 3));
      }
    }
  }
  const joinedCjk = [...normalized].filter((char) => char >= "\u4e00" && char <= "\u9fff").join("");
  if (joinedCjk.length >= 2) {
    for (let index = 0; index <= joinedCjk.length - 2; index += 1) {
      terms.push(joinedCjk.slice(index, index + 2));
    }
  }
  return [...new Set(terms.filter(Boolean))].slice(0, 512);
}

function buildKnowledgeVector(text) {
  const vector = new Array(KNOWLEDGE_VECTOR_SIZE).fill(0);
  const terms = buildKnowledgeTerms(text);
  if (!terms.length) {
    return vector;
  }
  terms.forEach((term) => {
    const weight = 1 + Math.min(term.length, 12) / 12;
    ["a", "b"].forEach((salt) => {
      const bucket = hashString(`${salt}:${term}`) % KNOWLEDGE_VECTOR_SIZE;
      const sign = hashString(`${salt}:sign:${term}`) % 2 === 0 ? 1 : -1;
      vector[bucket] += sign * weight;
    });
  });
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) {
    return vector;
  }
  return vector.map((value) => value / norm);
}

function cosineSimilarity(left, right) {
  if (!left?.length || !right?.length || left.length !== right.length) {
    return 0;
  }
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    sum += left[index] * right[index];
  }
  return sum;
}

function buildKnowledgeChunks(text, maxSize = KNOWLEDGE_CHUNK_SIZE, overlap = KNOWLEDGE_CHUNK_OVERLAP) {
  const blocks = splitKnowledgeBlocks(text);
  if (!blocks.length) {
    return [];
  }
  const chunks = [];
  let chunkIndex = 1;
  let currentText = "";
  let carryHeading = "";
  const flushChunk = () => {
    const normalizedChunk = normalizeKnowledgeText(currentText);
    if (!normalizedChunk) {
      currentText = carryHeading ? `${carryHeading}\n` : "";
      return;
    }
    chunks.push({ chunkIndex, text: normalizedChunk });
    chunkIndex += 1;
    const overlapText = normalizedChunk.slice(Math.max(0, normalizedChunk.length - overlap)).trim();
    currentText = [carryHeading, overlapText].filter(Boolean).join("\n").trim();
    if (currentText) {
      currentText += "\n";
    }
  };

  blocks.forEach((block) => {
    const blockText = normalizeKnowledgeText(block.text);
    if (!blockText) {
      return;
    }
    if (block.heading) {
      carryHeading = block.heading;
    }
    const candidate = [currentText, blockText].filter(Boolean).join("\n").trim();
    if (!currentText || candidate.length <= maxSize + 80) {
      currentText = candidate;
      return;
    }
    flushChunk();
    currentText = [carryHeading, blockText].filter(Boolean).join("\n").trim();
    if (currentText.length > maxSize + 120) {
      let remaining = currentText;
      while (remaining.length > maxSize + 120) {
        const preferredBreak = Math.max(
          remaining.lastIndexOf("\n", maxSize),
          remaining.lastIndexOf("。", maxSize),
          remaining.lastIndexOf("；", maxSize),
          remaining.lastIndexOf(" ", maxSize)
        );
        const cutIndex = preferredBreak > 80 ? preferredBreak + 1 : maxSize;
        chunks.push({ chunkIndex, text: remaining.slice(0, cutIndex).trim() });
        chunkIndex += 1;
        remaining = [carryHeading, remaining.slice(Math.max(0, cutIndex - overlap)).trim()].filter(Boolean).join("\n").trim();
      }
      currentText = remaining;
    }
  });

  if (currentText.trim()) {
    chunks.push({
      chunkIndex,
      text: normalizeKnowledgeText(currentText),
    });
  }
  return chunks.filter((chunk) => chunk.text);
}

function normalizeKnowledgeChunks(records, fallbackText = "") {
  const fallbackNormalized = normalizeKnowledgeText(fallbackText);
  if (Array.isArray(records) && records.length) {
    const normalizedRecords = records
      .filter(Boolean)
      .map((record, index) => ({
        chunkIndex: Number(record.chunkIndex || index + 1),
        text: normalizeKnowledgeText(record.text || ""),
      }))
      .filter((record) => record.text);
    if (fallbackNormalized && fallbackNormalized.length >= 240) {
      const totalChunkLength = normalizedRecords.reduce((sum, record) => sum + record.text.length, 0);
      const chunkCoverage = totalChunkLength / Math.max(fallbackNormalized.length, 1);
      const hasMeaningfulChunk = normalizedRecords.some((record) => record.text.length >= Math.min(180, Math.floor(fallbackNormalized.length * 0.28)));
      if (!normalizedRecords.length || chunkCoverage < 0.45 || !hasMeaningfulChunk) {
        return buildKnowledgeChunks(fallbackNormalized);
      }
    }
    return normalizedRecords;
  }
  return buildKnowledgeChunks(fallbackNormalized);
}

function shouldExposeInternalWorkflow() {
  return false;
}

function buildKnowledgeSnippet(text, matchedTerms = []) {
  const normalized = normalizeKnowledgeText(text);
  if (!normalized) {
    return "";
  }
  const firstTerm = matchedTerms.find(Boolean);
  if (!firstTerm) {
    return summarizeText(normalized, 110);
  }
  const lowerText = normalized.toLowerCase();
  const lowerTerm = firstTerm.toLowerCase();
  const termIndex = lowerText.indexOf(lowerTerm);
  if (termIndex === -1) {
    return summarizeText(normalized, 110);
  }
  const start = Math.max(0, termIndex - 48);
  const end = Math.min(normalized.length, termIndex + firstTerm.length + 72);
  const snippet = normalized.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${snippet}${end < normalized.length ? "…" : ""}`;
}

function summarizeStructuredKnowledgeText(value, maxLength = 4000) {
  const structured = buildStructuredKnowledgeText(value);
  if (!structured) {
    return "";
  }
  if (structured.length <= maxLength) {
    return structured;
  }
  return `${structured.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function getKnowledgeCategoryDefinition(categoryId) {
  return normalizeKnowledgeCategories(state.knowledgeCategories).find((category) => category.id === categoryId) || null;
}

function getKnowledgeCategoryLabel(categoryId) {
  if (!categoryId) {
    return langText("未分类", "Uncategorized");
  }
  const category = getKnowledgeCategoryDefinition(categoryId);
  if (!category) {
    return String(categoryId);
  }
  return state.appLanguage === "en"
    ? String(category.labelEn || category.label || category.id)
    : String(category.label || category.labelEn || category.id);
}

function getKnowledgeCategoryShortLabel(label, maxChars = 12) {
  const chars = Array.from(String(label || "").trim());
  if (chars.length <= maxChars) {
    return chars.join("");
  }
  return `${chars.slice(0, Math.max(0, maxChars - 3)).join("")}...`;
}

function renderKnowledgeCategoryOptions() {
  const categories = normalizeKnowledgeCategories(state.knowledgeCategories);
  state.knowledgeCategories = categories;

  if (knowledgeCategoryFilterSelect) {
    const selectedValue = knowledgeCategoryFilterSelect.value || "all";
    knowledgeCategoryFilterSelect.innerHTML = [
      `<option value="all">${escapeHtml(langText("全部", "All"))}</option>`,
      ...categories.map((category) => {
        const label = getKnowledgeCategoryLabel(category.id);
        return `<option value="${escapeHtml(category.id)}" title="${escapeHtml(label)}">${escapeHtml(getKnowledgeCategoryShortLabel(label))}</option>`;
      }),
    ].join("");
    knowledgeCategoryFilterSelect.value = categories.some((category) => category.id === selectedValue) ? selectedValue : "all";
    const selectedCategoryLabel = selectedValue === "all" ? langText("全部", "All") : getKnowledgeCategoryLabel(knowledgeCategoryFilterSelect.value);
    knowledgeCategoryFilterSelect.title = selectedCategoryLabel;
  }

  if (knowledgeUploadCategorySelect) {
    const selectedValue = String(knowledgeUploadCategorySelect.value || "").trim();
    knowledgeUploadCategorySelect.innerHTML = [
      `<option value="">${escapeHtml(langText("请选择目录", "Choose Folder"))}</option>`,
      ...categories.map((category) => {
        const label = getKnowledgeCategoryLabel(category.id);
        return `<option value="${escapeHtml(category.id)}" title="${escapeHtml(label)}">${escapeHtml(getKnowledgeCategoryShortLabel(label))}</option>`;
      }),
    ].join("");
    knowledgeUploadCategorySelect.value = categories.some((category) => category.id === selectedValue) ? selectedValue : "";
    knowledgeUploadCategorySelect.title = knowledgeUploadCategorySelect.value ? getKnowledgeCategoryLabel(knowledgeUploadCategorySelect.value) : langText("请选择目录", "Choose Folder");
  }
}

async function saveKnowledgeCategories(categories) {
  state.knowledgeCategories = normalizeKnowledgeCategories(categories);
  await saveAppState(KNOWLEDGE_CATEGORY_CONFIG_KEY, state.knowledgeCategories);
}

function createKnowledgeCategoryId() {
  return `knowledge-category-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getSelectedKnowledgeCategoryIdForManagement() {
  const selectedCategoryId = String(knowledgeUploadCategorySelect?.value || "").trim();
  if (selectedCategoryId) {
    return selectedCategoryId;
  }
  updateSharedAgentStatus(langText("请先在“上传到目录”里选中一个目录，再执行改名或删除。", "Choose a folder in the upload selector before renaming or deleting it."), "error");
  knowledgeUploadCategorySelect?.focus();
  return "";
}

function normalizeKnowledgeCategoryName(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasDuplicateKnowledgeCategoryName(name, ignoreId = "") {
  const normalizedName = normalizeKnowledgeCategoryName(name).toLowerCase();
  return normalizeKnowledgeCategories(state.knowledgeCategories).some((category) => category.id !== ignoreId && normalizeKnowledgeCategoryName(category.label).toLowerCase() === normalizedName);
}

async function remapKnowledgeCategoryAcrossEntries(sourceCategoryId, targetCategoryId) {
  if (!sourceCategoryId || !targetCategoryId || sourceCategoryId === targetCategoryId) {
    return;
  }

  const remapEntries = (entries) => {
    let changed = false;
    const nextEntries = normalizeKnowledgeEntries(entries).map((entry) => {
      if (entry.category !== sourceCategoryId) {
        return entry;
      }
      changed = true;
      return {
        ...entry,
        category: targetCategoryId,
        tags: Array.isArray(entry.tags) ? entry.tags.filter((tag) => tag !== sourceCategoryId) : [],
      };
    });
    return { changed, nextEntries };
  };

  const globalResult = remapEntries(state.globalKnowledgeEntries);
  if (globalResult.changed) {
    state.globalKnowledgeEntries = globalResult.nextEntries;
    await saveGlobalKnowledgeEntries(state.globalKnowledgeEntries);
  }

  const activeTopicId = state.activeTopicId;
  for (const topic of state.topics) {
    if (!topic?.id) {
      continue;
    }
    const entries = topic.id === activeTopicId ? state.projectKnowledgeEntries : await loadProjectKnowledgeEntries(topic.id);
    const projectResult = remapEntries(entries);
    if (!projectResult.changed) {
      continue;
    }
    if (topic.id === activeTopicId) {
      state.projectKnowledgeEntries = projectResult.nextEntries;
    }
    await saveProjectKnowledgeEntries(topic.id, projectResult.nextEntries);
  }
}

async function handleAddKnowledgeCategory() {
  const rawName = window.prompt(langText("输入新目录名称", "Enter a new folder name"), "");
  if (rawName === null) {
    return;
  }
  const nextName = normalizeKnowledgeCategoryName(rawName);
  if (!nextName) {
    updateSharedAgentStatus(langText("目录名称不能为空。", "Folder name cannot be empty."), "error");
    return;
  }
  if (hasDuplicateKnowledgeCategoryName(nextName)) {
    updateSharedAgentStatus(langText("已经有同名目录了。", "A folder with the same name already exists."), "error");
    return;
  }
  const nextCategory = { id: createKnowledgeCategoryId(), label: nextName, labelEn: nextName };
  await saveKnowledgeCategories([...state.knowledgeCategories, nextCategory]);
  renderKnowledgeCategoryOptions();
  if (knowledgeUploadCategorySelect) {
    knowledgeUploadCategorySelect.value = nextCategory.id;
  }
  renderKnowledgeBaseWorkspace();
  updateSharedAgentStatus(langText(`已新增目录“${nextName}”。`, `Added folder "${nextName}".`), "success");
}

async function handleRenameKnowledgeCategory() {
  const categoryId = getSelectedKnowledgeCategoryIdForManagement();
  if (!categoryId) {
    return;
  }
  const targetCategory = getKnowledgeCategoryDefinition(categoryId);
  if (!targetCategory) {
    updateSharedAgentStatus(langText("当前目录不存在，刷新后再试。", "The selected folder no longer exists. Refresh and try again."), "error");
    return;
  }
  const rawName = window.prompt(langText("输入新的目录名称", "Enter the new folder name"), targetCategory.label || "");
  if (rawName === null) {
    return;
  }
  const nextName = normalizeKnowledgeCategoryName(rawName);
  if (!nextName) {
    updateSharedAgentStatus(langText("目录名称不能为空。", "Folder name cannot be empty."), "error");
    return;
  }
  if (hasDuplicateKnowledgeCategoryName(nextName, categoryId)) {
    updateSharedAgentStatus(langText("已经有同名目录了。", "A folder with the same name already exists."), "error");
    return;
  }
  await saveKnowledgeCategories(state.knowledgeCategories.map((category) => category.id === categoryId ? { ...category, label: nextName, labelEn: nextName } : category));
  renderKnowledgeCategoryOptions();
  if (knowledgeUploadCategorySelect) {
    knowledgeUploadCategorySelect.value = categoryId;
  }
  renderKnowledgeBaseWorkspace();
  updateSharedAgentStatus(langText(`目录已改名为“${nextName}”。`, `Folder renamed to "${nextName}".`), "success");
}

async function handleDeleteKnowledgeCategory() {
  const categoryId = getSelectedKnowledgeCategoryIdForManagement();
  if (!categoryId) {
    return;
  }
  const categories = normalizeKnowledgeCategories(state.knowledgeCategories);
  if (categories.length <= 1) {
    updateSharedAgentStatus(langText("至少要保留一个目录，当前不能再删。", "At least one folder must remain."), "error");
    return;
  }
  const targetCategory = categories.find((category) => category.id === categoryId);
  if (!targetCategory) {
    updateSharedAgentStatus(langText("当前目录不存在，刷新后再试。", "The selected folder no longer exists. Refresh and try again."), "error");
    return;
  }
  const fallbackCategory = categories.find((category) => category.id !== categoryId) || categories[0];
  const confirmed = await openConfirmDialog({
    title: langText("删除目录", "Delete Folder"),
    message: langText(`删除目录“${targetCategory.label}”后，原来挂在这个目录下的文档会自动改到“${getKnowledgeCategoryLabel(fallbackCategory.id)}”。`, `Delete folder "${targetCategory.label}"? Existing documents under it will be moved to "${getKnowledgeCategoryLabel(fallbackCategory.id)}".`),
    confirmText: langText("删除", "Delete"),
  });
  if (!confirmed) {
    return;
  }
  await remapKnowledgeCategoryAcrossEntries(categoryId, fallbackCategory.id);
  await saveKnowledgeCategories(categories.filter((category) => category.id !== categoryId));
  renderKnowledgeCategoryOptions();
  if (knowledgeCategoryFilterSelect) {
    knowledgeCategoryFilterSelect.value = "all";
  }
  if (knowledgeUploadCategorySelect) {
    knowledgeUploadCategorySelect.value = "";
  }
  renderKnowledgeBaseWorkspace();
  updateSharedAgentStatus(langText(`目录“${targetCategory.label}”已删除，相关文档已转到“${getKnowledgeCategoryLabel(fallbackCategory.id)}”。`, `Folder "${targetCategory.label}" was deleted and its documents were moved to "${getKnowledgeCategoryLabel(fallbackCategory.id)}".`), "success");
}

async function loadGlobalKnowledgeEntries() {
  return normalizeKnowledgeEntries(await loadAppState(GLOBAL_KNOWLEDGE_KEY, []));
}

async function saveGlobalKnowledgeEntries(entries) {
  await saveAppState(GLOBAL_KNOWLEDGE_KEY, normalizeKnowledgeEntries(entries));
}

async function loadProjectKnowledgeEntries(topicId) {
  if (!topicId) {
    return [];
  }
  return normalizeKnowledgeEntries(await loadAppState(getProjectKnowledgeKey(topicId), []));
}

async function saveProjectKnowledgeEntries(topicId, entries) {
  if (!topicId) {
    return;
  }
  await saveAppState(getProjectKnowledgeKey(topicId), normalizeKnowledgeEntries(entries));
}

async function saveKnowledgeEntriesByEntryScope(entry, nextEntries) {
  if (entry?.scope === "project") {
    state.projectKnowledgeEntries = normalizeKnowledgeEntries(nextEntries);
    await saveProjectKnowledgeEntries(entry.topicId || state.activeTopicId, state.projectKnowledgeEntries);
    return;
  }
  state.globalKnowledgeEntries = normalizeKnowledgeEntries(nextEntries);
  await saveGlobalKnowledgeEntries(state.globalKnowledgeEntries);
}

async function removeKnowledgeEntry(entryId) {
  const allEntries = getKnowledgeScopeEntries();
  const targetEntry = allEntries.find((entry) => entry.id === entryId);
  if (!targetEntry) {
    return false;
  }
  const confirmed = await openConfirmDialog({
    title: langText("删除知识条目", "Delete Knowledge Entry"),
    message: langText(`删除“${targetEntry.title}”后，这条资料在知识库中的原文件副本、标准化结果、chunks 和命中记录都会一起从当前浏览器存储中移除。已经导出到你磁盘上的 JSON 文件不会被自动删除。`, `Deleting "${targetEntry.title}" will remove its stored original file copy, normalized payload, chunks, and retrieval history from this browser storage. Any JSON files already exported to disk will not be deleted automatically.`),
    confirmText: langText("删除", "Delete"),
  });
  if (!confirmed) {
    return false;
  }
  const nextEntries = allEntries.filter((entry) => entry.id !== entryId);
  await saveKnowledgeEntriesByEntryScope(targetEntry, nextEntries);
  activeKnowledgeEntryId = nextEntries[0]?.id || "";
  renderKnowledgeBaseWorkspace();
  updateSharedAgentStatus(langText(`已删除知识条目“${targetEntry.title}”。`, `Deleted knowledge entry "${targetEntry.title}".`), "success");
  return true;
}

async function buildKnowledgeFileFromEntry(entry) {
  if (entry.originalDataUrl) {
    const response = await fetch(entry.originalDataUrl);
    const blob = await response.blob();
    return new File([blob], entry.name || entry.title || "knowledge-file", { type: entry.type || blob.type || "application/octet-stream" });
  }
  const fallbackPayload = entry.textPreview || entry.summary || "";
  return new File([fallbackPayload], entry.name || `${sanitizeKnowledgeFileBaseName(entry)}.txt`, { type: "text/plain;charset=utf-8" });
}

async function rebuildKnowledgeEntry(entryId) {
  const allEntries = getKnowledgeScopeEntries();
  const targetEntry = allEntries.find((entry) => entry.id === entryId);
  if (!targetEntry) {
    return false;
  }
  updateSharedAgentStatus(langText(`正在重建“${targetEntry.title}”的标准化结果...`, `Rebuilding normalized payload for "${targetEntry.title}"...`), "pending");
  const rebuiltFile = await buildKnowledgeFileFromEntry(targetEntry);
  const rebuiltEntry = await buildKnowledgeEntryFromFile(rebuiltFile, {
    scope: targetEntry.scope,
    category: targetEntry.category,
    topicId: targetEntry.topicId || "",
  });
  const nextEntries = allEntries.map((entry) => entry.id === entryId ? {
    ...rebuiltEntry,
    id: targetEntry.id,
    createdAt: targetEntry.createdAt,
    storedAt: Date.now(),
    retrievalCount: targetEntry.retrievalCount || 0,
    lastRetrievedAt: targetEntry.lastRetrievedAt || 0,
    retrievalLog: normalizeKnowledgeRetrievalLog(targetEntry.retrievalLog),
  } : entry);
  await saveKnowledgeEntriesByEntryScope(targetEntry, nextEntries);
  activeKnowledgeEntryId = targetEntry.id;
  renderKnowledgeBaseWorkspace();
  updateSharedAgentStatus(langText(`已重建“${targetEntry.title}”的标准化结果。`, `Rebuilt normalized payload for "${targetEntry.title}".`), "success");
  return true;
}

async function deleteProjectKnowledgeEntries(topicId) {
  if (!topicId) {
    return;
  }
  await dbDelete(APP_STATE_STORE, getProjectKnowledgeKey(topicId));
}

function summarizeText(value, maxLength = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function uniqueStrings(items) {
  return [...new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function extractOpenQuestionsFromText(text) {
  return String(text || "")
    .split(/[\n。！？!?]/)
    .map((item) => item.trim())
    .filter((item) => item && (/[?？]/.test(item) || /待|尚未|不能|有待|仍需|还需|不确定/.test(item)))
    .slice(0, 6);
}

function getTopCountEntries(record, limit = 4) {
  return Object.entries(record || {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit);
}

function getReadableRoleNameById(roleId) {
  return getRoleById(roleId)?.name || roleId;
}

function buildUserMemoryPrompt() {
  const userMemory = normalizeUserMemory(state.userMemory);
  const preferredRoles = getTopCountEntries(userMemory.selectedRoleCounts)
    .map(([roleId]) => getReadableRoleNameById(roleId))
    .filter(Boolean)
    .join("、");
  const hostProfile = getConfiguredProfileById(userMemory.preferredHostProfileId);
  return [
    hostProfile ? `用户常用主持模型：${hostProfile.displayName}` : "",
    `用户常用讨论目标：${modeValues[userMemory.preferredModeIndex] || modeValues[0]}`,
    `用户常用回答力度：${densityValues[userMemory.preferredDensityIndex] || densityValues[1]}`,
    `用户常用讨论规模：${userMemory.preferredDiscussionSize} 人`,
    preferredRoles ? `用户偏好的常用人物：${preferredRoles}` : "",
  ].filter(Boolean).join("\n");
}

function buildProjectMemoryPrompt() {
  const projectMemory = normalizeProjectMemory(state.projectMemory);
  return [
    projectMemory.taskSummary ? `项目记忆中的任务定义：${projectMemory.taskSummary}` : "",
    projectMemory.sharedFacts ? `项目记忆中的共享事实：${projectMemory.sharedFacts}` : "",
    projectMemory.roundSummaries.length ? `项目记忆中的轮次摘要：\n${projectMemory.roundSummaries.join("\n")}` : "",
    projectMemory.unresolvedQuestions.length ? `项目记忆中的未决问题：${projectMemory.unresolvedQuestions.join("；")}` : "",
  ].filter(Boolean).join("\n\n");
}

function deriveProjectMemoryFromState() {
  const artifactEvidence = state.projectArtifacts.map((artifact) => {
    const typeLabel = artifact.kind === "image"
      ? langText("图片", "Image")
      : artifact.textPreview
        ? langText("文本附件", "Text Attachment")
        : langText("附件", "Attachment");
    const detail = artifact.textPreview ? `：${summarizeText(artifact.textPreview, 72)}` : "";
    return `${artifact.name}（${typeLabel}${detail}）`;
  });

  return normalizeProjectMemory({
    ...state.projectMemory,
    topicId: state.activeTopicId,
    title: deriveTopicTitle(),
    taskSummary: state.lastSummary,
    sharedFacts: state.sharedResearchBrief,
    roundSummaries: state.discussionRoundNotes.map((note) => `第 ${note.round} 轮：${summarizeText(note.moderatorSummary || "无", 120)}`),
    keyEvidence: uniqueStrings([
      ...artifactEvidence,
      ...collectSharedResearchEvidenceEntries(),
    ]).slice(0, 8),
    unresolvedQuestions: uniqueStrings([
      ...state.pendingRoleClarification,
      ...extractOpenQuestionsFromText(state.sharedResearchBrief),
      ...extractOpenQuestionsFromText(state.latestReportText),
    ]).slice(0, 6),
    updatedAt: Date.now(),
  });
}

function collectSharedResearchEvidenceEntries() {
  return String(state.sharedResearchBrief || "")
    .split(/[\n；;]/)
    .map((item) => summarizeText(item, 96))
    .filter(Boolean)
    .slice(0, 4);
}

function updateSharedAgentStatus(text, tone = "") {
  state.sharedAgentStatus = { text, tone };
  if (!sharedAgentStatus) {
    return;
  }
  sharedAgentStatus.textContent = text;
  sharedAgentStatus.className = `agent-status ${tone}`.trim();
}

function requireKnowledgeUploadCategory() {
  const category = String(knowledgeUploadCategorySelect?.value || "").trim();
  if (!category) {
    knowledgeUploadCategorySelect?.focus();
    throw new Error(langText("上传前请先选择知识目录。", "Please choose a knowledge folder before uploading."));
  }
  return category;
}

async function persistUserMemory() {
  state.userMemory = normalizeUserMemory(state.userMemory);
  await saveAppState(USER_MEMORY_KEY, state.userMemory);
}

function syncUserMemoryFromState(reason = "passive", options = {}) {
  const { attachmentCount = 0 } = options;
  const userMemory = normalizeUserMemory(state.userMemory);
  userMemory.lastUpdatedAt = Date.now();
  userMemory.preferredLanguage = state.appLanguage;
  userMemory.preferredModeIndex = state.modeIndex;
  userMemory.preferredParticipationIndex = state.participationIndex;
  userMemory.preferredDensityIndex = state.densityIndex;
  userMemory.preferredDiscussionSize = state.discussionSize;
  userMemory.preferredModelIndex = state.modelIndex;
  userMemory.preferredHostProfileId = state.mappings.main || "";
  userMemory.pinnedRoleIds = getOrderedSelectedRoleIds().slice(0, 6);

  if (reason === "discussion-start") {
    userMemory.usage.discussionsStarted += 1;
    if (state.mappings.main) {
      userMemory.hostProfileCounts[state.mappings.main] = (userMemory.hostProfileCounts[state.mappings.main] || 0) + 1;
    }
    getOrderedSelectedRoleIds().forEach((roleId) => {
      userMemory.selectedRoleCounts[roleId] = (userMemory.selectedRoleCounts[roleId] || 0) + 1;
    });
  }

  if (reason === "attachments") {
    userMemory.usage.attachmentsUploaded += attachmentCount;
  }

  if (reason === "research") {
    userMemory.usage.researchRuns += 1;
  }

  if (reason === "multimodal") {
    userMemory.usage.multimodalRuns += 1;
  }

  state.userMemory = userMemory;
}

function appendProjectAgentNote(label, content) {
  const projectMemory = deriveProjectMemoryFromState();
  const note = `${label}：${summarizeText(content, 180)}`;
  projectMemory.agentNotes = uniqueStrings([note, ...(state.projectMemory?.agentNotes || [])]).slice(0, 6);
  state.projectMemory = projectMemory;
}

async function hydrateProjectScopedState(topicId = state.activeTopicId) {
  state.projectArtifacts = await loadProjectArtifacts(topicId);
  state.projectKnowledgeEntries = await loadProjectKnowledgeEntries(topicId);
  const activeTopic = state.topics.find((topic) => topic.id === topicId);
  state.projectMemory = normalizeProjectMemory(activeTopic?.snapshot?.projectMemory || deriveProjectMemoryFromState());
}

function syncSharedAgentInputsFromState() {
  if (sharedAgentQueryInput) {
    sharedAgentQueryInput.value = state.sharedAgentQuery || "";
  }
  if (sharedAgentSourcesInput) {
    sharedAgentSourcesInput.value = state.sharedAgentSources || "";
  }
}

function parseSourceUrls(text) {
  return uniqueStrings(String(text || "").split(/[\n\s]+/).filter((item) => /^https?:\/\//i.test(item)));
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsArrayBuffer(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsText(file);
  });
}

async function extractPdfTextPreview(file) {
  if (!window.pdfjsLib) {
    return "";
  }
  if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  const pageCount = Math.min(pdf.numPages || 0, 5);
  for (let index = 1; index <= pageCount; index += 1) {
    const page = await pdf.getPage(index);
    const content = await page.getTextContent();
    const lines = [];
    let currentLine = [];
    let currentY = null;
    [...(content.items || [])]
      .filter((item) => String(item?.str || "").trim())
      .sort((left, right) => {
        const leftY = Number(left?.transform?.[5] || 0);
        const rightY = Number(right?.transform?.[5] || 0);
        if (Math.abs(rightY - leftY) > 2) {
          return rightY - leftY;
        }
        const leftX = Number(left?.transform?.[4] || 0);
        const rightX = Number(right?.transform?.[4] || 0);
        return leftX - rightX;
      })
      .forEach((item) => {
        const itemY = Number(item?.transform?.[5] || 0);
        const itemText = cleanKnowledgeLine(item?.str || "");
        if (!itemText) {
          return;
        }
        if (currentY !== null && Math.abs(currentY - itemY) > 3) {
          lines.push(currentLine.join(" ").trim());
          currentLine = [];
        }
        currentY = itemY;
        currentLine.push(itemText);
      });
    if (currentLine.length) {
      lines.push(currentLine.join(" ").trim());
    }
    const text = [`## 第 ${index} 页`, ...lines.filter(Boolean)].join("\n").trim();
    if (text) {
      pages.push(text);
    }
  }
  return pages.join("\n\n");
}

async function extractDocxTextPreview(file) {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  if (window.JSZip?.loadAsync) {
    try {
      const zip = await window.JSZip.loadAsync(arrayBuffer);
      const xmlParts = await Promise.all(
        ["word/document.xml", "word/footnotes.xml", "word/endnotes.xml"]
          .filter((path) => zip.file(path))
          .map(async (path) => ({ path, xmlText: await zip.file(path).async("string") }))
      );
      const extractedText = xmlParts
        .map(({ path, xmlText }) => {
          const doc = new DOMParser().parseFromString(xmlText, "application/xml");
          const body = doc.getElementsByTagNameNS("*", "body")[0] || doc.documentElement;
          const blocks = [];
          [...(body?.childNodes || [])]
            .filter((node) => node?.nodeType === Node.ELEMENT_NODE)
            .forEach((node) => {
              const localName = String(node.localName || "").toLowerCase();
              if (localName === "p") {
                const paragraphText = [...node.getElementsByTagNameNS("*", "t")].map((item) => item.textContent || "").join("").trim();
                if (!paragraphText) {
                  return;
                }
                const styleNode = node.getElementsByTagNameNS("*", "pStyle")[0];
                const styleValue = String(styleNode?.getAttribute("w:val") || styleNode?.getAttribute("val") || "");
                blocks.push(/heading/i.test(styleValue) ? `## ${paragraphText}` : paragraphText);
                return;
              }
              if (localName === "tbl") {
                const rows = [...node.getElementsByTagNameNS("*", "tr")]
                  .map((row) => [...row.getElementsByTagNameNS("*", "tc")]
                    .map((cell) => [...cell.getElementsByTagNameNS("*", "t")].map((item) => item.textContent || "").join("").trim())
                    .filter(Boolean)
                    .join(" | "))
                  .filter(Boolean)
                  .map((rowText) => `| ${rowText}`);
                if (rows.length) {
                  blocks.push(rows.join("\n"));
                }
              }
            });
          const prefix = path === "word/document.xml" ? "" : `## ${path.split("/").pop()}`;
          return [prefix, ...blocks].filter(Boolean).join("\n\n").trim();
        })
        .filter(Boolean)
        .join("\n\n");
      if (extractedText) {
        return extractedText;
      }
    } catch (error) {
      console.warn("JSZip DOCX extraction failed", file?.name || "docx", error);
    }
  }
  if (!window.mammoth?.extractRawText) {
    return "";
  }
  try {
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return String(result?.value || "").trim();
  } catch (error) {
    console.warn("Mammoth DOCX extraction failed", file?.name || "docx", error);
    return "";
  }
}

async function extractSpreadsheetTextPreview(file) {
  if (!window.XLSX?.read) {
    return "";
  }
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const workbook = window.XLSX.read(arrayBuffer, { type: "array" });
  return (workbook.SheetNames || [])
    .slice(0, 3)
    .map((sheetName) => {
      const sheet = workbook.Sheets?.[sheetName];
      if (!sheet) {
        return "";
      }
      const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, raw: false })
        .map((row) => normalizeSpreadsheetRowCells(row))
        .filter((row) => row.length);
      if (!rows.length) {
        return "";
      }
      const normalizedRows = rows
        .slice(0, 60)
        .map((row) => row.length === 1 ? `## ${row[0]}` : `| ${row.join(" | ")}`)
        .join("\n");
      return [`## ${sheetName}`, normalizedRows].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

async function extractTextPreviewForFile(file) {
  const fileName = String(file?.name || "");
  const fileType = String(file?.type || "");
  const importProfile = detectKnowledgeNormalizedFormat(fileName, fileType);
  try {
    if (importProfile.supported && ["plain_text", "markdown", "json", "csv", "html", "yaml", "source_code"].includes(importProfile.normalizedFormat)) {
      return summarizeStructuredKnowledgeText(await readFileAsText(file), 4000);
    }
    if (importProfile.normalizedFormat === "pdf") {
      return summarizeStructuredKnowledgeText(await extractPdfTextPreview(file), 4000);
    }
    if (importProfile.normalizedFormat === "docx") {
      return summarizeStructuredKnowledgeText(await extractDocxTextPreview(file), 4000);
    }
    if (importProfile.normalizedFormat === "spreadsheet") {
      return summarizeStructuredKnowledgeText(await extractSpreadsheetTextPreview(file), 4000);
    }
  } catch (error) {
    console.warn("extractTextPreviewForFile failed", fileName, error);
  }
  return "";
}

function getKnowledgeEntryFormatLabel(entry) {
  const extMatch = String(entry.name || "").match(/\.([A-Za-z0-9]+)$/);
  if (extMatch?.[1]) {
    return extMatch[1].toUpperCase();
  }
  return summarizeText(entry.type || langText("文件", "File"), 18);
}

function getKnowledgeScopeEntries() {
  return normalizeKnowledgeEntries(state.globalKnowledgeEntries);
}

function renderKnowledgeTagFilterOptions(entries) {
  return entries;
}

function filterKnowledgeEntries(entries, options = {}) {
  const searchTerm = String(options.queryOverride ?? knowledgeSearchInputField?.value ?? "").trim();
  const category = options.categoryOverride ?? knowledgeCategoryFilterSelect?.value ?? "all";
  const filteredEntries = entries.filter((entry) => {
    if (category !== "all" && entry.category !== category) {
      return false;
    }
    return true;
  });

  const searchableCount = filteredEntries.filter((entry) => entry.conversionStatus === "ready" && (entry.chunks || []).length).length;
  const blockedCount = filteredEntries.length - searchableCount;
  if (!searchTerm) {
    return {
      entries: filteredEntries.sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0)),
      searchTerm: "",
      searchableCount,
      blockedCount,
    };
  }

  const queryTerms = buildKnowledgeTerms(searchTerm);
  const queryVector = buildKnowledgeVector(searchTerm);
  const hits = filteredEntries
    .filter((entry) => entry.conversionStatus === "ready")
    .map((entry) => {
      const chunks = Array.isArray(entry.chunks) && entry.chunks.length ? entry.chunks : buildKnowledgeChunks(entry.textPreview || "");
      let bestHit = null;
      chunks.forEach((chunk) => {
        const chunkText = normalizeKnowledgeText(chunk.text || "");
        if (!chunkText) {
          return;
        }
        const lowerChunk = chunkText.toLowerCase();
        const matchedTerms = queryTerms.filter((term) => lowerChunk.includes(term.toLowerCase()));
        const lexicalScore = matchedTerms.reduce((sum, term) => sum + 1 + Math.min(term.length, 12) / 12, 0);
        const vectorScore = Math.max(0, cosineSimilarity(buildKnowledgeVector(chunkText), queryVector));
        const score = lexicalScore + vectorScore * 3;
        if (score <= 0) {
          return;
        }
        if (!bestHit || score > bestHit.score) {
          bestHit = {
            score,
            matchedTerms,
            snippet: buildKnowledgeSnippet(chunkText, matchedTerms),
            chunkIndex: Number(chunk.chunkIndex || 1),
          };
        }
      });
      return bestHit
        ? {
            ...entry,
            searchScore: bestHit.score,
            searchMatchedTerms: bestHit.matchedTerms,
            searchSnippet: bestHit.snippet,
            searchChunkIndex: bestHit.chunkIndex,
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.searchScore !== left.searchScore) {
        return right.searchScore - left.searchScore;
      }
      return (right.createdAt || 0) - (left.createdAt || 0);
    });

  return {
    entries: hits,
    searchTerm,
    searchableCount,
    blockedCount,
  };
}

function buildKnowledgeCatalogSummary(entries) {
  const categoryMap = new Map();
  entries.forEach((entry) => {
    const categoryKey = entry.category || "reference";
    const current = categoryMap.get(categoryKey) || { categoryKey, total: 0, ready: 0 };
    current.total += 1;
    if (entry.conversionStatus === "ready") {
      current.ready += 1;
    }
    categoryMap.set(categoryKey, current);
  });
  return [...categoryMap.values()]
    .sort((left, right) => right.ready - left.ready)
    .map((item) => `${getKnowledgeCategoryLabel(item.categoryKey)} ${item.ready}/${item.total}`)
    .slice(0, 5)
    .join(" · ");
}

// 为 AI prompt 生成可读的知识库目录（含每条文件的说明/摘要），让 AI 在写 handoff 时知道本地有什么可以检索
function buildKnowledgeCatalogForAI(entries) {
  if (!Array.isArray(entries) || !entries.length) {
    return "";
  }
  const readyEntries = entries.filter((e) => e.conversionStatus === "ready");
  if (!readyEntries.length) {
    return "";
  }
  // 按目录分组
  const grouped = new Map();
  readyEntries.forEach((entry) => {
    const cat = entry.category || "reference";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat).push(entry);
  });
  const lines = [`本地知识库（已入库 ${readyEntries.length} 条）：`];
  [...grouped.entries()].sort((a, b) => b[1].length - a[1].length).forEach(([cat, catEntries]) => {
    const label = getKnowledgeCategoryLabel(cat);
    catEntries.slice(0, 8).forEach((entry) => {
      // 优先用用户写的 description，其次 summary，最后用第1块原文作为文档定义
      const chunk1Text = Array.isArray(entry.chunks)
        ? (entry.chunks.find((c) => (c.chunkIndex || 1) === 1)?.text || "")
        : "";
      const desc = entry.description || entry.summary || summarizeText(chunk1Text || entry.textPreview || "", 80);
      const descPart = desc ? ` — ${desc}` : "";
      lines.push(`[${label}] ${entry.title}${descPart}`);
    });
  });
  return lines.join("\n");
}

function buildKnowledgeNormalizedPayload(entry) {
  const chunks = normalizeKnowledgeChunks(entry.chunks, entry.textPreview || "");
  return {
    id: entry.id,
    title: entry.title,
    originalFileName: entry.name,
    mimeType: entry.type,
    category: entry.category,
    categoryLabel: getKnowledgeCategoryLabel(entry.category),
    normalizedFormat: entry.normalizedFormat || "",
    conversionStatus: entry.conversionStatus || "limited",
    summary: entry.summary || "",
    textPreview: entry.textPreview || "",
    storedAt: entry.storedAt || entry.createdAt || 0,
    createdAt: entry.createdAt || 0,
    chunkCount: chunks.length,
    chunks: chunks.map((chunk) => ({
      chunkIndex: Number(chunk.chunkIndex || 0),
      text: String(chunk.text || ""),
      charLength: Array.from(String(chunk.text || "")).length,
    })),
  };
}

function buildKnowledgeChunkExportPayload(entry) {
  const payload = buildKnowledgeNormalizedPayload(entry);
  return {
    documentId: payload.id,
    title: payload.title,
    normalizedFormat: payload.normalizedFormat,
    conversionStatus: payload.conversionStatus,
    chunkCount: payload.chunkCount,
    chunks: payload.chunks,
  };
}

function sanitizeKnowledgeFileBaseName(entry) {
  const rawName = String(entry?.name || entry?.title || "knowledge-document").replace(/\.[A-Za-z0-9]+$/i, "").trim() || "knowledge-document";
  return rawName.replace(/[\\/:*?"<>|]/g, "-").trim() || "knowledge-document";
}

function formatKnowledgeRetrievalContext(context) {
  if (context === "shared_brief") {
    return langText("共享事实包", "Shared Brief");
  }
  if (context === "next_speaker_package") {
    return langText("下一位准备包", "Next Speaker Package");
  }
  return String(context || "");
}

async function recordKnowledgeRetrievalHits(query, hits, context = "shared_brief") {
  if (!Array.isArray(hits) || !hits.length) {
    return;
  }
  const now = Date.now();
  const hitMap = new Map(hits.map((hit) => [hit.id, hit]));
  state.globalKnowledgeEntries = normalizeKnowledgeEntries(state.globalKnowledgeEntries.map((entry) => {
    const matchedHit = hitMap.get(entry.id);
    if (!matchedHit) {
      return entry;
    }
    const nextCount = Number(entry.retrievalCount || 0) + 1;
    const nextLog = normalizeKnowledgeRetrievalLog([
      {
        timestamp: now,
        query,
        context,
        snippet: matchedHit.searchSnippet || matchedHit.summary || matchedHit.textPreview || "",
        score: matchedHit.searchScore || 0,
        chunkIndex: matchedHit.searchChunkIndex || 0,
      },
      ...(entry.retrievalLog || []),
    ]);
    return {
      ...entry,
      retrievalCount: nextCount,
      lastRetrievedAt: now,
      retrievalLog: nextLog,
    };
  }));
  await saveGlobalKnowledgeEntries(state.globalKnowledgeEntries);
}

function buildKnowledgeEvidenceEntries(hits, query, context = "shared_brief") {
  const createdAtBase = Date.now();
  return (Array.isArray(hits) ? hits : []).map((entry, index) => ({
    id: `knowledge-hit:${entry.id}:chunk${entry.searchChunkIndex || 0}`,
    label: entry.title || langText("知识片段", "Knowledge Hit"),
    kind: langText("知识库", "Knowledge Base"),
    filterType: "knowledge",
    summary: summarizeText(entry.searchSnippet || entry.summary || entry.textPreview || "", 82),
    createdAt: createdAtBase + index,
    detail: [
      `目录：${getKnowledgeCategoryLabel(entry.category)}`,
      entry.searchChunkIndex ? `Chunk：${entry.searchChunkIndex}` : "",
      query ? `检索词：${query}` : "",
      entry.searchSnippet || entry.summary || entry.textPreview || "",
    ].filter(Boolean).join("\n"),
    imageUrl: "",
    videoUrl: "",
    analysis: "",
    sourceUrl: "",
    previewUrl: "",
    meta: [getKnowledgeCategoryLabel(entry.category), entry.searchChunkIndex ? `Chunk ${entry.searchChunkIndex}` : ""].filter(Boolean),
    formatLabel: getKnowledgeEntryFormatLabel(entry),
    listKindLabel: langText("知识", "Knowledge"),
    sourceLabel: langText(`本地知识库 · ${formatKnowledgeRetrievalContext(context)}`, `Local Knowledge · ${formatKnowledgeRetrievalContext(context)}`),
  }));
}

function appendSharedEvidenceEntries(entries, limit = 40) {
  if (!Array.isArray(entries) || !entries.length) {
    return;
  }
  const existing = (Array.isArray(state.sharedEvidenceEntries) ? state.sharedEvidenceEntries : []).filter(Boolean);
  const merged = [...existing];
  for (const entry of entries) {
    const existingIdx = merged.findIndex((e) => e.id === entry.id);
    if (existingIdx >= 0) {
      const prev = merged[existingIdx];
      const refCount = (prev._refCount || 1) + 1;
      const baseLabel = prev._baseSourceLabel || prev.sourceLabel;
      merged[existingIdx] = {
        ...prev,
        _refCount: refCount,
        _baseSourceLabel: baseLabel,
        sourceLabel: `${baseLabel} · 被 ${refCount} 位发言者引用`,
      };
    } else {
      merged.push({ ...entry, _refCount: 1, _baseSourceLabel: entry.sourceLabel });
    }
  }
  state.sharedEvidenceEntries = merged.slice(-limit);
}

function buildKnowledgeReferenceChipsMarkup(hits) {
  if (!shouldExposeInternalWorkflow()) {
    return "";
  }
  if (!Array.isArray(hits) || !hits.length) {
    return "";
  }
  return `
    <div class="chat-evidence-strip">
      <div class="chat-evidence-strip-title">${escapeHtml(langText("本轮命中的本地知识", "Local Knowledge Used"))}</div>
      <div class="chat-evidence-chip-list">
        ${hits.map((entry) => `<button class="chat-evidence-chip" type="button" data-open-knowledge-id="${entry.id}" title="${escapeHtml(langText("点击打开知识库并定位到该条资料", "Open this document in the knowledge base"))}"><span class="chat-evidence-chip-title">${escapeHtml(entry.title)}</span><span class="chat-evidence-chip-meta">${escapeHtml(`${getKnowledgeCategoryLabel(entry.category)}${entry.searchChunkIndex ? ` · Chunk ${entry.searchChunkIndex}` : ""} · ${langText("点击打开", "Open")}`)}</span></button>`).join("")}
      </div>
    </div>
  `;
}

function buildLocalKnowledgeDigest(query, limit = 4) {
  if (!state.knowledgeEnabled) {
    return "";
  }
  const allEntries = getKnowledgeScopeEntries();
  if (!allEntries.length) {
    return "";
  }
  const result = filterKnowledgeEntries(allEntries, {
    queryOverride: query,
    categoryOverride: "all",
  });
  const hits = result.entries.slice(0, limit);
  if (!hits.length) {
    return "";
  }
  const matchedCategories = uniqueStrings(hits.map((entry) => getKnowledgeCategoryLabel(entry.category)));
  return [
    `本地知识库命中目录：${matchedCategories.join("、") || langText("未分类", "Uncategorized")}`,
    ...hits.map((entry, index) => `${index + 1}. ${entry.title}｜目录：${getKnowledgeCategoryLabel(entry.category)}${entry.description ? `｜说明：${summarizeText(entry.description, 50)}` : ""}｜片段：${entry.searchSnippet || summarizeText(entry.summary || entry.textPreview || "", 88)}`),
  ].join("\n");
}

function renderKnowledgeBaseWorkspace() {
  if (!knowledgeList || !knowledgeDetail || !knowledgeSummaryStrip) {
    return;
  }

  const allEntries = getKnowledgeScopeEntries();
  renderKnowledgeTagFilterOptions(allEntries);
  const filteredResult = filterKnowledgeEntries(allEntries);
  const entries = filteredResult.entries;
  const knowledgeCountBadge = document.getElementById("knowledge-count-badge");
  if (knowledgeCountBadge) {
    knowledgeCountBadge.textContent = langText(`${entries.length} 条`, `${entries.length} items`);
  }

  knowledgeSummaryStrip.innerHTML = `
    <div class="knowledge-summary-line">${escapeHtml(langText("当前查看：全局知识库", "Viewing: Global Knowledge"))}</div>
    <div class="knowledge-summary-line">${escapeHtml(langText(`当前共 ${state.globalKnowledgeEntries.length} 条资料`, `${state.globalKnowledgeEntries.length} items in the knowledge base`))}</div>
    <div class="knowledge-summary-line">${escapeHtml(langText(`可检索 ${filteredResult.searchableCount} 条，受限 ${filteredResult.blockedCount} 条`, `${filteredResult.searchableCount} searchable, ${filteredResult.blockedCount} limited`))}</div>
    <div class="knowledge-summary-line">${escapeHtml(langText(`目录概览：${buildKnowledgeCatalogSummary(allEntries) || "暂无"}`, `Catalog: ${buildKnowledgeCatalogSummary(allEntries) || "none yet"}`))}</div>
  `;

  if (!entries.some((entry) => entry.id === activeKnowledgeEntryId)) {
    activeKnowledgeEntryId = entries[0]?.id || "";
  }

  if (!entries.length) {
    activeKnowledgeEntryId = "";
    const hasActiveFilters = Boolean(filteredResult.searchTerm)
      || (knowledgeCategoryFilterSelect?.value || "all") !== "all";
    knowledgeList.innerHTML = `<div class="empty-panel">${escapeHtml(hasActiveFilters ? langText("当前筛选条件下没有命中资料。可以清空检索词或切换目录后再试。", "No knowledge items matched the current filters. Clear the search or switch folders and try again.") : langText("当前知识库还是空的。先上传文档。", "The knowledge base is empty. Upload documents to get started."))}</div>`;
    knowledgeDetail.innerHTML = `<div class="evidence-detail-empty">${escapeHtml(hasActiveFilters ? langText("命中片段、摘要和基础信息会在这里显示。", "Matched snippets, summaries, and metadata will appear here.") : langText("右侧会显示文档摘要、提取文本和基础信息。", "Document summary, extracted text, and metadata will appear here."))}</div>`;
    if (knowledgeSelectionPanel) {
      knowledgeSelectionPanel.innerHTML = "";
    }
    if (knowledgeEditorPanel) {
      knowledgeEditorPanel.innerHTML = "";
    }
    return;
  }

  knowledgeList.innerHTML = entries.map((entry, index) => `
    <button class="evidence-list-item ${entry.id === activeKnowledgeEntryId ? "active" : ""}" data-knowledge-id="${entry.id}" type="button">
      <span class="evidence-list-index">${index + 1}.</span>
      <span class="evidence-list-label">${escapeHtml(entry.title)}</span>
      <span class="evidence-list-kind">${escapeHtml([getKnowledgeEntryFormatLabel(entry), getKnowledgeConversionStatusLabel(entry.conversionStatus)].filter(Boolean).join(" · "))}</span>
      ${entry.searchSnippet ? `<span class="knowledge-hit-snippet">${escapeHtml(entry.searchSnippet)}</span>` : ""}
    </button>
  `).join("");

  const previousKnowledgeEntryId = activeKnowledgeEntryId;
  const activeEntry = entries.find((entry) => entry.id === activeKnowledgeEntryId) || entries[0];
  if (!activeEntry) {
    return;
  }
  if (previousKnowledgeEntryId !== activeEntry.id) {
    activeKnowledgePreviewMode = getDefaultKnowledgePreviewMode(activeEntry);
  }
  activeKnowledgeEntryId = activeEntry.id;
  if (!["normalized", "chunks", "source"].includes(activeKnowledgePreviewMode)) {
    activeKnowledgePreviewMode = getDefaultKnowledgePreviewMode(activeEntry);
  }
  if (knowledgeSelectionPanel) {
    knowledgeSelectionPanel.innerHTML = `<div class="knowledge-summary-line">${escapeHtml(langText(`目录：${getKnowledgeCategoryLabel(activeEntry.category)}`, `Folder: ${getKnowledgeCategoryLabel(activeEntry.category)}`))}</div>`;
  }
  if (knowledgeEditorPanel) {
    knowledgeEditorPanel.innerHTML = [
      `<div class="knowledge-summary-line">${escapeHtml(langText(`原文件格式：${getKnowledgeEntryFormatLabel(activeEntry)}`, `Original format: ${getKnowledgeEntryFormatLabel(activeEntry)}`))}</div>`,
      `<div class="knowledge-summary-line">${escapeHtml(langText(`状态：${getKnowledgeConversionStatusLabel(activeEntry.conversionStatus)} · 分片 ${activeEntry.chunks?.length || 0} 段`, `Status: ${getKnowledgeConversionStatusLabel(activeEntry.conversionStatus)} · ${activeEntry.chunks?.length || 0} chunks`))}</div>`,
      `<div class="knowledge-summary-line">${escapeHtml(langText(`回溯：累计命中 ${activeEntry.retrievalCount || 0} 次${activeEntry.lastRetrievedAt ? ` · 最近 ${formatEvidenceCreatedAt(activeEntry.lastRetrievedAt)}` : ""}`, `History: ${activeEntry.retrievalCount || 0} hit(s)${activeEntry.lastRetrievedAt ? ` · Latest ${formatEvidenceCreatedAt(activeEntry.lastRetrievedAt)}` : ""}`))}</div>`,
      `<div class="knowledge-action-row">
        ${activeEntry.originalDataUrl ? `<button class="knowledge-action-button" type="button" data-knowledge-action="download-original" data-knowledge-id="${activeEntry.id}">${escapeHtml(langText("下载原文件", "Download Original"))}</button>` : ""}
        <button class="knowledge-action-button" type="button" data-knowledge-action="download-normalized-json" data-knowledge-id="${activeEntry.id}">${escapeHtml(langText("下载标准化 JSON", "Download Normalized JSON"))}</button>
        <button class="knowledge-action-button" type="button" data-knowledge-action="download-chunks-json" data-knowledge-id="${activeEntry.id}">${escapeHtml(langText("下载 Chunks JSON", "Download Chunks JSON"))}</button>
        <button class="knowledge-action-button" type="button" data-knowledge-action="rebuild-normalized" data-knowledge-id="${activeEntry.id}">${escapeHtml(langText("重建标准化", "Rebuild Normalized"))}</button>
        <button class="knowledge-action-button danger" type="button" data-knowledge-action="delete-entry" data-knowledge-id="${activeEntry.id}">${escapeHtml(langText("删除条目", "Delete Entry"))}</button>
      </div>`,
      `<label class="knowledge-file-note-label" for="knowledge-entry-description">${escapeHtml(langText("文件说明（AI 检索参考）", "File Note (for AI retrieval)"))}</label>`,
      `<textarea id="knowledge-entry-description" class="knowledge-file-note" rows="3" placeholder="${escapeHtml(langText("一两句话说明这份文件讲什么、属于什么类型、适合回答哪类问题…", "One or two sentences: what this file covers, its type, and when to use it…"))}">${escapeHtml(activeEntry.description || "")}</textarea>`,
      `<div class="knowledge-action-row"><button class="knowledge-action-button" type="button" data-knowledge-action="generate-description" data-knowledge-id="${activeEntry.id}">${escapeHtml(langText("AI 生成说明", "AI Generate Note"))}</button><button class="knowledge-action-button" type="button" data-knowledge-action="save-description" data-knowledge-id="${activeEntry.id}">${escapeHtml(langText("保存说明", "Save Note"))}</button></div>`,
    ].join("");
  }
  knowledgeDetail.innerHTML = `
    <div class="evidence-detail-panel">
      <div class="evidence-detail-title">${escapeHtml(activeEntry.title)}</div>
      <div class="evidence-detail-meta">${escapeHtml([
        activeEntry.scope === "project" ? langText("项目知识包", "Project Pack") : langText("全局知识库", "Global Knowledge"),
        getKnowledgeCategoryLabel(activeEntry.category),
        getKnowledgeConversionStatusLabel(activeEntry.conversionStatus),
        activeEntry.normalizedFormat || "",
        activeEntry.chunks?.length ? langText(`${activeEntry.chunks.length} 段`, `${activeEntry.chunks.length} chunks`) : "",
        activeEntry.size ? `${Math.max(1, Math.round(activeEntry.size / 1024))} KB` : "",
      ].filter(Boolean).join("  ·  "))}</div>
      <div class="knowledge-preview-panel">
        <div class="knowledge-preview-tabs" role="tablist" aria-label="${escapeHtml(langText("知识预览模式", "Knowledge Preview Modes"))}">
          ${buildKnowledgePreviewTabsMarkup(activeKnowledgePreviewMode)}
        </div>
        <div class="knowledge-preview-viewport">
          ${buildKnowledgePreviewContentMarkup(activeEntry, activeKnowledgePreviewMode)}
        </div>
      </div>
    </div>
  `;
}

function buildKnowledgeDetailPreviewText(text, maxLines = 18) {
  const normalized = normalizeKnowledgeText(text);
  if (!normalized) {
    return "";
  }
  const lines = normalized.split("\n");
  if (lines.length <= maxLines) {
    return normalized;
  }
  return `${lines.slice(0, maxLines).join("\n")}\n…`;
}

function getDefaultKnowledgePreviewMode(entry) {
  if (entry?.originalDataUrl && entry?.normalizedFormat === "pdf") {
    return "source";
  }
  return "normalized";
}

function getKnowledgePreviewTabLabel(mode) {
  if (mode === "chunks") {
    return langText("Chunks 预览", "Chunk Preview");
  }
  if (mode === "source") {
    return langText("源文件预览", "Source Preview");
  }
  return langText("标准化预览", "Normalized Preview");
}

function isSparsePdfKnowledgeEntry(entry) {
  if (entry?.normalizedFormat !== "pdf") {
    return false;
  }
  const normalized = normalizeKnowledgeText(entry?.textPreview || "");
  if (!normalized) {
    return true;
  }
  const meaningfulLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^##\s*第\s*\d+\s*页$/i.test(line));
  return meaningfulLines.join(" ").length < 24;
}

function buildKnowledgePreviewTabsMarkup(activeMode) {
  return ["normalized", "chunks", "source"].map((mode) => `
    <button class="knowledge-preview-tab ${mode === activeMode ? "active" : ""}" type="button" data-knowledge-preview-mode="${mode}">
      ${escapeHtml(getKnowledgePreviewTabLabel(mode))}
    </button>
  `).join("");
}

function buildKnowledgePreviewEmptyMarkup(title, copy) {
  return `
    <div class="knowledge-preview-empty">
      <div class="knowledge-preview-empty-title">${escapeHtml(title)}</div>
      <div class="knowledge-preview-empty-copy">${escapeHtml(copy)}</div>
    </div>
  `;
}

function buildKnowledgeNormalizedPreviewMarkup(entry) {
  const normalizedText = normalizeKnowledgeText(entry?.textPreview || "");
  if (!normalizedText) {
    return buildKnowledgePreviewEmptyMarkup(
      langText("当前没有标准化正文", "No normalized text yet"),
      langText("这份资料已入库，但还没有形成稳定的标准化正文。你可以先看源文件预览，或者点击重建标准化再试一次。", "This document is stored, but no stable normalized text is available yet. Check the source preview or rebuild normalization and try again.")
    );
  }
  if (isSparsePdfKnowledgeEntry(entry)) {
    return buildKnowledgePreviewEmptyMarkup(
      langText("PDF 只提取到很少文本", "Only limited PDF text extracted"),
      langText("这份 PDF 当前主要只抽到了页码或极少正文，所以标准化预览会很薄。建议切到“源文件预览”直接看原 PDF；后续要提升这类文件，需要补 OCR/图片型 PDF 处理。", "This PDF currently only yielded page markers or very little body text, so the normalized preview is intentionally sparse. Switch to Source Preview to inspect the original PDF. Better handling later will require OCR or image-PDF processing.")
    );
  }
  return `<div class="knowledge-preview-scroll">${escapeHtml(normalizedText)}</div>`;
}

function buildKnowledgeChunkPreviewMarkup(entry) {
  if (!entry?.chunks?.length) {
    return buildKnowledgePreviewEmptyMarkup(
      langText("当前没有可用 chunks", "No chunks available"),
      isSparsePdfKnowledgeEntry(entry)
        ? langText("这份 PDF 当前没有抽出足够正文，因此还没形成可检索 chunks。先看源文件预览会更直观。", "This PDF does not have enough extracted text to form retrieval chunks yet. The source preview will be more useful for now.")
        : langText("当前还没有生成稳定 chunks。你可以点击重建标准化再试一次。", "No stable chunks have been generated yet. Try rebuilding normalization.")
    );
  }
  return `
    <div class="knowledge-chunk-list">
      ${entry.chunks.map((chunk) => `
        <section class="knowledge-chunk-card">
          <div class="knowledge-chunk-meta">${escapeHtml(langText(`Chunk ${chunk.chunkIndex} · ${String(chunk.text || "").length} 字符`, `Chunk ${chunk.chunkIndex} · ${String(chunk.text || "").length} chars`))}</div>
          <div class="knowledge-preview-scroll">${escapeHtml(chunk.text || "")}</div>
        </section>
      `).join("")}
    </div>
  `;
}

function buildKnowledgeSourcePreviewMarkup(entry) {
  if (!entry?.originalDataUrl) {
    return buildKnowledgePreviewEmptyMarkup(
      langText("当前没有源文件副本", "No source file copy"),
      langText("这条知识没有保存可直接预览的原文件副本。你仍可以看标准化结果或重新上传原文件。", "No previewable source file copy was saved for this entry. You can still inspect the normalized result or upload the original again.")
    );
  }
  if (entry?.normalizedFormat === "pdf") {
    return `<iframe class="knowledge-source-frame" src="${escapeHtml(entry.originalDataUrl)}" title="${escapeHtml(entry.title || "PDF Source")}"></iframe>`;
  }
  if (String(entry?.type || "").startsWith("image/")) {
    return `<img class="knowledge-source-image" src="${escapeHtml(entry.originalDataUrl)}" alt="${escapeHtml(entry.title || "Knowledge Source")}" />`;
  }
  return buildKnowledgePreviewEmptyMarkup(
    langText("当前格式不支持内嵌源文件预览", "Inline source preview is unavailable"),
    langText("这类文件已保存原件，但浏览器里不适合直接内嵌展示。你可以使用上方“下载原文件”查看。", "The original file is stored, but this format is not suitable for inline browser preview. Use Download Original above to inspect it.")
  );
}

function buildKnowledgePreviewContentMarkup(entry, mode) {
  if (mode === "chunks") {
    return buildKnowledgeChunkPreviewMarkup(entry);
  }
  if (mode === "source") {
    return buildKnowledgeSourcePreviewMarkup(entry);
  }
  return buildKnowledgeNormalizedPreviewMarkup(entry);
}

async function buildKnowledgeEntryFromFile(file, options = {}) {
  const { scope = "global", category = "reference", topicId = "" } = options;
  const importProfile = detectKnowledgeNormalizedFormat(file?.name || "", file?.type || "");
  const [textPreview, originalDataUrl] = await Promise.all([
    importProfile.supported ? extractTextPreviewForFile(file) : Promise.resolve(""),
    readFileAsDataUrl(file).catch(() => ""),
  ]);
  const conversionStatus = !importProfile.supported
    ? "unsupported"
    : textPreview
      ? "ready"
      : "limited";
  const chunks = conversionStatus === "ready" ? buildKnowledgeChunks(textPreview) : [];
  const summary = conversionStatus === "ready"
    ? summarizeText(textPreview || `${file.name || langText("文件", "File")} · ${langText("已上传入库", "stored in knowledge base")}`, 180)
    : conversionStatus === "limited"
      ? langText("文件已入库，但当前只拿到了有限的可检索文本。建议后续补更清晰的文本版资料。", "The file was stored, but only limited searchable text is available. Consider uploading a cleaner text version later.")
      : langText("该文件格式当前不会进入知识检索。你仍可保留原文件名作记录，但讨论阶段不会命中它。", "This file format is not searchable in the current version. It can stay as a record, but discussions will not retrieve it.");
  return {
    id: `knowledge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    topicId: scope === "project" ? topicId : "",
    scope,
    title: file.name || langText("未命名文档", "Untitled Document"),
    name: file.name || langText("未命名文档", "Untitled Document"),
    type: file.type || "application/octet-stream",
    size: file.size || 0,
    category,
    tags: [],
    summary,
    textPreview,
    normalizedFormat: importProfile.normalizedFormat,
    conversionStatus,
    chunks,
    originalDataUrl,
    retrievalCount: 0,
    lastRetrievedAt: 0,
    retrievalLog: [],
    sourceUrl: "",
    storedAt: Date.now(),
    createdAt: Date.now(),
  };
}

async function handleKnowledgeUploads(files) {
  const attachments = Array.from(files || []).filter(Boolean);
  if (!attachments.length) {
    return;
  }
  if (state.knowledgeScope === "project" && !state.activeTopicId) {
    ensureActiveTopicSession();
  }
  const scope = state.knowledgeScope === "project" ? "project" : "global";
  const category = requireKnowledgeUploadCategory();
  const topicId = scope === "project" ? state.activeTopicId : "";
  const supportedFiles = [];
  const blockedFiles = [];
  attachments.forEach((file) => {
    const profile = detectKnowledgeNormalizedFormat(file?.name || "", file?.type || "");
    if (profile.supported) {
      supportedFiles.push(file);
    } else {
      blockedFiles.push(file.name || langText("未命名文件", "Untitled file"));
    }
  });
  if (!supportedFiles.length) {
    throw new Error(langText("当前选中的文件都不是这版知识库支持的格式。请优先上传 TXT、Markdown、JSON、CSV、HTML、DOCX、XLSX、XLS、PDF 或源码/YAML 文本文件。", "None of the selected files are supported in this knowledge base version. Upload TXT, Markdown, JSON, CSV, HTML, DOCX, XLSX, XLS, PDF, source code, or YAML text files first."));
  }
  const newEntries = await Promise.all(supportedFiles.map((file) => buildKnowledgeEntryFromFile(file, { scope, category, topicId })));
  if (scope === "project") {
    state.projectKnowledgeEntries = normalizeKnowledgeEntries([...state.projectKnowledgeEntries, ...newEntries]);
    await saveProjectKnowledgeEntries(topicId, state.projectKnowledgeEntries);
  } else {
    state.globalKnowledgeEntries = normalizeKnowledgeEntries([...state.globalKnowledgeEntries, ...newEntries]);
    await saveGlobalKnowledgeEntries(state.globalKnowledgeEntries);
  }
  activeKnowledgeEntryId = newEntries[newEntries.length - 1]?.id || activeKnowledgeEntryId;
  renderKnowledgeBaseWorkspace();
  return {
    storedCount: newEntries.length,
    blockedFiles,
  };
}

async function resizeImageForAnalysis(dataUrl, maxDim = 1024, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height, 1));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function serializeAttachment(file) {
  const record = {
    id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    topicId: state.activeTopicId,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size || 0,
    kind: file.type?.startsWith("image/") ? "image" : file.type?.startsWith("video/") ? "video" : "file",
    createdAt: Date.now(),
    dataUrl: "",
    textPreview: "",
  };

  if (file.type?.startsWith("image/")) {
    const raw = await readFileAsDataUrl(file);
    record.dataUrl = await resizeImageForAnalysis(raw, 1024, 0.82);
  } else if (file.type?.startsWith("video/")) {
    record.dataUrl = await readFileAsDataUrl(file);
  } else {
    record.textPreview = summarizeText(await extractTextPreviewForFile(file), 1200);
  }

  return record;
}

async function storeAttachmentsForActiveTopic(attachments) {
  ensureActiveTopicSession();
  if (!attachments.length || !state.activeTopicId) {
    return;
  }
  const serialized = await Promise.all(attachments.map((file) => serializeAttachment(file)));
  state.projectArtifacts = normalizeProjectArtifacts([...state.projectArtifacts, ...serialized]);
  await saveProjectArtifacts(state.activeTopicId, state.projectArtifacts);
  state.projectMemory = deriveProjectMemoryFromState();
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

function translateRoleSourceLabel(label, source = "") {
  const normalized = String(label || "").trim();
  const fallback = source === "recommended"
    ? "临时生成"
    : source === "favorite"
      ? "收藏人物"
      : source === "custom"
        ? "自定义"
        : "常用职业";
  const value = normalized || fallback;
  const labelMap = {
    "技术": "Technology",
    "工程": "Engineering",
    "电气": "Electrical",
    "财务": "Finance",
    "医疗": "Medical",
    "历史": "History",
    "物理": "Physics",
    "数学": "Mathematics",
    "化学": "Chemistry",
    "法律": "Legal",
    "警务": "Police",
    "运营": "Operations",
    "产品": "Product",
    "教育": "Education",
    "收藏人物": "Saved Persona",
    "自定义": "Custom",
    "临时生成": "Generated",
    "AI 草稿": "AI Draft",
    "自定义补位": "Custom Fill-in",
    "常用职业": "Built-in Role",
  };
  return labelMap[value] || value;
}

function translateTraitValue(value) {
  if (!value) return value;
  if (state.appLanguage !== "en") return value;
  const map = {
    // Stance
    "\u652f\u6301\u539f\u547d\u9898": "Support the claim",
    "\u5f3a\u529b\u53cd\u9a73": "Strong rebuttal",
    "\u4e2d\u7acb\u88c1\u51b3": "Neutral judgment",
    "\u8865\u5145\u80cc\u666f": "Add context",
    "\u5f3a\u8c03\u843d\u5730": "Stress execution",
    "\u5f3a\u8c03\u98ce\u9669": "Stress risk",
    "\u6f84\u6e05\u8868\u8fbe": "Clarify expression",
    "\u5f3a\u8c03\u7ea6\u675f": "Stress constraints",
    "\u5f3a\u8c03\u5b89\u5168": "Stress safety",
    "\u8ffd\u6c42\u51c6\u786e": "Seek accuracy",
    "\u8ffd\u6c42\u4e25\u5bc6": "Seek rigor",
    "\u5f3a\u8c03\u8fb9\u754c": "Stress boundaries",
    "\u5f3a\u8c03\u6267\u884c": "Stress execution",
    "\u5f3a\u8c03\u53d6\u820d": "Stress trade-offs",
    "\u4fdd\u6301\u4e2d\u7acb\u4e3b\u6301": "Neutral facilitation",
    // Method
    "\u7f16\u7801\u5b9e\u73b0": "Coding",
    "\u7ed3\u6784\u8bc4\u4f30": "Structural assessment",
    "\u7cfb\u7edf\u6392\u969c": "System troubleshooting",
    "\u6210\u672c\u6838\u7b97": "Cost accounting",
    "\u4e34\u5e8a\u5224\u65ad": "Clinical judgment",
    "\u53f2\u6599\u6821\u5bf9": "Historical verification",
    "\u673a\u7406\u63a8\u5bfc": "Mechanism deduction",
    "\u903b\u8f91\u63a8\u5bfc": "Logical deduction",
    "\u53cd\u5e94\u5206\u6790": "Reaction analysis",
    "\u89c4\u5219\u62c6\u89e3": "Rule breakdown",
    "\u8bc1\u636e\u6838\u9a8c": "Evidence verification",
    "\u6267\u884c\u62c6\u89e3": "Execution breakdown",
    "\u9700\u6c42\u89c4\u5212": "Requirements planning",
    "\u77e5\u8bc6\u8bb2\u89e3": "Knowledge explanation",
    "\u603b\u7ed3\u538b\u7f29": "Summary compression",
    "\u9488\u5bf9\u6027\u5206\u6790": "Targeted analysis",
    // Temper
    "\u7a33\u5065": "Steady",
    "\u6e29\u539a": "Warm",
    "\u5c16\u9510": "Sharp",
    "\u514b\u5236": "Restrained",
    "\u5ba1\u614e": "Cautious",
    "\u575a\u51b3": "Firm",
    "\u51b7\u9759": "Calm",
    "\u8c28\u614e": "Prudent",
    "\u5e73\u8861": "Balanced",
    "\u4fdd\u5b88": "Conservative",
    "\u8010\u5fc3": "Patient",
    "\u7ec6\u817b": "Nuanced",
    "\u9ad8\u538b": "High-pressure",
    "\u5f3a\u786c": "Hardline",
    "\u7075\u6d3b": "Flexible",
    "\u6e29\u67d4": "Gentle",
    "\u76f4\u63a5": "Direct",
    "\u4e25\u8c28": "Meticulous",
    "\u679c\u65ad": "Decisive",
    "\u52a1\u5b9e": "Pragmatic",
    "\u6e05\u6670": "Clear",
    "\u81ea\u5b9a\u4e49": "Custom",
  };
  if (map[value]) return map[value];
  // Fallback: try English name translation for unknown trait values
  return buildEnglishRoleNameFallback(value) || value;
}

function buildEnglishRoleNameFallback(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const replacements = [
    ["产品经理", "Product Manager"],
    ["程序员", "Programmer"],
    ["审计师", "Auditor"],
    ["工程师", "Engineer"],
    ["设计师", "Designer"],
    ["研究员", "Researcher"],
    ["研究者", "Researcher"],
    ["学者", "Scholar"],
    ["顾问", "Advisor"],
    ["负责人", "Lead"],
    ["经理", "Manager"],
    ["医生", "Doctor"],
    ["教师", "Teacher"],
    ["律师", "Lawyer"],
    ["警察", "Police Officer"],
    ["分析师", "Analyst"],
    ["架构师", "Architect"],
    ["讲解者", "Explainer"],
    ["观察者", "Observer"],
    ["专家", "Expert"],
    ["策划", "Planner"],
    ["古代", "Ancient"],
    ["考古", "Archaeology"],
    ["天文", "Astronomy"],
    ["文明", "Civilization"],
    ["比较", "Comparative"],
    ["认知", "Cognitive"],
    ["材料", "Materials"],
    ["物理", "Physics"],
    ["化学", "Chemistry"],
    ["历史", "History"],
    ["法律", "Legal"],
    ["医疗", "Medical"],
    ["运营", "Operations"],
    ["系统", "Systems"],
    ["科学", "Science"],
    ["工程", "Engineering"],
    ["教育", "Education"],
    ["数学", "Mathematics"],
  ];
  const localized = replacements.reduce((text, [needle, replacement]) => text.replaceAll(needle, ` ${replacement} `), raw)
    .replace(/[\u4e00-\u9fff]+/g, " ")  // strip remaining Chinese chars instead of failing
    .replace(/\s+/g, " ")
    .trim();
  return /[A-Za-z]/.test(localized) ? localized : "";
}

function roleAvatar(role) {
  if (state.appLanguage === "en" && role?.nameEn) {
    const preferredAvatar = /[A-Za-z0-9]/.test(String(role.avatar || "")) ? role.avatar : "";
    return deriveRoleAvatar(role.nameEn, preferredAvatar);
  }
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
  speakerAvatar.textContent = avatar === "系"
    ? langText("系", "S")
    : avatar === "我"
      ? langText("我", "I")
      : avatar === "主"
        ? langText("主", "H")
        : avatar === "H"
          ? langText("主", "H")
          : avatar;
  if (avatarInlineStyle) {
    speakerAvatar.setAttribute("style", avatarInlineStyle);
  } else {
    speakerAvatar.removeAttribute("style");
  }
  speakerName.textContent = title;
  speakerRole.textContent = role || "";
  speakerDescription.textContent = description;
}

function setSpeakerCardSpeaking(active) {
  speakerAvatar.classList.toggle("is-speaking", !!active);
  speakerName.classList.toggle("is-speaking", !!active);
}

function setStatusLoadingState(active) {
  liveStatusBanner.classList.toggle("loading-dots", !!active);
  speakerName.classList.toggle("loading-dots", !!active);
}

function setSpeakerCardForRole(role, status, description) {
  setSpeakerCard(getDisplayRoleName(role), status, description, roleAvatar(role), avatarStyle(role));
}

function updateLiveStatus(message, tone = "") {
  liveStatusBanner.textContent = message;
  liveStatusBanner.className = `live-status-banner ${tone}`.trim();
}

function formatCurrentTopicTitle(title = "") {
  const normalizedTitle = String(title || "").trim();
  const chars = Array.from(normalizedTitle);
  if (!chars.length) {
    return langText("目前还没有任务", "No task yet");
  }
  if (normalizedTitle === "目前还没有任务" || normalizedTitle === "No task yet") {
    return langText("目前还没有任务", "No task yet");
  }
  return chars.length > 14 ? `${chars.slice(0, 14).join("")}...` : chars.join("");
}

function updateCurrentTopicTitle(title = "") {
  const normalizedTitle = String(title || "").trim();
  const effectiveTitle = !normalizedTitle || normalizedTitle === "目前还没有任务" || normalizedTitle === "No task yet"
    ? ""
    : normalizedTitle;
  currentTopicTitle.textContent = formatCurrentTopicTitle(effectiveTitle);
  currentTopicTitle.title = effectiveTitle || langText("目前还没有任务", "No task yet");
}

function sendLauncherHeartbeat() {
  fetch("/__roundtable_heartbeat", {
    method: "POST",
    keepalive: true,
  }).catch(() => {});
}

function startLauncherHeartbeat() {
  if (launcherHeartbeatTimer) {
    window.clearInterval(launcherHeartbeatTimer);
  }
  sendLauncherHeartbeat();
  launcherHeartbeatTimer = window.setInterval(() => {
    sendLauncherHeartbeat();
  }, 15000);
}

function getRoundLabel() {
  return `${state.discussionRounds} 轮`;
}

function getRoundTokenBudget() {
  if (state.densityIndex === 0) {
    return { main: 620, participant: 420, challenger: 620, rebuttal: 620, judge: 1100, report: 1400, charHint: "结论报告控制在 500 到 700 字内，以确据和结论为主体，不确定内容简短带过。" };
  }
  if (state.densityIndex === 2) {
    return { main: 1300, participant: 950, challenger: 1300, rebuttal: 1300, judge: 2000, report: 2600, charHint: "结论报告控制在 1200 到 1800 字内，每一条确立的论据都要充分展开，给出清晰有力的综合结论。" };
  }
  return { main: 900, participant: 700, challenger: 900, rebuttal: 900, judge: 1500, report: 2000, charHint: "结论报告控制在 800 到 1200 字内，以证据和结论为重点，篇幅充实，不要空话。" };
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

function downloadJsonFile(fileName, payload) {
  downloadBlob(fileName, new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }));
}

function downloadDataUrlFile(fileName, dataUrl) {
  if (!dataUrl) {
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
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
  return getConfiguredProfileById(ensureSeatModelAssignment(role)) || getPrimarySummaryProfile();
}

function openConfirmDialog({ title, message, confirmText = langText("确认", "Confirm"), cancelText = langText("取消", "Cancel") }) {
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
      <button class="ghost-link js-export-txt" type="button">${escapeHtml(langText("导出 TXT", "Export TXT"))}</button>
      <button class="ghost-link js-export-docx" type="button">${escapeHtml(langText("导出 DOCX", "Export DOCX"))}</button>
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
    "你现在要把本次圆桌讨论整理成一份给用户直接阅读的正式结论报告。",
    "这不是聊天回复，也不是讨论过程复述，而是一份经过完整讨论后、由主持AI站在全桌视角整理出的结论文件。",
    "核心写作原则：报告以已确立的证据和结论为重心，而不是以不确定性为重心。如果讨论已经形成有力的论证，就直接清楚地表达，不要为显示客观平衡而稀释已成立的结论。",
    "请分成以下5个部分撰写，每部分先写简短小标题，然后展开成2到4段完整中文：",
    "第一部分，议题与论证路径：本次讨论在回答什么具体问题，采用了哪种论证框架，对证据的要求是什么。篇幅简洁。",
    "第二部分，已确立的核心证据（本报告最重要的部分，篇幅最多）：哪些证据和论证经受了多轮质疑仍然站得住脚？逐条具体展开，每条说明内容是什么、来源类型是什么、为什么在反驳下仍然成立。不能只写词语列表，要有实质内容。",
    "第三部分，综合结论：基于上述证据，给出清晰有力的综合判断。如果证据总体指向某个方向，就明确说出来，不要模糊成有一定可能。如有附加条件，说清楚条件是什么，而不是用保留条款掩盖结论本身。",
    "第四部分，边界与尚未闭合的难点（篇幅简短）：哪些具体论点没有完全证实？明确区分这些难点是致命的还是属于周边细节。不要用边缘难点否定已确立的核心。",
    "第五部分，深化论证的优先方向：如果要向怀疑者系统展示或未来补强，最值得投入的2到3个具体方向是什么，说明理由。",
    "格式：不要使用#等Markdown符号，每部分以中文数字序号开头，展开成有实质内容的段落。",
    getModelOutputLanguageInstruction(),
    buildDiscussionContext(state.lastSummary, roundNotes, []),
    `裁判总结供参考，从中提取已确立的论据，不要照抄口吻：${judgeText}`,
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
      "要求：双方以证据为主展开讨论，优先区分事实、推断和猜测，优先校验证据链，而不是急着下漂亮结论。",
      "如果前文有偷换概念、证据不足、出处含糊或逻辑跳跃，要直接点破并收紧结论。",
      "最终由裁判依据各轮证据链质量和论证严密性明确判出输赢，裁判必须给出明确的胜负结论，不允许两边打平或模糊收场。",
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
      "开场要求：你要明确告诉用户，这场讨论不预设立场，双方以证据为主展开论辩，重点是核验证据链、区分事实和推断。",
      "同时告知：讨论结束后裁判会依据证据链质量和论证严密性明确判出输赢，必须有胜负结论，不允许模糊收场。",
      "邀请每位嘉宾先提出自己最想先核验的证据、疑点或解释方向。",
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
      "先把你这一侧最强、最完整、最能成立的版本讲出来，不允许故意把任何一方说弱。",
      assignment === "challenger"
        ? "如果你承担主讲职责，要把本方 strongest case 的主论点、关键依据和最难反驳的部分讲扎实。"
        : assignment === "rebuttal"
          ? "如果你承担辩驳职责，你要默认站在主讲对面，专门拆主讲当前版本里最脆弱、最可疑、最经不起追问的地方。"
        : assignment === "neutral"
          ? "如果你承担中立评议职责，要判断双方是否都被公平表达，指出哪一边其实还没讲到 strongest case。"
          : "如果你承担旁证职责，要补足本方 strongest case 的背景、案例、约束和现实回应。",
      "如果你承担反对或质疑功能，你的任务不是为了赢而偷换概念，而是提前提出现实世界里最强的反对意见，帮助后续形成更强回应。",
      "承接前轮要求：把前面已经稳住的防守点、已经被有效击中的薄弱点、仍未回应的关键反对都当成当前攻防账本，不要把已经回应过的点重新当成没回应。",
      "这些约束只作为你心里的发言骨架，不要把它们原样说出来，不要使用统一小标题、固定口头禅或机械模板。",
    ].join("\n");
  }
  if (state.modeIndex === 2) {
    return [
      "请把发言内在地建立在四层推进上：先压实可以确认的部分，再在此基础上做推断，接着明确仍然存在的证据空白，最后给出当前阶段性的判断。",
      "如果前文给了模糊出处、似是而非的事实、跳跃推理或偷换概念，要直接点破并收紧结论。",
      assignment === "neutral"
        ? "作为中立评议者，你要主动压实证据，而不是做礼貌性总结。"
        : assignment === "rebuttal"
          ? "作为辩驳者，你要优先检查主讲刚才的证据链是否真的闭合，哪些地方只是推断冒充事实。"
        : "不要求你保持语气温和，但要求你优先服从真假和证据链，而不是服从角色偏好。",
      "承接前轮要求：把前面已经形成的共识当成本轮默认约束，优先在尚未确认的点和证据缺口上继续推进，不要把已经收住的点重新说散。",
      "不要显式说“能确认的事实”“基于事实的推断”“仍然不确定的空白”“暂时判断”这类统一标题，也不要把整段发言写成四段固定模板。",
    ].join("\n");
  }
  if (state.modeIndex === 3) {
    return [
      "你既要提出新设想，也要判断前文设想的可行性、风险和前提条件。",
      "对自己的新想法可以大胆提出，对别人的新想法不能只会附和或只会否定，要说明为什么可能行、为什么不行，或者怎样改才可能行。",
      assignment === "challenger"
        ? "作为主讲，你应当主动提出一个值得继续追的新方向，而不是只做保守评论。"
        : assignment === "rebuttal"
          ? "作为辩驳者，你要优先指出主讲新方向里最容易翻车的前提和最可能被忽略的代价。"
        : "作为非主讲角色，你可以沿着别人的思路做变体、筛选和条件修正。",
      "承接前轮要求：把前面已经被证明值得继续试的方向、仍属探索但可保留的方向、以及已经判定风险过高的方向分开对待，不要把明显应放弃的想法重新包装成主方向。",
      "这些要求只能体现在你的思路里，不要写成统一标题、固定三段式或每个人都一样的套话。",
    ].join("\n");
  }
  return [
    "请把一个复杂问题拆成几个子问题、层次、时间段或利益相关方中的某一条继续展开，而不是平铺重复。",
    "你可以选择顺着前文扩展，也可以选择把前文没分清的层面拆开讲，但最终要帮助用户把问题看得更开、更清楚。",
    assignment === "neutral"
      ? "作为中立评议者，你要帮助用户看清哪些讨论线已经展开、哪些还没展开。"
      : assignment === "rebuttal"
        ? "作为辩驳者，你要专门盯住主讲当前拆法里的漏洞、遗漏和不成立的跳步。"
      : "不要试图一口气把所有层面说完，优先把你这一条线讲透。",
    "承接前轮要求：把前面已经展开过的讨论线、已经形成的暂时共识和仍未展开的线区分开，优先补还没讲透的部分，而不是重复已经讲开的线。",
    "不要把这些要求直接说出口，也不要把发言写成统一标题模板。",
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
      "裁判要求：你必须在最终裁定中明确判出输赢，不允许两边打平或模糊收场，这是本模式的硬性规则。",
      "判断依据：证据链的完整性、论证的严密性、是否有偷换概念或逻辑跳跃、关键疑点是否被正面回应。",
      "先梳理各轮已经确认的事实与共识，再对比双方论证质量，最终明确宣告哪一方的证据链更强、为什么胜出，以及对方哪些关键点没能成立。",
      "同时写出：胜方仍存在的不足、败方中有价值的部分、整体讨论还留有哪些待查证的空白。",
      "不要把前面已经形成的共识重新打散，除非你能明确指出那份共识为什么站不住脚。",
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
    turn.searchDigest ? `此人发言前搜索到的网页证据（其他人可据此质疑或核实）：\n${turn.searchDigest}` : "",
    turn.handoff?.next_role_focus ? `交接给下一位的重点：${turn.handoff.next_role_focus}` : "",
    turn.handoff?.local_knowledge_needed?.length ? `建议下一位优先看的本地知识方向：${turn.handoff.local_knowledge_needed.join("、")}` : "",
    turn.handoff?.recommended_counterpoints?.length ? `建议下一位优先反打的点：${turn.handoff.recommended_counterpoints.join("；")}` : "",
    `发言内容：${turn.text}`,
  ].filter(Boolean).join("\n");
}

function buildDiscussionStateLabel(round, totalRounds, speakerRole, orderedSpeakers) {
  const speakerIndex = Math.max(0, orderedSpeakers.findIndex((role) => role?.id === speakerRole?.id));
  return `round_${round}_speaker_${speakerIndex + 1}_of_${orderedSpeakers.length}_total_${totalRounds}`;
}

function getNextSpeakerRole(orderedSpeakers, currentRole) {
  const currentIndex = orderedSpeakers.findIndex((role) => role?.id === currentRole?.id);
  if (currentIndex === -1) {
    return null;
  }
  return orderedSpeakers[currentIndex + 1] || null;
}

function buildKnowledgeGateDecision({ summary, speakerRole, nextRole, liveTurns = [], roundNotes = [] }) {
  const previousTurn = getLatestSpeakerTurn(roundNotes, liveTurns);
  const seedQuery = [
    summary,
    getActiveRoleName(speakerRole),
    getActiveRoleSeat(speakerRole),
    getActiveRoleDescription(speakerRole),
    ...(previousTurn?.handoff?.local_knowledge_needed || []),
    String(previousTurn?.handoff?.next_role_focus || "").trim(),
    ...liveTurns.slice(-2).map((turn) => turn?.text || ""),
    ...roundNotes.slice(-1).map((note) => note?.moderatorSummary || ""),
  ].filter(Boolean).join("\n");
  const knowledgeResult = state.knowledgeEnabled
    ? filterKnowledgeEntries(getKnowledgeScopeEntries(), {
      queryOverride: seedQuery,
      categoryOverride: "all",
    })
    : { entries: [] };
  const hits = (knowledgeResult.entries || []).slice(0, 3);
  const handoffNeedsWeb = !!previousTurn?.handoff?.web_search_needed?.length;
  const handoffMissingEvidence = !!previousTurn?.handoff?.missing_evidence_types?.length;
  const shouldUseLocalKnowledge = !!hits.length;
  // 本地命中不压制网搜：知识库通常存内部规则/私有数据，网络提供公开事实，两者互补
  const shouldUseWebSearch = shouldUseLocalKnowledge || handoffNeedsWeb || handoffMissingEvidence;
  const retrievalStrategy = shouldUseLocalKnowledge
    ? (shouldUseWebSearch ? "local_first_web_supplement" : "local_only")
    : (shouldUseWebSearch ? "web_first" : "context_only");
  const decisionReasons = uniqueStrings([
    shouldUseLocalKnowledge ? `本地已命中 ${hits.length} 条相关知识` : "当前没有稳定本地命中",
    previousTurn?.handoff?.next_role_focus ? `上一位 handoff 明确要求：${previousTurn.handoff.next_role_focus}` : "",
    previousTurn?.handoff?.preferred_keywords?.length ? `上一位给出关键词：${previousTurn.handoff.preferred_keywords.join("、")}` : "",
  ]).slice(0, 4);
  const webSearchReasons = uniqueStrings([
    handoffNeedsWeb ? "上一位 handoff 明确要求补网页公开资料" : "",
    shouldUseLocalKnowledge ? "本地知识库命中，同步补查网页公开事实做交叉验证" : "",
    !hits.length ? "本地没有形成足够可用命中" : "",
    handoffMissingEvidence ? "上一位指出仍缺关键公开证据" : "",
  ]).slice(0, 3);
  const skippedSignals = uniqueStrings([
    !shouldUseLocalKnowledge && !shouldUseWebSearch ? "当前没有明确检索触发信号，先只依赖上下文推进" : "",
  ]).slice(0, 2);
  const categories = uniqueStrings(hits.map((entry) => getKnowledgeCategoryLabel(entry.category))).slice(0, 3);
  const keywords = uniqueStrings([
    getActiveRoleName(speakerRole),
    getActiveRoleSeat(speakerRole),
    getActiveRoleName(nextRole),
    ...(previousTurn?.handoff?.preferred_keywords || []),
    ...hits.map((entry) => entry.title),
  ]).slice(0, 6);
  return {
    shouldUseLocalKnowledge,
    shouldUseWebSearch,
    retrievalStrategy,
    preferredCategories: categories,
    preferredKeywords: keywords,
    localKnowledgeNeeded: hits.map((entry) => `${entry.title}｜${getKnowledgeCategoryLabel(entry.category)}`).slice(0, 3),
    decisionReasons,
    webSearchReasons,
    skippedSignals,
    evidenceGaps: uniqueStrings([
      hits.length ? "还需要确认知识命中片段是否足够直接支撑本轮观点" : "当前没有明显本地知识命中，需要更多事实支撑",
      shouldUseWebSearch && shouldUseLocalKnowledge ? "可继续补公开网页来源，交叉验证本地命中是否足够稳" : "",
      nextRole ? `${getActiveRoleName(nextRole)} 下一轮最需要的关键证据是什么` : "当前轮最后一位发言后，仍需主持人做收束",
    ]).slice(0, 3),
    localHitCount: hits.length,
    rationaleSummary: uniqueStrings([
      retrievalStrategy === "local_first_web_supplement" ? "先吃本地命中，再用网页公开材料做交叉验证。" : "",
      retrievalStrategy === "local_only" ? "当前本地命中已足够，先不扩网页检索。" : "",
      retrievalStrategy === "web_first" ? "当前本地命中不足，先依赖网页公开资料补证。" : "",
      retrievalStrategy === "context_only" ? "当前没有明确检索触发信号，先沿上下文推进。" : "",
    ]).join(" "),
  };
}

function buildSpeakerTurnPrompt({
  preparedTurnInput,
}) {
  return [
    preparedTurnInput?.identityBlock || "",
    preparedTurnInput?.taskBlock || "",
    preparedTurnInput?.historyBlock || "",
    preparedTurnInput?.liveContextBlock || "",
    preparedTurnInput?.retrievalBlock ? `系统检索决策：\n${preparedTurnInput.retrievalBlock}` : "",
    preparedTurnInput?.packageBlock ? `系统为你准备的输入包：\n${preparedTurnInput.packageBlock}` : "",
    preparedTurnInput?.roleBlock || "",
    preparedTurnInput?.outputBlock || "",
  ].filter(Boolean).join("\n\n");
}

function normalizeSpeakerTurnPayload(payload, fallbackNextRole) {
  const handoff = payload?.handoff && typeof payload.handoff === "object" && !Array.isArray(payload.handoff)
    ? payload.handoff
    : {};
  return {
    speakerMessage: sanitizeDisplayedModelText(String(payload?.speaker_message || payload?.speakerMessage || "").trim()),
    speakerClaims: normalizeClarificationQuestions(payload?.speaker_claims || payload?.speakerClaims || []),
    speakerRisks: normalizeClarificationQuestions(payload?.speaker_risks || payload?.speakerRisks || []),
    speakerOpenQuestions: normalizeClarificationQuestions(payload?.speaker_open_questions || payload?.speakerOpenQuestions || []),
    handoff: {
      next_role_id: String(handoff?.next_role_id || fallbackNextRole?.id || "").trim(),
      next_role_focus: String(handoff?.next_role_focus || "").trim(),
      local_knowledge_needed: normalizeClarificationQuestions(handoff?.local_knowledge_needed || []),
      web_search_needed: normalizeClarificationQuestions(handoff?.web_search_needed || []),
      preferred_categories: normalizeClarificationQuestions(handoff?.preferred_categories || []),
      preferred_keywords: normalizeClarificationQuestions(handoff?.preferred_keywords || []),
      avoid_categories: normalizeClarificationQuestions(handoff?.avoid_categories || []),
      missing_evidence_types: normalizeClarificationQuestions(handoff?.missing_evidence_types || []),
      current_round_summary: String(handoff?.current_round_summary || "").trim(),
      recommended_counterpoints: normalizeClarificationQuestions(handoff?.recommended_counterpoints || []),
    },
  };
}

function parseSpeakerTurnResponse(rawText, fallbackNextRole) {
  const jsonText = extractJsonObject(rawText);
  if (!jsonText) {
    return {
      speakerMessage: sanitizeDisplayedModelText(extractJsonStringField(rawText, "speaker_message") || rawText),
      speakerClaims: [],
      speakerRisks: [],
      speakerOpenQuestions: [],
      handoff: {
        next_role_id: fallbackNextRole?.id || "",
        next_role_focus: "",
        local_knowledge_needed: [],
        web_search_needed: [],
        preferred_categories: [],
        preferred_keywords: [],
        avoid_categories: [],
        missing_evidence_types: [],
        current_round_summary: "",
        recommended_counterpoints: [],
      },
    };
  }
  try {
    return normalizeSpeakerTurnPayload(JSON.parse(jsonText), fallbackNextRole);
  } catch (error) {
    console.warn("speaker turn JSON parse failed", error);
    const fallbackSpeakerMessage = extractJsonStringField(jsonText, "speaker_message") || extractJsonStringField(rawText, "speaker_message") || rawText;
    return {
      speakerMessage: sanitizeDisplayedModelText(fallbackSpeakerMessage),
      speakerClaims: [],
      speakerRisks: [],
      speakerOpenQuestions: [],
      handoff: {
        next_role_id: fallbackNextRole?.id || "",
        next_role_focus: "",
        local_knowledge_needed: [],
        web_search_needed: [],
        preferred_categories: [],
        preferred_keywords: [],
        avoid_categories: [],
        missing_evidence_types: [],
        current_round_summary: "",
        recommended_counterpoints: [],
      },
    };
  }
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

function buildDiscussionContext(summary, roundNotes, liveTurns, compressedHistory) {
  const finishedRounds = compressedHistory
    ? `前面各轮压缩记忆：\n${compressedHistory}`
    : roundNotes.length
      ? `前面轮次记录：\n${roundNotes
          .map((note) => formatFinishedRoundContext(note))
          .join("\n\n")}`
      : "";
  const currentTurns = liveTurns.length
    ? `本轮前面已经发言的内容：\n${liveTurns.map((turn) => formatTurnContext(turn)).join("\n\n")}`
    : "";
  const sharedResearch = state.sharedResearchBrief
    ? `【置顶基准事实包 · 全程有效，每轮必须遵守】本次讨论的共识基础如下，所有角色共用同一份材料，不得假装另查到不同外部资料，不得与此包中确认内容矛盾：\n${state.sharedResearchBrief}`
    : "";
  const userMemory = buildUserMemoryPrompt();
  const projectMemory = buildProjectMemoryPrompt();

  return [
    `任务定义：${summary}`,
    sharedResearch,
    userMemory ? `用户记忆（长期偏好，可作为语气和组织方式参考）：\n${userMemory}` : "",
    projectMemory ? `项目记忆（当前项目沉淀）：\n${projectMemory}` : "",
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
  // 先整体剥离：如果文本以明确的 reasoning 段落标记开头，清掉整个 reasoning 块直到真正的中文正文
  const reasoningHeaderPattern = /^(?:analyze user input|draft construction|mental refinement|key requirements|identify key requirements|constraints check|deconstruct & plan|deconstruct)/i;
  if (reasoningHeaderPattern.test(text.trimStart())) {
    // 找到第一个非空中文段落作为正文起点
    const chineseParagraph = text.match(/\n\n([\u4e00-\u9fa5][^\n]{10,})/);
    if (chineseParagraph && chineseParagraph.index !== undefined) {
      text = text.slice(chineseParagraph.index).trim();
    }
  }
  // 剥离 markdown 代码围栏（整段包裹在 ```json ... ``` 或 ``` ... ``` 里）
  const fencedBlock = text.match(/^```[a-z]*\s*\n([\s\S]*?)\n?```\s*$/i);
  if (fencedBlock?.[1]) {
    text = fencedBlock[1].trim();
  }
  // 截断响应：只有开头围栏、没有结尾围栏（模型回复被截断）
  if (/^```[a-z]*\s*\n/i.test(text)) {
    text = text.replace(/^```[a-z]*\s*\n/i, "").trim();
  }
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
    .replace(/^role\s*:\s*(?=[a-z ])/gim, "")
    .replace(/^goal\s*:\s*(?=[a-z ])/gim, "")
    .replace(/^output\s*:\s*(?=[a-z ])/gim, "")
    .replace(/^context\s*:\s*(?=[a-z ])/gim, "")
    .replace(/^tone\s*:\s*(?=[a-z ])/gim, "")
    .replace(/^format\s*:\s*(?=[a-z ])/gim, "")
    .replace(/^audience\s*:\s*(?=[a-z ])/gim, "")
    .replace(/^you are\s+.*$/gim, "")
    .replace(/^as an?\s+.*$/gim, "")
    .replace(/^i (need to|will|should|am going to|assume).*$/gim, "")
    .replace(/^\s*[-*]?\s*(previous speaker(?:\s*\d+)?|previous发言|mode requirement|mode requirements|constraints check|task definition|shared facts|controversies|unverified)\s*[:：].*$/gim, "")
    .replace(/^[（(][^\n）)]{0,40}[）)]\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function profileSupportsVision(profile) {
  if (!profile) {
    return false;
  }
  if (profile.compatibility === "anthropic") {
    return true;
  }
  // Trust the vision probe result first (set after model test)
  if (profile.supportsVision === true) {
    return true;
  }

  const provider = String(profile.providerName || "").toLowerCase();
  const modelId = String(profile.modelId || "").toLowerCase();
  const baseUrl = String(profile.baseUrl || "").toLowerCase();

  if (/(rerank|reranker|embedding|embed)/.test(modelId)) {
    return false;
  }

  if (/gemini/.test(provider) || /generativelanguage|gemini/.test(baseUrl) || /gemini/.test(modelId)) {
    return true;
  }

  return /(gpt-4o|gpt-4\.1|vision|vl|qvq|qwen2\.5-vl|internvl|minicpm-v|llava|claude-3|claude-sonnet-4|doubao|volc|ark)/.test(modelId);
}

async function probeVisionCapability(profile, timeoutMs = MODEL_TEST_TIMEOUT_MS) {
  if (!profile || !profile.baseUrl || !profile.modelId) {
    return { supported: false, status: "error", latencyMs: 0 };
  }

  const requestControl = createRequestSignal(null, timeoutMs);
  const startedAt = performance.now();
  try {
    let response;
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
          max_tokens: 48,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "请只回复：图像可读" },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn2eKQAAAAASUVORK5CYII=",
                },
              },
            ],
          }],
        }),
      });
    } else {
      response = await fetch(joinUrl(profile.baseUrl, profile.endpointPath || "/chat/completions"), {
        method: "POST",
        signal: requestControl.signal,
        headers: {
          "content-type": "application/json",
          ...(profile.apiKey ? { authorization: `Bearer ${profile.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: profile.modelId,
          max_tokens: 48,
          temperature: 0.2,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "请只回复：图像可读" },
              { type: "image_url", image_url: { url: "https://raw.githubusercontent.com/github/explore/main/topics/github/github.png" } },
            ],
          }],
          ...(isQwenProfile(profile) ? { chat_template_kwargs: { enable_thinking: false } } : {}),
        }),
      });
    }
    requestControl.cleanup();
    return {
      supported: response.ok,
      status: response.ok ? "success" : "error",
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
    };
  } catch (error) {
    requestControl.cleanup();
    return {
      supported: false,
      status: "error",
      latencyMs: requestControl.didTimeOut() ? timeoutMs : 0,
      error,
    };
  }
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
  const cycleModelButton = document.getElementById("cycle-model");
  if (cycleModelButton) {
    cycleModelButton.disabled = running;
  }
  if (hostModelSelect) {
    hostModelSelect.disabled = running || !getConfiguredProfiles().length;
  }
  if (!running) {
    // 讨论结束后刷新按钮文字（继续讨论 / 重新生成人物 / 开始讨论）
    renderSeatStack();
  }
}

function stopDiscussionFlow() {
  if (!state.discussionRunning) {
    return;
  }
  stopReadAloudPlayback();
  state.discussionAbortRequested = true;
  if (pendingUserParticipationResolver) {
    pendingUserParticipationResolver({ aborted: true });
  }
  if (pendingDiscussionContinuationResolver) {
    pendingContinuationButtonCard?.remove();
    pendingContinuationButtonCard = null;
    pendingDiscussionContinuationResolver({ aborted: true });
  }
  state.discussionAbortController?.abort();
  setSpeakerCard(langText("正在结束讨论", "Stopping Discussion"), langText("等待当前请求停止", "Waiting for the current request to stop"), langText(`当前执行到 ${getRoundLabel()}，系统会在这一步结束后停止。`, `Currently at ${getRoundLabel()}. The system will stop after this step finishes.`), "系");
  updateSeatFeedback(langText("已请求结束讨论，正在停止当前角色。", "Stop requested. The system is stopping the current speaker."), "pending");
}

function createTopicSession(title = "") {
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
  return "";
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
    sharedEvidenceEntries: Array.isArray(state.sharedEvidenceEntries) ? state.sharedEvidenceEntries : [],
    rolePlanningBrief: state.rolePlanningBrief,
    roleBackgroundContext: state.roleBackgroundContext,
    projectMemory: normalizeProjectMemory(state.projectMemory),
    pendingRoleClarification: [...state.pendingRoleClarification],
    taskSupplementMode: state.taskSupplementMode,
    sharedAgentQuery: state.sharedAgentQuery,
    sharedAgentSources: state.sharedAgentSources,
    latestReportText: state.latestReportText,
    latestReportFileName: state.latestReportFileName,
    discussionRoundNotes: state.discussionRoundNotes,
    discussionState: state.discussionState,
    recommendedRoleGenerationMeta: state.recommendedRoleGenerationMeta,
    aiAutoRecommendEnabled: state.aiAutoRecommendEnabled,
    seatSource: state.seatSource,
    recommendedRoles: state.recommendedRoles,
    selectedIds: [...state.selectedIds],
    seatAssignments: { ...state.seatAssignments },
    seatLayoutCustomized: state.seatLayoutCustomized,
    discussionOrder: { ...state.discussionOrder },
    ttsVoiceAssignments: { ...state.ttsVoiceAssignments },
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
  state.projectMemory = deriveProjectMemoryFromState();
  syncUserMemoryFromState();
  topic.title = deriveTopicTitle();
  topic.summary = deriveTopicSummary();
  topic.updatedAt = Date.now();
  topic.snapshot = buildCurrentTopicSnapshot();
  updateCurrentTopicTitle(topic.title);
  await persistTopics();
  await persistUserMemory();
  renderMemoryAgentWorkspace();
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
  state.sharedEvidenceEntries = Array.isArray(snapshot.sharedEvidenceEntries) ? snapshot.sharedEvidenceEntries.filter(Boolean) : [];
  state.rolePlanningBrief = snapshot.rolePlanningBrief || "";
  state.roleBackgroundContext = snapshot.roleBackgroundContext || "";
  state.projectMemory = normalizeProjectMemory(snapshot.projectMemory || buildEmptyProjectMemory());
  state.pendingRoleClarification = Array.isArray(snapshot.pendingRoleClarification) ? snapshot.pendingRoleClarification.filter(Boolean) : [];
  state.taskSupplementMode = !!snapshot.taskSupplementMode;
  state.sharedAgentQuery = snapshot.sharedAgentQuery || "";
  state.sharedAgentSources = snapshot.sharedAgentSources || "";
  state.latestReportText = snapshot.latestReportText || "";
  state.latestReportFileName = snapshot.latestReportFileName || "";
  state.discussionRoundNotes = Array.isArray(snapshot.discussionRoundNotes) ? snapshot.discussionRoundNotes : [];
  state.discussionState = normalizeDiscussionState(snapshot.discussionState || buildEmptyDiscussionState());
  state.recommendedRoleGenerationMeta = snapshot.recommendedRoleGenerationMeta || null;
  state.aiAutoRecommendEnabled = snapshot.aiAutoRecommendEnabled !== false;
  state.seatSource = snapshot.seatSource || "recommended";
  state.recommendedRoles = normalizeRecommendedRoleList(snapshot.recommendedRoles || []);
  if (!state.aiAutoRecommendEnabled && !state.recommendedRoles.length) {
    state.seatSource = "library";
  }
  state.selectedIds = new Set(snapshot.selectedIds || []);
  state.seatAssignments = snapshot.seatAssignments || {};
  state.seatLayoutCustomized = !!snapshot.seatLayoutCustomized;
  state.discussionOrder = snapshot.discussionOrder || {};
  state.ttsVoiceAssignments = snapshot.ttsVoiceAssignments || {};
  state.seatModelAssignments = snapshot.seatModelAssignments || {};
  sanitizeSeatModelAssignments();
  if (state.seatLayoutCustomized) {
    ensureCoreAssignments();
    syncDiscussionOrder();
  } else {
    applyDefaultSeatLayout([...state.selectedIds], { force: true });
  }
  state.pendingAttachments = snapshot.pendingAttachments || [];
  userInput.value = snapshot.userInput || "";
  discussionStream.innerHTML = snapshot.discussionHtml || "";
  pruneHiddenWorkflowMessages();
  relocalizeDiscussionMessages();
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
  renderDiscussionStatusPanel();
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
  renderMemoryAgentWorkspace();
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
  state.projectMemory = buildEmptyProjectMemory();
  state.projectArtifacts = [];
  state.projectKnowledgeEntries = [];
  activeKnowledgeEntryId = "";
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
  await hydrateProjectScopedState(topicId);
  await persistTopics();
  renderMemoryAgentWorkspace();
  renderRoundtableEvidenceWorkspace();
  renderKnowledgeBaseWorkspace();
  renderTopicList();
}

async function deleteTopic(topicId) {
  const topic = state.topics.find((item) => item.id === topicId);
  if (!topic) {
    return;
  }

  const confirmed = await openConfirmDialog({
    title: langText("删除任务", "Delete Task"),
    message: langText(`删除任务“${topic.title}”？这会同时移除这条任务里的讨论记录和导出结果。`, `Delete task “${topic.title}”? This will also remove the discussion history and exported results.`),
    confirmText: langText("删除", "Delete"),
  });
  if (!confirmed) {
    return;
  }

  state.discussionAbortController?.abort();
  await deleteProjectArtifacts(topicId);
  await deleteProjectKnowledgeEntries(topicId);
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
  if (configModel) {
    configModel.textContent = state.appLanguage === "en" ? modelValuesEn[state.modelIndex] : modelValues[state.modelIndex];
  }
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

function updateComposerViewportPlacement() {
  if (!chatShell || !composerShell) {
    return;
  }

  composerShell.style.setProperty("--composer-offset", "0px");

  const composerHeight = Math.ceil(composerShell.getBoundingClientRect().height);
  chatShell.style.setProperty("--composer-reserve", `${Math.max(composerHeight + 12, 96)}px`);

  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const composerBottom = composerShell.getBoundingClientRect().bottom;
  const overflow = Math.max(0, Math.ceil(composerBottom - viewportHeight + 8));
  composerShell.style.setProperty("--composer-offset", `${overflow}px`);
}

function autoResizeTextarea() {
  userInput.style.height = "auto";
  const nextHeight = Math.min(userInput.scrollHeight, 140);
  userInput.style.height = `${nextHeight}px`;
  userInput.style.overflowY = userInput.scrollHeight > 140 ? "auto" : "hidden";
  updateComposerViewportPlacement();
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
    documentTitle: "圆桌智囊团 - 讨论工作台原型",
    currentTopicFallbackTitle: "请先新建并确认一个话题",
    liveStatusWaiting: "等待开始讨论",
    discussionStatusTitle: "讨论状态",
    discussionStatusTargetLabel: "当前目标",
    discussionStatusStrategyLabel: "检索策略",
    discussionStatusEvidenceLabel: "证据情况",
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
    openSeatPicker: "席位",
    regeneratePersonas: "重新生成角色",
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
    roleGenderLabel: "性别",
    roleAgeLabel: "年龄",
    roleAgePlaceholder: "比如：45岁 / 16岁 / 68岁",
    roleDescriptionLabel: "人物说明",
    roleDescriptionPlaceholder: "写这个人物的身份背景、长期经验和典型关切",
    rolePromptLabel: "专有提示词",
    rolePromptPlaceholder: "写给 AI 的专属提示词模板：先交代身份，再写清楚这个人物先看什么、如何判断、如何发言、如何反驳别人、何时承认不确定",
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
    profileModelIdPlaceholder: "gpt-5.4 / deepseek-ai/DeepSeek-V3.2 / glm-4.5",
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
    hostModelNote: "这里只指定主持 AI 用哪个已接入模型。建议优先选择测试延迟更低的模型做主持。其他人物席位仍然在席位卡里各自选择模型，不在这里统一覆盖。",
    multimodalModelTitle: "多模态 AI",
    multimodalModelSelectLabel: "谁来负责图片解析",
    multimodalModelFollowHost: "跟随主持 AI",
    multimodalModelNote: "如果主持模型本身支持视觉，可以跟随主持。若主持模型偏快但不支持图片，请在这里单独指定一个支持多模态的模型。",
    multimodalAiTag: "多模态",
    peopleLibraryCurrentTag: "当前库",
    newTopic: "+ 新建话题",
    topicListTitle: "话题列表",
    quickAccessTitle: "快捷入口",
    peopleLibraryOpen: "人物库",
    roundtableWorkbenchOpen: "圆桌台",
    knowledgeBaseOpen: "知识库",
    discussionSettingsTitle: "讨论设置",
    seatConfigTitle: "配置席位",
    toggleTopicsMore: "更多",
    toggleTopicsLess: "收起",
    cycleModeLabel: "讨论目标",
    cycleParticipationLabel: "用户参与",
    cycleDensityLabel: "回答力度",
    cycleModelLabel: "模型切换",
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
    documentTitle: "Roundtable Braintrust - Discussion Workspace Prototype",
    currentTopicFallbackTitle: "Create and confirm a topic first",
    liveStatusWaiting: "Waiting to start discussion",
    discussionStatusTitle: "Discussion Status",
    discussionStatusTargetLabel: "Current Target",
    discussionStatusStrategyLabel: "Retrieval Strategy",
    discussionStatusEvidenceLabel: "Evidence Status",
    followToggle: "Follow New Messages",
    languageToggle: "CN",
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
    openSeatPicker: "Seats",
    regeneratePersonas: "Regen Roles",
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
    roleGenderLabel: "Gender",
    roleAgeLabel: "Age",
    roleAgePlaceholder: "For example: 45 years old / 16 years old",
    roleDescriptionLabel: "Persona Background",
    roleDescriptionPlaceholder: "Describe this persona's background, long-term experience, and typical concerns",
    rolePromptLabel: "Persona Prompt",
    rolePromptPlaceholder: "Write the AI prompt for this persona: identity first, then what this persona notices first, how they judge, how they speak, how they challenge others, and when they admit uncertainty",
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
    profileModelIdPlaceholder: "gpt-5.4 / deepseek-ai/DeepSeek-V3.2 / glm-4.5",
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
    hostModelNote: "This only assigns the host AI. Prefer lower-latency tested models for the host when possible. Other personas still choose their own model from their seat cards and are not overridden globally.",
    multimodalModelTitle: "Multimodal AI",
    multimodalModelSelectLabel: "Which model should handle image analysis",
    multimodalModelFollowHost: "Follow Host AI",
    multimodalModelNote: "If the host model already supports vision, let multimodal follow the host. If you want a faster host that does not support images, assign a separate vision-capable model here.",
    multimodalAiTag: "Multimodal",
    peopleLibraryCurrentTag: "Current Library",
    newTopic: "+ New Topic",
    topicListTitle: "Topic List",
    quickAccessTitle: "Quick Access",
    peopleLibraryOpen: "Open Library",
    roundtableWorkbenchOpen: "Open Roundtable",
    knowledgeBaseOpen: "Knowledge Base",
    discussionSettingsTitle: "Discussion Settings",
    seatConfigTitle: "Seat Setup",
    toggleTopicsMore: "More",
    toggleTopicsLess: "Less",
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
  document.documentElement.lang = state.appLanguage === "en" ? "en" : "zh-CN";
  document.title = t("documentTitle");
  if (speakerAvatar && /^[\u7cfbS]$/.test((speakerAvatar.textContent || "").trim())) {
    speakerAvatar.textContent = langText("\u7cfb", "S");
  }
  if (speakerAvatar && /^[\u4e3bH]$/.test((speakerAvatar.textContent || "").trim())) {
    speakerAvatar.textContent = langText("主", "H");
  }
  const confirmSectionLabel = document.getElementById("confirm-section-label");
  if (confirmSectionLabel) {
    confirmSectionLabel.textContent = langText("确认操作", "Confirm Action");
  }
  if (confirmTitle && (/^(请确认这次操作|Please confirm this action)$/.test((confirmTitle.textContent || "").trim()) || !(confirmTitle.textContent || "").trim())) {
    confirmTitle.textContent = langText("请确认这次操作", "Please confirm this action");
  }
  if (confirmMessage && (/^(这项操作会直接生效。|This action will take effect immediately\.)$/.test((confirmMessage.textContent || "").trim()) || !(confirmMessage.textContent || "").trim())) {
    confirmMessage.textContent = langText("这项操作会直接生效。", "This action will take effect immediately.");
  }
  if (confirmCancel && (/^(取消|Cancel)$/.test((confirmCancel.textContent || "").trim()) || !(confirmCancel.textContent || "").trim())) {
    confirmCancel.textContent = langText("取消", "Cancel");
  }
  if (confirmAccept && (/^(确认|Confirm)$/.test((confirmAccept.textContent || "").trim()) || !(confirmAccept.textContent || "").trim())) {
    confirmAccept.textContent = langText("确认", "Confirm");
  }
  if (confirmModal?.classList.contains("open")) {
    if ((confirmCancel?.textContent || "").trim() === "取消" || (confirmCancel?.textContent || "").trim() === "Cancel") {
      confirmCancel.textContent = langText("取消", "Cancel");
    }
    if ((confirmAccept?.textContent || "").trim() === "确认" || (confirmAccept?.textContent || "").trim() === "Confirm") {
      confirmAccept.textContent = langText("确认", "Confirm");
    }
  }
  if (currentTopicLabel) {
    currentTopicLabel.textContent = t("currentTopicLabel");
  }
  const openSettingsDrawerButton = document.getElementById("open-settings-drawer");
  if (openSettingsDrawerButton) {
    openSettingsDrawerButton.setAttribute("aria-label", langText("打开设置", "Open Settings"));
    openSettingsDrawerButton.title = langText("打开设置", "Open Settings");
  }
  if (followToggle) {
    followToggle.textContent = t("followToggle");
  }
  if (appLanguageToggle) {
    appLanguageToggle.textContent = t("languageToggle");
  }
  if (speakerName && /^(任务整理中|Task Intake)$/.test((speakerName.textContent || "").trim())) {
    speakerName.textContent = langText("任务整理中", "Task Intake");
  }
  if (speakerRole && /^(等待用户输入|Waiting for user input)$/.test((speakerRole.textContent || "").trim())) {
    speakerRole.textContent = langText("等待用户输入", "Waiting for user input");
  }
  if (speakerDescription && /^(先整理，再确认，再生成人物。|First organize, then confirm, then generate participants\.)$/.test((speakerDescription.textContent || "").trim())) {
    speakerDescription.textContent = langText("先整理，再确认，再生成人物。", "First organize, then confirm, then generate participants.");
  }
  if (currentTopicTitle && !state.activeTopicId) {
    currentTopicTitle.textContent = t("currentTopicFallbackTitle");
  }
  if (liveStatusBanner) {
    const liveStatusText = (liveStatusBanner.textContent || "").trim();
    if (!liveStatusText || /^(等待开始讨论|Waiting to start discussion)$/.test(liveStatusText)) {
      liveStatusBanner.textContent = t("liveStatusWaiting");
    } else if (/^(目前无任务|目前还没有任务|No task yet)$/.test(liveStatusText)) {
      liveStatusBanner.textContent = t("currentTaskEmpty");
    }
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
  if (regeneratePersonasButton) {
    regeneratePersonasButton.textContent = t("regeneratePersonas");
  }
  renderAiRoleRecommendationToggle();
  renderVoiceReadToggle();
  if (closePeopleLibrary) {
    closePeopleLibrary.textContent = roleEditor.classList.contains("hidden") ? t("exitLibrary") : t("returnToList");
  }
  const knowledgeSectionLabel = document.getElementById("knowledge-base-section-label");
  const knowledgeTitle = document.getElementById("knowledge-base-title");
  const knowledgeSearchLabel = document.getElementById("knowledge-search-label");
  const knowledgeCategoryFilterLabel = document.getElementById("knowledge-category-filter-label");
  const knowledgeUploadCategoryLabel = document.getElementById("knowledge-upload-category-label");
  const knowledgeListTitle = document.getElementById("knowledge-list-title");
  const knowledgeDetailTitle = document.getElementById("knowledge-detail-title");
  const knowledgeSearchInput = document.getElementById("knowledge-search");
  if (knowledgeSectionLabel) {
    knowledgeSectionLabel.textContent = langText("知识库", "Knowledge Base");
  }
  if (knowledgeTitle) {
    knowledgeTitle.textContent = langText("全局知识库", "Global Knowledge Base");
  }
  if (knowledgeUploadTrigger) {
    knowledgeUploadTrigger.textContent = langText("上传文档", "Upload Docs");
  }
  if (knowledgeCategoryAddButton) {
    knowledgeCategoryAddButton.textContent = langText("新增目录", "Add Folder");
  }
  if (knowledgeCategoryRenameButton) {
    knowledgeCategoryRenameButton.textContent = langText("改名", "Rename");
  }
  if (knowledgeCategoryDeleteButton) {
    knowledgeCategoryDeleteButton.textContent = langText("删除", "Delete");
  }
  if (closeKnowledgeBaseButton) {
    closeKnowledgeBaseButton.textContent = t("close");
  }
  if (knowledgeSearchLabel) {
    knowledgeSearchLabel.textContent = langText("检索", "Search");
  }
  if (knowledgeCategoryFilterLabel) {
    knowledgeCategoryFilterLabel.textContent = langText("目录", "Folder");
  }
  if (knowledgeUploadCategoryLabel) {
    knowledgeUploadCategoryLabel.textContent = langText("上传到目录", "Upload to folder");
  }
  if (knowledgeListTitle) {
    knowledgeListTitle.textContent = langText("知识目录", "Knowledge Catalog");
  }
  if (knowledgeDetailTitle) {
    knowledgeDetailTitle.textContent = langText("详情", "Detail");
  }
  if (knowledgeSearchInput) {
    knowledgeSearchInput.placeholder = langText("搜索标题、摘要、正文", "Search title, summary, or content");
  }
  const roundtableSectionLabel = document.getElementById("roundtable-workbench-section-label");
  const roundtableTitle = document.getElementById("roundtable-workbench-title");
  const runWebSearchLabel = document.getElementById("run-web-search-agent");
  const runImageAnalysisLabel = document.getElementById("run-multimodal-agent");
  const roundtableEvidenceListTitle = document.getElementById("roundtable-evidence-list-title");
  const roundtableEvidenceFilterLabel = document.getElementById("roundtable-evidence-filter-label");
  const roundtableEvidenceDetailTitle = document.getElementById("roundtable-evidence-detail-title");
  const evidenceTranslateToggle = document.getElementById("evidence-translate-toggle");
  const knowledgeNoteStrip = document.getElementById("knowledge-note-strip");
  const knowledgeCountBadge = document.getElementById("knowledge-count-badge");
  if (roundtableSectionLabel) {
    roundtableSectionLabel.textContent = langText("圆桌台", "Roundtable");
  }
  if (roundtableTitle) {
    roundtableTitle.textContent = langText("证据链", "Evidence Chain");
  }
  if (runWebSearchLabel) {
    runWebSearchLabel.textContent = langText("搜索网页", "Web Search");
  }
  if (runImageAnalysisLabel) {
    runImageAnalysisLabel.textContent = langText("图片解析", "Image Analysis");
  }
  if (roundtableEvidenceListTitle) {
    roundtableEvidenceListTitle.textContent = langText("证据链", "Evidence Chain");
  }
  if (roundtableEvidenceFilterLabel) {
    roundtableEvidenceFilterLabel.textContent = langText("筛选", "Filter");
  }
  if (roundtableEvidenceDetailTitle) {
    roundtableEvidenceDetailTitle.textContent = langText("详情", "Detail");
  }
  if (evidenceTranslateToggle) {
    evidenceTranslateToggle.textContent = langText(`自动翻译 ${state.autoTranslateEvidence ? "✔" : "✘"}`, `Auto Translate ${state.autoTranslateEvidence ? "✔" : "✘"}`);
    evidenceTranslateToggle.title = langText("开启后，搜索结果采用 AI 自动翻译为中文", "When enabled, search results are automatically translated for the current language.");
  }
  if (knowledgeNoteStrip) {
    knowledgeNoteStrip.textContent = langText("当前只把可稳定标准化的资料纳入检索：TXT、Markdown、JSON、CSV、HTML、YAML、常见源码文本、PDF、DOCX、XLSX、XLS。上传后会先整理成分片，再进入本地检索。", "Only formats that can be normalized reliably enter retrieval: TXT, Markdown, JSON, CSV, HTML, YAML, common source code text, PDF, DOCX, XLSX, and XLS. Uploaded files are chunked locally before retrieval.");
  }
  if (knowledgeCountBadge) {
    const count = Number.parseInt(knowledgeCountBadge.textContent, 10);
    knowledgeCountBadge.textContent = Number.isFinite(count) ? langText(`${count} 条`, `${count} items`) : langText("0 条", "0 items");
  }
  localizeSelectOptions(roundtableEvidenceFilterSelect, {
    all: langText("全部", "All"),
    web: langText("网页", "Web"),
    knowledge: langText("知识", "Knowledge"),
    image: langText("图片", "Images"),
    video: langText("视频", "Video"),
    file: langText("文件", "Files"),
    text: langText("文本", "Text"),
  });
  renderKnowledgeCategoryOptions();
  renderKnowledgeScopeUi();
  renderKnowledgeEnabledToggle();
  updateProfileTemplateHint(defaultProfileMap.get(providerTemplateSelect?.value) || null);
  setElementText("people-library-section-label", "peopleLibrarySectionLabel");
  setElementText("people-library-title", "peopleLibraryTitle");
  setElementText("open-role-editor", "newPersona");
  setElementText("people-filter-all", "filterAll");
  setElementText("people-filter-favorite", "filterFavorite");
  setElementText("people-filter-custom", "filterCustom");
  setElementPlaceholder("people-search", "peopleSearchPlaceholder");
  setElementText("role-editor-name-label", "roleNameLabel");
  const roleEditorNameEnLabel = document.getElementById("role-editor-name-en-label");
  const roleEditorDescriptionEnLabel = document.getElementById("role-editor-description-en-label");
  const roleEditorPromptEnLabel = document.getElementById("role-editor-prompt-en-label");
  const roleEditorSourceLabelEnText = document.getElementById("role-editor-source-label-en-text");
  if (roleEditorNameEnLabel) {
    roleEditorNameEnLabel.textContent = langText("人物名称（英文）", "Persona Name");
  }
  if (roleEditorDescriptionEnLabel) {
    roleEditorDescriptionEnLabel.textContent = langText("人物说明（英文）", "Persona Background");
  }
  if (roleEditorPromptEnLabel) {
    roleEditorPromptEnLabel.textContent = langText("专有提示词（英文）", "Persona Prompt");
  }
  if (roleEditorSourceLabelEnText) {
    roleEditorSourceLabelEnText.textContent = langText("来源标签（英文）", "Source Tag");
  }
  setElementText("role-editor-ai-label", "roleAiAssistLabel");
  setElementPlaceholder("role-editor-ai-requirements", "roleAiAssistPlaceholder");
  setElementText("generate-role-with-ai", "roleAiGenerateButton");
  setElementPlaceholder("role-editor-name", "roleNamePlaceholder");
  if (roleEditorNameEn) {
    roleEditorNameEn.placeholder = langText("比如：Literal Reading Advocate", "For example: Literal Reading Advocate");
  }
  setElementText("role-editor-gender-label", "roleGenderLabel");
  localizeSelectOptions(roleEditorGender, {
    female: langText("女", "Female"),
    male: langText("男", "Male"),
    nonbinary: langText("中性", "Non-binary"),
  });
  setElementText("role-editor-age-label", "roleAgeLabel");
  setElementPlaceholder("role-editor-age", "roleAgePlaceholder");
  setElementText("role-editor-description-label", "roleDescriptionLabel");
  setElementPlaceholder("role-editor-description", "roleDescriptionPlaceholder");
  if (roleEditorDescriptionEn) {
    roleEditorDescriptionEn.placeholder = langText("用英文描述这个人物", "Describe this persona in English");
  }
  setElementText("role-editor-prompt-label", "rolePromptLabel");
  setElementPlaceholder("role-editor-prompt", "rolePromptPlaceholder");
  if (roleEditorPromptEn) {
    roleEditorPromptEn.placeholder = langText("写给 AI 的英文人物提示词", "Write the English persona prompt for the AI");
  }
  setElementText("role-editor-stance-label", "roleStanceLabel");
  setElementText("role-editor-color-label", "roleColorLabel");
  setElementText("role-editor-temper-label", "roleTemperLabel");
  setElementText("role-editor-source-label-text", "roleSourceLabel");
  setElementPlaceholder("role-editor-source-label", "roleSourcePlaceholder");
  if (roleEditorSourceLabelEn) {
    roleEditorSourceLabelEn.placeholder = langText("比如：Sermon / Legal / Medical", "For example: Sermon / Legal / Medical");
  }
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
  setElementText("multimodal-model-title", "multimodalModelTitle");
  setElementText("multimodal-model-select-label", "multimodalModelSelectLabel");
  setElementText("multimodal-model-note", "multimodalModelNote");
  setElementText("sidebar-people-library-title", "peopleLibrarySectionLabel");
  setElementText("new-topic", "newTopic");
  setElementText("topic-list-title", "topicListTitle");
  setElementText("quick-access-title", "quickAccessTitle");
  setElementText("open-people-library", "peopleLibraryOpen");
  setElementText("open-roundtable-workbench", "roundtableWorkbenchOpen");
  setElementText("open-knowledge-base", "knowledgeBaseOpen");
  setElementText("close-roundtable-workbench", "close");
  setElementText("people-library-current-tag", "peopleLibraryCurrentTag");
  setElementText("discussion-settings-title", "discussionSettingsTitle");
  setElementText("seat-config-title", "seatConfigTitle");
  setElementText("cycle-mode-label", "cycleModeLabel");
  setElementText("cycle-participation-label", "cycleParticipationLabel");
  setElementText("cycle-density-label", "cycleDensityLabel");
  setElementText("cycle-model-label", "cycleModelLabel");
  setElementText("discussion-rounds-label", "discussionRoundsLabel");
  setElementText("discussion-size-label", "discussionSizeLabel");
  setElementText("discussion-status-title", "discussionStatusTitle");
  setElementText("discussion-status-target-label", "discussionStatusTargetLabel");
  setElementText("discussion-status-strategy-label", "discussionStatusStrategyLabel");
  setElementText("discussion-status-evidence-label", "discussionStatusEvidenceLabel");
  localizeSelectOptions(discussionSizeSelect, {
    4: state.appLanguage === "en" ? "4 people" : "4 人",
    5: state.appLanguage === "en" ? "5 people" : "5 人",
    6: state.appLanguage === "en" ? "6 people" : "6 人",
    7: state.appLanguage === "en" ? "7 people" : "7 人",
    8: state.appLanguage === "en" ? "8 people" : "8 人",
  });
  if (toggleTopicsButton) {
    toggleTopicsButton.textContent = topicList.classList.contains("expanded") ? t("toggleTopicsLess") : t("toggleTopicsMore");
  }

  localizeSelectOptions(roleEditorStance, {
    "支持原命题": state.appLanguage === "en" ? "Support the claim" : "支持原命题",
    "强力反驳": state.appLanguage === "en" ? "Strong rebuttal" : "强力反驳",
    "中立裁决": state.appLanguage === "en" ? "Neutral judgment" : "中立裁决",
    "补充背景": state.appLanguage === "en" ? "Add context" : "补充背景",
    "强调落地": state.appLanguage === "en" ? "Stress execution" : "强调落地",
    "强调风险": state.appLanguage === "en" ? "Stress risk" : "强调风险",
    "澄清表达": state.appLanguage === "en" ? "Clarify expression" : "澄清表达",
    "强调约束": state.appLanguage === "en" ? "Stress constraints" : "强调约束",
    "强调安全": state.appLanguage === "en" ? "Stress safety" : "强调安全",
    "追求准确": state.appLanguage === "en" ? "Seek accuracy" : "追求准确",
    "追求严密": state.appLanguage === "en" ? "Seek rigor" : "追求严密",
    "强调边界": state.appLanguage === "en" ? "Stress boundaries" : "强调边界",
    "强调执行": state.appLanguage === "en" ? "Stress execution" : "强调执行",
    "强调取舍": state.appLanguage === "en" ? "Stress trade-offs" : "强调取舍",
    "保持中立主持": state.appLanguage === "en" ? "Neutral facilitation" : "保持中立主持",
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
    "直接": state.appLanguage === "en" ? "Direct" : "直接",
    "严谨": state.appLanguage === "en" ? "Meticulous" : "严谨",
    "果断": state.appLanguage === "en" ? "Decisive" : "果断",
    "务实": state.appLanguage === "en" ? "Pragmatic" : "务实",
    "清晰": state.appLanguage === "en" ? "Clear" : "清晰",
    "自定义": state.appLanguage === "en" ? "Custom" : "自定义",
  });
  updateCurrentTopicTitle(deriveTopicTitle());
  refreshTaskSummaryMessages();
  relocalizeDiscussionMessages();
  renderTopicList();
  renderPeopleLibrary();
  renderSeatPicker();
  renderSeatStack();
  if (!roleEditor.classList.contains("hidden") && roleEditorId?.value) {
    const currentRole = getRoleById(roleEditorId.value);
    if (currentRole) {
      fillRoleEditor(currentRole);
    }
  }
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

function relocalizeDiscussionMessages() {
  if (!discussionStream) {
    return;
  }

  const noTaskHint = discussionStream.querySelector(".no-task-hint");
  if (noTaskHint) {
    noTaskHint.textContent = langText("暂无任务。点击上方「+ 新建话题」开始。", 'No task yet. Click "+ New Topic" above to start.');
  }

  discussionStream.querySelectorAll(".chat-item").forEach((item) => {
    const strong = item.querySelector(".chat-meta strong");
    const sublabel = item.querySelector(".chat-meta span:not(.chat-assignment-badge):not(.chat-msg-voice-btns):not(.speaking-wave)");
    const avatar = item.querySelector(".avatar-badge");
    const speakerId = item.dataset.speakerId || "";
    const role = getDiscussionSpeakerRoleById(speakerId);

    if (strong) {
      if (role) {
        strong.textContent = getDisplayRoleName(role);
      } else {
        strong.textContent = localizeChatSpeakerLabel(strong.textContent.trim());
      }
    }

    if (avatar) {
      const avatarText = (avatar.textContent || "").trim();
      if (avatarText === "系" || avatarText === "S") {
        avatar.textContent = langText("系", "S");
      } else if (avatarText === "我" || avatarText === "I") {
        avatar.textContent = langText("我", "I");
      } else if (avatarText === "研" || avatarText === "R") {
        avatar.textContent = langText("研", "R");
      } else if (avatarText === "网" || avatarText === "W") {
        avatar.textContent = langText("网", "W");
      }
    }

    if (sublabel) {
      const text = sublabel.textContent.trim();
      const replacements = new Map([
        ["整理后的任务定义", langText("整理后的任务定义", "Refined Task Definition")],
        ["Refined Task Definition", langText("整理后的任务定义", "Refined Task Definition")],
        ["讨论执行失败", langText("讨论执行失败", "Discussion Failed")],
        ["Discussion Failed", langText("讨论执行失败", "Discussion Failed")],
        ["讨论已结束", langText("讨论已结束", "Discussion Stopped")],
        ["Discussion Stopped", langText("讨论已结束", "Discussion Stopped")],
        ["共享事实包", langText("共享事实包", "Shared Brief")],
        ["Shared Brief", langText("共享事实包", "Shared Brief")],
        ["网页搜索与共享事实", langText("网页搜索与共享事实", "Web Search + Shared Brief")],
        ["Web Search + Shared Brief", langText("网页搜索与共享事实", "Web Search + Shared Brief")],
        ["已确认任务定义", langText("已确认任务定义", "Task Definition Confirmed")],
        ["Task Definition Confirmed", langText("已确认任务定义", "Task Definition Confirmed")],
        ["继续补充", langText("继续补充", "Add More Details")],
        ["Add More Details", langText("继续补充", "Add More Details")],
        ["系统主持", langText("系统主持", "System Host")],
        ["System Host", langText("系统主持", "System Host")],
      ]);
      if (replacements.has(text)) {
        sublabel.textContent = replacements.get(text);
      }
    }

    const paragraphs = [...item.querySelectorAll(".chat-bubble p")];
    paragraphs.forEach((paragraph) => {
      const text = paragraph.textContent.trim();
      if (text === "请求已中止。" || text === "Request aborted.") {
        paragraph.textContent = langText("请求已中止。", "Request aborted.");
      }
      if (text === "你已手动结束本轮讨论。当前已生成的发言会保留，未执行的角色不会继续。" || text === "You manually stopped this discussion. Generated turns will be kept, and unexecuted speakers will not continue.") {
        paragraph.textContent = langText("你已手动结束本轮讨论。当前已生成的发言会保留，未执行的角色不会继续。", "You manually stopped this discussion. Generated turns will be kept, and unexecuted speakers will not continue.");
      }
    });
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

function normalizeModelMappings(mappings = {}) {
  return {
    main: mappings.main || "",
    challenger: mappings.challenger || "",
    judge: mappings.judge || "",
    multimodal: mappings.multimodal || "",
  };
}

function getMultimodalProfile() {
  const configuredProfiles = getConfiguredProfiles();
  const mappedMultimodal = configuredProfiles.find((profile) => profile.id === state.mappings.multimodal);
  return mappedMultimodal || getPrimarySummaryProfile();
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

function renderKnowledgeEnabledToggle() {
  if (!toggleKnowledgeEnabledButton) {
    return;
  }
  toggleKnowledgeEnabledButton.innerHTML = `
    <span class="seat-toggle-label">${escapeHtml(langText("启用知识库", "Use Knowledge Base"))}</span>
    <span class="seat-toggle-track" aria-hidden="true"></span>
  `;
  toggleKnowledgeEnabledButton.classList.toggle("is-on", state.knowledgeEnabled);
  toggleKnowledgeEnabledButton.setAttribute("aria-pressed", state.knowledgeEnabled ? "true" : "false");
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
  readAloudQueue = [];
  activeReadAloudUtterance = null;
  readAloudPaused = false;
  if (activeReadAloudElement) {
    activeReadAloudElement.classList.remove("chat-item-reading", "chat-item-voice-paused");
    activeReadAloudElement = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// 刷新非当前消息的播放按钮状态（清除已不活跃条目的高亮）
function updateMsgVoiceBtnState() {
  discussionStream.querySelectorAll(".chat-item[data-has-voice]").forEach((el) => {
    if (el !== activeReadAloudElement) {
      el.classList.remove("chat-item-reading", "chat-item-voice-paused");
    }
  });
}

// 从指定消息开始朗读，并自动续读后续消息
function playFromElement(startElement) {
  if (!state.voiceReadEnabled) {
    return;
  }
  stopReadAloudPlayback();
  const allItems = [...discussionStream.querySelectorAll(".chat-item[data-has-voice]")];
  const startIdx = allItems.indexOf(startElement);
  if (startIdx === -1) {
    return;
  }
  for (const el of allItems.slice(startIdx)) {
    const body = [...el.querySelectorAll(".chat-bubble p")].map((p) => p.textContent.trim()).filter(Boolean).join("\n") || "";
    if (!body) {
      continue;
    }
    readAloudQueue.push({
      text: sanitizeReadAloudText(body),
      speakerId: el.dataset.speakerId || "",
      role: getDiscussionSpeakerRoleById(el.dataset.speakerId || ""),
      element: el,
    });
  }
  drainReadAloudQueue();
}

function focusReadAloudMessage(element) {
  if (activeReadAloudElement && activeReadAloudElement !== element) {
    activeReadAloudElement.classList.remove("chat-item-reading", "chat-item-voice-paused");
  }
  if (!element) {
    activeReadAloudElement = null;
    discussionStream.classList.remove("voice-reading-active");
    setSpeakerCardSpeaking(false);
    updateMsgVoiceBtnState();
    return;
  }
  activeReadAloudElement = element;
  activeReadAloudElement.classList.add("chat-item-reading");
  discussionStream.classList.add("voice-reading-active");
  readAloudPaused = false;
  setSpeakerCardSpeaking(true);
  updateMsgVoiceBtnState();
  requestAnimationFrame(() => {
    if (!activeReadAloudElement) return;
    const container = discussionStream;
    const targetTop = Math.max(0, activeReadAloudElement.offsetTop - 50);
    container.scrollTo({ top: targetTop, behavior: "smooth" });
  });
}

function drainReadAloudQueue() {
  if (!state.voiceReadEnabled || !window.speechSynthesis || activeReadAloudUtterance || !readAloudQueue.length) {
    return;
  }

  const nextEntry = readAloudQueue.shift();
  const nextText = typeof nextEntry === "string" ? nextEntry : nextEntry?.text;
  if (!nextText) {
    return;
  }

  focusReadAloudMessage(typeof nextEntry === "string" ? null : nextEntry?.element || null);

  const utterance = new SpeechSynthesisUtterance(nextText);
  utterance.lang = state.appLanguage === "en" ? "en-US" : "zh-CN";
  // 使用最新的 role 对象（避免持有生成时的旧引用，保证性别字段最新）
  const entryRoleId = typeof nextEntry === "string" ? null : nextEntry?.speakerId || nextEntry?.role?.id || null;
  const speakerRole = entryRoleId
    ? getDiscussionSpeakerRoleById(entryRoleId)
    : (typeof nextEntry === "string" ? null : nextEntry?.role || null);
  const speechProfile = buildReadAloudProfile(speakerRole);
  utterance.rate = speechProfile.rate;
  utterance.pitch = speechProfile.pitch;
  const preferredVoice = getPreferredReadAloudVoice({ ...speechProfile, role: speakerRole });
  if (preferredVoice) {
    utterance.voice = preferredVoice;
    utterance.lang = preferredVoice.lang || utterance.lang;
  }
  utterance.onend = () => {
    if (activeReadAloudUtterance === utterance) {
      activeReadAloudUtterance = null;
    }
    if (!readAloudQueue.length) {
      focusReadAloudMessage(null);
    }
    drainReadAloudQueue();
  };
  utterance.onerror = () => {
    if (activeReadAloudUtterance === utterance) {
      activeReadAloudUtterance = null;
    }
    if (!readAloudQueue.length) {
      focusReadAloudMessage(null);
    }
    drainReadAloudQueue();
  };
  activeReadAloudUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function getPreferredReadAloudVoice(options = {}) {
  if (!window.speechSynthesis) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    return null;
  }

  const langPrefix = state.appLanguage === "en" ? "en" : "zh";
  const gender = options.gender === "male" ? "male" : "female";
  const manualVoiceUri = options.role?.id ? state.ttsVoiceAssignments?.[options.role.id] || "" : "";
  if (manualVoiceUri) {
    const manuallyAssignedVoice = voices.find((voice) => voice.voiceURI === manualVoiceUri);
    if (manuallyAssignedVoice) {
      return manuallyAssignedVoice;
    }
  }
  const cacheKey = `${langPrefix}:${gender}`;
  const cachedVoice = preferredReadAloudVoices.get(cacheKey);
  if (cachedVoice && voices.some((voice) => voice.voiceURI === cachedVoice.voiceURI)) {
    return cachedVoice;
  }

  const zhFemalePattern = /xiaoxiao|xiaoyi|female|huihui|xiaomei|xiaomeng|xiaorui|yaoyao|xiaohan|xiaoshuang|hanhan/i;
  const zhMalePattern = /yunxi|yunyang|male|xiaobei|yunjian|xiaogang|xiaomo|yunhao|kangkang|zhiwei|yunfeng|yunze|xiaochen/i;
  const enFemalePattern = /female|zira|aria|jenny|samantha|ava|emma|sara/i;
  const enMalePattern = /male|david|guy|mark|andrew|roger|tony|brian|christopher|daniel/i;
  const malePattern = state.appLanguage === "en" ? enMalePattern : zhMalePattern;
  const femalePattern = state.appLanguage === "en" ? enFemalePattern : zhFemalePattern;
  const matchesLang = (voice) => new RegExp(`^${langPrefix}(-|_|$)`, "i").test(voice.lang || "");
  const inferVoiceGender = (voice) => {
    const fingerprint = `${voice.name} ${voice.voiceURI}`;
    if (malePattern.test(fingerprint)) {
      return "male";
    }
    if (femalePattern.test(fingerprint)) {
      return "female";
    }
    return "";
  };
  const preferred = [...voices].sort((left, right) => {
    const leftGender = inferVoiceGender(left);
    const rightGender = inferVoiceGender(right);
    const leftScore = (matchesLang(left) ? 4 : 0)
      + (leftGender === gender ? 3 : 0)
      + (!leftGender ? 1 : 0);
    const rightScore = (matchesLang(right) ? 4 : 0)
      + (rightGender === gender ? 3 : 0)
      + (!rightGender ? 1 : 0);
    return rightScore - leftScore;
  })[0] || null;

  const result = preferred || voices[0] || null;
  preferredReadAloudVoices.set(cacheKey, result);
  return result;
}

function inferReadAloudVoiceGender(voice) {
  if (!voice) {
    return "";
  }
  const fingerprint = `${voice.name} ${voice.voiceURI}`;
  if (/yunxi|yunyang|male|xiaobei|yunjian|xiaogang|xiaomo|yunhao|kangkang|zhiwei|yunfeng|yunze|xiaochen|david|guy|mark|andrew|roger|tony|brian|christopher|daniel/i.test(fingerprint)) {
    return "male";
  }
  if (/xiaoxiao|xiaoyi|female|huihui|xiaomei|xiaomeng|xiaorui|yaoyao|xiaohan|xiaoshuang|hanhan|zira|aria|jenny|samantha|ava|emma|sara/i.test(fingerprint)) {
    return "female";
  }
  return "";
}

function getAvailableReadAloudVoices() {
  if (!window.speechSynthesis) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    return [];
  }
  const langPrefix = state.appLanguage === "en" ? "en" : "zh";
  const matchesLang = voices.filter((voice) => new RegExp(`^${langPrefix}(-|_|$)`, "i").test(voice.lang || ""));
  return matchesLang.length ? matchesLang : voices;
}

function getReadAloudVoiceLabel(voice) {
  const inferredGender = inferReadAloudVoiceGender(voice);
  const genderLabel = inferredGender === "male"
    ? langText("男声", "Male")
    : inferredGender === "female"
      ? langText("女声", "Female")
      : langText("未标注", "Unknown");
  return `${voice.name} · ${genderLabel}`;
}

function buildSeatReadAloudVoiceOptionsMarkup(role) {
  const voices = getAvailableReadAloudVoices();
  const assignedVoiceUri = state.ttsVoiceAssignments?.[role.id] || "";
  const autoLabel = `${langText("自动匹配", "Auto match")} · ${normalizeRoleGender(role?.gender) === "male" || inferRoleGender(role) === "male" ? langText("男声优先", "Prefer male") : langText("女声优先", "Prefer female")}`;
  return [
    `<option value="">${escapeHtml(autoLabel)}</option>`,
    ...voices.map((voice) => `<option value="${escapeHtml(voice.voiceURI)}" ${assignedVoiceUri === voice.voiceURI ? "selected" : ""}>${escapeHtml(getReadAloudVoiceLabel(voice))}</option>`),
  ].join("");
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

  readAloudQueue.push({
    text: normalized,
    speakerId: options.speakerId || options.role?.id || "",
    role: options.role || null,
    element: options.element || null,
  });
  drainReadAloudQueue();
}

function maybeReadAppendedMessage(element) {
  if (!state.voiceReadEnabled || !element || element.classList.contains("user")) {
    return;
  }
  const body = [...element.querySelectorAll(".chat-bubble p")].map((p) => p.textContent.trim()).filter(Boolean).join("\n") || "";
  if (!body) {
    return;
  }
  readTextAloud(body, {
    speakerId: element.dataset.speakerId || "",
    role: getDiscussionSpeakerRoleById(element.dataset.speakerId || ""),
    element,
  });
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

function isNetworkError(error) {
  if (!error) return false;
  if (error.name === "AbortError") return false;
  const msg = error instanceof Error ? error.message : String(error);
  return /failed to fetch|network.*error|networkerror|load failed|the internet connection appears to be offline/i.test(msg);
}

async function requestModelText(profile, prompt, maxTokens = 420, signal, timeoutMs = MODEL_REQUEST_TIMEOUT_MS) {
  const MAX_NETWORK_RETRIES = 3;
  const NETWORK_RETRY_DELAY_MS = 3000;

  for (let attempt = 0; attempt <= MAX_NETWORK_RETRIES; attempt += 1) {
    if (signal?.aborted) {
      console.error("[requestModelText] 信号在循环顶部已中止", {
        profile: profile?.displayName,
        attempt,
        discussionAbortRequested: typeof state !== "undefined" ? state.discussionAbortRequested : "unknown",
        stack: new Error().stack,
      });
      throw new DOMException(langText("请求已中止。", "Request aborted."), "AbortError");
    }
    if (attempt > 0) {
      // 断网重试：等待后再试，让用户有时间恢复网络
      await new Promise((resolve) => setTimeout(resolve, NETWORK_RETRY_DELAY_MS));
      if (signal?.aborted) {
        throw new DOMException(langText("请求已中止。", "Request aborted."), "AbortError");
      }
    }

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
      if (error?.name === "AbortError") {
        throw error;
      }
      if (isNetworkError(error) && attempt < MAX_NETWORK_RETRIES) {
        // 断网/切换网络：等待后自动重试
        console.warn(`网络请求失败（第 ${attempt + 1} 次），${NETWORK_RETRY_DELAY_MS / 1000}s 后自动重试...`, error.message);
        continue;
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

  throw new Error(`${profile.displayName} 网络请求反复失败，请检查网络后重试。`);
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
    return langText("未配置该席位人物。", "No persona is assigned to this seat.");
  }
  return [
    langText(`人物：${getActiveRoleName(role)}`, `Persona: ${getActiveRoleName(role)}`),
    langText(`席位：${getActiveRoleSeat(role)}`, `Seat: ${getActiveRoleSeat(role)}`),
    langText(`说明：${getActiveRoleDescription(role)}`, `Background: ${getActiveRoleDescription(role)}`),
    langText(`立场：${state.appLanguage === "en" ? (role?.traitsEn?.stance || translateTraitValue(role?.traits?.stance) || role?.traits?.stance || "") : (role?.traits?.stance || "")}`, `Stance: ${role?.traitsEn?.stance || translateTraitValue(role?.traits?.stance) || role?.traits?.stance || ""}`),
    langText(`风格：${state.appLanguage === "en" ? (role?.traitsEn?.temper || translateTraitValue(role?.traits?.temper) || role?.traits?.temper || "") : (role?.traits?.temper || "")}`, `Temper: ${role?.traitsEn?.temper || translateTraitValue(role?.traits?.temper) || role?.traits?.temper || ""}`),
    langText(`提示词：${getActiveRoleSystemPrompt(role) || "无"}`, `Prompt: ${getActiveRoleSystemPrompt(role) || "None"}`),
  ].join("\n");
}

function appendRoleMessage(role, assignmentLabel, body, modelName) {
  const assignment = role ? (role.id === "host-ai" ? "moderator" : getRoleAssignment(role)) : "";
  const assignmentBadgeMap = {
    challenger: langText("主讲", "Lead"),
    rebuttal: langText("辩驳", "Rebuttal"),
    neutral: langText("中立评议", "Neutral"),
    judge: langText("裁判", "Judge"),
    moderator: langText("主持", "Host"),
    participant: langText("旁证", "Participant"),
  };
  const badgeLabel = assignmentBadgeMap[assignment] || "";
  const isDiscussantRole = !!role;
  appendMarkup(
    createMessageMarkup({
      speakerId: role?.id || assignmentLabel,
      label: role ? getDisplayRoleName(role) : assignmentLabel,
      sublabel: `${assignmentLabel}${modelName ? ` · ${modelName}` : ""}`,
      badgeLabel,
      body,
      avatarLabel: role ? roleAvatar(role) : assignmentLabel.slice(0, 1),
      avatarClass: "avatar-system",
      avatarStyleText: role ? avatarStyle(role) : "",
      tone: "system",
      showVoiceControls: isDiscussantRole,
    })
  );
}

async function waitForUserParticipation(round, totalRounds, moderatorRole) {
  const isFinalConfiguredRound = round >= totalRounds;
  appendRoleMessage(
    moderatorRole,
    langText(`第 ${round} 轮后 · 等待用户`, `After Round ${round} · Waiting for User`),
    isFinalConfiguredRound
      ? langText(`第 ${round} 轮已经是当前预设的最后一轮。现在请用户先表态。你可以补充证据、指出谁说得不对、表达你的判断，或者说明你还想深挖哪一条线。你发言后，系统将直接生成阶段性结论和结束致辞，完成本次讨论。`, `Round ${round} is the last round in the current plan. It is now the user's turn. You can add evidence, point out who was off, give your own judgment, or name the thread you still want to probe. After you respond, the system will generate the final conclusion and closing remarks to wrap up the discussion.`)
      : langText(`第 ${round} 轮讨论已经结束。现在请用户发言。你可以补充证据、表达倾向、指出谁说得不对，或者要求下一轮重点追问某个点。系统会停在这里，等你说完再继续第 ${round + 1} 轮。`, `Round ${round} is complete. It is now the user's turn. You can add evidence, express a preference, point out who was off, or tell the system what to probe in the next round. The system will pause here and continue with round ${round + 1} after you respond.`),
    langText("系统主持", "System Host")
  );
  state.awaitingUserParticipation = true;
  setSpeakerCardForRole(moderatorRole, langText(`第 ${round} 轮后 · 等待用户`, `After Round ${round} · Waiting for User`), isFinalConfiguredRound ? langText("已到预设最后一轮，等待用户发言后将直接生成结论和结束致辞。", "Final round complete. Waiting for the user's input, then the system will generate the conclusion and closing remarks.") : langText("当前轮次已结束，正在等待用户补充意见后再继续。", "This round is complete. Waiting for the user's follow-up before continuing."));
  updateLiveStatus(langText(`第 ${round} 轮后暂停：等待用户发言`, `Paused after round ${round}: waiting for user input`), "pending");
  updateSeatFeedback(isFinalConfiguredRound ? langText(`第 ${round} 轮已结束，等待用户发言，之后将直接生成结论和结束致辞。`, `Round ${round} is complete. Waiting for the user's input before generating the conclusion and closing remarks.`) : langText(`第 ${round} 轮已结束，等待用户发言。`, `Round ${round} is complete. Waiting for user input.`), "pending");

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
  state.awaitingDiscussionContinuation = true;
  setSpeakerCardForRole(moderatorRole, langText(`第 ${completedRounds} 轮后 · 等待决定`, `After Round ${completedRounds} · Waiting for Decision`), langText("阶段性结论已给出，等待你决定现在结束还是再追加一轮。", "The stage conclusion is ready. Waiting for your decision to end or add one more round."));
  updateLiveStatus(langText(`第 ${completedRounds} 轮后暂停：等待用户决定`, `Paused after round ${completedRounds}: waiting for your decision`), "pending");
  updateSeatFeedback(langText("阶段性结论已生成，等待你决定是否继续。", "Stage conclusion ready. Decide whether to continue."), "pending");

  const decision = await new Promise((resolve) => {
    pendingDiscussionContinuationResolver = (turn) => {
      pendingContinuationButtonCard?.remove();
      pendingContinuationButtonCard = null;
      resolve(turn);
    };
    const card = document.createElement("article");
    card.className = "chat-item system";
    const avatarLabel = langText("系", "S");
    const cardTitle = langText(`第 ${completedRounds} 轮后 · 等待用户 · 系统主持`, `After Round ${completedRounds} · Waiting for User · System Host`);
    const cardBody = langText("阶段性结论已生成。现在结束，还是再追加一轮？", "Stage conclusion ready. End here, or add one more round?");
    const continueLabel = langText("追加一轮", "Add 1 Round");
    const stopLabel = langText("结束讨论", "End Discussion");
    card.innerHTML = `
      <div class="avatar-badge avatar-system">${avatarLabel}</div>
      <div class="chat-content">
        <div class="chat-meta"><strong>${cardTitle}</strong></div>
        <div class="chat-bubble">
          <p style="margin:0 0 10px">${cardBody}</p>
          <div class="continuation-buttons">
            <button class="action-primary compact-primary continuation-continue-btn" type="button">${continueLabel}</button>
            <button class="action-secondary compact-primary continuation-stop-btn" type="button">${stopLabel}</button>
          </div>
        </div>
      </div>
    `;
    pendingContinuationButtonCard = card;
    card.querySelector(".continuation-continue-btn").addEventListener("click", () => {
      pendingContinuationButtonCard = null;
      pendingDiscussionContinuationResolver = null;
      card.remove();
      resolve({ continueDiscussion: true, additionalRounds: 1, content: langText("继续，请围绕当前最大分歧追问下一轮。", "Continue. Please probe the largest remaining disagreement in the next round.") });
    });
    card.querySelector(".continuation-stop-btn").addEventListener("click", () => {
      pendingContinuationButtonCard = null;
      pendingDiscussionContinuationResolver = null;
      card.remove();
      resolve({ continueDiscussion: false, additionalRounds: 0, content: "结束" });
    });
    discussionStream.appendChild(card);
    if (state.autoFollow) scrollToLatest();
  });

  pendingDiscussionContinuationResolver = null;
  state.awaitingDiscussionContinuation = false;

  if (!decision || decision.aborted) {
    throw new DOMException("用户结束了当前讨论。", "AbortError");
  }
  if (typeof decision.continueDiscussion !== "boolean") {
    return parseDiscussionContinuationDecision(decision);
  }
  return decision;
}

// ─── 实时证据裁判机制 ──────────────────────────────────────────────────────────

function buildJudgeFactCheckPrompt(speakerTurn, evidenceSummary, nextSpeakerRole) {
  const speakerName = getActiveRoleName(speakerTurn.role);
  const speakerSeat = getActiveRoleSeat(speakerTurn.role);
  const nextName = getActiveRoleName(nextSpeakerRole);
  const nextSeat = getActiveRoleSeat(nextSpeakerRole);
  const nextDesc = nextSpeakerRole?.traits?.stance || getActiveRoleDescription(nextSpeakerRole) || "";
  return [
    "═══════════════════════════════════",
    "【阶段一】你的身份：独立证据裁判",
    "═══════════════════════════════════",
    `以下是发言者 ${speakerName}（${speakerSeat}）在本轮中收到的证据摘要：`,
    evidenceSummary
      ? `---\n${evidenceSummary}\n---`
      : "（本轮发言者未使用任何检索证据）",
    "",
    `以下是 ${speakerName} 的正式发言：`,
    `---\n${speakerTurn.text}\n---`,
    "",
    "你的任务：判断发言者的核心论断是否超出或扭曲了所提供的证据范围，是否存在无中生有的数据、伪造的因果链、或对来源的实质性曲解。",
    "如果你发现了明确的事实问题，输出 verdict=\"issue_found\"，并用简洁中文写出公开纠正（public_correction），控制在 80 到 150 字以内，直接点出哪条论断有问题、问题性质是什么。",
    "如果没有明确的事实问题，或者仅属于推断分歧而非事实错误，输出 verdict=\"ok\"，无需其他字段。",
    getModelOutputLanguageInstruction(),
    "",
    "═══════════════════════════════════",
    "【阶段二】裁判身份在此完全终止。",
    `你现在是：${nextName}（${nextSeat}）`,
    nextDesc ? `你的专业立场：${nextDesc}` : "",
    "═══════════════════════════════════",
    `你刚刚看到了 ${speakerName} 的发言以及上方的裁判纠正（如有）。`,
    `站在你自己（${nextName}）的专业立场，你接下来最需要搜索哪些公开资料来作出有力回应？`,
    "输出 corrected_search_hints：3 到 5 条具体英文搜索词，帮助系统为你检索最相关的公开证据。",
    "严格禁止：阶段二中出现「裁判认为」「根据裁判」「纠错」等字样。阶段二内容只供系统使用，不对用户展示。",
    "",
    "请以 JSON 格式输出（直接输出 JSON，不要包裹在代码块中）：",
    "verdict 为 ok 时：{\"verdict\":\"ok\",\"corrected_search_hints\":[\"...\",\"...\"]}",
    "verdict 为 issue_found 时：{\"verdict\":\"issue_found\",\"confidence\":\"high|medium\",\"public_correction\":\"...\",\"issue_summary\":\"...\",\"affected_claim\":\"...\",\"corrected_search_hints\":[\"...\",\"...\"]}",
    "绝对不要输出 thinking process、英文分析草稿、自检步骤或任何内部推理过程。",
  ].filter((line) => line !== undefined).join("\n");
}

function parseJudgeFactCheckResponse(rawText) {
  const jsonText = extractJsonObject(rawText);
  if (!jsonText) {
    return { verdict: "ok" };
  }
  try {
    const parsed = JSON.parse(jsonText);
    const verdict = String(parsed?.verdict || "ok").trim().toLowerCase();
    const correctedSearchHints = normalizeClarificationQuestions(parsed?.corrected_search_hints || []);
    if (verdict !== "issue_found") {
      return { verdict: "ok", correctedSearchHints };
    }
    return {
      verdict: "issue_found",
      confidence: String(parsed?.confidence || "medium").trim(),
      publicCorrection: String(parsed?.public_correction || "").trim(),
      issueSummary: String(parsed?.issue_summary || "").trim(),
      affectedClaim: String(parsed?.affected_claim || "").trim(),
      correctedSearchHints,
    };
  } catch {
    return { verdict: "ok" };
  }
}

async function runJudgeFactCheck({ speakerRole, speakerText, evidenceSummary, nextSpeakerRole, moderatorProfile, signal }) {
  if (!moderatorProfile || !speakerRole || !nextSpeakerRole) {
    return { verdict: "ok" };
  }
  try {
    const speakerTurn = { role: speakerRole, text: speakerText };
    const prompt = buildJudgeFactCheckPrompt(speakerTurn, evidenceSummary || "", nextSpeakerRole);
    const raw = await requestModelText(moderatorProfile, prompt, 400, signal, 20000);
    return parseJudgeFactCheckResponse(raw);
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    console.warn("[judge-fact-check] 裁判调用失败，已跳过", err);
    return { verdict: "ok" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function runSingleDiscussionRound({
  round,
  totalRounds,
  orderedSpeakers,
  moderatorRole,
  moderatorProfile,
  roundNotes,
  compressedHistory,
  budget,
  signal,
  userParticipationEnabled,
  userRoundRole,
}) {
  const summary = state.lastSummary;
  const liveTurns = [];
  // 上一位发言者结束后异步启动的裁判校验 Promise（在下一位检索时并行等待）
  let pendingJudgePromise = null;

  for (const speakerRole of orderedSpeakers) {
    const assignment = getRoleAssignment(speakerRole);
    const isLead = assignment === "challenger" || assignment === "rebuttal";
    const discussionProfile = getRoleModelProfile(speakerRole);
    const nextRole = getNextSpeakerRole(orderedSpeakers, speakerRole);
    const previousTurn = getLatestSpeakerTurn(roundNotes, liveTurns);
    const knowledgeGate = buildKnowledgeGateDecision({
      summary,
      speakerRole,
      nextRole,
      liveTurns,
      roundNotes,
    });
    let speakerSearchDigest = "";
    // 与裁判并行处理：裁判 Promise（上一位结束时启动）与本位搜索同步竞跑
    let currentJudgeResult = null;

    if (knowledgeGate.shouldUseWebSearch) {
      setSpeakerCardForRole(
        speakerRole,
        langText(`第 ${round} 轮 · 正在检索`, `Round ${round} · Retrieving`),
        knowledgeGate.shouldUseLocalKnowledge
          ? langText("先看本地知识，再补查网页公开资料。", "Checking local knowledge first, then supplementing with web sources.")
          : langText("当前缺少稳定本地命中，正在补查网页公开资料。", "No stable local hit was found. Searching public web sources.")
      );
      updateLiveStatus(
        knowledgeGate.shouldUseLocalKnowledge
          ? langText(`第 ${round} 轮：${getActiveRoleName(speakerRole)} 先用本地知识，再补网页资料`, `Round ${round}: ${getActiveRoleName(speakerRole)} is using local knowledge first, then supplementing with the web`)
          : langText(`第 ${round} 轮：${getActiveRoleName(speakerRole)} 正在补查网页资料`, `Round ${round}: ${getActiveRoleName(speakerRole)} is searching the web`),
        "pending"
      );
      setDiscussionRuntimeState({
        phase: "retrieval_pending",
        round,
        totalRounds,
        speakerRoleId: speakerRole.id,
        nextRoleId: nextRole?.id || "",
        retrievalStatus: knowledgeGate.retrievalStrategy,
        knowledgeGate,
        handoff: null,
      });
      // 裁判与搜索并行，避免额外等待
      const webSearchPromise = runSpeakerWebSearch(speakerRole, summary, signal, {
        retrievalStrategy: knowledgeGate.retrievalStrategy,
        queryHints: uniqueStrings([
          ...(previousTurn?.handoff?.web_search_needed || []),
          ...(previousTurn?.handoff?.preferred_keywords || []),
          ...(knowledgeGate.preferredKeywords || []),
        ]).slice(0, 6),
      });
      const [judgeResolved, rawSearchDigest] = await Promise.all([
        pendingJudgePromise || Promise.resolve(null),
        webSearchPromise,
      ]);
      currentJudgeResult = judgeResolved;
      speakerSearchDigest = rawSearchDigest;
    } else if (pendingJudgePromise) {
      // 本位无需搜索，但仍需等待上一轮的裁判结果
      currentJudgeResult = await pendingJudgePromise;
    }
    pendingJudgePromise = null;

    // 处理裁判结果：发现问题时插入公开纠正卡片，并用修正搜索词重新检索
    if (currentJudgeResult?.verdict === "issue_found") {
      const correctionText = currentJudgeResult.publicCorrection || langText("裁判发现上一位发言者的论断存在证据问题。", "The judge found an evidence issue with the previous speaker's claim.");
      appendMarkup(
        createMessageMarkup({
          speakerId: `judge-correction-r${round}-${speakerRole.id}`,
          label: langText("裁", "Judge"),
          sublabel: langText("裁判纠错", "Judge Correction"),
          body: correctionText,
          avatarLabel: langText("裁", "J"),
          avatarClass: "avatar-system",
          tone: "system",
        })
      );
      // 记录到 judgeLog，供后续发言者提示词引用
      if (Array.isArray(state.judgeLog)) {
        const previousLiveTurn = liveTurns[liveTurns.length - 1];
        state.judgeLog.push({
          round,
          speakerId: previousLiveTurn?.role?.id || "",
          speakerName: previousLiveTurn?.role ? getActiveRoleName(previousLiveTurn.role) : "",
          verdict: "issue_found",
          issueSummary: currentJudgeResult.issueSummary || "",
          affectedClaim: currentJudgeResult.affectedClaim || "",
        });
      }
      // 弃用原始搜索，用裁判提供的修正搜索词重新检索
      const correctedHints = currentJudgeResult.correctedSearchHints || [];
      if (correctedHints.length) {
        updateLiveStatus(
          langText(`第 ${round} 轮：${getActiveRoleName(speakerRole)} 裁判修正检索中`, `Round ${round}: ${getActiveRoleName(speakerRole)} re-searching with judge's corrected hints`),
          "pending"
        );
        speakerSearchDigest = await runSpeakerWebSearch(speakerRole, summary, signal, {
          retrievalStrategy: "web_first",
          queryHints: correctedHints.slice(0, 5),
        });
      } else {
        speakerSearchDigest = "";
      }
    } else if (currentJudgeResult?.verdict === "ok" && currentJudgeResult?.correctedSearchHints?.length && !speakerSearchDigest) {
      // 裁判无问题但提供了更好的搜索方向，且本位原本未做检索 → 补充搜索
      speakerSearchDigest = await runSpeakerWebSearch(speakerRole, summary, signal, {
        retrievalStrategy: "web_first",
        queryHints: currentJudgeResult.correctedSearchHints.slice(0, 5),
      });
    }
    const nextSpeakerPackage = await prepareNextSpeakerPackage({
      summary,
      speakerRole,
      previousTurn,
      knowledgeGate,
      speakerSearchDigest,
      liveTurns,
      roundNotes,
    });
    const preparedTurnInput = buildPreparedTurnInput({
      round,
      totalRounds,
      speakerRole,
      nextRole,
      assignment,
      summary,
      roundNotes,
      liveTurns,
      compressedHistory,
      knowledgeGate,
      nextSpeakerPackage,
      orderedSpeakers,
      budgetHint: isLead ? budget.charHint : "控制在 280 到 520 字内。",
    });
    if (shouldExposeInternalWorkflow() && hasMeaningfulNextSpeakerPackage(nextSpeakerPackage)) {
      appendMarkup(
        createMessageMarkup({
          speakerId: `${speakerRole.id}-package-${round}`,
          label: "系",
          sublabel: langText(`第 ${round} 轮 · 角色准备包`, `Round ${round} · Speaker Package`),
          body: buildNextSpeakerPackageMessageBody(nextSpeakerPackage),
          avatarLabel: "系",
          avatarClass: "avatar-system",
          tone: "system",
        })
      );
    }

    const speakerPrompt = buildSpeakerTurnPrompt({
      preparedTurnInput,
    });

    setSpeakerCardForRole(speakerRole, langText(`第 ${round} 轮 · 正在思考`, `Round ${round} · Thinking`), langText("正在读取任务和前面已发言内容，并准备按顺序接续。", "Reading the task and previous turns, then preparing to continue in order."));
    updateLiveStatus(langText(`第 ${round} 轮：${getActiveRoleName(speakerRole)} 正在思考`, `Round ${round}: ${getActiveRoleName(speakerRole)} is thinking`), "pending");
    updateSeatFeedback(langText(`第 ${round} 轮：${getActiveRoleName(speakerRole)} 正在思考`, `Round ${round}: ${getActiveRoleName(speakerRole)} is thinking`), "pending");
    setDiscussionRuntimeState({
      phase: "speaker_preparing",
      round,
      totalRounds,
      speakerRoleId: speakerRole.id,
      nextRoleId: nextRole?.id || "",
      retrievalStatus: knowledgeGate.retrievalStrategy || (knowledgeGate.shouldUseLocalKnowledge ? "knowledge_gate_ready" : "idle"),
      knowledgeGate,
      nextSpeakerPackage,
      handoff: null,
    });
    let speakerText;
    let speakerTurnPayload;
    try {
      const rawSpeakerResponse = await requestModelText(discussionProfile, speakerPrompt, isLead ? budget.main : budget.participant, signal);
      speakerTurnPayload = parseSpeakerTurnResponse(rawSpeakerResponse, nextRole);
      speakerText = speakerTurnPayload.speakerMessage || sanitizeDisplayedModelText(rawSpeakerResponse);
    } catch (speakerError) {
      if (speakerError?.name === "AbortError") {
        throw speakerError;
      }
      const skipMsg = langText(
        `${speakerRole.name} 这一轮未能发言（${speakerError instanceof Error ? speakerError.message : String(speakerError)}），已跳过，讨论继续。`,
        `${speakerRole.name} could not speak this round (${speakerError instanceof Error ? speakerError.message : String(speakerError)}). Skipped, discussion continues.`
      );
      appendMarkup(
        createMessageMarkup({
          speakerId: "system",
          label: "系",
          sublabel: langText("席位跳过", "Seat Skipped"),
          body: skipMsg,
          avatarLabel: "系",
          avatarClass: "avatar-system",
          tone: "system",
        })
      );
      updateLiveStatus(skipMsg, "pending");
      continue;
    }
    setSpeakerCardForRole(speakerRole, langText(`第 ${round} 轮 · 正在发言`, `Round ${round} · Speaking`), langText("当前顺序发言已生成，马上写入讨论流。", "The current turn has been generated and will be written into the discussion stream next."));
    updateLiveStatus(langText(`第 ${round} 轮：${getActiveRoleName(speakerRole)} 正在发言`, `Round ${round}: ${getActiveRoleName(speakerRole)} is speaking`), "pending");
    setDiscussionRuntimeState({
      phase: "speaker_speaking",
      round,
      totalRounds,
      speakerRoleId: speakerRole.id,
      nextRoleId: nextRole?.id || "",
      retrievalStatus: knowledgeGate.retrievalStrategy || (knowledgeGate.shouldUseLocalKnowledge ? "knowledge_gate_ready" : "idle"),
      knowledgeGate,
      nextSpeakerPackage,
      handoff: speakerTurnPayload?.handoff || null,
    });
    appendRoleMessage(speakerRole, formatRoundSpeakerLabel(round, speakerRole), speakerText, discussionProfile.displayName);
    if (shouldExposeInternalWorkflow() && speakerTurnPayload?.handoff) {
      appendMarkup(
        createMessageMarkup({
          speakerId: `${speakerRole.id}-handoff-${round}`,
          label: "系",
          sublabel: langText(`第 ${round} 轮 · 交接准备`, `Round ${round} · Handoff Prep`),
          body: buildHandoffMessageBody({
            round,
            speakerRole,
            nextRole,
            handoff: speakerTurnPayload.handoff,
            knowledgeGate,
          }),
          avatarLabel: "系",
          avatarClass: "avatar-system",
          tone: "system",
        })
      );
    }
    liveTurns.push({
      role: speakerRole,
      assignmentLabel: formatRoundSpeakerLabel(round, speakerRole),
      text: speakerText,
      searchDigest: speakerSearchDigest || "",
      handoff: speakerTurnPayload?.handoff || null,
      speakerClaims: speakerTurnPayload?.speakerClaims || [],
      speakerRisks: speakerTurnPayload?.speakerRisks || [],
      speakerOpenQuestions: speakerTurnPayload?.speakerOpenQuestions || [],
      knowledgeGate,
    });
    setDiscussionRuntimeState({
      phase: nextRole ? "speaker_resume_ready" : "round_summary_pending",
      round,
      totalRounds,
      speakerRoleId: speakerRole.id,
      nextRoleId: nextRole?.id || "",
      retrievalStatus: nextRole ? "handoff_ready" : "idle",
      knowledgeGate,
      nextSpeakerPackage,
      handoff: speakerTurnPayload?.handoff || null,
    });
    // 当前发言者结束后，为下一位异步启动裁判校验（不 await，让下一轮搜索并行）
    if (nextRole) {
      pendingJudgePromise = runJudgeFactCheck({
        speakerRole,
        speakerText,
        evidenceSummary: speakerSearchDigest || "",
        nextSpeakerRole: nextRole,
        moderatorProfile,
        signal,
      });
    }
  }

  const isFinalRound = round >= totalRounds;
  const moderatorRoundSummaryPrompt = [
    `你现在是本场讨论的主持AI，需要在第 ${round}/${totalRounds} 轮结束后做一段主持小结。`,
    getModeratorModeInstruction(),
    getModelOutputLanguageInstruction(),
    isFinalRound
      ? "这是最后一轮讨论，你的小结要做收束：把所有轮次中已经在质疑和反驳中站稳的论据明确点出来，用确定的语气写出；对经过多轮未被推翻的论点直接肯定它成立；不要再罗列不确定性。"
      : "你的任务是压缩本轮重点，明确谁提出了什么、谁提出了反对或保留、哪些例子或依据最关键。确认已成立的论点不必再争，把焦点留给下一轮仍待解决的问题。",
    "这段小结既要给用户看，也要为下一轮压缩上下文，所以要信息密、语言自然、不要太长。",
    `任务定义：${summary}`,
    `本轮记录：${liveTurns.map((turn) => `${turn.assignmentLabel}\n${turn.text}`).join("\n\n")}`,
    "绝对不要输出 thinking process、英文分析草稿、自检步骤、constraint list 或任何内部推理过程。",
    isFinalRound
      ? "要求：控制在 300 到 500 字内，给出明确的收束性判断，哪些已经确立、哪些仍有边界，写清楚。"
      : "要求：控制在 260 到 420 字内，点出本轮最关键的共识、分歧和例证。",
  ].join("\n\n");
  setSpeakerCardForRole(moderatorRole, langText(`第 ${round} 轮后 · 正在思考`, `After Round ${round} · Thinking`), langText("正在压缩本轮发言，整理谁说了什么、哪里有争议。", "Compressing this round and organizing who said what and where the disagreements are."));
  updateLiveStatus(langText(`第 ${round} 轮后：主持AI 正在总结`, `After round ${round}: Host AI is summarizing`), "pending");
  setDiscussionRuntimeState({
    phase: "round_complete",
    round,
    totalRounds,
    speakerRoleId: moderatorRole.id,
    nextRoleId: "",
    retrievalStatus: "idle",
  });
  const moderatorSummary = await requestModelText(moderatorProfile, moderatorRoundSummaryPrompt, Math.min(700, budget.participant), signal);
  appendRoleMessage(moderatorRole, formatModeratorSummaryLabel(round, moderatorRole), moderatorSummary, moderatorProfile.displayName);

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
    `你现在是圆桌讨论的中立裁判，经过 ${targetRounds} 轮讨论，现在必须给出明确的最终裁决。`,
    getJudgeModeInstruction(),
    getModelOutputLanguageInstruction(),
    "你的首要任务是给出决断，而不是再次罗列各方观点。经过多轮讨论和反驳，哪些论据已经站稳脚跟，就直接确认它们成立，不要为了追求平衡而稀释已经成立的结论。",
    "裁判发言结构：第一，开门见山说出最终判断是什么（一两句话）；第二，逐条列出支撑这个判断的核心论据，每条说明为什么它在质疑下仍然成立；第三，指出哪些边界条件不影响核心结论但用户应当知晓；第四，给用户一句具体的行动建议或方向。",
    "如果某方的论证在讨论中被充分质疑且未能有效回应，要明确指出其不足，而不是给它同等地位。",
    buildDiscussionContext(state.lastSummary, roundNotes, []),
    rolePromptBlock(judgeRole),
    `篇幅要求：${budget.charHint}`,
    "绝对不要输出 thinking process、英文分析草稿、自检步骤、constraint list 或任何内部推理过程。",
    "要求：直接输出最终裁判发言正文，至少写 4 段，开头必须是清晰的最终判断，结尾必须是具体建议。每段之间用换行分隔，不要连成一整段。",
  ].join("\n\n");
  setSpeakerCardForRole(judgeRole, langText(`第 ${targetRounds} 轮后 · 正在思考`, `After Round ${targetRounds} · Thinking`), langText("正在综合全部轮次，判断哪些说法更有依据，哪些地方仍然不能下结论。", "Reviewing all rounds to judge which claims are best supported and which points still remain unresolved."));
  updateLiveStatus(langText(`最终总结前：${getActiveRoleName(judgeRole)} 正在思考`, `Before the final summary: ${getActiveRoleName(judgeRole)} is thinking`), "pending");
  updateSeatFeedback(langText(`${getActiveRoleName(judgeRole)} 正在做最终裁判`, `${getActiveRoleName(judgeRole)} is preparing the final judgment`), "pending");
  // 裁判使用专属超时，并在首次超时后自动重试一次
  let judgeText;
  try {
    judgeText = await requestModelText(judgeProfile, judgePrompt, budget.judge, signal, JUDGE_REQUEST_TIMEOUT_MS);
  } catch (firstErr) {
    if (firstErr?.name === "AbortError") throw firstErr;
    console.warn("[judge] 首次调用超时，3 秒后自动重试", firstErr);
    updateLiveStatus(langText(`最终总结：${getActiveRoleName(judgeRole)} 首次超时，正在重试…`, `Final summary: ${getActiveRoleName(judgeRole)} timed out, retrying…`), "pending");
    await new Promise((res) => setTimeout(res, 3000));
    judgeText = await requestModelText(judgeProfile, judgePrompt, budget.judge, signal, JUDGE_REQUEST_TIMEOUT_MS);
  }
  setSpeakerCardForRole(judgeRole, langText(`第 ${targetRounds} 轮后 · 正在发言`, `After Round ${targetRounds} · Speaking`), langText("最终裁判已生成，马上写入讨论流。", "The final judgment has been generated and will be written into the discussion stream next."));
  updateLiveStatus(langText(`最终总结：${getActiveRoleName(judgeRole)} 正在发言`, `Final summary: ${getActiveRoleName(judgeRole)} is speaking`), "pending");
  appendRoleMessage(judgeRole, formatFinalJudgeLabel(judgeRole), judgeText, judgeProfile.displayName);

  updateLiveStatus(langText("主持 AI 正在整理本次讨论的最终文字报告", "The host AI is preparing the final written report for this discussion"), "pending");
  const reportText = await createConclusionReport(moderatorProfile, judgeText, roundNotes, signal);
  state.latestReportText = reportText;
  state.latestReportFileName = buildReportFileName();
  appendMarkup(
    createMessageMarkup({
      speakerId: "system-report",
      label: "系",
      sublabel: langText("主持整理版结论报告", "Host Curated Final Report"),
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

  const selectedRoles = getOrderedSelectedRoleIds()
    .map((roleId) => getRoleById(roleId))
    .filter(Boolean);
  const startBlockerMessage = getSeatStartBlockerMessage(selectedRoles);
  if (startBlockerMessage) {
    updateSeatFeedback(startBlockerMessage, "pending");
    return;
  }

  const judgeRole = selectedRoles.find((role) => getRoleAssignment(role) === "judge") || null;
  const orderedSpeakers = selectedRoles.filter((role) => getRoleAssignment(role) !== "judge");
  const moderatorProfile = getPrimarySummaryProfile();
  const moderatorRole = {
    id: "host-ai",
    name: "主持AI",
    nameEn: "Host AI",
    seat: "讨论主持者",
    seatEn: "Discussion Host",
    description: "负责开场、控制节奏、每轮小结、压缩上下文，并在最后整理给用户的结论稿。",
    descriptionEn: "Opens the discussion, manages pacing, summarizes each round, compresses context, and prepares the final conclusion for the user.",
    traits: { stance: "保持中立主持", method: "总结压缩", temper: "清晰" },
    traitsEn: { stance: "Neutral facilitation", method: "Summary compression", temper: "Clear" },
    systemPrompt: "你是主持AI。你的职责是主持、压缩和组织讨论，而不是替代嘉宾发言。",
    color: "sky",
    avatar: langText("主", "H"),
  };

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
  setDiscussionRuntimeState({
    phase: "topic_ready",
    round: completedRounds,
    totalRounds: targetRounds,
    speakerRoleId: moderatorRole.id,
    nextRoleId: orderedSpeakers[0]?.id || "",
    retrievalStatus: "idle",
    handoff: null,
  });
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
    setDiscussionRuntimeState({
      phase: "shared_brief_preparing",
      round: 0,
      totalRounds: targetRounds,
      speakerRoleId: moderatorRole.id,
      nextRoleId: orderedSpeakers[0]?.id || "",
      retrievalStatus: "shared_brief_pending",
      handoff: null,
    });
    state.sharedResearchBrief = "";
    setSpeakerCardForRole(moderatorRole, langText("开场前 · 正在整理事实包", "Before Opening · Building Shared Brief"), langText("先为整张桌子整理一份可共享的背景事实、约束和未决问题。", "Building one shared brief of facts, constraints, and unresolved questions for the whole table."));
    updateLiveStatus(langText("开场前：共享 research agent 正在整理事实包", "Before opening: the shared research agent is building the brief"), "pending");
    updateSeatFeedback(langText("正在整理共享事实包，后续所有席位会共用这一份材料。", "Building a shared brief that all seats will use."), "pending");
    try {
      state.sharedResearchBrief = await buildSharedResearchBrief(state.lastSummary, moderatorProfile, orderedSpeakers, signal);
      if (shouldExposeInternalWorkflow()) {
        appendMarkup(
          createMessageMarkup({
            speakerId: "shared-research-agent",
            label: "研",
            sublabel: langText("共享事实包", "Shared Brief"),
            body: state.sharedResearchBrief,
            actions: buildKnowledgeReferenceChipsMarkup(filterKnowledgeEntries(getKnowledgeScopeEntries(), {
              queryOverride: state.lastSummary || "",
              categoryOverride: "all",
            }).entries.slice(0, 4)),
            avatarLabel: "研",
            avatarClass: "avatar-system",
            tone: "system",
            showVoiceControls: true,
          })
        );
      }
      void syncCurrentTopicSnapshot();
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      console.warn("shared research brief failed", error);
      state.sharedResearchBrief = "";
    }

    const firstSpeakerRole = orderedSpeakers[0] || null;
    const knowledgeCatalogBlock = state.knowledgeEnabled ? buildKnowledgeCatalogForAI(getKnowledgeScopeEntries()) : "";
    const firstSpeakerHandoffInstruction = firstSpeakerRole
      ? [
          `开场发言完毕后，请你立刻切换身份，站在第一位发言者「${getActiveRoleName(firstSpeakerRole)}」`,
          `（${getActiveRoleDescription(firstSpeakerRole) || getActiveRoleSeat(firstSpeakerRole)}）的角度，`,
          `为系统生成一份资料准备需求。这份需求只给系统用，用户看不到。`,
          `\n\n请以如下 JSON 格式输出（先输出开场发言，然后紧跟一段裸 JSON，不加 Markdown 代码块标记）:\n`,
          `{"opening_message":"...开场发言正文，180-320字，段落间用换行...",`,
          `"first_speaker_handoff":{"next_role_id":"${firstSpeakerRole.id}",`,
          `"next_role_focus":"一句话说明${getActiveRoleName(firstSpeakerRole)}最应聚焦的角度",`,
          `"local_knowledge_needed":["本地知识库里最有帮助的条目标题，最多3条"],`,
          `"web_search_needed":["如本地不足则补查的英文关键词，最多2条"],`,
          `"preferred_categories":["优先目录，如product、company"],`,
          `"preferred_keywords":["检索关键词，最多4个"]}}`,
        ].join("")
      : "篇幅控制在 180 到 320 字，不要写成提纲，每个自然段之间用换行分隔。";
    const openingPrompt = [
      `你现在是本场圆桐的主持人，需要在正式讨论前做开场。`,
      `任务定义：${state.lastSummary}`,
      state.sharedResearchBrief ? `共享事实包：${state.sharedResearchBrief}` : "",
      knowledgeCatalogBlock ? `本地知识库目录（供你决定检索方向）:\n${knowledgeCatalogBlock}` : "",
      getOpeningModeInstruction(),
      getModelOutputLanguageInstruction(),
      rolePromptBlock(moderatorRole),
      `本次讨论顺序：${orderedSpeakers.map((role, index) => `${index + 1}.${getActiveRoleName(role)}`).join("，")}`,
      "请先说明今天讨论的主题、基本规则和切入方式，再邀请各位嵌宾按自己的身份先抛出最值得优先展开的问题、证据或解释方向。",
      "不要在开场里预先给每位嵌宾分配固定子题，也不要提前规定谁只能讲哪个角度，更不要用“首先、其次、最后”把整场讨论定死。你只负责打开讨论场，让桌上的人自己往外长。",
      "绝对不要输出 thinking process、英文分析草稿、自检步骤、constraint list 或任何内部推理过程。",
      firstSpeakerHandoffInstruction,
    ].filter(Boolean).join("\n\n");
    setSpeakerCardForRole(moderatorRole, langText("开场前 · 正在思考", "Before Opening · Thinking"), langText("正在整理今天这场讨论的主题、顺序和焦点。", "Organizing the topic, order, and focal tensions for today's discussion."));
    updateLiveStatus(langText(`开场：${getActiveRoleName(moderatorRole)} 正在思考`, `Opening: ${getActiveRoleName(moderatorRole)} is thinking`), "pending");
    const rawOpeningResponse = await requestModelText(moderatorProfile, openingPrompt, Math.min(860, budget.participant + 360), signal);
    // 尝试解析结构化输出，提取开场文字和给第一位发言者的资料准备 handoff
    let openingText = rawOpeningResponse;
    state.openingHandoffTurn = null;
    try {
      const jsonMatch = rawOpeningResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && parsed.opening_message) {
          openingText = sanitizeDisplayedModelText(String(parsed.opening_message).trim());
          if (firstSpeakerRole && parsed.first_speaker_handoff && typeof parsed.first_speaker_handoff === "object") {
            const h = parsed.first_speaker_handoff;
            state.openingHandoffTurn = {
              role: moderatorRole,
              text: openingText,
              searchDigest: "",
              handoff: {
                next_role_id: String(h.next_role_id || firstSpeakerRole.id || "").trim(),
                next_role_focus: String(h.next_role_focus || "").trim(),
                local_knowledge_needed: normalizeClarificationQuestions(h.local_knowledge_needed || []),
                web_search_needed: normalizeClarificationQuestions(h.web_search_needed || []),
                preferred_categories: normalizeClarificationQuestions(h.preferred_categories || []),
                preferred_keywords: normalizeClarificationQuestions(h.preferred_keywords || []),
                avoid_categories: [],
                missing_evidence_types: [],
                current_round_summary: "",
                recommended_counterpoints: [],
              },
            };
            console.log("[opening-handoff] 主持人已为第一位发言者生成资料准备需求", state.openingHandoffTurn.handoff);
          }
        }
      }
    } catch (parseErr) {
      console.warn("[opening-handoff] JSON 解析失败，退化为纯文本开场", parseErr);
      openingText = rawOpeningResponse;
    }
    appendRoleMessage(moderatorRole, formatOpeningMessageLabel(moderatorRole), openingText, moderatorProfile.displayName);
    let compressedHistory = "";

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
        compressedHistory,
        budget,
        signal,
        userParticipationEnabled,
        userRoundRole,
      });
      roundNotes.push(roundNote);
      state.discussionRoundNotes = [...roundNotes];
      void syncCurrentTopicSnapshot();

      // 每轮结束后，如果后面还有轮次，主持AI把本轮记忆压缩到 compressedHistory
      if (currentRound < targetRounds) {
        setSpeakerCardForRole(moderatorRole, langText(`第 ${currentRound} 轮后 · 压缩记忆中`, `After Round ${currentRound} · Compressing Memory`), langText("正在把本轮要点并入压缩记忆，下一轮各席位将只看压缩后的历史。", "Merging this round into compressed memory. Next round, each seat will see only the compressed history."));
        updateLiveStatus(langText(`第 ${currentRound} 轮结束，正在压缩记忆供下一轮使用...`, `Round ${currentRound} done. Compressing memory for the next round...`), "pending");
        try {
          const prevMemoryBlock = compressedHistory ? `已有压缩记忆（第 1 到第 ${currentRound - 1} 轮）：\n${compressedHistory}\n\n` : "";
          const latestRoundBlock = `本轮（第 ${currentRound} 轮）各席位发言摘要：\n${roundNote.turns.map((t) => `${t.assignmentLabel}：${t.text.slice(0, 300)}${t.text.length > 300 ? "……" : ""}`).join("\n\n")}\n\n主持小结：${roundNote.moderatorSummary}`;
          const compressionPrompt = [
            "你是本场圆桌讨论的主持AI，现在需要把已有压缩记忆和刚完成的这一轮合并，输出一段新的压缩记忆供下一轮所有席位使用。",
            "目标：用最少的字数保留最多的信息密度——每位参与者的核心立场、关键论据、分歧焦点、已形成的共识、仍悬而未决的问题。",
            "要求：控制在 400 字以内，不要输出标题或 Markdown 格式，用连续段落即可。",
            `任务定义：${state.lastSummary}`,
            prevMemoryBlock + latestRoundBlock,
          ].filter(Boolean).join("\n\n");
          compressedHistory = await requestModelText(moderatorProfile, compressionPrompt, 600, signal);
        } catch (compressionError) {
          console.warn("memory compression failed, falling back to summaries", compressionError);
          // 压缩失败则退化为原有拼接方式，不中断讨论
          compressedHistory = "";
        }
      }

      currentRound += 1;
    }

    await generateStageConclusion({
      targetRounds,
      judgeRole,
      judgeProfile,
      moderatorProfile,
      roundNotes,
      budget,
      signal,
    });

    // 主持人结束致辞
    setSpeakerCardForRole(moderatorRole, langText(`结束致辞 · ${getActiveRoleName(moderatorRole)}`, `Closing · ${getActiveRoleName(moderatorRole)}`), langText("所有轮次已完整结束，主持AI正在致辞。", "All rounds complete. Host AI is delivering closing remarks."));
    updateLiveStatus(langText("主持AI正在说结束致辞", "Host AI is delivering closing remarks"), "pending");
    const closingPrompt = [
      langText(
        `你是本场圆桌讨论的主持人，经过 ${targetRounds} 轮讨论，所有轮次已完整结束。`,
        `You are the host of this roundtable discussion. All ${targetRounds} rounds have been completed.`
      ),
      langText(
        "请用 2 到 3 句话做简短的结束致辞：感谢各位参与，点明本次讨论到此结束。语气真诚，简洁自然，不要重复已经说过的结论内容。",
        "Write a brief closing in 2 to 3 sentences. Thank everyone for participating and make it clear that this discussion is now concluded. Keep the tone sincere, natural, and concise. Do not repeat the conclusions that were already given."
      ),
      getModelOutputLanguageInstruction(),
      state.lastSummary ? langText(`本次话题：${state.lastSummary}`, `Topic: ${state.lastSummary}`) : "",
    ].filter(Boolean).join("\n\n");
    let closingText;
    try {
      closingText = await requestModelText(moderatorProfile, closingPrompt, 150, signal, MODEL_REQUEST_TIMEOUT_MS);
    } catch (closingErr) {
      if (closingErr?.name === "AbortError") throw closingErr;
      closingText = langText("本次圆桌讨论至此圆满结束。感谢各位的精彩发言，希望这场对话有所启发。", "This roundtable discussion has now come to a close. Thank you all for your insightful contributions — I hope this conversation has been illuminating.");
    }
    closingText = sanitizeClosingTextForLanguage(closingText) || langText("本次圆桌讨论至此圆满结束。感谢各位的精彩发言，希望这场对话有所启发。", "This roundtable discussion has now come to a close. Thank you all for your thoughtful contributions.");
    appendRoleMessage(moderatorRole, langText(`结束致辞 · ${getActiveRoleName(moderatorRole)}`, `Closing · ${getActiveRoleName(moderatorRole)}`), closingText, moderatorProfile.displayName);

    state.discussionRounds = targetRounds;
    state.discussionRoundNotes = [...roundNotes];
    const activeTopic = getActiveTopic();
    if (activeTopic) {
      activeTopic.status = "completed";
      activeTopic.summary = "本次讨论已完成，结论可下载。";
    }
    setSpeakerCardSpeaking(false);
    setSpeakerCard(langText("讨论完成", "Discussion Complete"), langText("主持总结已完成", "Host wrap-up completed"), langText(`已按 ${targetRounds} 轮完成顺序讨论、逐轮主持压缩和最终裁判流程。`, `Completed ${targetRounds} round(s) of ordered discussion, host compression, and final judgment.`), "系");
    updateLiveStatus(langText("讨论完成：结论报告已生成，可下载。", "Discussion complete: the final report is ready to download."), "success");
    updateSeatFeedback(langText("本轮讨论已完成。你可以继续补充任务，或调整角色后再来一轮。", "This discussion is complete. You can add more task details or adjust personas and run another round."), "success");
    await syncCurrentTopicSnapshot();
  } catch (error) {
    const aborted = state.discussionAbortRequested;
    if (error?.name === "AbortError" && !aborted) {
      console.error("[runDiscussionFlow] 意外的 AbortError：signal 被中止但 discussionAbortRequested=false", {
        errorMessage: error.message,
        errorStack: error.stack,
        controllerAborted: state.discussionAbortController?.signal?.aborted,
        discussionRunning: state.discussionRunning,
        appLanguage: state.appLanguage,
      });
    } else {
      console.error(error);
    }
    const localizedErrorMessage = error?.name === "AbortError"
      ? langText("请求已中止。", "Request aborted.")
      : (error?.message || langText("执行多角色讨论时失败。", "The multi-person discussion failed."));
    appendMarkup(
      createMessageMarkup({
        speakerId: "system",
        label: "系",
        sublabel: aborted ? langText("讨论已结束", "Discussion Stopped") : langText("讨论执行失败", "Discussion Failed"),
        body: aborted ? langText("你已手动结束本轮讨论。当前已生成的发言会保留，未执行的角色不会继续。", "You manually stopped this discussion. Generated turns will be kept, and unexecuted speakers will not continue.") : localizedErrorMessage,
        avatarLabel: "系",
        avatarClass: "avatar-system",
        tone: "system",
      })
    );
    setSpeakerCardSpeaking(false);
    setSpeakerCard(aborted ? langText("讨论已结束", "Discussion Stopped") : langText("讨论中断", "Discussion Interrupted"), aborted ? langText("已按你的要求停止", "Stopped as requested") : langText("模型调用失败", "Model call failed"), aborted ? langText("当前已经执行完的发言会保留，你可以调整后重新开始。", "Completed turns will be kept. You can adjust the setup and start again.") : localizedErrorMessage, "系");
    updateLiveStatus(aborted ? langText("讨论已结束：已停止后续角色发言。", "Discussion stopped: later speakers have been halted.") : langText(`讨论中断：${localizedErrorMessage}`, `Discussion interrupted: ${localizedErrorMessage}`), aborted ? "" : "pending");
    updateSeatFeedback(aborted ? langText("讨论已结束。你可以调整轮次或席位后重新开始。", "Discussion stopped. You can adjust rounds or seats and start again.") : localizedErrorMessage, "pending");
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
    throw new Error(langText("还没有可用的主 AI 接入。先在设置里保存配置，并映射给主 AI。", "No primary AI connection is available yet. Save a configuration in Settings and map it to the primary AI first."));
  }

  if (!profile.baseUrl || !profile.modelId || !profile.apiKey) {
    throw new Error(langText(`主 AI 接入“${profile.displayName}”还没配完整，至少要有 Base URL、模型 ID 和 API Key。`, `The primary AI connection "${profile.displayName}" is incomplete. It must include at least the Base URL, Model ID, and API Key.`));
  }

  const { treatAsSupplement = false, baseSummary = "", clarificationQuestions = [] } = options;
  const { promptContent, attachmentNote, fallbackSource } = buildTaskSummaryPromptContent(content, attachments, {
    treatAsSupplement,
    baseSummary,
    clarificationQuestions,
  });
  const labels = getExpandedTaskSummaryLabels();
  const userMemoryPrompt = buildUserMemoryPrompt();
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
        userMemoryPrompt ? `Long-term user preference memory:\n${userMemoryPrompt}` : "",
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
        userMemoryPrompt ? `用户记忆（长期偏好，只作为表达和组织参考，不要把它误当成当前任务事实）：\n${userMemoryPrompt}` : "",
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
    throw new Error(langText("主 AI 返回了空结果", "The primary AI returned an empty result."));
  }
  return summary;
}

function joinUrl(baseUrl, endpointPath) {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
  return `${normalizedBase}${normalizedPath}`;
}

function formatBodyToHtml(text) {
  if (!text) return "<p></p>";
  // 优先按空行分段；若没有空行则按单个换行分段
  const raw = String(text);
  const byBlankLine = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (byBlankLine.length > 1) {
    return byBlankLine.map((para) => {
      const lines = para.split("\n").map((l) => escapeHtml(l)).join("<br>");
      return `<p>${lines}</p>`;
    }).join("");
  }
  const bySingleLine = raw.split("\n").map((p) => p.trim()).filter(Boolean);
  if (bySingleLine.length > 1) {
    return bySingleLine.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  }
  return `<p>${escapeHtml(raw.trim())}</p>`;
}

function createMessageMarkup({ speakerId, label, sublabel = "", badgeLabel = "", body, avatarLabel: rawAvatarLabel, avatarClass = "avatar-system", avatarStyleText = "", tone = "system", actions = "", attachments = [], showVoiceControls = false }) {
  const avatarLabel = rawAvatarLabel === "系"
    ? langText("系", "S")
    : rawAvatarLabel === "我"
      ? langText("我", "I")
      : rawAvatarLabel === "研"
        ? langText("研", "R")
        : rawAvatarLabel === "网"
          ? langText("网", "W")
          : rawAvatarLabel;
  const localizedLabel = localizeChatSpeakerLabel(label);
  const attachmentMarkup = attachments.length
    ? `<div class="chat-attachments">${attachments
        .map((file) => `<span class="attachment-pill">${escapeHtml(file.name)} · ${Math.max(1, Math.round((file.size || 0) / 1024))} KB</span>`)
        .join("")}</div>`
    : "";

  const voiceControlsMarkup = showVoiceControls ? `
    <div class="chat-msg-voice-bar">
      <span class="chat-msg-voice-btns" aria-label="朗读控制">
        <button class="chat-msg-playpause" type="button" title="朗读/暂停">
          <svg class="icon-play" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M8 6.5v11l9-5.5-9-5.5z" fill="currentColor"/></svg>
          <svg class="icon-pause" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M6 5h3v14H6zm9 0h3v14h-3z" fill="currentColor"/></svg>
        </button>
        <button class="chat-msg-stop" type="button" title="停止朗读"><svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"/></svg></button>
      </span>
      <span class="speaking-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    </div>` : "";

  return `
    <article class="chat-item ${tone}" data-speaker-id="${speakerId}"${showVoiceControls ? ' data-has-voice="1"' : ""}>
      <div class="avatar-badge ${avatarClass}" ${avatarStyleText ? `style="${escapeHtml(avatarStyleText)}"` : ""}>${avatarLabel}</div>
      <div class="chat-content">
        <div class="chat-meta">
          <strong>${localizedLabel}</strong>
          ${sublabel ? `<span>${sublabel}</span>` : ""}
          ${badgeLabel ? `<span class="chat-assignment-badge">${escapeHtml(badgeLabel)}</span>` : ""}
          ${voiceControlsMarkup}
        </div>
        <div class="chat-bubble">
          ${formatBodyToHtml(body)}
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
  if (state.autoFollow && !(state.voiceReadEnabled && (activeReadAloudUtterance || readAloudQueue.length))) {
    scrollToLatest();
  }
}

function pruneHiddenWorkflowMessages() {
  if (!discussionStream || shouldExposeInternalWorkflow()) {
    return;
  }
  discussionStream.querySelectorAll('.chat-item[data-speaker-id="shared-research-agent"]').forEach((item) => item.remove());
  discussionStream.querySelectorAll(".chat-evidence-strip").forEach((item) => item.remove());
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

function getDefaultMiddleSeatAssignment(role, index) {
  const candidates = ["participant", "neutral", "rebuttal"];
  const fingerprint = `${role?.id || ""}|${role?.name || ""}|${role?.seat || ""}|${index}`;
  let hash = 0;
  for (let position = 0; position < fingerprint.length; position += 1) {
    hash = (hash * 31 + fingerprint.charCodeAt(position)) % 2147483647;
  }
  return candidates[Math.abs(hash) % candidates.length];
}

function applyDefaultSeatLayout(selectedRoleIds = [...state.selectedIds], options = {}) {
  const { force = false } = options;
  if (!force && state.seatLayoutCustomized) {
    return;
  }

  const orderedRoleIds = [...new Set(selectedRoleIds)].filter((roleId) => getRoleById(roleId));
  const nextAssignments = {};
  const nextDiscussionOrder = {};

  if (!orderedRoleIds.length) {
    state.seatAssignments = {};
    state.discussionOrder = {};
    return;
  }

  if (orderedRoleIds.length === 1) {
    nextAssignments[orderedRoleIds[0]] = "challenger";
    nextDiscussionOrder[orderedRoleIds[0]] = 1;
  } else {
    let discussantOrder = 1;
    orderedRoleIds.forEach((roleId, index) => {
      const role = getRoleById(roleId);
      const assignment = index === 0
        ? "challenger"
        : index === orderedRoleIds.length - 1
          ? "judge"
          : getDefaultMiddleSeatAssignment(role, index);
      nextAssignments[roleId] = assignment;
      if (assignment !== "judge") {
        nextDiscussionOrder[roleId] = discussantOrder;
        discussantOrder += 1;
      }
    });
  }

  state.seatAssignments = nextAssignments;
  state.discussionOrder = nextDiscussionOrder;
  orderedRoleIds.forEach((roleId) => {
    const role = getRoleById(roleId);
    if (role) {
      ensureSeatModelAssignment(role);
    }
  });
}

function getSeatStartBlockerMessage(selectedRoles = getOrderedSelectedRoleIds().map((roleId) => getRoleById(roleId)).filter(Boolean)) {
  if (!state.lastSummary) {
    return langText("先让主 AI 整理并确认任务定义，再开始讨论。", "Let the primary AI organize and confirm the task definition before starting.");
  }
  if (selectedRoles.length < state.discussionSize) {
    return langText(`当前讨论人数还没配满，需要先补齐到 ${state.discussionSize} 个席位。`, `The discussion is not fully staffed yet. Fill all ${state.discussionSize} seats first.`);
  }

  const judgeRole = selectedRoles.find((role) => getRoleAssignment(role) === "judge") || null;
  const discussants = selectedRoles.filter((role) => getRoleAssignment(role) !== "judge");
  if (!judgeRole) {
    return langText("当前讨论未设置裁判。请先把其中一个席位设为裁判，再开始讨论。", "No judge is set for this discussion. Assign one seat as judge before starting.");
  }
  if (!discussants.length) {
    return langText("当前讨论还没有发言席位。请至少保留一个主讲或讨论席位。", "There are no speaking seats yet. Keep at least one lead or discussion seat.");
  }

  const moderatorProfile = getPrimarySummaryProfile();
  if (!moderatorProfile) {
    return langText("先在设置里选好主持AI，再开始讨论。", "Choose a host AI in settings before starting.");
  }
  const judgeProfile = getRoleModelProfile(judgeRole);
  if (!judgeProfile) {
    return langText("当前裁判还没绑定可用模型。请先给裁判席位选一个模型。", "The judge seat does not have an available model yet. Assign one before starting.");
  }
  const missingModelRole = discussants.find((role) => !getRoleModelProfile(role));
  if (missingModelRole) {
    return langText(`先给 ${getDisplayRoleName(missingModelRole)} 选一个模型，再开始讨论。`, `Assign a model to ${getDisplayRoleName(missingModelRole)} before starting.`);
  }

  return "";
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
  return ensureRoleIdentityMeta({
    ...role,
    systemPrompt: role.systemPrompt || `你是${role.name}，你长期最稳定的观察重心是${role.seat}。请围绕“${role.description}”发言，保持${role.traits.temper}语气，优先使用${role.traits.method}的方法，并坚持${role.traits.stance}的立场。`,
  });
}

function normalizeProfile(profile) {
  const builtin = defaultProfileMap.get(profile.id);
  if (builtin) {
    return {
      ...builtin,
      ...profile,
      lastTestLatencyMs: Number(profile.lastTestLatencyMs) > 0 ? Number(profile.lastTestLatencyMs) : 0,
      lastVisionTestLatencyMs: Number(profile.lastVisionTestLatencyMs) > 0 ? Number(profile.lastVisionTestLatencyMs) : 0,
      supportsVision: profile.supportsVision === true,
      visionTestStatus: profile.visionTestStatus || "",
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
    lastTestLatencyMs: Number(profile.lastTestLatencyMs) > 0 ? Number(profile.lastTestLatencyMs) : 0,
    lastVisionTestLatencyMs: Number(profile.lastVisionTestLatencyMs) > 0 ? Number(profile.lastVisionTestLatencyMs) : 0,
    supportsVision: profile.supportsVision === true,
    visionTestStatus: profile.visionTestStatus || "",
    compatibility: profile.compatibility === "anthropic" ? "anthropic" : "openai",
  };
}

function getProfileLatencyScore(profile) {
  const latency = Number(profile?.lastTestLatencyMs || 0);
  return latency > 0 ? latency : Number.MAX_SAFE_INTEGER;
}

function sortConfiguredProfilesByLatency(profiles) {
  return [...profiles].sort((left, right) => {
    const latencyDiff = getProfileLatencyScore(left) - getProfileLatencyScore(right);
    if (latencyDiff !== 0) {
      return latencyDiff;
    }
    return (left.displayName || "").localeCompare(right.displayName || "", "zh-CN");
  });
}

function formatProfileLatency(profile) {
  const latency = Number(profile?.lastTestLatencyMs || 0);
  if (!(latency > 0)) {
    return langText("未测速", "No latency yet");
  }
  return latency < 1000
    ? langText(`延迟 ${latency}ms`, `Latency ${latency}ms`)
    : langText(`延迟 ${(latency / 1000).toFixed(2)}s`, `Latency ${(latency / 1000).toFixed(2)}s`);
}

function formatVisionCapabilityLabel(profile) {
  if (profile?.supportsVision) {
    const latency = Number(profile?.lastVisionTestLatencyMs || 0);
    if (latency > 0) {
      return langText(`多模态已验 ${latency}ms`, `Vision verified ${latency}ms`);
    }
    return langText("多模态已验证", "Vision verified");
  }
  if (profile?.visionTestStatus === "error") {
    return langText("多模态不可用", "Vision unavailable");
  }
  return langText("多模态未验证", "Vision unverified");
}

function getVisionCapableProfiles() {
  return sortConfiguredProfilesByLatency(getConfiguredProfiles().filter((profile) => profile.supportsVision));
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
    return langText(
      "火山方舟的 Base URL 是官方公共入口模板值，通常不用改。真正要核对的是精确 Model ID：请复制详情区那串全小写、带版本号的值，例如 doubao-seed-1-8-251228，不要填页面大标题 Doubao-Seed-1.8。",
      "Volcengine Ark usually keeps the default Base URL. The key field to verify is the exact Model ID from the official details, such as doubao-seed-1-8-251228. Do not use a display title like Doubao-Seed-1.8."
    );
  }
  if (profile?.id === "profile-siliconflow" || /siliconflow/i.test(profile?.providerName || "")) {
    return langText(
      "硅基流动本身就是聚合入口，很多 DeepSeek、Qwen、GLM、Llama 都能先在这里接。优先只换 Model ID，其他字段通常不用动。",
      "SiliconFlow is already an aggregated gateway for many model families such as DeepSeek, Qwen, GLM, and Llama. In most cases you only need to change the Model ID."
    );
  }
  if (profile?.id === "profile-openai-official") {
    return langText(
      "OpenAI 官方模板适合直接接官方接口，也适合作为很多 OpenAI 兼容中转的参考格式。若你买的是转发服务，通常复制它给你的 Base URL、Model ID、API Key 即可。",
      "The OpenAI official template works for the direct official API and is also a good reference for many OpenAI-compatible relays. In most relay cases you only need the provided Base URL, Model ID, and API Key."
    );
  }
  if (profile?.id === "profile-claude" || profile?.compatibility === "anthropic") {
    return langText(
      "Claude 官方走 Anthropic Messages 协议，不和 OpenAI Compatible 混用。只有卖家明确写着支持 Anthropic Messages 时，才选这一类。",
      "Claude official endpoints use the Anthropic Messages protocol and should not be mixed with OpenAI-compatible settings. Use this only when the provider explicitly supports Anthropic Messages."
    );
  }
  return langText(
    "内置模板只保留四类常用入口：硅基流动、火山方舟、OpenAI 官方、Claude 官方。其他淘宝中转大多走自定义接入 + OpenAI Compatible；如果对方要求额外签名、特殊 body 或自定义 header，这版前端还不够。",
    "Built-in templates currently keep only four common gateways: SiliconFlow, Volcengine Ark, OpenAI Official, and Claude Official. Most relay vendors should use a custom connection with OpenAI-compatible settings. If a vendor requires extra signatures, special request bodies, or custom headers, this frontend is not enough yet."
  );
}

function updateProfileTemplateHint(profile = null) {
  if (!profileTemplateHint) {
    return;
  }
  profileTemplateHint.textContent = getProfileTemplateHint(profile);
}

function renderKnowledgeScopeUi() {
  state.knowledgeScope = "global";
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

function ensureSelectValue(selectElement, value, label = value) {
  if (!value) {
    return;
  }
  const hasOption = [...selectElement.options].some((option) => option.value === value);
  if (!hasOption) {
    selectElement.append(new Option(label, value));
  }
}

function filterRoles(list, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return list;
  }

  return list.filter((role) => [
    role.name,
    role.nameEn,
    role.seat,
    role.description,
    role.descriptionEn,
    role.systemPrompt || "",
    role.systemPromptEn || "",
    role.sourceLabel || "",
    role.age || "",
    getRoleGenderLabel(role),
    ...Object.values(role.traits || {}),
  ].join(" ").toLowerCase().includes(normalized));
}

function renderPeopleSummary() {
  const favoriteCount = state.peopleRoles.filter(isFavoriteRole).length;
  const customCount = state.peopleRoles.filter((role) => role.source === "custom").length;
  if (peopleCount) {
    peopleCount.textContent = state.appLanguage === "en"
      ? `${state.peopleRoles.length} ${t("peopleCountSuffix")}`
      : `${state.peopleRoles.length}${t("peopleCountSuffix")}`;
  }
  if (peopleSummary) {
    peopleSummary.textContent = formatUiText(t("peopleSummaryTemplate"), {
      base: state.peopleRoles.length - favoriteCount - customCount,
      favorite: favoriteCount,
      custom: customCount,
    });
  }
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
  const startBlockerMessage = getSeatStartBlockerMessage(selectedRoles);
  startDiscussionButton.disabled = state.discussionRunning || !!startBlockerMessage;
  startDiscussionButton.title = startBlockerMessage || "";
  if (!state.discussionRunning) {
    updateSeatFeedback(startBlockerMessage || langText("当前可以开始讨论了。", "Everything is ready. You can start the discussion now."), startBlockerMessage ? "pending" : "success");
  }

  // 动态更新按钮文字：有历史轮次则显示"继续讨论"
  if (!state.discussionRunning) {
    const completedRounds = getCompletedRoundCount();
    if (completedRounds > 0 && state.seatsReady) {
      startDiscussionButton.textContent = langText(`继续讨论（已 ${completedRounds} 轮）`, `Resume (${completedRounds})`);
    } else {
      startDiscussionButton.textContent = t("startDiscussion");
    }
  }
  // 人物已生成、或正在生成（卡住时也需要出口）时显示"重新生成"按钮
  if (regeneratePersonasButton) {
    const showRegen = (state.seatsReady || state.generatingSeats) && !state.discussionRunning;
    regeneratePersonasButton.style.display = showRegen ? "" : "none";
  }

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

function renderMemoryChipList(items) {
  if (!items.length) {
    return `<p class="memory-summary-line">${escapeHtml(langText("当前还没有可展示的记录。", "No memory entries yet."))}</p>`;
  }
  return `<div class="memory-summary-list">${items.map((item) => `<span class="memory-summary-chip">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function renderMemoryAgentWorkspace() {
  const userMemory = normalizeUserMemory(state.userMemory);
  const topRoles = getTopCountEntries(userMemory.selectedRoleCounts, 4)
    .map(([roleId, count]) => `${getReadableRoleNameById(roleId)} × ${count}`)
    .filter(Boolean);
  const topHosts = getTopCountEntries(userMemory.hostProfileCounts, 2)
    .map(([profileId, count]) => `${getConfiguredProfileById(profileId)?.displayName || profileId} × ${count}`)
    .filter(Boolean);

  if (userMemoryPanel) {
    userMemoryPanel.innerHTML = [
      `<p class="memory-summary-line">${escapeHtml(langText(`偏好：${modeValues[userMemory.preferredModeIndex] || modeValues[0]} / ${densityValues[userMemory.preferredDensityIndex] || densityValues[1]} / ${userMemory.preferredDiscussionSize} 人`, `Preferences: ${modeValuesEn[userMemory.preferredModeIndex] || modeValuesEn[0]} / ${densityValuesEn[userMemory.preferredDensityIndex] || densityValuesEn[1]} / ${userMemory.preferredDiscussionSize} seats`))}</p>`,
      `<p class="memory-summary-line">${escapeHtml(langText(`累计：已开始 ${userMemory.usage.discussionsStarted} 次讨论，上传 ${userMemory.usage.attachmentsUploaded} 个附件`, `Usage: ${userMemory.usage.discussionsStarted} discussions, ${userMemory.usage.attachmentsUploaded} attachments`))}</p>`,
      topHosts.length ? renderMemoryChipList(topHosts) : "",
      topRoles.length ? renderMemoryChipList(topRoles) : "",
    ].filter(Boolean).join("");
  }

  const projectMemory = normalizeProjectMemory(state.projectMemory);
  if (projectMemoryPanel) {
    projectMemoryPanel.innerHTML = [
      `<p class="memory-summary-line">${escapeHtml(projectMemory.taskSummary ? summarizeText(projectMemory.taskSummary, 120) : langText("当前项目还没有确认后的任务定义。", "This project does not have a confirmed task summary yet."))}</p>`,
      projectMemory.sharedFacts ? `<p class="memory-summary-line">${escapeHtml(langText(`共享事实：${summarizeText(projectMemory.sharedFacts, 140)}`, `Shared brief: ${summarizeText(projectMemory.sharedFacts, 140)}`))}</p>` : "",
      projectMemory.unresolvedQuestions.length ? renderMemoryChipList(projectMemory.unresolvedQuestions.slice(0, 4)) : "",
      projectMemory.keyEvidence.length ? renderMemoryChipList(projectMemory.keyEvidence.slice(0, 4)) : "",
    ].filter(Boolean).join("");
  }

  syncSharedAgentInputsFromState();
  updateSharedAgentStatus(state.sharedAgentStatus.text || langText("资料还没有更新", "No evidence update yet."), state.sharedAgentStatus.tone || "");
  renderRoundtableEvidenceWorkspace();
}

function buildEvidenceLabelFromText(text, fallbackLabel) {
  const firstLine = String(text || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .find((item) => item && !/^来源[:：]/.test(item) && !/^摘要[:：]/.test(item));
  const normalized = String(firstLine || "")
    .replace(/^[\d\-*.、\s]+/, "")
    .replace(/^(图片证据补充|研究问题|共享事实包)[:：]\s*/i, "")
    .trim();
  return summarizeText(normalized, 34) || fallbackLabel;
}

function getEvidenceListKindLabel(filterType) {
  if (filterType === "image") {
    return langText("图片", "Image");
  }
  if (filterType === "knowledge") {
    return langText("知识", "Knowledge");
  }
  if (filterType === "file") {
    return langText("文件", "File");
  }
  return langText("文本", "Text");
}

function formatEvidenceCreatedAt(timestamp) {
  if (!timestamp) {
    return "";
  }
  try {
    return new Date(timestamp).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

function buildEvidenceMetaLine(entry) {
  const parts = [];
  const createdAtText = formatEvidenceCreatedAt(entry.createdAt || 0);
  if (createdAtText) {
    parts.push(langText(`时间 ${createdAtText}`, `Time ${createdAtText}`));
  }
  if (entry.sourceLabel) {
    parts.push(langText(`由 ${entry.sourceLabel} 提出`, `Proposed by ${entry.sourceLabel}`));
  }
  return parts.join("  ·  ");
}

function buildWebPreviewUrl(url) {
  const normalized = String(url || "").trim();
  if (!normalized) {
    return "";
  }
  return `https://r.jina.ai/http/${normalized.replace(/^https?:\/\//i, "")}`;
}

function detectArtifactFilterType(artifact) {
  if (artifact.kind === "image") {
    return "image";
  }
  if (artifact.kind === "video") {
    return "video";
  }
  if (/^text\//i.test(artifact.type || "") || /\.(txt|md|json|csv)$/i.test(artifact.name || "")) {
    return "text";
  }
  return "file";
}

function formatArtifactKindLabel(artifact, filterType) {
  if (filterType === "image") {
    return langText("图片", "Image");
  }
  if (filterType === "video") {
    return langText("视频", "Video");
  }
  if (filterType === "text") {
    return langText("文本", "Text");
  }
  return langText("文件", "File");
}

function getArtifactFormatLabel(artifact) {
  const extMatch = String(artifact.name || "").match(/\.([A-Za-z0-9]+)$/);
  if (extMatch?.[1]) {
    return extMatch[1].toUpperCase();
  }
  return summarizeText(artifact.type || langText("文件", "File"), 18);
}

function getImageEvidenceAnalysisText() {
  const blocks = String(state.sharedResearchBrief || "")
    .split(/\n\s*\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const match = [...blocks].reverse().find((item) => /^图片证据补充[:：]/.test(item));
  return match ? match.replace(/^图片证据补充[:：]\s*/, "").trim() : "";
}

function getSharedResearchEvidenceEntries() {
  return Array.isArray(state.sharedEvidenceEntries)
    ? state.sharedEvidenceEntries.filter(Boolean)
    : [];
}

function getRoundtableEvidenceEntries() {
  const imageAnalysis = getImageEvidenceAnalysisText();
  const artifactEntries = state.projectArtifacts.map((artifact) => {
    const filterType = detectArtifactFilterType(artifact);
    return {
      id: `artifact:${artifact.id}`,
      label: artifact.name || langText("附件", "Attachment"),
      kind: formatArtifactKindLabel(artifact, filterType),
      filterType,
      summary: artifact.textPreview
        ? summarizeText(artifact.textPreview, 82)
        : artifact.kind === "image"
          ? langText("已上传图片，点开后可看右侧预览和分析。", "Image uploaded. Open it to inspect the preview and analysis on the right.")
          : artifact.kind === "video"
            ? langText("已上传视频，点开后可在右侧播放预览。", "Video uploaded. Open it to play the preview on the right.")
          : langText("当前文件没有可直接展开的文本内容。", "This file has no inline text preview yet."),
      createdAt: artifact.createdAt || 0,
      detail: artifact.textPreview || "",
      imageUrl: artifact.kind === "image" ? artifact.dataUrl || "" : "",
      videoUrl: artifact.kind === "video" ? artifact.dataUrl || "" : "",
      analysis: artifact.kind === "image" ? (artifact.analysisText || imageAnalysis) : "",
      sourceUrl: "",
      previewUrl: "",
      meta: [artifact.size ? `${Math.max(1, Math.round(artifact.size / 1024))} KB` : ""].filter(Boolean),
      formatLabel: getArtifactFormatLabel(artifact),
      listKindLabel: getEvidenceListKindLabel(filterType),
      sourceLabel: langText("用户上传", "User Upload"),
    };
  });

  const sharedEvidenceEntries = getSharedResearchEvidenceEntries().map((entry) => ({
    ...entry,
    listKindLabel: getEvidenceListKindLabel(entry.filterType),
    sourceLabel: entry.sourceLabel || (entry.filterType === "knowledge" ? langText("本地知识库", "Local Knowledge") : langText("网页搜索", "Web Search")),
  }));

  const briefEntry = state.sharedResearchBrief ? [{
    id: "shared-research-brief",
    label: langText("置顶基准事实包", "Pinned Shared Brief"),
    kind: langText("共享事实包", "Shared Brief"),
    filterType: "brief",
    summary: summarizeText(state.sharedResearchBrief, 120),
    createdAt: 0,
    detail: state.sharedResearchBrief,
    imageUrl: "",
    videoUrl: "",
    analysis: "",
    sourceUrl: "",
    previewUrl: "",
    meta: [langText("全程有效·每轮必遵", "Active all rounds")],
    formatLabel: langText("事实包", "Brief"),
    listKindLabel: langText("置顶共识", "Pinned"),
    sourceLabel: langText("共享 Research Agent", "Shared Research Agent"),
  }] : [];

  return [...briefEntry, ...artifactEntries, ...sharedEvidenceEntries].sort((left, right) => {
    if (left.id === "shared-research-brief") return -1;
    if (right.id === "shared-research-brief") return 1;
    return (left.createdAt || 0) - (right.createdAt || 0);
  });
}

function filterRoundtableEvidenceEntries(entries) {
  if (activeRoundtableEvidenceFilter === "all") {
    return entries;
  }
  return entries.filter((entry) => entry.filterType === activeRoundtableEvidenceFilter);
}

function renderRoundtableEvidenceWorkspace() {
  if (!roundtableEvidenceList || !roundtableEvidenceDetail) {
    return;
  }

  if (roundtableEvidenceFilterSelect) {
    roundtableEvidenceFilterSelect.value = activeRoundtableEvidenceFilter;
  }

  const evidenceEntries = filterRoundtableEvidenceEntries(getRoundtableEvidenceEntries());
  if (!evidenceEntries.length) {
    activeRoundtableEvidenceId = "";
    roundtableEvidenceList.innerHTML = `<div class="empty-panel">${escapeHtml(langText("当前筛选下还没有条目。上传附件、搜索网页或解析图片后，会按顺序出现在这里。", "No evidence matches this filter yet. Upload files or run search/image analysis to populate the list."))}</div>`;
    roundtableEvidenceDetail.innerHTML = `<div class="evidence-detail-empty">${escapeHtml(langText("右侧会在你点开左边条目后显示详情。", "The detail panel appears here after you open an item from the list."))}</div>`;
    return;
  }

  if (!evidenceEntries.some((entry) => entry.id === activeRoundtableEvidenceId)) {
    activeRoundtableEvidenceId = "";
  }

  const activeEntry = evidenceEntries.find((entry) => entry.id === activeRoundtableEvidenceId) || null;

  if (!activeRoundtableEvidenceId) {
    roundtableEvidenceList.scrollTop = 0;
  }

  roundtableEvidenceList.innerHTML = evidenceEntries
    .map((entry, index) => `
      <button class="evidence-list-item ${entry.id === activeRoundtableEvidenceId ? "active" : ""}" data-evidence-id="${entry.id}" type="button">
        <span class="evidence-list-index">${index + 1}.</span>
        <span class="evidence-list-label">${escapeHtml(entry.label)}</span>
        <span class="evidence-list-kind">${escapeHtml(entry.listKindLabel || getEvidenceListKindLabel(entry.filterType))}</span>
      </button>
    `)
    .join("");

  if (!activeEntry) {
    roundtableEvidenceDetail.innerHTML = `<div class="evidence-detail-empty">${escapeHtml(langText("右侧当前没有打开的条目。点左边任意一项，这里就会展开详情。", "No item is open on the right yet. Click any row on the left to inspect its details here."))}</div>`;
    return;
  }

  if (activeEntry.filterType === "image" && !activeEntry.analysis) {
    const artifactId = String(activeEntry.id || "").replace(/^artifact:/, "");
    if (artifactId && !pendingEvidenceAnalysisIds.has(artifactId)) {
      pendingEvidenceAnalysisIds.add(artifactId);
      updateSharedAgentStatus(langText("正在补跑当前图片的解析内容...", "Running analysis for the current image..."), "pending");
      void analyzeSingleImageArtifact(artifactId)
        .then(() => {
          updateSharedAgentStatus(langText("当前图片的解析内容已更新。", "The current image analysis has been updated."), "success");
        })
        .catch((error) => {
          updateSharedAgentStatus(error instanceof Error ? error.message : String(error), "error");
        })
        .finally(() => {
          pendingEvidenceAnalysisIds.delete(artifactId);
          renderRoundtableEvidenceWorkspace();
        });
    }
  }

  const _detailArtId = String(activeEntry.id || "").replace(/^artifact:/, "");
  const _detailAnalyzing = activeEntry.filterType === "image" && !activeEntry.analysis && _detailArtId && pendingEvidenceAnalysisIds.has(_detailArtId);
  const _detailModelName = _detailAnalyzing ? (getMultimodalProfile()?.displayName || langText("默认模型", "default model")) : "";
  const analysisStatusBlock = activeEntry.filterType !== "image" || activeEntry.analysis ? ""
    : _detailAnalyzing
      ? `<div class="evidence-analyzing-indicator"><span class="evidence-analyzing-text">${escapeHtml(langText("正在解析图片", "Analyzing image"))}</span><span class="evidence-analyzing-dots"></span><span class="evidence-analyzing-model">${escapeHtml(langText("使用模型：", "Model: ") + _detailModelName)}</span></div>`
      : `<div class="evidence-detail-placeholder">${escapeHtml(langText("这张图片还没有解析内容。正在尝试自动补跑；如果这一条仍为空，可以点右上角\u201c图片解析\u201d立即补跑。", "No analysis yet. Auto-analysis is being attempted; if still empty, click Image Analysis in the top-right."))}</div>`;

  roundtableEvidenceDetail.innerHTML = `
    <div class="evidence-detail-panel">
      <div class="evidence-detail-title">${escapeHtml(activeEntry.label)}</div>
      <div class="evidence-detail-meta">${escapeHtml(buildEvidenceMetaLine(activeEntry) || langText("未记录时间与来源", "No time or source recorded"))}</div>
      <div class="evidence-detail-surface">
        ${activeEntry.sourceUrl ? `<a class="evidence-source-link" href="${escapeHtml(activeEntry.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(activeEntry.sourceUrl)}</a>` : ""}
        ${activeEntry.imageUrl ? `<img src="${activeEntry.imageUrl}" alt="${escapeHtml(activeEntry.label)}" />` : ""}
        ${activeEntry.videoUrl ? `<video class="evidence-detail-video" src="${activeEntry.videoUrl}" controls preload="metadata"></video>` : ""}
        ${analysisStatusBlock}
        ${activeEntry.analysis ? `<div class="evidence-detail-copy">${escapeHtml(activeEntry.analysis)}</div>` : ""}
        ${activeEntry.detail ? `<div class="evidence-detail-copy">${escapeHtml(activeEntry.detail)}</div>` : ""}
        ${!activeEntry.sourceUrl && !activeEntry.imageUrl && !activeEntry.videoUrl && !activeEntry.analysis && !activeEntry.detail ? `<div class="evidence-detail-copy">${escapeHtml(activeEntry.summary || langText("当前没有更多内容可展示。", "No additional content is available."))}</div>` : ""}
      </div>
    </div>
  `;
}

function renderModelMappings() {
  sanitizeSeatModelAssignments();
  const configuredProfiles = sortConfiguredProfilesByLatency(getConfiguredProfiles());
  const visionProfiles = getVisionCapableProfiles();
  if (!hostModelSelect) {
    return;
  }
  if (!configuredProfiles.length) {
    state.mappings.main = "";
    state.mappings.multimodal = "";
    hostModelSelect.innerHTML = `<option value="">${escapeHtml(t("noAvailableModels"))}</option>`;
    if (multimodalModelSelect) {
      multimodalModelSelect.innerHTML = `<option value="">${escapeHtml(langText("没有可用的多模态模型", "No multimodal models available"))}</option>`;
      multimodalModelSelect.disabled = true;
    }
    hostModelSelect.disabled = true;
    return;
  }
  if (!configuredProfiles.some((profile) => profile.id === state.mappings.main)) {
    state.mappings.main = configuredProfiles[0].id;
  }
  if (!visionProfiles.some((profile) => profile.id === state.mappings.multimodal)) {
    state.mappings.multimodal = "";
  }
  hostModelSelect.innerHTML = configuredProfiles
    .map((profile) => `<option value="${profile.id}" ${profile.id === state.mappings.main ? "selected" : ""}>${escapeHtml(getLocalizedProfileDisplayName(profile))} · ${escapeHtml(formatProfileLatency(profile))}</option>`)
    .join("");
  if (multimodalModelSelect) {
    if (visionProfiles.length) {
      multimodalModelSelect.innerHTML = [
        `<option value="">${escapeHtml(t("multimodalModelFollowHost"))}</option>`,
        ...visionProfiles.map((profile) => `<option value="${profile.id}" ${profile.id === state.mappings.multimodal ? "selected" : ""}>${escapeHtml(getLocalizedProfileDisplayName(profile))} · ${escapeHtml(formatVisionCapabilityLabel(profile))}</option>`),
      ].join("");
      multimodalModelSelect.disabled = state.discussionRunning;
    } else {
      multimodalModelSelect.innerHTML = `<option value="">${escapeHtml(langText("没有已验证通过的多模态模型", "No verified multimodal models"))}</option>`;
      multimodalModelSelect.disabled = true;
    }
  }
  hostModelSelect.disabled = state.discussionRunning;
}

function renderConnectedModelList() {
  const configuredProfiles = sortConfiguredProfilesByLatency(getConfiguredProfiles());
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
            <strong>
              <span class="model-health-dot ${getProfileHealth(profile)}"></span>
              <span class="connected-model-name">${escapeHtml(profile.displayName)}</span>
              ${isHost ? `<span class="profile-tag active">${escapeHtml(t("hostAiTag"))}</span>` : ""}
              ${profile.supportsVision ? `<span class="profile-tag">${escapeHtml(langText("多模态", "Multimodal"))}</span>` : ""}
            </strong>
          </div>
          <div class="connected-model-actions">
            <span class="model-latency-pill">${escapeHtml(formatProfileLatency(profile))}</span>
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
    .map((profile) => `<option value="${profile.id}">${escapeHtml(getLocalizedProfileDisplayName(profile))}</option>`);
  providerTemplateSelect.innerHTML = [`<option value="">${escapeHtml(t("providerTemplatePlaceholder"))}</option>`, ...builtinOptions, `<option value="custom-new">${escapeHtml(t("providerTemplateCreate"))}</option>`].join("");
  providerTemplateSelect.value = modelProfileTemplateId || "";
  updateProfileTemplateHint(defaultProfileMap.get(providerTemplateSelect.value) || null);
}

function updateSeatFeedback(message, tone = "") {
  seatFeedback.textContent = message;
  seatFeedback.className = `seat-feedback ${message ? "" : "seat-feedback-hidden"} ${tone}`.trim();
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

function openKnowledgeBaseModal() {
  knowledgeBaseBackdrop?.classList.add("open");
  knowledgeBaseModal?.classList.add("open");
  renderKnowledgeBaseWorkspace();
}

function closeKnowledgeBaseModal() {
  knowledgeBaseBackdrop?.classList.remove("open");
  knowledgeBaseModal?.classList.remove("open");
}

function openRoundtableWorkbench() {
  activeRoundtableEvidenceId = "";
  roundtableWorkbenchBackdrop?.classList.add("open");
  roundtableWorkbenchModal?.classList.add("open");
  renderMemoryAgentWorkspace();
  renderRoundtableEvidenceWorkspace();
}

function closeRoundtableWorkbench() {
  roundtableWorkbenchBackdrop?.classList.remove("open");
  roundtableWorkbenchModal?.classList.remove("open");
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
  applyLanguageToBody();
  applyLanguageToStaticUi();
  pruneHiddenWorkflowMessages();
  renderKnowledgeBaseWorkspace();
  renderRoundtableEvidenceWorkspace();
  renderDiscussionStatusPanel();
  setRoleEditorFieldVisibility();
  renderThemeToggle();
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

function applyThemeToBody() {
  document.body.classList.toggle("theme-light", state.appTheme === "light");
}

function applyLanguageToBody() {
  document.body.classList.toggle("app-lang-en", state.appLanguage === "en");
  document.body.classList.toggle("app-lang-zh", state.appLanguage !== "en");
}

function sanitizeClosingTextForLanguage(text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return "";
  }
  if (state.appLanguage === "en" && /[\u4e00-\u9fff]/.test(normalized)) {
    return "This roundtable discussion has now come to a close. Thank you all for your thoughtful contributions.";
  }
  return normalized;
}

function renderThemeToggle() {
  if (!appThemeToggle) {
    return;
  }
  appThemeToggle.textContent = state.appTheme === "light"
    ? langText("深色", "Dark")
    : langText("浅色", "Light");
}

async function setAppTheme(nextTheme) {
  state.appTheme = nextTheme === "light" ? "light" : "dark";
  applyThemeToBody();
  renderThemeToggle();
  await saveAppState("appTheme", state.appTheme);
}

function resetRoleEditor() {
  roleEditorContext = null;
  roleEditorId.value = "";
  if (roleEditorAiRequirements) {
    roleEditorAiRequirements.value = "";
  }
  roleEditorName.value = "";
  if (roleEditorNameEn) {
    roleEditorNameEn.value = "";
  }
  roleEditorSeat.value = "讨论参与者";
  roleEditorGender.value = "female";
  roleEditorAge.value = "45岁";
  roleEditorDescription.value = "";
  if (roleEditorDescriptionEn) {
    roleEditorDescriptionEn.value = "";
  }
  roleEditorPrompt.value = "";
  if (roleEditorPromptEn) {
    roleEditorPromptEn.value = "";
  }
  roleEditorStance.value = "支持原命题";
  roleEditorTemper.value = "稳健";
  roleEditorColor.value = "sky";
  syncRoleColorPicker("sky");
  roleEditorSourceLabel.value = "";
  if (roleEditorSourceLabelEn) {
    roleEditorSourceLabelEn.value = "";
  }
  if (roleEditorAiFeedback) {
    roleEditorAiFeedback.textContent = t("roleAiGenerateHint");
    roleEditorAiFeedback.className = "drawer-feedback compact-feedback";
  }
}

function setRoleEditorFieldVisibility() {
  const fieldPairs = [
    [roleEditorName, roleEditorNameEn],
    [roleEditorDescription, roleEditorDescriptionEn],
    [roleEditorPrompt, roleEditorPromptEn],
    [roleEditorSourceLabel, roleEditorSourceLabelEn],
  ];
  fieldPairs.forEach(([zhField, enField]) => {
    const zhLabel = zhField?.closest("label");
    const enLabel = enField?.closest("label");
    if (zhLabel) {
      zhLabel.classList.toggle("hidden", state.appLanguage === "en");
    }
    if (enLabel) {
      enLabel.classList.toggle("hidden", state.appLanguage !== "en");
    }
  });
}

function toggleRoleEditor(visible) {
  roleEditor.classList.toggle("hidden", !visible);
  setRoleEditorFieldVisibility();
  closePeopleLibrary.textContent = visible ? t("returnToList") : t("exitLibrary");
}

function fillRoleEditor(role) {
  const preparedRole = normalizeRecommendedRolePersona(role);
  roleEditorId.value = preparedRole.id;
  roleEditorName.value = preparedRole.name;
  if (roleEditorNameEn) {
    roleEditorNameEn.value = preparedRole.nameEn || preparedRole.i18n?.en?.name || "";
  }
  roleEditorSeat.value = preparedRole.seat || "讨论参与者";
  roleEditorGender.value = normalizeRoleGender(preparedRole.gender) || inferRoleGender(preparedRole);
  roleEditorAge.value = state.appLanguage === "en"
    ? localizeAge(normalizeRoleAge(preparedRole.age) || inferRoleAge(preparedRole))
    : (normalizeRoleAge(preparedRole.age) || inferRoleAge(preparedRole));
  roleEditorDescription.value = preparedRole.description;
  if (roleEditorDescriptionEn) {
    roleEditorDescriptionEn.value = preparedRole.descriptionEn || preparedRole.i18n?.en?.description || "";
  }
  roleEditorPrompt.value = preparedRole.systemPrompt || "";
  if (roleEditorPromptEn) {
    roleEditorPromptEn.value = preparedRole.systemPromptEn || preparedRole.i18n?.en?.systemPrompt || "";
  }
  const stanceValue = preparedRole.traits?.stance || "自定义";
  const temperValue = preparedRole.traits?.temper || "自定义";
  ensureSelectValue(roleEditorStance, stanceValue, state.appLanguage === "en" ? getLocalizedTraitDisplay(preparedRole, "stance") || stanceValue : stanceValue);
  ensureSelectValue(roleEditorTemper, temperValue, state.appLanguage === "en" ? getLocalizedTraitDisplay(preparedRole, "temper") || temperValue : temperValue);
  roleEditorStance.value = stanceValue;
  roleEditorTemper.value = temperValue;
  roleEditorColor.value = roleColor(preparedRole);
  syncRoleColorPicker(roleColor(preparedRole));
  roleEditorSourceLabel.value = preparedRole.sourceLabel || "";
  if (roleEditorSourceLabelEn) {
    roleEditorSourceLabelEn.value = preparedRole.sourceLabelEn || translateRoleSourceLabel(preparedRole.sourceLabel || "", preparedRole.source);
  }
}

function openRoleEditorForCreate(sourceLabel = "") {
  resetRoleEditor();
  roleEditorContext = { sourceCollection: "custom", roleId: "", replaceSelectedId: "" };
  roleEditorSourceLabel.value = sourceLabel;
  if (roleEditorSourceLabelEn) {
    roleEditorSourceLabelEn.value = translateRoleSourceLabel(sourceLabel, "custom");
  }
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
  if (state.seatLayoutCustomized) {
    syncDiscussionOrder();
  } else {
    applyDefaultSeatLayout(getOrderedSelectedRoleIds(), { force: true });
  }
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
    sourceLabelEn: "Generated",
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

function extractJsonStringField(text, fieldName) {
  const rawText = String(text || "");
  const escapedFieldName = String(fieldName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = rawText.match(new RegExp(`"${escapedFieldName}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i"));
  if (match?.[1]) {
    try {
      return JSON.parse(`"${match[1]}"`);
    } catch {
      return match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  }
  // 截断响应兜底：模型回复被截断、字段值没有闭合引号时，捕获到文本末尾
  // \\\\? 允许末尾有一个孤立的反斜杠（转义序列被截断的情况）
  const truncatedMatch = rawText.match(new RegExp(`"${escapedFieldName}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)\\\\?$`, "i"));
  if (truncatedMatch?.[1]) {
    return truncatedMatch[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .trimEnd();
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
    "先判断这个任务属于哪个核心领域（例如天文/宇宙科学、医学、工程、法律、商业、历史等），再根据该领域推荐对应的历史或当代名人。名人必须在该核心领域有直接建树，不允许因为方法论相似就跨领域借用——例如宇宙科学话题不能因为推理能力强就用侦探人物，探索类话题不能因为证据分析能力就用破案人物。名人/历史人物不能超过总人数一半，而且必须保留现代知识覆盖层。",
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
  return buildSharedResearchBriefFromSources(summary, moderatorProfile, orderedSpeakers, "", signal);
}

async function buildSharedResearchBriefFromSources(summary, moderatorProfile, orderedSpeakers, sourceDigest = "", signal) {
  const localKnowledgeResult = state.knowledgeEnabled
    ? filterKnowledgeEntries(getKnowledgeScopeEntries(), {
      queryOverride: summary,
      categoryOverride: "all",
    })
    : { entries: [] };
  const localKnowledgeHits = (localKnowledgeResult.entries || []).slice(0, 4);
  const localKnowledgeDigest = localKnowledgeHits.length
    ? [
      `本地知识库命中目录：${uniqueStrings(localKnowledgeHits.map((entry) => getKnowledgeCategoryLabel(entry.category))).join("、") || langText("未分类", "Uncategorized")}`,
      ...localKnowledgeHits.map((entry, index) => `${index + 1}. ${entry.title}｜目录：${getKnowledgeCategoryLabel(entry.category)}｜片段：${entry.searchSnippet || summarizeText(entry.summary || entry.textPreview || "", 88)}`),
    ].join("\n")
    : "";
  if (localKnowledgeHits.length) {
    await recordKnowledgeRetrievalHits(summary, localKnowledgeHits, "shared_brief");
    appendSharedEvidenceEntries(buildKnowledgeEvidenceEntries(localKnowledgeHits, summary, "shared_brief"));
    renderRoundtableEvidenceWorkspace();
  }
  const prompt = [
    "你现在是这张圆桌唯一的共享 research agent。",
    "你的职责不是替任何一个席位发言，而是先为整张桌子整理一份所有角色共用的事实包。",
    "这份事实包要像讨论前的统一 briefing：只整理背景、已知约束、关键分歧、需要核实的点、不能偷换的概念，不替任何一方下最终结论。",
    "如果题目涉及历史人物、现实政策、产品、案件或专业判断，可以使用当下公开常识与公开知识来做背景校正，但不要伪造来源、原话、年份、数字或未核实细节。",
    "输出至少覆盖：背景事实、当前约束、桌上最值得争的 2 到 4 个问题、哪些点现在还不能下死结论。",
    "控制在 220 到 420 字。直接输出正文，不要 Markdown 标题，不要列表编号。",
    getModelOutputLanguageInstruction(),
    `任务定义：${summary}`,
    `本次参与人物及其长期观察重心：${orderedSpeakers.map((role) => `${getActiveRoleName(role)}（${getActiveRoleSeat(role)}）`).join("，")}`,
    localKnowledgeDigest ? `本地知识库命中结果（请先吸收这批片段，再判断还缺什么）：\n${localKnowledgeDigest}` : "",
    sourceDigest ? `补充来源材料（请优先消化这批材料，再提炼成共享事实包）：\n${sourceDigest}` : "",
  ].join("\n\n");

  return requestModelText(moderatorProfile, prompt, 650, signal);
}

async function requestMultimodalModelText(profile, prompt, artifacts, maxTokens = 900, signal, timeoutMs = MODEL_REQUEST_TIMEOUT_MS) {
  const usableArtifacts = artifacts.filter((artifact) => artifact?.dataUrl && artifact.kind === "image");
  if (!usableArtifacts.length) {
    throw new Error("当前没有可供多模态解析的图片附件。");
  }
  if (!profileSupportsVision(profile)) {
    throw new Error(`${profile.displayName} 当前配置的模型 ${profile.modelId} 不支持图片解析。请切换到支持视觉输入的模型，例如 Qwen2.5-VL、Gemini、Claude 或 GPT-4o。`);
  }

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
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...usableArtifacts.map((artifact) => ({
                type: "image",
                source: {
                  type: "base64",
                  media_type: artifact.type || "image/png",
                  data: String(artifact.dataUrl).split(",")[1] || "",
                },
              })),
            ],
          }],
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
        body: JSON.stringify({
          model: profile.modelId,
          max_tokens: maxTokens,
          temperature: 0.2,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...usableArtifacts.map((artifact) => ({
                type: "image_url",
                image_url: { url: artifact.dataUrl },
              })),
            ],
          }],
        }),
      });
    }
  } catch (error) {
    requestControl.cleanup();
    if (requestControl.didTimeOut()) {
      throw new Error(`${profile.displayName} 的多模态解析超时（已等待 ${Math.round(timeoutMs / 1000)} 秒）。图片可能太大或网络不稳，请检查模型配置后再试。`);
    }
    throw error;
  }
  requestControl.cleanup();

  if (!response.ok) {
    throw new Error(formatHttpFailureMessage(profile, response, "多模态解析失败"));
  }
  const payload = await response.json();
  const text = extractTextFromModelResponse(payload, profile.compatibility);
  if (!text) {
    throw new Error(`${profile.displayName} 返回了空的多模态解析结果`);
  }
  return sanitizeDisplayedModelText(text);
}

async function fetchDuckDuckGoSearchDigest(query) {
  if (canUseLocalWebSearchProxy()) {
    try {
      // 代理模式：抓取 DuckDuckGo HTML 网页搜索结果（比 Instant Answers API 返回真实网页）
      const response = await fetch(buildLocalWebSearchProxyUrl("duck", query));
      if (!response.ok) {
        throw new Error(`DuckDuckGo 搜索失败：${response.status}`);
      }
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const items = [];

      // 打印诊断：前500字符帮助识别是否为验证码/拦截页
      const htmlSnippet = html.replace(/\s+/g, " ").slice(0, 500);
      const isCaptcha = /captcha|unusual traffic|robot|blocked/i.test(html);
      console.log("[duck-html-parse]", {
        query,
        rawLength: html.length,
        isCaptcha,
        htmlSnippet,
      });

      if (isCaptcha) {
        throw new Error("DuckDuckGo 返回了人机验证页，无法解析（可能是 VPN 出口被限制）");
      }

      // 方案A: .result__a（标准 HTML 结果页）
      doc.querySelectorAll(".result__a").forEach((anchor) => {
        if (items.length >= 5) return;
        const title = anchor.textContent.trim();
        const url = anchor.getAttribute("href") || "";
        const container = anchor.closest(".result") || anchor.parentElement?.parentElement?.parentElement;
        const snippetEl = container?.querySelector(".result__snippet");
        const snippet = snippetEl?.textContent?.trim() || "";
        if (title && url && !url.includes("duckduckgo.com")) {
          items.push({ title, snippet: snippet || title, url });
        }
      });

      // 方案B: .links_main a（lite 版结果页）
      if (!items.length) {
        doc.querySelectorAll(".links_main a[href]").forEach((anchor) => {
          if (items.length >= 5) return;
          const href = anchor.getAttribute("href") || "";
          if (!href.startsWith("http")) return;
          const title = anchor.textContent.trim();
          if (title.length > 5) items.push({ title, snippet: title, url: href });
        });
      }

      // 方案C：所有 http 外链（最后兜底）
      if (!items.length) {
        doc.querySelectorAll("a[href^='http']").forEach((anchor) => {
          if (items.length >= 4) return;
          const href = anchor.getAttribute("href") || "";
          if (href.includes("duckduckgo.com")) return;
          const title = anchor.textContent.trim();
          if (title.length > 10) items.push({ title, snippet: title, url: href });
        });
      }

      console.log("[duck-html-parse:result]", { parsedCount: items.length, firstItem: items[0] || null });
      return items;
    } catch (error) {
      console.warn("local duck proxy unavailable, falling back to public API", error);
    }
  }

  // 非代理模式：依然用 Instant Answers JSON API
  const response = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`
  );
  if (!response.ok) {
    throw new Error(`DuckDuckGo 搜索失败：${response.status}`);
  }
  const payload = await response.json();
  const items = [];
  if (payload.AbstractText) {
    items.push({
      title: payload.Heading || query,
      snippet: payload.AbstractText,
      url: payload.AbstractURL || "",
    });
  }
  const queue = Array.isArray(payload.RelatedTopics) ? [...payload.RelatedTopics] : [];
  while (queue.length && items.length < 4) {
    const next = queue.shift();
    if (!next) {
      continue;
    }
    if (Array.isArray(next.Topics)) {
      queue.push(...next.Topics);
      continue;
    }
    if (next.Text) {
      items.push({
        title: next.FirstURL || query,
        snippet: next.Text,
        url: next.FirstURL || "",
      });
    }
  }
  return items;
}

async function fetchWikipediaSearchDigest(query) {
  let response;
  if (canUseLocalWebSearchProxy()) {
    try {
      response = await fetch(buildLocalWebSearchProxyUrl("wiki", query));
      if (!response.ok) {
        throw new Error(`Wikipedia 搜索失败：${response.status}`);
      }
    } catch (error) {
      console.warn("local wikipedia proxy unavailable, falling back to public API", error);
    }
  }
  if (!response) {
    response = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json&origin=*`);
  }
  if (!response.ok) {
    throw new Error(`Wikipedia 搜索失败：${response.status}`);
  }
  const payload = await response.json();
  const searchResults = Array.isArray(payload?.query?.search) ? payload.query.search : [];
  return searchResults.map((item) => ({
    title: item.title || "",
    snippet: (item.snippet || item.title || "").replace(/<[^>]+>/g, ""),
    url: item.title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(String(item.title).replace(/ /g, "_"))}` : "",
  })).filter((item) => item.title).slice(0, 3);
}

async function fetchUrlDigest(url) {
  const normalized = String(url || "").trim();
  if (!normalized) {
    return null;
  }
  let mirrorUrl = `https://r.jina.ai/http/${normalized.replace(/^https?:\/\//i, "")}`;
  if (canUseLocalWebSearchProxy()) {
    const proxyUrl = buildLocalWebSearchProxyUrl("url", normalized);
    try {
      const proxyResponse = await fetch(proxyUrl);
      if (!proxyResponse.ok) {
        throw new Error(`网页抓取失败：${normalized}`);
      }
      const text = await proxyResponse.text();
      return {
        title: normalized,
        snippet: summarizeText(text, 500),
        url: normalized,
      };
    } catch (error) {
      console.warn("local url proxy unavailable, falling back to jina mirror", error);
    }
  }
  const response = await fetch(mirrorUrl);
  if (!response.ok) {
    throw new Error(`网页抓取失败：${normalized}`);
  }
  const text = await response.text();
  return {
    title: normalized,
    snippet: summarizeText(text, 500),
    url: normalized,
  };
}

function formatResearchSourceDigest(query, collectedResults, sourceUrls) {
  return [
    `研究问题：${query}`,
    sourceUrls.length ? `用户补充网址：${sourceUrls.join("，")}` : "",
    ...collectedResults.map((item, index) => `${index + 1}. ${item.title}${item.url ? `\n来源：${item.url}` : ""}\n摘要：${item.snippet}`),
  ].filter(Boolean).join("\n\n");
}

function canUseLocalWebSearchProxy() {
  return /^https?:$/i.test(window.location.protocol)
    && /^(127\.0\.0\.1|localhost)$/i.test(window.location.hostname);
}

function buildLocalWebSearchProxyUrl(kind, value) {
  const url = new URL("/__roundtable_proxy", window.location.origin);
  url.searchParams.set("kind", kind);
  if (kind === "url") {
    url.searchParams.set("url", value);
  } else {
    url.searchParams.set("q", value);
  }
  return url.toString();
}

function formatWebSearchError(error) {
  if (!error) {
    return langText("未知错误", "Unknown error");
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/AbortError|aborted/i.test(message)) {
    return langText("请求被中止", "Request aborted");
  }
  if (/ERR_CONNECTION_TIMED_OUT|timeout/i.test(message)) {
    return langText("连接超时", "Connection timed out");
  }
  if (/Failed to fetch/i.test(message)) {
    return langText("浏览器未能完成跨站请求", "Browser failed to complete the cross-site request");
  }
  return message;
}

function formatWebSearchDiagnostics(diagnostics) {
  return (Array.isArray(diagnostics) ? diagnostics : [])
    .filter(Boolean)
    .map((item) => {
      const source = item.source || langText("来源", "Source");
      if (item.ok) {
        return langText(`${source} ${item.count || 0} 条`, `${source} ${item.count || 0} result(s)`);
      }
      return langText(`${source} 失败：${item.detail || "未知错误"}`, `${source} failed: ${item.detail || "Unknown error"}`);
    })
    .join("；");
}

async function collectPublicWebResearch(query, sourceUrls = []) {
  const diagnostics = [];
  const results = [];
  const [duckResult, wikiResult] = await Promise.allSettled([
    fetchDuckDuckGoSearchDigest(query),
    fetchWikipediaSearchDigest(query),
  ]);

  if (duckResult.status === "fulfilled") {
    const items = Array.isArray(duckResult.value) ? duckResult.value.filter(Boolean) : [];
    diagnostics.push({ source: "DuckDuckGo", ok: true, count: items.length, detail: "" });
    results.push(...items);
  } else {
    diagnostics.push({
      source: "DuckDuckGo",
      ok: false,
      count: 0,
      detail: formatWebSearchError(duckResult.reason),
    });
  }

  if (wikiResult.status === "fulfilled") {
    const items = Array.isArray(wikiResult.value) ? wikiResult.value.filter(Boolean) : [];
    diagnostics.push({ source: "Wikipedia", ok: true, count: items.length, detail: "" });
    results.push(...items);
  } else {
    diagnostics.push({
      source: "Wikipedia",
      ok: false,
      count: 0,
      detail: formatWebSearchError(wikiResult.reason),
    });
  }

  for (const [index, url] of sourceUrls.slice(0, 2).entries()) {
    try {
      const digest = await fetchUrlDigest(url);
      diagnostics.push({
        source: langText(`补充网址 ${index + 1}`, `Extra URL ${index + 1}`),
        ok: Boolean(digest),
        count: digest ? 1 : 0,
        detail: digest ? "" : langText("未提取到内容", "No content extracted"),
      });
      if (digest) {
        results.push(digest);
      }
    } catch (error) {
      console.warn("fetchUrlDigest failed", error);
      diagnostics.push({
        source: langText(`补充网址 ${index + 1}`, `Extra URL ${index + 1}`),
        ok: false,
        count: 0,
        detail: formatWebSearchError(error),
      });
    }
  }

  return { results, diagnostics };
}

// 席位级即时搜索：在发言前根据角色立场生成一个精准查询词，搜索 DuckDuckGo + Wikipedia，返回摘要字符串
async function runSpeakerWebSearch(speakerRole, summary, signal, options = {}) {
  try {
    const profile = getRoleModelProfile(speakerRole);
    if (!profile) return "";
    const speakerName = getActiveRoleName(speakerRole);
    const queryHints = normalizeClarificationQuestions(options?.queryHints || []).slice(0, 6);
    const retrievalStrategy = String(options?.retrievalStrategy || "web_first").trim();
    const queryPrompt = [
      `你是"${speakerName}"（${getActiveRoleSeat(speakerRole)}），你的立场是：${speakerRole.traits?.stance || getActiveRoleDescription(speakerRole) || ""}。`,
      `本次讨论话题：${summary}`,
      retrievalStrategy === "local_first_web_supplement"
        ? "你已经先看过一批本地知识命中，现在只需要补查公开网页材料来交叉验证、补足最新事实或补足缺失证据。"
        : "你准备搜索一条能支撑你这一轮发言的网页。",
      queryHints.length ? `优先围绕这些线索生成搜索词：${queryHints.join("；")}` : "",
      "你准备搜索一条能支撑你这一轮发言的网页。请用英文输出一个最有用的搜索关键词（3到8个英文单词）。",
      "只输出英文关键词本身，不要中文，不要任何解释。",
    ].join("\n");
    const rawQuery = await requestModelText(profile, queryPrompt, 40, signal, 10000).catch(() => "");
    const searchQuery = rawQuery.trim().split("\n")[0].trim().slice(0, 60) || summary.slice(0, 40);
    if (!searchQuery) return "";

    const research = await collectPublicWebResearch(searchQuery);
    const results = research.results.slice(0, 4);
    console.log("[speaker-web-search]", {
      speakerId: speakerRole?.id || "",
      speakerName: speakerRole?.name || "",
      query: searchQuery,
      resultCount: results.length,
      diagnostics: research.diagnostics,
    });
    if (!results.length) {
      // 搜索无结果时，也写一条诊断占位，方便用户在圆桌台证据区直接看到原因
      const failedAt = Date.now();
      const diagnosticSummary = formatWebSearchDiagnostics(research.diagnostics);
      const failEntry = {
        id: `speaker-web-fail:${speakerRole.id}:${failedAt}`,
        label: langText(`${speakerName} · 搜索未返回结果`, `${speakerName} · No search result`),
        kind: langText("网页", "Web"),
        filterType: "web",
        summary: diagnosticSummary || langText("搜索未返回任何结果。", "No results returned by the search."),
        createdAt: failedAt,
        detail: diagnosticSummary || langText("搜索未返回任何结果。", "No results returned by the search."),
        imageUrl: "",
        analysis: "",
        sourceUrl: "",
        previewUrl: "",
        meta: [speakerName],
        formatLabel: "",
        sourceLabel: langText(`${speakerName} 引用`, `Cited by ${speakerName}`),
      };
      state.sharedEvidenceEntries = [
        ...(Array.isArray(state.sharedEvidenceEntries) ? state.sharedEvidenceEntries : []).filter(Boolean),
        failEntry,
      ].slice(-30);
      void syncCurrentTopicSnapshot();
      renderRoundtableEvidenceWorkspace();
      return "";
    }

    // 把搜索结果写入证据链，让用户在圆桌台里看到原始出处
    const createdAtBase = Date.now();
    const translateSnippet = async (text) => {
      if (!state.autoTranslateEvidence) return text;
      const profile = getPrimarySummaryProfile();
      if (!profile) return text;
      try {
        const translationPrompt = state.appLanguage === "en"
          ? `Translate the following web snippet into concise English. Return only the translated text without any explanation:\n${text}`
          : `把下面这段英文翻译成简洁中文，直接输出翻译结果，不要加任何说明：\n${text}`;
        const translated = await requestModelText(
          profile,
          translationPrompt,
          120, null, 8000
        );
        return translated.trim() || text;
      } catch { return text; }
    };
    const newEntries = await Promise.all(results.filter((item) => item.url).map(async (item, index) => {
      const rawSnippet = item.snippet || item.title || item.url || "";
      const displaySnippet = await translateSnippet(rawSnippet);
      return {
        id: `speaker-web:${speakerRole.id}:${createdAtBase}:${index}`,
        label: buildEvidenceLabelFromText(item.title || item.url, langText(`${speakerName} · 搜索 ${index + 1}`, `${speakerName} · Search ${index + 1}`)),
        kind: langText("网页", "Web"),
        filterType: "web",
        summary: summarizeText(displaySnippet, 82),
        createdAt: createdAtBase + index,
        detail: displaySnippet,
        imageUrl: "",
        analysis: "",
        sourceUrl: item.url || "",
        previewUrl: "",
        meta: [speakerName],
        formatLabel: "",
        sourceLabel: langText(`${speakerName} 引用`, `Cited by ${speakerName}`),
      };
    }));
    if (newEntries.length) {
      state.sharedEvidenceEntries = [
        ...(Array.isArray(state.sharedEvidenceEntries) ? state.sharedEvidenceEntries : []).filter(Boolean),
        ...newEntries,
      ].slice(-30); // 最多保留 30 条，超出时淘汰最旧的
      console.log("[speaker-web-search:evidence-updated]", {
        speakerId: speakerRole?.id || "",
        speakerName: speakerRole?.name || "",
        addedCount: newEntries.length,
        totalCount: state.sharedEvidenceEntries.length,
      });
      void syncCurrentTopicSnapshot();
      renderRoundtableEvidenceWorkspace(); // 立即刷新证据链界面
    }

    return `【${speakerName} 搜索到的参考资料（关键词："${searchQuery}"）】\n` +
      results.map((item, i) => `${i + 1}. ${item.title}\n${item.snippet}`).join("\n\n");
  } catch {
    return "";
  }
}

async function runWebSearchAgent() {
  const query = String(state.sharedAgentQuery || state.lastSummary || "").trim();
  if (!query) {
    throw new Error("还没有可用的研究问题。先确认任务，或在研究问题里手动填写。 ");
  }
  const sourceUrls = parseSourceUrls(state.sharedAgentSources);
  const research = await collectPublicWebResearch(query, sourceUrls);
  const results = research.results;
  console.log("[shared-web-search]", {
    query,
    resultCount: results.length,
    diagnostics: research.diagnostics,
  });
  if (!results.length) {
    const diagnosticSummary = formatWebSearchDiagnostics(research.diagnostics);
    throw new Error(diagnosticSummary ? `网页搜索未拿到可用结果。${diagnosticSummary}` : "网页搜索未拿到可用结果。");
  }
  const createdAtBase = Date.now();
  state.sharedEvidenceEntries = [
    ...(Array.isArray(state.sharedEvidenceEntries) ? state.sharedEvidenceEntries : []).filter(Boolean),
    ...results.slice(0, 6).map((item, index) => ({
      id: `web:${createdAtBase}:${index}`,
      label: buildEvidenceLabelFromText(item.title || item.url || item.snippet, langText(`网页证据 ${index + 1}`, `Web Evidence ${index + 1}`)),
      kind: langText("网页", "Web"),
      filterType: "web",
      summary: summarizeText(item.snippet || item.title || item.url, 82),
      createdAt: createdAtBase + index,
      detail: item.snippet || item.title || item.url || "",
      imageUrl: "",
      analysis: "",
      sourceUrl: item.url || "",
      previewUrl: "",
      meta: [],
      formatLabel: "",
      sourceLabel: langText("网页搜索", "Web Search"),
    })),
  ].slice(-12);
  return {
    digest: formatResearchSourceDigest(query, results.slice(0, 6), sourceUrls),
    diagnostics: research.diagnostics,
    resultCount: results.length,
  };
}

async function executeSharedResearchAgent(options = {}) {
  const { includeWebSearch = false } = options;
  const moderatorProfile = getPrimarySummaryProfile();
  if (!moderatorProfile) {
    throw new Error("还没有可用的主持模型，无法执行共享 research agent。先配置主持 AI。 ");
  }
  const query = String(state.sharedAgentQuery || state.lastSummary || "").trim();
  const orderedSpeakers = getOrderedSelectedRoleIds().map((roleId) => getRoleById(roleId)).filter(Boolean);
  let webSearchResult = { digest: "", diagnostics: [], resultCount: 0 };
  let sourceDigest = "";
  if (includeWebSearch) {
    webSearchResult = await runWebSearchAgent();
    sourceDigest = webSearchResult.digest;
  } else {
    try {
      webSearchResult = await runWebSearchAgent();
      sourceDigest = webSearchResult.digest;
    } catch (error) {
      console.warn("shared research fallback without web evidence", error);
    }
  }
  const brief = await buildSharedResearchBriefFromSources(query || state.lastSummary, moderatorProfile, orderedSpeakers, sourceDigest);
  state.sharedResearchBrief = brief;
  appendProjectAgentNote(includeWebSearch ? "网页搜索 Agent" : "共享 research agent", brief);
  appendMarkup(
    createMessageMarkup({
      speakerId: includeWebSearch ? "web-search-agent" : "shared-research-agent",
      label: includeWebSearch ? "网" : "研",
      sublabel: includeWebSearch ? langText("网页搜索与共享事实", "Web Search + Shared Brief") : langText("共享事实包", "Shared Brief"),
      body: brief,
      avatarLabel: includeWebSearch ? "网" : "研",
      avatarClass: "avatar-system",
      tone: "system",
    })
  );
  syncUserMemoryFromState(includeWebSearch ? "research" : "passive");
  await persistUserMemory();
  await syncCurrentTopicSnapshot();
  return {
    brief,
    webSearch: webSearchResult,
  };
}

async function executeMultimodalEvidenceAgent() {
  const multimodalProfile = getMultimodalProfile();
  if (!multimodalProfile) {
    throw new Error("还没有可用的多模态模型，无法执行图片解析。先配置主持 AI，或单独指定多模态模型。 ");
  }
  const imageArtifacts = state.projectArtifacts.filter((artifact) => artifact.kind === "image" && artifact.dataUrl).slice(-3);
  if (!imageArtifacts.length) {
    throw new Error("当前项目里还没有可解析的图片附件。请先上传图片。 ");
  }
  const prompt = [
    "你现在是这张圆桌的共享多模态证据 agent。",
    "你的任务不是替任何一个角色站队，而是先把图片里能直接看到的内容整理成所有席位共用的证据摘要。",
    "必须优先写图片中实际可见的细节，例如人物/物体轮廓、皮肤或材质纹理、光影、关节、表情、边缘、反光、褶皱、背景痕迹。",
    "如果你没有看到足够清晰的细节，就明确写看不清的点，不要输出泛化背景常识来凑字数。",
    "请按这个顺序输出：1. 直接可见细节 2. 基于这些细节可支持的判断 3. 当前图片还不能证明什么。",
    "不要编造 OCR 结果，不要把看不清的地方说成已经确认。",
    `任务定义：${state.lastSummary || "当前项目"}`,
    `当前执行模型：${multimodalProfile.displayName}`,
    state.sharedResearchBrief ? `当前共享事实包：${state.sharedResearchBrief}` : "",
  ].filter(Boolean).join("\n\n");
  const result = await requestMultimodalModelText(multimodalProfile, prompt, imageArtifacts, 900);
  const latestArtifact = imageArtifacts[imageArtifacts.length - 1];
  if (latestArtifact) {
    state.projectArtifacts = normalizeProjectArtifacts(
      state.projectArtifacts.map((artifact) => artifact.id === latestArtifact.id ? { ...artifact, analysisText: result } : artifact)
    );
    await saveProjectArtifacts(state.activeTopicId, state.projectArtifacts);
  }
  state.sharedResearchBrief = [state.sharedResearchBrief, `图片证据补充：${result}`].filter(Boolean).join("\n\n");
  appendProjectAgentNote("多模态证据 Agent", result);
  syncUserMemoryFromState("multimodal");
  await persistUserMemory();
  await syncCurrentTopicSnapshot();
}

async function analyzeSingleImageArtifact(artifactId) {
  const multimodalProfile = getMultimodalProfile();
  if (!multimodalProfile) {
    throw new Error("当前没有可用的多模态模型，所以这张图片还不能自动解析。先配置一个支持视觉的多模态模型。");
  }
  const artifact = state.projectArtifacts.find((item) => item.id === artifactId && item.kind === "image" && item.dataUrl);
  if (!artifact) {
    throw new Error("没有找到可解析的图片条目。请重新上传图片后再试。");
  }
  const prompt = [
    "你现在是这张圆桌的共享多模态证据 agent。",
    "只分析当前这一张图片，不要泛泛而谈，也不要把别的图片内容混进来。",
    "必须优先写图片中实际可见的细节，例如人物/物体轮廓、材质纹理、光影、表情、边缘、反光、背景痕迹。",
    "如果细节不清楚，就明确说明看不清的点，不要用背景常识凑结论。",
    "请按这个顺序输出：1. 直接可见细节 2. 基于这些细节可支持的判断 3. 当前图片还不能证明什么。",
    `任务定义：${state.lastSummary || "当前项目"}`,
    `当前执行模型：${multimodalProfile.displayName}`,
  ].filter(Boolean).join("\n\n");
  const result = await requestMultimodalModelText(multimodalProfile, prompt, [artifact], 900, undefined, 120000);
  state.projectArtifacts = normalizeProjectArtifacts(
    state.projectArtifacts.map((item) => item.id === artifact.id ? { ...item, analysisText: result } : item)
  );
  await saveProjectArtifacts(state.activeTopicId, state.projectArtifacts);
  // 把分析结果同步写入共享事实包，让主持/席位 agent 在下一轮能读到
  state.sharedResearchBrief = [state.sharedResearchBrief, `图片证据补充（${artifact.name || "图片"}）：${result}`].filter(Boolean).join("\n\n");
  await syncCurrentTopicSnapshot();
  return result;
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
      "这是圣经/神学/查经议题。优先考虑让 1-2 位真实历史名人（roleType=exemplar）入桌，例如：斯普真（布道家）、约翰加尔文（改革家）、马丁路德（宗教改革）、奥古斯丁（教父）、约翰卫斯理（复兴运动）、马太亨利（释经家）、C.S.路易斯（护教学）、巴刻（系统神学）、司布真（讲道）等——根据话题最贴题的人选 1-2 位即可，不要强塞不相关的人。",
      "其余位用专家原型（roleType=expert）补足：经文原义、教义整合、牧养应用、历史背景这四个取向缺谁补谁。",
      "名人可以拥有现代视角和当代知识，不必受限于其历史时代。",
    ].join(" ");
  }

  if (/(智能镜|镜子|卫生间|卫浴|浴室|家居|家庭空间|空间体验|工业设计|产品设计|交互设计|体验设计|审美|美学|cmf|材料|家装|家电)/i.test(normalized)) {
    return [
      "这是工业设计/家居/体验议题。考虑引入 1-2 位真实设计名人（roleType=exemplar），如：乔纳森·艾夫（苹果工业设计）、深泽直人（无印设计哲学）、原研哉（平面与产品美学）、宜家创始人坎普拉德（大众家居）、詹姆斯·戴森（工程美学）等，选最贴题的 1-2 位。",
      "其余位用专家原型补足：CMF、空间动线、交互、制造约束、家庭场景研究等缺位。",
      "名人可以拥有现代视角和当代知识，不必受限于其历史时代。",
    ].join(" ");
  }

  if (/(产品|用户|增长|运营|商业|公司|组织|管理|战略|市场|品牌|创业|ai产品|软件产品)/i.test(normalized)) {
    return [
      "这是产品/商业/组织议题。考虑引入 1-2 位真实名人（roleType=exemplar），如：彼得·德鲁克（管理学）、史蒂夫·乔布斯（产品与设计）、杰夫·贝佐斯（用户飞轮）、埃隆·马斯克（第一性原理）、克莱顿·克里斯坦森（创新理论）等，选最贴题的 1-2 位。",
      "其余位用专家原型补足：法务、财务、运营、交付、风控等现实约束位。",
      "名人可以拥有现代视角和当代知识，不必受限于其历史时代。",
    ].join(" ");
  }

  if (/(案件|刑侦|审讯|证据|法医|命案|调查|犯罪|失踪|监控|法庭|合规|判决)/i.test(normalized)) {
    return [
      "这是案件/刑侦/法律议题。考虑引入 1-2 位真实名人（roleType=exemplar），如：狄仁杰（逻辑推理与案情重构）、李昌钰（现代法医科学）、弗朗西斯·格雷索（犯罪心理画像）、阿尔方斯·贝蒂隆（指纹与物证鉴定先驱）等，选最贴题的 1-2 位。",
      "其余位用专家原型补足：现场勘验、媒体传播、心理画像、安全管理等配角位。",
      "名人可以拥有现代视角和当代知识，不必受限于其历史时代。",
    ].join(" ");
  }

  if (/(外星|外星人|地外文明|宇宙生命|宇宙|天文|星际|星系|天体|物理宇宙|暗物质|暗能量|黑洞|引力波|量子|粒子物理|相对论|宇宙学)/i.test(normalized)) {
    return [
      "这是天文/宇宙科学/物理议题。考虑引入 1-2 位真实科学名人（roleType=exemplar），如：卡尔·萨根（宇宙学与外星生命探索）、斯蒂芬·霍金（宇宙学与理论物理）、尼尔·泰森（天体物理科普）、弗兰克·德雷克（地外文明搜索方程）、恩里科·费米（费米悖论）、克里斯托弗·麦基（行星科学）等，选最贴题的 1-2 位。",
      "其余位用专家原型补足：天体物理学家、射电天文学家、行星科学家、天体生物学家、SETI研究员、科学哲学家等缺位。",
      "名人可以拥有现代视角和当代知识，不必受限于其历史时代。",
      "注意：不要因为话题涉及'探寻''证据''推理'就引入侦探、法医、破案类人物，这类能力与该领域没有直接关联。",
    ].join(" ");
  }

  // 生物/进化/自然科学/地球科学/生态/古生物等领域
  if (/(进化|生物|生态|物种|基因|基因组|遗传|自然选择|达尔文|古生物|化石|地层|生命|演化|生物多样性|生物圈|微生物|病毒|细菌|真菌|植物|动物|海洋生物|神经科学|脑科学|认知科学|心理学)/i.test(normalized)) {
    return [
      "这是生物/进化/自然科学领域议题。考虑引入 2-3 位真实科学名人（roleType=exemplar），如：查尔斯·达尔文（进化论奠基）、斯蒂芬·古尔德（间断平衡论）、理查德·道金斯（自私基因/基因中心论）、恩斯特·迈尔（进化生物学系统分类）、罗莎琳德·富兰克林（DNA结构）、爱德华·威尔逊（社会生物学/生物多样性）、路易斯·利基（古人类学）、约翰·梅纳德·史密斯（进化博弈论）等——根据话题最贴题的选 2-3 位。",
      "其余位用专家原型（roleType=expert）补足：现代分子生物学家、生态系统研究者、地质年代学家、基因组学家等当代缺位。",
      "名人可以拥有现代视角和当代知识，不必受限于其历史时代。",
    ].join(" ");
  }

  // 历史/哲学/社会科学/政治等领域
  if (/(历史|哲学|政治|经济|社会|文明|文化|思想|国际关系|地缘|民主|专制|权力|战争|外交|法律|制度|革命|殖民)/i.test(normalized)) {
    return [
      "这是历史/哲学/社会科学领域议题。考虑引入 2-3 位在该核心问题上有直接建树的思想家或历史人物（roleType=exemplar），并从思想史、现代学术、现实政策三个层次各补 1-2 位专家原型。",
      "名人必须在该话题的核心领域有直接建树，不允许跨领域借用（例如：讨论地缘政治不能用文学作家）。名人可以拥有现代视角和当代知识，不必受限于其历史时代。",
    ].join(" ");
  }

  return [
    "先判断这个话题属于哪个核心领域，再主动推荐 1-3 位在该领域有直接建树的历史或当代名人（roleType=exemplar）——整桌应有接近一半是真实名人，不要默认全用专家原型。只有在该领域确实找不到贴题名人时，才全用专家原型。名人必须在该核心领域有直接建树，不能因为方法论相似就跨领域借用。",
    "名人可以拥有现代视角和当代知识，不必受限于其历史时代。",
    "其余位用原型专家补足：让整桌覆盖思想者、实务者、组织者和一线执行者，不要出现 3 个本质相同的抽象专家。",
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
  const { includeAllRecommended = false, onStart = null, onFinish = null, generationSession = state.recommendedRoleGenerationSession } = options;
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
    if (generationSession !== state.recommendedRoleGenerationSession) {
      return;
    }
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
    if (generationSession !== state.recommendedRoleGenerationSession) {
      return;
    }
    console.error(error);
    onFinish?.(false, targetRoles.length);
  }
}

function normalizeGeneratedRole(generatedRole, index, createdAt) {
  const roleType = normalizeGeneratedRoleType(generatedRole.roleType || generatedRole.roleKind || generatedRole.personaType);
  const seat = String(generatedRole.seat || generatedRole.role || "专题分析者").trim();
  const seatEn = String(generatedRole.seatEn || generatedRole.roleEn || "").trim();
  const name = getRecommendedRolePublicName({
    name: sanitizeGeneratedRoleName(generatedRole.name || generatedRole.title || `临时角色${index + 1}`),
    seat,
    roleType,
  });
  const nameEn = String(generatedRole.nameEn || generatedRole.titleEn || "").trim()
    || buildEnglishRoleNameFallback(generatedRole.name || generatedRole.title || "")
    || seatEn
    || buildEnglishRoleNameFallback(seat);
  const description = String(generatedRole.background || generatedRole.bio || generatedRole.identity || generatedRole.description || generatedRole.focus || generatedRole.why || `${name} 长期从 ${seat} 这个观察重心出发参与讨论，习惯依靠自己的专业训练与长期经验做判断。`).trim();
  const descriptionEn = String(generatedRole.descriptionEn || generatedRole.backgroundEn || generatedRole.bioEn || generatedRole.identityEn || generatedRole.focusEn || generatedRole.whyEn || "").trim();
  const method = String(generatedRole.method || generatedRole.style || generatedRole.approach || "针对性分析").trim();
  const methodEn = String(generatedRole.methodEn || generatedRole.styleEn || generatedRole.approachEn || "").trim() || translateTraitValue(method) || "";
  const stance = String(generatedRole.stance || generatedRole.position || "补充关键视角").trim();
  const stanceEn = String(generatedRole.stanceEn || generatedRole.positionEn || "").trim() || translateTraitValue(stance) || "";
  const temper = String(generatedRole.temper || generatedRole.tone || "冷静").trim();
  const temperEn = String(generatedRole.temperEn || generatedRole.toneEn || "").trim() || translateTraitValue(temper) || "";
  const prompt = String(generatedRole.systemPrompt || generatedRole.prompt || "").trim();
  const promptEn = String(generatedRole.systemPromptEn || generatedRole.promptEn || "").trim();
  const color = ROLE_COLORS.includes(generatedRole.color) ? generatedRole.color : ROLE_COLORS[index % ROLE_COLORS.length];
  const avatar = deriveRoleAvatar(name, generatedRole.avatar);

  return normalizeRecommendedRolePersona({
    id: `recommended-${createdAt}-${index}`,
    name,
    nameEn,
    seat,
    seatEn,
    description,
    descriptionEn,
    traits: {
      stance,
      method,
      temper,
    },
    traitsEn: {
      stance: stanceEn,
      method: methodEn,
      temper: temperEn,
    },
    color,
    avatar,
    gender: normalizeRoleGender(generatedRole.gender || generatedRole.sex || generatedRole.genderLabel || generatedRole.genderText),
    age: normalizeRoleAge(generatedRole.age || generatedRole.ageText || generatedRole.ageLabel || generatedRole.ageRange),
    source: "recommended",
    sourceLabel: "临时生成",
    sourceLabelEn: String(generatedRole.sourceLabelEn || "").trim() || "Generated",
    roleType,
    systemPrompt: prompt,
    systemPromptEn: promptEn,
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
    "请直接根据任务本身去想：这件事真正需要哪些人来一起讨论，才能既有启发，又能兼顾现实落地。",
    `输出刚好 ${targetCount} 个角色。专业不要重复，人物之间要互补。`,
    "优先让 AI 自己想清楚需要哪些视角，不要按固定行业模板硬凑。",
    "name 必须写成人能一眼看懂的人话名称。只有 roleType=exemplar 时才允许直接用名人、历史人物、影视人物或高辨识度角色的人名。",
    "只要 roleType=expert，就不要用真实姓名或普通人名，统一改用职业或职责称呼，例如公安痕迹鉴定专家、犯罪现场调查专家、电池安全研究员、结构工艺工程师。",
    "不要输出王工、张教授、李总、陈雪梅、周文渊这种名字式称呼，也不要输出“风险边界者”“资源配置者”“长期主义判断者”这类抽象标签。",
    "如果现实里有非常贴题的知名人物、行业代表人物、历史人物、小说人物或影视角色，可以少量混入，但不是必须。",
    `真实人物或高辨识度代表人物最多只能占一半，按 ${targetCount} 人计算最多 ${Math.max(1, Math.floor(targetCount * MAX_EXEMPLAR_ROLE_RATIO))} 个。名人必须在该话题的核心领域有直接建树，不允许因为方法论相似就跨领域借用（例如：探讨宇宙/外星生命不能用侦探人物，探讨设计不能用历史政治家）。`,
    "不要把人物写成空泛职业堆砌，也不要用一个名字换几种说法来重复同类专家。",
    "对于贴近产品、设计、制造、市场这类任务，要优先想到真实会影响结果的人，而不是先想到抽象学者。",
    "如果任务涉及材料、电池、化学、制造、工艺、结构等领域，可以自然混入少量现实中有名的人物或代表性专家，但整桌仍要以能真正讨论问题的人为主。",
    "例如如果任务是做欧美市场智能镜，像欧美工业设计专家、结构工艺工程师、成本与供应链专家、UI/UX 设计师、家居软装顾问、灯光设计师、跨境选品专家、量产工艺专家，这种就是合格的人话命名方式。",
    getPeoplePoolRoleNamesText() ? `当前人物池里已经有这些人物，禁止再生成同名人物：${getPeoplePoolRoleNamesText()}。` : "",
    "seat 字段也写人话，简单概括这个人上桌主要负责看什么，不要再造抽象黑话。",
    "严格输出 JSON 数组，不要解释，不要 Markdown。",
    "每个元素必须包含字段：name, nameEn, seat, seatEn, description, descriptionEn, stance, method, temper, systemPrompt, systemPromptEn, roleType, gender, age。可选字段：color, avatar。这里的 seat 表示人物长期观察重心，不是外部的本轮扮演角色。",
    "其中 name/seat/description/systemPrompt 用中文，nameEn/seatEn/descriptionEn/systemPromptEn 用英文。不要把英文塞回中文字段，也不要省略英文字段。",
    "roleType 只能填 exemplar 或 expert。exemplar 表示真实人物、历史人物或高辨识度代表角色；expert 表示现实专家或原型角色。",
    "gender 只填 male 或 female。age 直接写这个人物最贴切的年龄，比如 11岁、28岁、45岁、68岁。",
    "如果是历史人物，优先写他最广为人知阶段的大致年龄；如果是虚构人物，优先写大众最熟悉设定里的年龄；如果是原型专家，请你直接编一个合理年龄。",
    "description 要写这个人的身份背景和长期关注点，不要写成任务拆解句。",
    "systemPrompt 要能直接拿去扮演这个人，第一句先说清身份，再说他最关注什么、如何发言、不要越位做什么。",
    `本次话题：${summary}`,
    planningBrief ? `本地知识库参考（角色生成时请参考）：\n${planningBrief}` : "",
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

async function requestSingleRecommendedRole(summary, planningBrief, existingRoles, slotIndex, targetCount, additionalBlockedNames = new Set()) {
  const profile = getPrimarySummaryProfile();
  if (!profile) {
    throw new Error("还没有可用模型，无法生成系统临时角色。");
  }

  const existingNames = new Set([
    ...getPeoplePoolRoleNamesText(200).split("、").map((item) => sanitizeGeneratedRoleName(item)).filter(Boolean),
    ...existingRoles.map((role) => sanitizeGeneratedRoleName(role?.name || "")).filter(Boolean),
    ...[...additionalBlockedNames],
  ]);

  let lastError = new Error("单个人物生成失败：未知错误。");
  let lastDuplicateName = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retryNote = attempt === 1
      ? ""
      : lastDuplicateName
        ? `上一次生成的"${lastDuplicateName}"与人物库已有人物同名，这次必须换一个完全不同的人物，不得再生成"${lastDuplicateName}"。`
        : "上一次返回的人物重复、过空或不可解析。这一次请只返回一个新的、可直接上桌的人物 JSON 对象。";
    const existingExemplarCount = existingRoles.filter((r) => r.roleType === "exemplar").length;
    const maxExemplars = Math.floor(targetCount / 2);
    const exemplarQuotaFull = existingExemplarCount >= maxExemplars;
    const exemplarHint = exemplarQuotaFull
      ? `整桌名人（roleType=exemplar）已达到上限 ${maxExemplars} 位，本位请只生成专家原型（roleType=expert）。`
      : `整桌名人（roleType=exemplar）上限为 ${maxExemplars} 位（不超过总人数一半），当前已有 ${existingExemplarCount} 位。本位优先判断：该话题领域有没有非常贴题的历史或当代名人？有的话就用名人（roleType=exemplar）；如果该领域真的没有高辨识度代表人物，再考虑用专家原型（roleType=expert）。名人可以拥有现代视角和当代知识，不必受限于其历史时代。`;
    const guidanceText = getRecommendedRoleGenerationGuidance(summary);
    const guidanceBlockedNames = [...existingNames].filter((n) => n.length > 1 && guidanceText.includes(n));
    const guidanceWithOverride = guidanceBlockedNames.length > 0
      ? `${guidanceText}\n【以上指引中的以下名人已在人物库，绝对不能再生成：${guidanceBlockedNames.join("、")}，请改选其他候选名人或换用专家原型。】`
      : guidanceText;
    const prompt = [
      "你现在不是一次生成整桌，而是只为这次圆桌补出下一个最缺的人物。",
      `当前总目标人数：${targetCount}。当前正在生成第 ${slotIndex + 1} 个。`,
      guidanceWithOverride,
      exemplarHint,
      existingRoles.length
        ? `桌上已经有这些人物，不要重复，也不要再换一种说法生成同类：\n${existingRoles.map((role, index) => `${index + 1}. ${role.name}｜${role.seat}｜${role.description}`).join("\n")}`
        : "这是当前圆桌的第一个人物，请先给出最必要的起手人物。",
      getPeoplePoolRoleNamesText() ? `人物库里已有这些名字，禁止重复同名：${getPeoplePoolRoleNamesText()}` : "",
      "只需要返回 1 个 JSON 对象，不要解释，不要 Markdown。",
      "必须字段：name, nameEn, seat, seatEn, description, descriptionEn, stance, stanceEn, method, methodEn, temper, temperEn, roleType, gender, age。可选字段：systemPrompt, systemPromptEn, color, avatar。这里的 seat 表示人物长期观察重心，不是外部的本轮扮演角色。",
      "name 和 seat 必须是人话，不能是抽象黑话。roleType=expert 时 name 只能写职业或职责称呼，例如材料科学家、材料工程师、电池安全研究员，不要写王工、张教授、李总，也不要写普通人名。",
      "name/seat/description/systemPrompt 用中文；nameEn/seatEn/descriptionEn/systemPromptEn 必须用自然英文。stance/method/temper 尽量短而稳定，对应的 En 字段写英文。",
      "只有 roleType=exemplar 时才允许直接用知名人物的人名。",
      "gender 只填 male 或 female。age 直接写具体年龄，例如 16岁、29岁、44岁、63岁。",
      "如果是历史人物，优先写他最广为人知阶段的大致年龄；如果是虚构人物，写大众最熟悉设定里的年龄；如果是原型专家，请直接编一个合理年龄。",
      "优先保证人物身份准确和互补。如果 systemPrompt 一时写不完整，可以留空，不要为了补 prompt 牺牲人物准确性。",
      `本次话题：${summary}`,
      planningBrief ? `本地知识库参考（角色生成时请参考）：\n${planningBrief}` : "",
      retryNote,
    ].filter(Boolean).join("\n\n");

    try {
      const raw = await requestModelText(profile, prompt, 1400, null, ROLE_IDENTITY_TIMEOUT_MS);
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
        lastDuplicateName = role.name;
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
  const rejectedPoolNames = new Set();

  callbacks.onStage?.("identity-start", { targetCount, generatedCount: 0, roles: [] });
  for (let slotIndex = 0; slotIndex < targetCount; slotIndex += 1) {
    callbacks.onStage?.("identity-progress", { slotIndex, targetCount, generatedCount: roles.length, roles: [...roles] });
    try {
      const nextRole = await requestSingleRecommendedRole(summary, planningBrief, roles, slotIndex, targetCount, rejectedPoolNames);
      roles.push(nextRole);
      callbacks.onRoleGenerated?.([...roles], { slotIndex, targetCount, role: nextRole });
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      const dupMatch = failure.message.match(/生成人物与已有人物重名：(.+)/);
      if (dupMatch) {
        const rejectedName = sanitizeGeneratedRoleName(dupMatch[1].trim());
        if (rejectedName) {
          rejectedPoolNames.add(rejectedName);
        }
      }
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
    "只选对任务真的有帮助的人，不要凑抽象标签，不要塞无关人物。",
    `总数仍然不少于 ${targetCount} 个，行业佼佼者人物最多只能占一半。名人必须在该话题核心领域有直接建树，不允许跨领域借用。`,
    "name 和 seat 都必须是用户一眼能看懂的人话名称，不要写成抽象岗位标签。职业名尽量写成材料科学家、材料工程师、电池安全研究员这类更具体的称呼，不要只写王工、张教授、李总。",
    "如果现实里有非常贴题的知名人物或代表专家，也可以少量直接用人名，但不是必须。",
    getPeoplePoolRoleNamesText() ? `当前人物池里已经有这些人物，禁止再生成同名人物：${getPeoplePoolRoleNamesText()}。` : "",
    `输出 ${targetCount} 个角色。`,
    "严格输出 JSON 数组，不要解释。",
    "每个元素必须包含字段：name, seat, description, stance, method, temper, systemPrompt, roleType, gender, age。这里的 seat 表示人物长期观察重心，不是外部的本轮扮演角色。",
    "gender 只填 male 或 female。age 直接写具体年龄，例如 15岁、27岁、46岁、71岁。",
    "如果是历史人物，优先写他最广为人知阶段的大致年龄；如果是虚构人物，写大众最熟悉设定里的年龄；如果是原型专家，请直接编一个合理年龄。",
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
      multimodal: "",
    });
  }
}

async function hydrateState() {
  state.peopleRoles = (await dbGetAll(ROLE_STORE)).map(ensureRoleDefaults);
  state.modelProfiles = (await dbGetAll(PROFILE_STORE)).map(normalizeProfile);
  state.appLanguage = await loadAppState("appLanguage", navigator.language?.startsWith("zh") ? "zh" : "en");
  state.appTheme = await loadAppState("appTheme", "dark");
  state.knowledgeEnabled = await loadAppState("knowledgeEnabled", true);
  state.voiceReadEnabled = await loadAppState("voiceReadEnabled", false);
  state.knowledgeScope = await loadAppState("knowledgeScope", "global");
  state.projectUsesGlobalKnowledge = await loadAppState("projectUsesGlobalKnowledge", true);
  state.knowledgeCategories = normalizeKnowledgeCategories(await loadAppState(KNOWLEDGE_CATEGORY_CONFIG_KEY, buildDefaultKnowledgeCategories()));
  state.userMemory = normalizeUserMemory(await loadAppState(USER_MEMORY_KEY, buildEmptyUserMemory()));
  state.mappings = normalizeModelMappings(await loadAppState("modelMappings", {
    main: defaultProfiles[0].id,
    challenger: defaultProfiles[1].id,
    judge: defaultProfiles[0].id,
    multimodal: "",
  }));
  state.topics = await loadAppState("topicSessions", []);
  state.activeTopicId = await loadAppState("activeTopicId", "");
  state.globalKnowledgeEntries = await loadGlobalKnowledgeEntries();
  if (!state.topics.length) {
    state.topics = [];
    state.activeTopicId = "";
  }
  await hydrateProjectScopedState(state.activeTopicId);
}

async function saveRole(role) {
  if (role.source === "base") {
    await clearDeletedBaseRole(role.id);
  }
  await dbPut(ROLE_STORE, role);
  // 如果是推荐角色，也同步更新 state.recommendedRoles（它不存在于 ROLE_STORE 的 hydrateState 路径）
  if (role.source === "recommended" || state.recommendedRoles.some((r) => r.id === role.id)) {
    state.recommendedRoles = state.recommendedRoles.map((r) => (r.id === role.id ? { ...r, ...role } : r));
    await syncCurrentTopicSnapshot();
  }
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
  if (state.mappings.multimodal === profileIdValue) {
    state.mappings.multimodal = "";
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
    if (state.seatLayoutCustomized) {
      syncDiscussionOrder();
    } else {
      applyDefaultSeatLayout([...state.selectedIds], { force: true });
    }
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
  const role = getRoleById(roleId);
  if (state.seatLayoutCustomized) {
    syncDiscussionOrder();
    if (role) {
      state.seatAssignments[roleId] = suggestSeatAssignment(role);
      ensureSeatModelAssignment(role);
    }
    ensureCoreAssignments();
  } else {
    applyDefaultSeatLayout([...state.selectedIds], { force: true });
  }
  renderSeatPicker();
  renderSeatStack();
  updateSeatFeedback(`已加入席位：${getRoleById(roleId)?.name || "人物"}`, "success");
  void syncCurrentTopicSnapshot();
}

async function handleRoleEditorSave() {
  const name = roleEditorName.value.trim();
  const nameEn = roleEditorNameEn?.value.trim() || "";
  const description = roleEditorDescription.value.trim();
  const descriptionEn = roleEditorDescriptionEn?.value.trim() || "";
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
  const source = existing?.source || savedFavorite?.source || (recommendedSource ? "favorite" : "custom");
  const sourceLabel = roleEditorSourceLabel.value.trim() || baseRole?.sourceLabel || (recommendedSource ? "收藏人物" : "自定义");
  const sourceLabelEn = roleEditorSourceLabelEn?.value.trim()
    || existing?.sourceLabelEn
    || savedFavorite?.sourceLabelEn
    || recommendedSource?.sourceLabelEn
    || translateRoleSourceLabel(sourceLabel, source);

  const role = {
    ...(existing || savedFavorite || {}),
    id: existing?.id || savedFavorite?.id || `${recommendedSource ? "favorite" : "custom"}-${Date.now()}`,
    name,
    nameEn,
    seat,
    gender: normalizeRoleGender(roleEditorGender.value) || inferRoleGender(baseRole || { name, seat, description }),
    age: normalizeRoleAge(roleEditorAge.value) || inferRoleAge(baseRole || { name, seat, description }),
    description,
    descriptionEn,
    systemPrompt: roleEditorPrompt.value.trim() || buildFallbackGeneratedRoleSystemPrompt({
      name,
      seat,
      description,
      stance: roleEditorStance.value || "自定义",
      method: baseRole?.traits?.method || "综合求证",
      temper: roleEditorTemper.value || "自定义",
    }),
    systemPromptEn: roleEditorPromptEn?.value.trim() || existing?.systemPromptEn || savedFavorite?.systemPromptEn || recommendedSource?.systemPromptEn || "",
    traits: {
      ...(baseRole?.traits || {}),
      stance: roleEditorStance.value || "自定义",
      method: baseRole?.traits?.method || "综合求证",
      temper: roleEditorTemper.value || "自定义",
    },
    color: roleEditorColor.value,
    source,
    sourceLabel,
    sourceLabelEn,
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
    sourceLabelEn: draft?.sourceLabelEn || "AI Draft",
  }, 0, Date.now());

  roleEditorId.value = "";
  roleEditorName.value = preparedRole.name;
  if (roleEditorNameEn) {
    roleEditorNameEn.value = preparedRole.nameEn || "";
  }
  roleEditorSeat.value = preparedRole.seat || "讨论参与者";
  roleEditorGender.value = normalizeRoleGender(preparedRole.gender) || inferRoleGender(preparedRole);
  roleEditorAge.value = normalizeRoleAge(preparedRole.age) || inferRoleAge(preparedRole);
  roleEditorDescription.value = preparedRole.description;
  if (roleEditorDescriptionEn) {
    roleEditorDescriptionEn.value = preparedRole.descriptionEn || "";
  }
  roleEditorPrompt.value = preparedRole.systemPrompt || "";
  if (roleEditorPromptEn) {
    roleEditorPromptEn.value = preparedRole.systemPromptEn || "";
  }
  ensureSelectValue(roleEditorStance, preparedRole.traits?.stance || "自定义");
  ensureSelectValue(roleEditorTemper, preparedRole.traits?.temper || "自定义");
  roleEditorStance.value = preparedRole.traits?.stance || "自定义";
  roleEditorTemper.value = preparedRole.traits?.temper || "自定义";
  roleEditorColor.value = roleColor(preparedRole);
  syncRoleColorPicker(roleColor(preparedRole));
  roleEditorSourceLabel.value = draft?.sourceLabel || langText("AI 草稿", "AI Draft");
  if (roleEditorSourceLabelEn) {
    roleEditorSourceLabelEn.value = draft?.sourceLabelEn || preparedRole.sourceLabelEn || "AI Draft";
  }
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
    "字段必须包含：name, seat, description, stance, method, temper, systemPrompt, sourceLabel, gender, age。可选字段：color。这里的 seat 表示人物长期观察重心，不是外部的本轮扮演角色。",
    "规则：",
    "1. name 和 seat 都必须人话化；seat 只写人物长期观察重心，不要写主讲、旁证、裁判这类外部扮演角色。",
    "2. description 要写身份背景、长期经验和典型关注点。",
    "3. systemPrompt 第一段先交代身份，再写这个人物最先看什么、最不同意什么、会提醒别人忽略什么。",
    "4. gender 只填 male 或 female。age 直接写具体年龄，例如 16岁、29岁、45岁、67岁。",
    "5. 如果是历史人物，优先写他最广为人知阶段的大致年龄；如果是虚构人物，优先写大众最熟悉设定里的年龄；如果是原型专家，请直接编一个合理年龄。",
    "6. 默认具备现代知识，不要写成古早背景设定。",
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
    setProfileTestStatus(langText("基础字段还没填完整", "Required fields are still incomplete"), "error");
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
  setProfileTestStatus(
    profile.locked
      ? langText("已保存，这个接入现在会出现在下面的已接入模型列表", "Saved. This connection now appears in the connected model list below.")
      : langText("已保存到已接入模型列表，可继续用于角色映射", "Saved to the connected model list and ready for role mapping."),
    "success"
  );
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
    setProfileTestStatus(langText("先填 Base URL 和模型 ID", "Fill in Base URL and Model ID first"), "error");
    return;
  }

  setProfileTestStatus(langText("测试中...", "Testing..."), "");

  try {
    let response;
    const startedAt = performance.now();
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
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const visionProbe = response.ok ? await probeVisionCapability(profile) : { supported: false, status: "error", latencyMs: 0 };

    if (!response.ok) {
      if (existing) {
        await saveModelProfile({ ...existing, ...profile, lastTestStatus: "error", lastTestLatencyMs: latencyMs, supportsVision: false, visionTestStatus: "error", lastVisionTestLatencyMs: 0 });
      }
      setProfileTestStatus(langText(`测试失败 ${response.status}`, `Test failed ${response.status}`), "error");
      return;
    }

    if (existing) {
      await saveModelProfile({ ...existing, ...profile, lastTestStatus: "success", lastTestLatencyMs: latencyMs, supportsVision: visionProbe.supported, visionTestStatus: visionProbe.status, lastVisionTestLatencyMs: visionProbe.latencyMs });
    }
    setProfileTestStatus(langText(`测试通过 · ${formatProfileLatency({ lastTestLatencyMs: latencyMs })} · ${formatVisionCapabilityLabel(visionProbe)}`, `Test passed · ${formatProfileLatency({ lastTestLatencyMs: latencyMs })} · ${formatVisionCapabilityLabel(visionProbe)}`), "success");
  } catch (error) {
    console.error(error);
    if (existing) {
      await saveModelProfile({ ...existing, ...profile, lastTestStatus: "error", supportsVision: false, visionTestStatus: "error", lastVisionTestLatencyMs: 0 });
    }
    setProfileTestStatus(
      error?.name === "AbortError"
        ? langText("测试超时，模型接通了但长时间没有返回", "Test timed out. The model is reachable but did not return in time.")
        : langText("测试失败，可能被 CORS 或网络拦截", "Test failed. The request may be blocked by CORS or the network."),
      "error"
    );
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
    const startedAt = performance.now();
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
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    requestControl.cleanup();
    const visionProbe = response.ok ? await probeVisionCapability(profile) : { supported: false, status: "error", latencyMs: 0 };

    const nextStatus = response.ok ? "success" : "error";
    await saveModelProfile({ ...existing, lastTestStatus: nextStatus, lastTestLatencyMs: latencyMs, supportsVision: visionProbe.supported, visionTestStatus: visionProbe.status, lastVisionTestLatencyMs: visionProbe.latencyMs });
    updateSeatFeedback(response.ok ? `${profile.displayName} 测试通过，${formatProfileLatency({ lastTestLatencyMs: latencyMs })} / ${formatVisionCapabilityLabel(visionProbe)}` : formatHttpFailureMessage(profile, response, "测试失败"), response.ok ? "success" : "pending");
    if (profileId.value === profile.id) {
      setProfileTestStatus(response.ok ? langText(`测试通过 · ${formatProfileLatency({ lastTestLatencyMs: latencyMs })} · ${formatVisionCapabilityLabel(visionProbe)}`, `Test passed · ${formatProfileLatency({ lastTestLatencyMs: latencyMs })} · ${formatVisionCapabilityLabel(visionProbe)}`) : formatHttpFailureMessage(profile, response, "测试失败"), response.ok ? "success" : "error");
    }
  } catch (error) {
    await saveModelProfile({ ...existing, lastTestStatus: "error", lastTestLatencyMs: 0, supportsVision: false, visionTestStatus: "error", lastVisionTestLatencyMs: 0 });
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
      state.judgeLog = [];
    }
  }
  appendMarkup(
    createMessageMarkup({
      speakerId: "user",
      label: langText("我", "I"),
      sublabel: langText("刚发送", "Just Sent"),
      body: content,
      avatarLabel: langText("我", "I"),
      avatarClass: "avatar-user",
      tone: "user",
      attachments,
    })
  );
  setSpeakerCard(langText("补充需求中", "Updating Request"), langText("已收到新输入", "New input received"), langText("主 AI 正在重新整理任务定义。", "The primary AI is reorganizing the task definition."), "我");
  void syncCurrentTopicSnapshot();
}

function removeTaskSummaryActionPrompts() {
  if (!discussionStream) {
    return;
  }

  discussionStream.querySelectorAll(".js-confirm-topic, .js-supplement-topic").forEach((button) => {
    button.closest(".message-actions")?.remove();
  });
}

function resetPendingPersonaGeneration() {
  clearTimeout(state.generatingTimer);
  state.recommendedRoleGenerationSession += 1;
  state.topicConfirmed = false;
  state.generatingSeats = false;
  state.seatsReady = false;
  state.recommendedRoleGenerationMeta = null;
  state.recommendedRoles = [];
  state.selectedIds.clear();
  state.seatAssignments = {};
  state.seatLayoutCustomized = false;
  state.discussionOrder = {};
  state.seatModelAssignments = {};
  setStatusLoadingState(false);
  renderSeatPicker();
  renderSeatStack();
}

function appendAiSummary(content) {
  ensureActiveTopicSession();
  const summary = content.trim();
  const displaySummary = formatTaskSummaryForDisplay(summary);
  resetPendingPersonaGeneration();
  removeTaskSummaryActionPrompts();
  state.lastSummary = summary;
  state.sharedAgentQuery = summary;
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
  discussionStream.innerHTML = `<div class="no-task-hint">${langText("暂无任务。点击上方「+ 新建话题」开始。", 'No task yet. Click "+ New Topic" above to start.')}</div>`;
}

async function finishSeatGeneration(options = {}) {
  const { forceGeneration = false, generationSession = state.recommendedRoleGenerationSession } = options;
  if (generationSession !== state.recommendedRoleGenerationSession) {
    return;
  }
  const currentSummary = state.lastSummary || "当前话题";
  const hostProfile = getPrimarySummaryProfile();
  state.rolePlanningBrief = "";
  state.recommendedRoleGenerationMeta = null;

  state.pendingRoleClarification = [];
  state.taskSupplementMode = false;
  const generatingDescription = langText(`正在直接生成人物。当前调用模型：${getPrimarySummaryProfileName()}。`, `Generating personas directly with ${getPrimarySummaryProfileName()}.`);
  setStatusLoadingState(true);
  setSpeakerCard(langText("生成人物中", "Generating Personas"), "", generatingDescription, "系");
  updateLiveStatus(generatingDescription, "pending");
  updateSeatFeedback(generatingDescription, "pending");
  try {
    state.recommendedRoles = [];
    renderSeatPicker();
    renderSeatStack();
    // 角色生成前，先检索本地知识库，自动为角色规划提供背景参考
    let preRoleKnowledgeBrief = "";
    if (state.knowledgeEnabled) {
      const knowledgeResult = filterKnowledgeEntries(getKnowledgeScopeEntries(), {
        queryOverride: currentSummary,
        categoryOverride: "all",
      });
      const knowledgeHits = (knowledgeResult.entries || []).slice(0, 5);
      if (knowledgeHits.length) {
        preRoleKnowledgeBrief = [
          "本地知识库检索结果（请在规划人物时参考以下背景材料）：",
          ...knowledgeHits.map((e, i) => `${i + 1}. ${e.title}｜${getKnowledgeCategoryLabel(e.category)}${e.description ? `｜说明：${summarizeText(e.description, 50)}` : ""}｜${e.searchSnippet || summarizeText(e.summary || e.textPreview || "", 80)}`),
        ].join("\n");
      }
    }
    const generationResult = await requestGeneratedRecommendedRolesSequential(currentSummary, preRoleKnowledgeBrief, {
      onStage: (stage, payload) => {
        if (generationSession !== state.recommendedRoleGenerationSession) {
          return;
        }
        if (stage === "identity-start") {
          const message = langText(`正在逐个生成人物，共 ${payload.targetCount} 个。`, `Generating ${payload.targetCount} personas one by one.`);
          setSpeakerCard(langText("生成人物中", "Generating Personas"), "", message, "系");
          updateLiveStatus(message, "pending");
          updateSeatFeedback(message, "pending");
          return;
        }
        if (stage === "identity-progress") {
          const message = langText(`正在生成人物 ${Math.min(payload.slotIndex + 1, payload.targetCount)}/${payload.targetCount}，当前已生成 ${payload.generatedCount} 个。`, `Generating persona ${Math.min(payload.slotIndex + 1, payload.targetCount)}/${payload.targetCount}, ${payload.generatedCount} ready.`);
          setSpeakerCard(langText("生成人物中", "Generating Personas"), "", message, "系");
          updateLiveStatus(message, "pending");
          updateSeatFeedback(message, "pending");
        }
      },
      onRoleGenerated: (roles, payload) => {
        if (generationSession !== state.recommendedRoleGenerationSession) {
          return;
        }
        state.recommendedRoles = roles;
        renderSeatPicker();
        renderSeatStack();
        const message = langText(`已生成第 ${payload.slotIndex + 1} 个，当前共 ${roles.length}/${payload.targetCount} 个。`, `Generated persona ${payload.slotIndex + 1}, ${roles.length}/${payload.targetCount} ready.`);
        setSpeakerCard(langText("生成人物中", "Generating Personas"), "", message, "系");
        updateLiveStatus(message, "pending");
        updateSeatFeedback(message, "pending");
      },
      onRoleFailed: (error, payload) => {
        if (generationSession !== state.recommendedRoleGenerationSession) {
          return;
        }
        const message = langText(`第 ${payload.slotIndex + 1} 个生成失败，系统会继续补后面的位。当前已生成 ${payload.generatedCount} 个。`, `Persona ${payload.slotIndex + 1} failed, continuing with the remaining slots. ${payload.generatedCount} ready so far.`);
        setSpeakerCard(langText("生成人物中", "Generating Personas"), "", message, "系");
        updateLiveStatus(message, "pending");
        updateSeatFeedback(error.message, "pending");
      },
    });

    if (generationSession !== state.recommendedRoleGenerationSession) {
      return;
    }

    state.recommendedRoles = generationResult.roles;
    if (!state.recommendedRoles.length) {
      throw new Error(generationResult.failures.map((item) => `第 ${item.slotIndex + 1} 个失败：${item.error}`).join("；") || "没有拿到任何可用人物结果。");
    }

    const generatedCountDetail = state.recommendedRoles.length === generationResult.targetCount
      ? langText(`本轮共生成 ${state.recommendedRoles.length} 个针对性人物。`, `${state.recommendedRoles.length} targeted personas were generated.`)
      : langText(`本轮先生成了 ${state.recommendedRoles.length}/${generationResult.targetCount} 个人物，其余位稍后可重试或从人物库补齐。`, `${state.recommendedRoles.length}/${generationResult.targetCount} personas were generated. The remaining slots can be retried later or filled from the library.`);
    state.recommendedRoleGenerationMeta = createRoleGenerationMeta("ai", hostProfile, generatedCountDetail, false);
    updateSeatFeedback(generatedCountDetail, state.recommendedRoles.length === generationResult.targetCount ? "success" : "pending");
  } catch (error) {
    if (generationSession !== state.recommendedRoleGenerationSession) {
      return;
    }
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
  if (generationSession !== state.recommendedRoleGenerationSession) {
    return;
  }
  state.selectedIds.clear();
  state.seatAssignments = {};
  state.seatLayoutCustomized = false;
  state.discussionOrder = {};
  state.seatModelAssignments = {};
  const defaultRecommended = [
    ...state.recommendedRoles.slice(0, Math.min(state.discussionSize, state.recommendedRoles.length)).map((role) => role.id),
  ].filter(Boolean);
  [...new Set(defaultRecommended)].slice(0, state.discussionSize).forEach((roleId) => state.selectedIds.add(roleId));
  applyDefaultSeatLayout([...state.selectedIds], { force: true });
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
    generationSession,
    onStart: () => {
      if (generationSession !== state.recommendedRoleGenerationSession) {
        return;
      }
      const message = langText(`第 3 步：正在后台补全人物提示词，当前已生成 ${state.recommendedRoles.length} 个身份。`, `Step 3: enriching persona prompts in the background for ${state.recommendedRoles.length} generated identities.`);
      updateLiveStatus(message, "pending");
      updateSeatFeedback(message, "pending");
    },
    onFinish: (success, count) => {
      if (generationSession !== state.recommendedRoleGenerationSession) {
        return;
      }
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
    state.judgeLog = [];
    state.recommendedRoleGenerationMeta = null;
    state.recommendedRoles = [];
    state.selectedIds.clear();
    state.seatAssignments = {};
    state.seatLayoutCustomized = false;
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

  removeTaskSummaryActionPrompts();
  state.topicConfirmed = true;
  state.generatingSeats = true;
  state.seatsReady = false;
  state.rolePlanningBrief = forceGeneration ? state.rolePlanningBrief : "";
  if (forceGeneration) {
    state.pendingRoleClarification = [];
  }
  state.taskSupplementMode = false;
  state.discussionRoundNotes = [];
  state.judgeLog = [];
  state.recommendedRoleGenerationMeta = null;
  state.selectedIds.clear();
  state.seatAssignments = {};
  state.seatLayoutCustomized = false;
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
  const generationSession = state.recommendedRoleGenerationSession + 1;
  state.recommendedRoleGenerationSession = generationSession;
  state.generatingTimer = setTimeout(() => {
    void finishSeatGeneration({ forceGeneration, generationSession });
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
  state.sharedEvidenceEntries = [];
  state.rolePlanningBrief = "";
  state.projectMemory = buildEmptyProjectMemory();
  state.projectArtifacts = [];
  state.sharedAgentQuery = "";
  state.sharedAgentSources = "";
  state.pendingRoleClarification = [];
  state.taskSupplementMode = false;
  state.latestReportText = "";
  state.latestReportFileName = "";
  state.discussionRoundNotes = [];
  state.judgeLog = [];
  state.discussionState = buildEmptyDiscussionState();
  state.recommendedRoles = [];
  state.seatModelAssignments = {};
  state.seatAssignments = {};
  state.seatLayoutCustomized = false;
  state.pendingAttachments = [];
  setStatusLoadingState(false);
  renderAiRoleRecommendationToggle();
  renderSeedConversation();
  setSpeakerCard(langText("任务整理中", "Task Intake"), langText("等待用户输入", "Waiting for user input"), langText("先整理，再确认，再生成人物。", "First organize, then confirm, then generate participants."), "系");
  updateLiveStatus(langText("目前无任务", "No task yet"), "");
  updateSeatFeedback(langText("无任务", "No task"), "");
  renderDiscussionStatusPanel();
  renderSeatStack();
  renderSeatPicker();
  renderAttachmentStrip();
  renderMemoryAgentWorkspace();
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

  if (state.seatLayoutCustomized) {
    syncDiscussionOrder();
  } else {
    applyDefaultSeatLayout([...state.selectedIds], { force: true });
  }
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

  openKnowledgeBaseButton?.addEventListener("click", () => {
    openKnowledgeBaseModal();
  });
  closeKnowledgeBaseButton?.addEventListener("click", closeKnowledgeBaseModal);
  knowledgeBaseBackdrop?.addEventListener("click", closeKnowledgeBaseModal);
  knowledgeCategoryAddButton?.addEventListener("click", () => {
    void handleAddKnowledgeCategory();
  });
  knowledgeCategoryRenameButton?.addEventListener("click", () => {
    void handleRenameKnowledgeCategory();
  });
  knowledgeCategoryDeleteButton?.addEventListener("click", () => {
    void handleDeleteKnowledgeCategory();
  });
  knowledgeUploadTrigger?.addEventListener("click", () => {
    try {
      requireKnowledgeUploadCategory();
    } catch (error) {
      updateSharedAgentStatus(error instanceof Error ? error.message : String(error), "error");
      return;
    }
    try {
      if (typeof knowledgeUploadInput?.showPicker === "function") {
        knowledgeUploadInput.showPicker();
        return;
      }
    } catch (error) {
      console.warn("knowledge showPicker failed", error);
    }
    knowledgeUploadInput?.click();
  });
  knowledgeUploadInput?.addEventListener("change", async () => {
    const files = Array.from(knowledgeUploadInput.files || []);
    if (!files.length) {
      return;
    }
    try {
      const uploadResult = await handleKnowledgeUploads(files);
      updateSharedAgentStatus(
        uploadResult.blockedFiles.length
          ? langText(`已入库 ${uploadResult.storedCount} 个文件；以下格式暂未纳入检索：${uploadResult.blockedFiles.join("、")}`, `Stored ${uploadResult.storedCount} file(s); these formats are not searchable yet: ${uploadResult.blockedFiles.join(", ")}`)
          : langText(`知识库已入库 ${uploadResult.storedCount} 个文件，并已整理成可检索片段。`, `Stored ${uploadResult.storedCount} knowledge file(s) and prepared searchable chunks.`),
        uploadResult.blockedFiles.length ? "pending" : "success"
      );
      if (knowledgeUploadCategorySelect) {
        knowledgeUploadCategorySelect.value = "";
      }
    } catch (error) {
      updateSharedAgentStatus(error instanceof Error ? error.message : String(error), "error");
    } finally {
      knowledgeUploadInput.value = "";
    }
  });
  knowledgeSearchInputField?.addEventListener("input", renderKnowledgeBaseWorkspace);
  knowledgeCategoryFilterSelect?.addEventListener("change", renderKnowledgeBaseWorkspace);
  knowledgeList?.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-knowledge-id]");
    if (!trigger) {
      return;
    }
    activeKnowledgeEntryId = trigger.dataset.knowledgeId || "";
    renderKnowledgeBaseWorkspace();
  });
  knowledgeEditorPanel?.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-knowledge-action]");
    if (!trigger) {
      return;
    }
    const entry = getKnowledgeScopeEntries().find((item) => item.id === (trigger.dataset.knowledgeId || ""));
    if (!entry) {
      return;
    }
    const fileBaseName = sanitizeKnowledgeFileBaseName(entry);
    const action = trigger.dataset.knowledgeAction || "";
    if (action === "download-original") {
      downloadDataUrlFile(entry.name || `${fileBaseName}.${entry.normalizedFormat || "bin"}`, entry.originalDataUrl || "");
      return;
    }
    if (action === "download-normalized-json") {
      downloadJsonFile(`${fileBaseName}.normalized.json`, buildKnowledgeNormalizedPayload(entry));
      return;
    }
    if (action === "download-chunks-json") {
      downloadJsonFile(`${fileBaseName}.chunks.json`, buildKnowledgeChunkExportPayload(entry));
      return;
    }
    if (action === "rebuild-normalized") {
      rebuildKnowledgeEntry(entry.id).catch((error) => {
        console.error("Knowledge rebuild failed", error);
        updateSharedAgentStatus(error?.message || langText("重建标准化失败。", "Failed to rebuild normalized payload."), "error");
      });
      return;
    }
    if (action === "generate-description") {
      const profile = getPrimarySummaryProfile();
      if (!profile) {
        updateSharedAgentStatus(langText("请先配置 AI 模型后再生成说明。", "Please configure an AI model first."), "error");
        return;
      }
      const textarea = document.getElementById("knowledge-entry-description");
      if (textarea) {
        textarea.value = langText("AI 正在生成说明，请稍候…", "Generating note with AI, please wait…");
        textarea.disabled = true;
      }
      const textSample = summarizeText(normalizeKnowledgeText(entry.textPreview || ""), 600);
      const prompt = [
        langText("你是一个知识库管理助手。请为以下文档生成一段简短说明（2到3句话），让 AI 在检索时能快速判断这份文件是否相关。", "You are a knowledge base assistant. Generate a brief 2-3 sentence description of the following document so an AI can quickly judge its relevance during retrieval."),
        langText("说明应覆盖：这份文件主要讲什么、属于什么类型（背景资料/规格/流程/财务/合同等）、适合回答什么类型的问题。", "Cover: what the file mainly discusses, its type (background/specs/process/financial/contract etc.), and what types of questions it helps answer."),
        langText("只输出说明正文，不要加标题、不要加序号、不要加任何解释。", "Output only the description, no title, no numbering, no extra explanation."),
        `文件名：${entry.title}`,
        `目录：${getKnowledgeCategoryLabel(entry.category)}`,
        `内容节选：\n${textSample}`,
      ].join("\n");
      requestModelText(profile, prompt, 120, null, 25000).then((result) => {
        if (textarea) {
          textarea.value = result.trim();
          textarea.disabled = false;
        }
      }).catch((error) => {
        console.error("Generate description failed", error);
        if (textarea) {
          textarea.value = "";
          textarea.disabled = false;
        }
        updateSharedAgentStatus(langText("AI 生成说明失败，请手动填写。", "Failed to generate AI note. Please fill it in manually."), "error");
      });
      return;
    }
    if (action === "save-description") {
      const textarea = document.getElementById("knowledge-entry-description");
      const newDescription = (textarea?.value || "").trim();
      const allEntries = getKnowledgeScopeEntries();
      const nextEntries = normalizeKnowledgeEntries(allEntries.map((e) =>
        e.id === entry.id ? { ...e, description: newDescription } : e
      ));
      saveKnowledgeEntriesByEntryScope(entry, nextEntries).then(() => {
        updateSharedAgentStatus(langText(`已保存"${entry.title}"的文件说明。`, `File note saved for "${entry.title}".`), "success");
        renderKnowledgeBaseWorkspace();
      }).catch((error) => {
        console.error("Save description failed", error);
        updateSharedAgentStatus(langText("保存文件说明失败。", "Failed to save file note."), "error");
      });
      return;
    }
    if (action === "delete-entry") {
      removeKnowledgeEntry(entry.id).catch((error) => {
        console.error("Knowledge delete failed", error);
        updateSharedAgentStatus(error?.message || langText("删除知识条目失败。", "Failed to delete knowledge entry."), "error");
      });
    }
  });
  knowledgeDetail?.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-knowledge-preview-mode]");
    if (!trigger) {
      return;
    }
    activeKnowledgePreviewMode = trigger.dataset.knowledgePreviewMode || "normalized";
    renderKnowledgeBaseWorkspace();
  });
  discussionStatusToggle?.addEventListener("click", () => {
    discussionStatusExpanded = !discussionStatusExpanded;
    renderDiscussionStatusPanel();
  });

  openRoundtableWorkbenchButton?.addEventListener("click", () => {
    openRoundtableWorkbench();
  });
  closeRoundtableWorkbenchButton?.addEventListener("click", closeRoundtableWorkbench);
  roundtableWorkbenchBackdrop?.addEventListener("click", closeRoundtableWorkbench);
  roundtableEvidenceList?.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-evidence-id]");
    if (!trigger) {
      return;
    }
    activeRoundtableEvidenceId = trigger.dataset.evidenceId || "";
    renderRoundtableEvidenceWorkspace();
  });
  roundtableEvidenceFilterSelect?.addEventListener("change", () => {
    activeRoundtableEvidenceFilter = roundtableEvidenceFilterSelect.value || "all";
    activeRoundtableEvidenceId = "";
    renderRoundtableEvidenceWorkspace();
  });

  document.getElementById("evidence-translate-toggle")?.addEventListener("click", (e) => {
    state.autoTranslateEvidence = !state.autoTranslateEvidence;
    e.currentTarget.textContent = langText(`自动翻译 ${state.autoTranslateEvidence ? "✔" : "✘"}`, `Auto Translate ${state.autoTranslateEvidence ? "✔" : "✘"}`);
    e.currentTarget.style.color = state.autoTranslateEvidence ? "var(--cool)" : "var(--text-dim)";
    e.currentTarget.style.borderColor = state.autoTranslateEvidence ? "rgba(100,180,255,0.3)" : "rgba(255,255,255,0.15)";
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

  toggleKnowledgeEnabledButton?.addEventListener("click", async () => {
    state.knowledgeEnabled = !state.knowledgeEnabled;
    renderKnowledgeEnabledToggle();
    await saveAppState("knowledgeEnabled", state.knowledgeEnabled);
    updateSeatFeedback(
      state.knowledgeEnabled
        ? langText("当前讨论已启用知识库。", "Knowledge base is enabled for this discussion.")
        : langText("当前讨论已关闭知识库。", "Knowledge base is disabled for this discussion."),
      state.knowledgeEnabled ? "success" : "pending"
    );
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
  appThemeToggle?.addEventListener("click", () => {
    void setAppTheme(state.appTheme === "light" ? "dark" : "light");
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
        title: langText("删除人物", "Delete Persona"),
        message: langText(`删除“${getDisplayRoleName(role)}”后，这个人物会从人物库中移除。`, `Delete "${getDisplayRoleName(role)}" from the persona library?`),
        confirmText: langText("删除", "Delete"),
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
    delete state.seatModelAssignments[button.dataset.roleId];
    if (state.seatLayoutCustomized) {
      syncDiscussionOrder();
    } else {
      applyDefaultSeatLayout([...state.selectedIds], { force: true });
    }
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

    const readAloudVoiceSelect = event.target.closest(".seat-readaloud-voice-select");
    if (readAloudVoiceSelect) {
      const role = getRoleById(readAloudVoiceSelect.dataset.roleId);
      if (readAloudVoiceSelect.value) {
        state.ttsVoiceAssignments[readAloudVoiceSelect.dataset.roleId] = readAloudVoiceSelect.value;
      } else {
        delete state.ttsVoiceAssignments[readAloudVoiceSelect.dataset.roleId];
      }
      preferredReadAloudVoices.clear();
      renderSeatStack();
      updateSeatFeedback(
        readAloudVoiceSelect.value
          ? langText(`已为 ${getDisplayRoleName(role) || "人物"} 指定朗读音色`, `Assigned a read-aloud voice to ${getDisplayRoleName(role) || "persona"}`)
          : langText(`已恢复 ${getDisplayRoleName(role) || "人物"} 的自动音色匹配`, `Restored automatic voice matching for ${getDisplayRoleName(role) || "persona"}`),
        "success"
      );
      void syncCurrentTopicSnapshot();
      return;
    }

    const orderSelect = event.target.closest(".seat-order-select");
    if (orderSelect) {
      state.seatLayoutCustomized = true;
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
    state.seatLayoutCustomized = true;
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
    setProfileTestStatus(langText("已清空表单", "Form cleared"), "");
  });
  deleteModelProfileButton.addEventListener("click", () => {
    if (!profileId.value) {
      setProfileTestStatus(langText("当前还没有选中已保存配置", "No saved configuration is currently selected"), "error");
      return;
    }
    deleteModelProfile(profileId.value);
    resetModelProfileForm();
    setProfileTestStatus(langText("配置已删除", "Configuration deleted"), "");
  });
  providerTemplateSelect.addEventListener("change", () => {
    if (providerTemplateSelect.value === "custom-new" || !providerTemplateSelect.value) {
      resetModelProfileForm(providerTemplateSelect.value || "custom-new");
      setProfileTestStatus(langText("正在新建自定义接入", "Creating a new custom connection"), "");
      return;
    }

    const profile = defaultProfileMap.get(providerTemplateSelect.value);
    if (!profile) {
      resetModelProfileForm("custom-new");
      setProfileTestStatus(langText("正在新建自定义接入", "Creating a new custom connection"), "");
      return;
    }
    fillModelProfileTemplate(profile);
    setProfileTestStatus(langText("已载入厂商模板。点击保存会新增一条接入，不会覆盖已有配置。", "Template loaded. Saving will create a new connection and will not overwrite an existing one."), "");
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
      setProfileTestStatus(langText("已载入这个接入配置，可继续修改", "This saved connection has been loaded and can now be edited."), "");
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
      setProfileTestStatus(
        profile.locked
          ? langText("已从已接入列表移除，可随时重新配置", "Removed from the connected list. You can configure it again at any time.")
          : langText("配置已删除", "Configuration deleted"),
        ""
      );
    }
  });

  attachFilesButton.addEventListener("click", () => {
    attachmentInput.click();
  });

  attachmentInput.addEventListener("change", () => {
    const files = Array.from(attachmentInput.files || []);
    state.pendingAttachments = state.pendingAttachments.concat(files);
    syncUserMemoryFromState("attachments", { attachmentCount: files.length });
    void persistUserMemory();
    attachmentInput.value = "";
    renderAttachmentStrip();
    renderMemoryAgentWorkspace();
    updateComposerViewportPlacement();
  });

  composerAttachments.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-attachment-index]");
    if (!chip) {
      return;
    }
    removePendingAttachment(Number(chip.dataset.attachmentIndex));
    updateComposerViewportPlacement();
  });

  window.addEventListener("resize", updateComposerViewportPlacement);
  window.visualViewport?.addEventListener("resize", updateComposerViewportPlacement);

  userInput.addEventListener("input", autoResizeTextarea);
  sharedAgentQueryInput?.addEventListener("input", () => {
    state.sharedAgentQuery = sharedAgentQueryInput.value;
    renderMemoryAgentWorkspace();
  });
  sharedAgentSourcesInput?.addEventListener("input", () => {
    state.sharedAgentSources = sharedAgentSourcesInput.value;
    renderMemoryAgentWorkspace();
  });

  refreshUserMemoryButton?.addEventListener("click", async () => {
    syncUserMemoryFromState();
    await persistUserMemory();
    updateSharedAgentStatus(langText("已刷新用户记忆。", "User memory refreshed."), "success");
    renderMemoryAgentWorkspace();
  });

  refreshProjectMemoryButton?.addEventListener("click", async () => {
    state.projectMemory = deriveProjectMemoryFromState();
    appendProjectAgentNote(langText("项目记忆 Agent", "Project Memory Agent"), state.projectMemory.taskSummary || langText("已刷新当前项目记忆。", "Project memory refreshed."));
    await syncCurrentTopicSnapshot();
    updateSharedAgentStatus(langText("已刷新项目记忆。", "Project memory refreshed."), "success");
    renderMemoryAgentWorkspace();
  });

  runSharedResearchAgentButton?.addEventListener("click", async () => {
    updateSharedAgentStatus(langText("共享 research agent 正在整理事实包...", "Shared research agent is building the brief..."), "pending");
    try {
      await executeSharedResearchAgent();
      updateSharedAgentStatus(langText("共享事实包已更新，并已注入本项目。", "Shared brief updated and injected into this project."), "success");
      renderMemoryAgentWorkspace();
    } catch (error) {
      updateSharedAgentStatus(error instanceof Error ? error.message : String(error), "error");
    }
  });

  runWebSearchAgentButton?.addEventListener("click", async () => {
    updateSharedAgentStatus(langText("网页搜索 Agent 正在整理公开网页结果...", "Web search agent is collecting public results..."), "pending");
    try {
      const result = await executeSharedResearchAgent({ includeWebSearch: true });
      const resultCount = Number(result?.webSearch?.resultCount || 0);
      const diagnosticSummary = formatWebSearchDiagnostics(result?.webSearch?.diagnostics || []);
      updateSharedAgentStatus(
        langText(
          `网页搜索已入库 ${resultCount} 条证据。${diagnosticSummary ? `来源状态：${diagnosticSummary}` : ""}`,
          `Stored ${resultCount} web evidence item(s). ${diagnosticSummary ? `Source status: ${diagnosticSummary}` : ""}`
        ).trim(),
        "success"
      );
      renderMemoryAgentWorkspace();
    } catch (error) {
      updateSharedAgentStatus(error instanceof Error ? error.message : String(error), "error");
    }
  });

  runMultimodalAgentButton?.addEventListener("click", async () => {
    updateSharedAgentStatus(langText("多模态证据 Agent 正在解析图片...", "Multimodal evidence agent is analyzing images..."), "pending");
    renderRoundtableEvidenceWorkspace();
    try {
      await executeMultimodalEvidenceAgent();
      updateSharedAgentStatus(langText("图片解析已完成，并已补入共享事实包。", "Image analysis completed and was appended to the shared brief."), "success");
      renderMemoryAgentWorkspace();
      renderRoundtableEvidenceWorkspace();
    } catch (error) {
      updateSharedAgentStatus(error instanceof Error ? error.message : String(error), "error");
      renderRoundtableEvidenceWorkspace();
    }
  });

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
    const knowledgeTrigger = event.target.closest("[data-open-knowledge-id]");
    if (knowledgeTrigger) {
      activeKnowledgeEntryId = knowledgeTrigger.dataset.openKnowledgeId || "";
      openKnowledgeBase();
      renderKnowledgeBaseWorkspace();
      return;
    }
    // 每条讨论消息的朗读控制按钮
    const msgItem = event.target.closest(".chat-item[data-has-voice]");
    if (msgItem) {
      if (event.target.closest(".chat-msg-playpause")) {
        const msgItem = event.target.closest("[data-has-voice]");
        if (!msgItem) return;
        if (activeReadAloudElement === msgItem && activeReadAloudUtterance) {
          if (readAloudPaused) {
            window.speechSynthesis.resume();
            readAloudPaused = false;
            msgItem.classList.remove("chat-item-voice-paused");
            msgItem.classList.add("chat-item-reading");
          } else {
            window.speechSynthesis.pause();
            readAloudPaused = true;
            msgItem.classList.remove("chat-item-reading");
            msgItem.classList.add("chat-item-voice-paused");
          }
          updateMsgVoiceBtnState();
        } else {
          playFromElement(msgItem);
        }
      }
      if (event.target.closest(".chat-msg-stop")) {
        stopReadAloudPlayback();
      }
    }
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
      downloadTextFile(`${buildExportBaseName()}-${langText("完整讨论", "full-discussion")}.txt`, buildFullExportText());
      return;
    }
    if (event.target.closest(".js-export-docx")) {
      downloadDocxFile(`${buildExportBaseName()}-${langText("完整讨论", "full-discussion")}.docx`, buildFullExportHtml());
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
    await storeAttachmentsForActiveTopic(attachments);
    const hasNewImageAttachment = attachments.some((file) => file?.type?.startsWith("image/"));
    if (hasNewImageAttachment && getMultimodalProfile()) {
      try {
        updateSharedAgentStatus(langText("检测到新图片，正在自动补跑图片解析...", "New images detected. Running image analysis automatically..."), "pending");
        await executeMultimodalEvidenceAgent();
        updateSharedAgentStatus(langText("图片解析已自动更新到证据详情。", "Image analysis was automatically updated in the evidence details."), "success");
      } catch (error) {
        console.warn("auto image analysis failed", error);
        updateSharedAgentStatus(error instanceof Error ? error.message : String(error), "error");
      }
    }
    state.pendingAttachments = [];
    renderAttachmentStrip();
    state.projectMemory = deriveProjectMemoryFromState();
    renderMemoryAgentWorkspace();
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
      const treatAsSupplement = !!state.lastSummary;
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
    toggleTopicsButton.textContent = topicList.classList.contains("expanded")
      ? t("toggleTopicsLess")
      : t("toggleTopicsMore");
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
  document.getElementById("cycle-model")?.addEventListener("click", () => cycleSetting("modelIndex", modelValues));
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
  multimodalModelSelect?.addEventListener("change", async () => {
    if (state.discussionRunning) {
      return;
    }
    state.mappings.multimodal = multimodalModelSelect.value;
    await saveAppState("modelMappings", state.mappings);
    renderConnectedModelList();
    renderModelMappings();
    const nextProfile = getMultimodalProfile();
    updateSeatFeedback(
      state.mappings.multimodal
        ? langText(`已切换多模态模型：${nextProfile?.displayName || "未设置"}`, `Multimodal model changed to: ${nextProfile?.displayName || "Not set"}`)
        : langText(`多模态模型已改为跟随主持 AI：${nextProfile?.displayName || "未设置"}`, `Multimodal model now follows Host AI: ${nextProfile?.displayName || "Not set"}`),
      "success"
    );
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
    syncUserMemoryFromState("discussion-start");
    void persistUserMemory();
    renderMemoryAgentWorkspace();
    runDiscussionFlow();
  });
  stopDiscussionButton.addEventListener("click", () => {
    stopDiscussionFlow();
  });
  if (regeneratePersonasButton) {
    regeneratePersonasButton.addEventListener("click", () => {
      state.seatsReady = false;
      state.generatingSeats = false;
      state.recommendedRoles = [];
      state.selectedIds.clear();
      state.seatAssignments = {};
      state.seatLayoutCustomized = false;
      state.discussionOrder = {};
      state.seatModelAssignments = {};
      renderSeatStack();
      renderSeatPicker();
      startSeatGeneration();
    });
  }
}

async function init() {
  await seedDatabase();
  await hydrateState();
  if (window.speechSynthesis) {
    const handleVoicesChanged = () => {
      preferredReadAloudVoices.clear();
      renderSeatStack();
    };
    if (typeof window.speechSynthesis.addEventListener === "function") {
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    } else {
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    }
    window.speechSynthesis.getVoices();
  }
  applyThemeToBody();
  applyLanguageToBody();
  applyLanguageToStaticUi();
  setRoleEditorFieldVisibility();
  renderThemeToggle();
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
  renderMemoryAgentWorkspace();
  renderKnowledgeBaseWorkspace();
  const activeTopic = state.topics.find((topic) => topic.id === state.activeTopicId);
  if (activeTopic?.snapshot?.topicConfirmed) {
    applyTopicSnapshot(activeTopic.snapshot);
    await hydrateProjectScopedState(activeTopic.id);
    renderMemoryAgentWorkspace();
    renderKnowledgeBaseWorkspace();
  } else {
    seedConversation();
  }
  autoResizeTextarea();
  updateComposerViewportPlacement();
  bindEvents();
  startLauncherHeartbeat();
  document.body.classList.remove("app-initializing");
}

init().catch((error) => {
  console.error(error);
  document.body.classList.remove("app-initializing");
  setProfileTestStatus(`初始化失败：${error.message}`, "error");
});
