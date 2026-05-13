const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../prototype-ui/app.js');
let c = fs.readFileSync(file, 'utf8');

const start = c.indexOf('async function createConclusionReport');
const endMarker = '\r\nfunction discussionEvidenceRules';
const end = c.indexOf(endMarker, start);

if (start === -1 || end === -1) {
  console.error('markers not found', start, end);
  process.exit(1);
}

const newFn = `async function createConclusionReport(mainProfile, judgeText, roundNotes, signal) {
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
    buildDiscussionContext(state.lastSummary, roundNotes, []),
    \`裁判总结供参考，从中提取已确立的论据，不要照抄口吻：\${judgeText}\`,
    \`篇幅要求：\${budget.charHint}\`,
  ].join("\\n\\n");

  return requestModelText(mainProfile, prompt, budget.report, signal);
}
`;

c = c.slice(0, start) + newFn + c.slice(end + 2);
fs.writeFileSync(file, c, 'utf8');
console.log('createConclusionReport replaced OK');
