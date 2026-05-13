const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../prototype-ui/app.js');
let c = fs.readFileSync(file, 'utf8');

// ---- 1. moderator round summary: distinguish final vs non-final round ----
const modOld = `  const moderatorRoundSummaryPrompt = [
    \`你现在是本场讨论的主持AI，需要在第 \${round}/\${totalRounds} 轮结束后做一段主持小结。\`,
    getModeratorModeInstruction(),
    "你的任务是压缩本轮重点，明确谁提出了什么、谁提出了反对或保留、哪些例子或依据最关键。",
    "这段小结既要给用户看，也要为下一轮压缩上下文，所以要信息密、语言自然、不要太长。",
    \`任务定义：\${summary}\`,
    \`本轮记录：\${liveTurns.map((turn) => \`\${turn.assignmentLabel}\\n\${turn.text}\`).join("\\n\\n")}\`,
    "绝对不要输出 thinking process、英文分析草稿、自检步骤、constraint list 或任何内部推理过程。",
    "要求：控制在 260 到 420 字内，点出本轮最关键的共识、分歧和例证。",
  ].join("\\n\\n");`;

const modNew = `  const isFinalRound = round >= totalRounds;
  const moderatorRoundSummaryPrompt = [
    \`你现在是本场讨论的主持AI，需要在第 \${round}/\${totalRounds} 轮结束后做一段主持小结。\`,
    getModeratorModeInstruction(),
    isFinalRound
      ? "这是最后一轮讨论，你的小结要做收束：把所有轮次中已经在质疑和反驳中站稳的论据明确点出来，用确定的语气写出；对经过多轮未被推翻的论点直接肯定它成立；不要再罗列不确定性。"
      : "你的任务是压缩本轮重点，明确谁提出了什么、谁提出了反对或保留、哪些例子或依据最关键。确认已成立的论点不必再争，把焦点留给下一轮仍待解决的问题。",
    "这段小结既要给用户看，也要为下一轮压缩上下文，所以要信息密、语言自然、不要太长。",
    \`任务定义：\${summary}\`,
    \`本轮记录：\${liveTurns.map((turn) => \`\${turn.assignmentLabel}\\n\${turn.text}\`).join("\\n\\n")}\`,
    "绝对不要输出 thinking process、英文分析草稿、自检步骤、constraint list 或任何内部推理过程。",
    isFinalRound
      ? "要求：控制在 300 到 500 字内，给出明确的收束性判断，哪些已经确立、哪些仍有边界，写清楚。"
      : "要求：控制在 260 到 420 字内，点出本轮最关键的共识、分歧和例证。",
  ].join("\\n\\n");`;

if (!c.includes(modOld)) {
  console.error('moderator prompt old string not found');
  process.exit(1);
}
c = c.replace(modOld, modNew);
console.log('moderator prompt patched');

// ---- 2. judge final prompt: more decisive ----
const judgeOld = `  const judgePrompt = [
    \`你现在是圆桌讨论的中立裁判，需要在 \${targetRounds} 轮讨论结束后做最终总结。\`,
    getJudgeModeInstruction(),
    "你要像真正的人类裁判一样写最终结论，语言自然、清楚、完整，不要写成 Markdown 标题、提纲或代码注释。",
    "请明确回答：谁的论证更站得住脚、哪些补充信息最有价值、最终建议怎么讲给人听。",
    "如果双方都有道理，也可以明确指出哪部分更强、哪部分还不能下死结论。",
    buildDiscussionContext(state.lastSummary, roundNotes, []),
    rolePromptBlock(judgeRole),
    \`篇幅要求：\${budget.charHint}\`,
    "绝对不要输出 thinking process、英文分析草稿、自检步骤、constraint list 或任何内部推理过程。",
    "要求：直接输出最终裁判发言正文，要给人类用户看，至少写 4 段，并给出一个清晰的最终判断。",
  ].join("\\n\\n");`;

const judgeNew = `  const judgePrompt = [
    \`你现在是圆桌讨论的中立裁判，经过 \${targetRounds} 轮讨论，现在必须给出明确的最终裁决。\`,
    getJudgeModeInstruction(),
    "你的首要任务是给出决断，而不是再次罗列各方观点。经过多轮讨论和反驳，哪些论据已经站稳脚跟，就直接确认它们成立，不要为了追求平衡而稀释已经成立的结论。",
    "裁判发言结构：第一，开门见山说出最终判断是什么（一两句话）；第二，逐条列出支撑这个判断的核心论据，每条说明为什么它在质疑下仍然成立；第三，指出哪些边界条件不影响核心结论但用户应当知晓；第四，给用户一句具体的行动建议或方向。",
    "如果某方的论证在讨论中被充分质疑且未能有效回应，要明确指出其不足，而不是给它同等地位。",
    buildDiscussionContext(state.lastSummary, roundNotes, []),
    rolePromptBlock(judgeRole),
    \`篇幅要求：\${budget.charHint}\`,
    "绝对不要输出 thinking process、英文分析草稿、自检步骤、constraint list 或任何内部推理过程。",
    "要求：直接输出最终裁判发言正文，至少写 4 段，开头必须是清晰的最终判断，结尾必须是具体建议。",
  ].join("\\n\\n");`;

if (!c.includes(judgeOld)) {
  console.error('judge prompt old string not found');
  process.exit(1);
}
c = c.replace(judgeOld, judgeNew);
console.log('judge prompt patched');

fs.writeFileSync(file, c, 'utf8');
console.log('all patches done');
