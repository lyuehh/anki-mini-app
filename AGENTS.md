# AGENTS.md

本文件面向在本仓库工作的编码 Agent。仓库是一个**基于间隔重复（SM-2）的记忆卡片微信多端小程序**，数据全部保存在本地存储，无后端。项目背景与功能详见 `README.md`。

## 协作与提交规范（重要）

- **禁止直接向 `master` 提交或推送。** 任何改动都必须在独立分支上进行，并发起一个单独的 MR（Merge Request / Pull Request）等待评审合入。
- 每次任务：
  1. 从最新 `master` 切出功能分支，命名建议 `feat/xxx`、`fix/xxx`、`docs/xxx`、`refactor/xxx`。
  2. 在分支上完成改动并自测。
  3. 推送分支并创建一个 MR，标题概述改动、描述说明动机与影响面。
  4. 一个 MR 只做一件事，保持改动聚焦、可评审。
- 不要在一个分支/MR 里混入互不相关的改动。

## 项目速览

- 平台：微信「多端应用」小程序，目标端包含 微信小程序 / Android / iOS / HarmonyOS（见 `project.miniapp.json`）。
- 无后端，数据存于微信本地存储（`wx.getStorageSync`/`wx.setStorageSync`）：牌组键 `anki_decks`、模板键 `anki_templates`（结构见 `README.md`）。
- 页面用 WXML/WXSS，卡片内容为**纯文本模板变量替换**（`{{字段名}}`），不执行 HTML/JS/CSS。

### 目录结构

```
├── app.js / app.json / app.wxss      # 入口、全局配置、全局样式
├── project.miniapp.json              # 多端应用配置（Android/iOS/HarmonyOS）
├── utils/
│   ├── store.js      # 本地存储数据层（牌组/卡片/模板 CRUD）
│   ├── srs.js        # SM-2 间隔重复算法
│   ├── csv.js        # Anki CSV 解析
│   └── template.js   # 纯文本模板渲染（{{字段}} 替换与校验）
└── pages/            # index(统计) / decks / templates / template-edit / study / card-edit
```

## 开发约定

- 代码风格沿用现有文件：2 空格缩进、无分号（`utils/*.js` 现状），命名与注释保持中文注释、语义清晰。
- 修改数据结构（`anki_decks` / `anki_templates` 字段）时，务必兼容已有本地数据，避免破坏用户存量卡片。
- 涉及卡片正反面渲染的改动，注意模板字段校验逻辑（`utils/template.js`）与「更新模板重渲染受影响卡片」流程（`store.refreshCardsByTemplate`）。
- 多端相关能力（设备、媒体、文件选择等）在不同端表现可能不同，改动前参考 `.trae/skills/miniapp-multi-end/` 技能。

## 验证

- 用微信开发者工具导入本目录，AppID 使用测试号（`project.config.json` 当前为 `touristappid`）编译预览。
- 涉及多端差异的改动，尽量在对应真机/模拟器验证（Android/iOS/HarmonyOS）。
- 无自动化测试框架；改动核心逻辑（`utils/srs.js`、`utils/csv.js`、`utils/template.js`）时手动构造用例自测边界情况。

## 相关技能（`.trae/skills/`）

- `miniapp-multi-end`：微信多端应用的端差异与真机/模拟器调试要点。
- `anki-capabilities`：Anki 官方能力 与 本项目能力 的对比说明。
