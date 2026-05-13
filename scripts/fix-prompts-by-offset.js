const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../prototype-ui/app.js');
let c = fs.readFileSync(file, 'utf8');

// ---- patch 1: moderatorRoundSummaryPrompt ----
const modS = c.indexOf('const moderatorRoundSummaryPrompt');
let modE = c.indexOf('].join', modS);
modE = c.indexOf(';', modE) + 1;

const modNew = `const isFinalRound = round >= totalRounds;\r\n  const moderatorRoundSummaryPrompt = [\r\n    \`你现在是本场讨论的主持AI，需要在第 \${round}/\${totalRounds} 轮结束后做一段主持小结。\`,\r\n    getModeratorModeInstruction(),\r\n    isFinalRound\r\n      ? "这是最后一轮讨论，你的小结要做收束：把所有轮次中已经在质疑和反驳中站稳的论据明确点出来，用确定的语气写出；对经过多轮未被推翻的论点直接肯定它成立；不要再罗列不确定性。"\r\n      : "你的任务是压缩本轮重点，明确谁提出了什么、谁提出了反对或保留、哪些例子或依据最关键。确认已成立的论点不必再争，把焦点留给下一轮仍待解决的问题。",\r\n    "这段小结既要给用户看，也要为下一轮压缩上下文，所以要信息密、语言自然、不要太长。",\r\n    \`任务定义：\${summary}\`,\r\n    \`本轮记录：\${liveTurns.map((turn) => \`\${turn.assignmentLabel}\\n\${turn.text}\`).join("\\n\\n")}\`,\r\n    "绝对不要输出 thinking process、英文分析草稿、自检步骤、constraint list 或任何内部推理过程。",\r\n    isFinalRound\r\n      ? "要求：控制在 300 到 500 字内，给出明确的收束性判断，哪些已经确立、哪些仍有边界，写清楚。"\r\n      : "要求：控制在 260 到 420 字内，点出本轮最关键的共识、分歧和例证。",\r\n  ].join("\\n\\n");`;

c = c.slice(0, modS) + modNew + c.slice(modE);
console.log('moderator prompt patched');

// ---- patch 2: judgePrompt (recalculate position after patch 1) ----
const judgeS = c.indexOf('const judgePrompt = [');
let judgeE = c.indexOf('].join', judgeS);
judgeE = c.indexOf(';', judgeE) + 1;

const judgeNew = `const judgePrompt = [\r\n    \`你现在是圆桌讨论的中立裁判，经过 \${targetRounds} 轮讨论，现在必须给出明确的最终裁决。\`,\r\n    getJudgeModeInstruction(),\r\n    "你的首要任务是给出决断，而不是再次罗列各方观点。经过多轮讨论和反驳，哪些论据已经站稳脚跟，就直接确认它们成立，不要为了追求平衡而稀释已经成立的结论。",\r\n    "裁判发言结构：第一，开门见山说出最终判断是什么（一两句话）；第二，逐条列出支撑这个判断的核心论据，每条说明为什么它在质疑下仍然成立；第三，指出哪些边界条件不影响核心结论但用户应当知晓；第四，给用户一句具体的行动建议或方向。",\r\n    "如果某方的论证在讨论中被充分质疑且未能有效回应，要明确指出其不足，而不是给它同等地位。",\r\n    buildDiscussionContext(state.lastSummary, roundNotes, []),\r\n    rolePromptBlock(judgeRole),\r\n    \`篇幅要求：\${budget.charHint}\`,\r\n    "绝对不要输出 thinking process、英文分析草稿、自检步骤、constraint list 或任何内部推理过程。",\r\n    "要求：直接输出最终裁判发言正文，至少写 4 段，开头必须是清晰的最终判断，结尾必须是具体建议。",\r\n  ].join("\\n\\n");`;

c = c.slice(0, judgeS) + judgeNew + c.slice(judgeE);
console.log('judge prompt patched');

fs.writeFileSync(file, c, 'utf8');
console.log('all done');
