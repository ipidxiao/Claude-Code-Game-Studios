# CoC Engine V18.6 R29.57 发布审查

发布日期：2026-10-10

## 本批范围

- `index.html` 去掉 Vue、Chart、pdf.js、anime.js 的 CDN 回退，只加载本地 `vendor/`。
- 设置页写明：使用联网守秘人时，行动、角色姓名和密钥会发送到接口地址中的主机。
- 视口使用 `viewport-fit=cover`，`#app` 增加顶部安全区内边距。

## 未纳入本批

- 未加内容安全策略。
- 未改接口请求逻辑、规则、存档和理智公式。
- `js/scenario/pdf_import.mjs` 在本地 pdf.js 缺失时仍会请求 cdnjs。

## 回滚点

- 撤销本批：回到 `6038b10`（浏览器验收单 worker）。
