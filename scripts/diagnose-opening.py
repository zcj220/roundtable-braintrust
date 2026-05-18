"""
查找并删除 app.js 中的重复开场代码块。
原始文件已被正确插入新 block，但旧的 openingPrompt + setSpeakerCard + ... + appendRoleMessage 仍残留。
"""

with open('prototype-ui/app.js', encoding='utf-8') as f:
    content = f.read()
    lines = content.splitlines(keepends=True)

print(f"Total lines: {len(lines)}")

# 查找 appendRoleMessage 所有出现位置
am_lines = [i+1 for i, l in enumerate(lines) if 'appendRoleMessage(moderatorRole, formatOpeningMessageLabel' in l]
print("appendRoleMessage(moderatorRole, formatOpeningMessageLabel) at lines:", am_lines)

# 查找 const openingPrompt 所有出现位置
op_lines = [i+1 for i, l in enumerate(lines) if 'const openingPrompt = [' in l]
print("const openingPrompt = [ at lines:", op_lines)

# 查找 const rawOpeningResponse 所有出现位置
ror_lines = [i+1 for i, l in enumerate(lines) if 'const rawOpeningResponse = await requestModelText' in l]
print("const rawOpeningResponse at lines:", ror_lines)

# 查找 let openingText 所有出现位置  
ot_lines = [i+1 for i, l in enumerate(lines) if 'let openingText = rawOpeningResponse' in l]
print("let openingText at lines:", ot_lines)

# 查找 let compressedHistory
ch_lines = [i+1 for i, l in enumerate(lines) if 'let compressedHistory = ""' in l]
print("let compressedHistory at lines:", ch_lines)
