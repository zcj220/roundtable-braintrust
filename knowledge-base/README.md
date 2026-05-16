# Knowledge Base V1

## 目标

第一版采用双层结构：

- 全局知识库：跨项目长期复用
- 项目知识包：仅当前项目使用，可结束后删除

## 推荐目录

- company
- product
- process
- reference
- project

## 推荐上传格式

- txt
- md / markdown
- json
- csv
- pdf
- docx
- xlsx / xls

说明：旧版 doc 建议先转换为 docx 再导入。

## 运行时策略

- 项目知识默认参与当前项目讨论
- 全局知识需要勾选后才注入当前项目
- 讨论时先按目录过滤，再把少量摘要注入 prompt
