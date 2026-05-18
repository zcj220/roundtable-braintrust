"""删除 app.js 中重复的旧开场代码块（行 7783-7837）"""

with open('prototype-ui/app.js', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Before: {len(lines)} lines")
print(f"Line 7782: {lines[7781].rstrip()}")
print(f"Line 7783: {lines[7782].rstrip()}")
print(f"Line 7836: {lines[7835].rstrip()}")
print(f"Line 7837: {lines[7836].rstrip()}")
print(f"Line 7838: {lines[7837].rstrip()}")

# 删除 0-indexed 7782..7836（即 1-indexed 7783-7837，55 行）
new_lines = lines[:7782] + lines[7837:]

print(f"After: {len(new_lines)} lines")
print(f"New line 7782: {new_lines[7781].rstrip()}")
print(f"New line 7783: {new_lines[7782].rstrip()}")

with open('prototype-ui/app.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done.")
