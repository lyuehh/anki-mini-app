# Anki 微信小程序

一个基于间隔重复（FSRS 算法）的记忆卡片微信小程序，数据全部保存在本地存储，无需后端。

## 功能

- **牌组管理**：新建 / 删除牌组，新建时可指定模板（也可随时修改牌组使用的模板），查看每个牌组的卡片数与待复习数量；支持选择 CSV 文件**导入**（微信端从会话选择，Android/iOS 端调用系统文件选择器）
- **卡片管理**：为牌组添加正反面卡片，删除卡片；牌组指定模板后，添加卡片改为按模板字段填写，自动渲染成正反面
- **模板功能**：新建模板 → 为模板添加字段 → 用 `{{字段名}}` 编辑正反面模板（正反面只能引用本模板的字段，保存时校验）；纯文本替换，带实时预览；可设置**内容放大倍数**，复习时按此倍数放大正反面字号，方便识别。**更新模板并保存时，会提示有多少张已有卡片受影响，并用新模板重新渲染这些卡片的正反面**（依据卡片保存的字段原始值）
- **学习复习**：翻转卡片查看答案，按「忘记 / 困难 / 良好 / 简单」四档评分，自动安排下次复习时间（FSRS）
- **学习统计**：牌组数、卡片总数、待复习、已掌握概览

## 关于模板

微信小程序页面用 WXML（非 HTML），卡片内不能执行内嵌的 `html` / `script` / `css`（`rich-text` 仅支持有限标签白名单且不执行脚本）。因此模板采用**纯文本变量替换**：模板正反面文本中用 `{{字段名}}` 作为占位符，渲染时替换为对应字段的纯文本值。字段与模板绑定，正反面只能使用该模板已定义的字段。

## 导入 CSV

在「牌组」页点击右上角「导入 CSV」选择 Anki 导出的 CSV 文件即可导入。本项目已适配为多端应用，文件选择会按运行环境自动切换：

- **微信客户端 / 开发者工具**：使用 `wx.chooseMessageFile`，从微信会话选择文件。
- **Android / iOS 衍生 App**：使用多端框架的 `wx.miniapp.chooseFile` 拉起系统文件选择器。该接口需构建安装包在真机测试，不支持在微信开发者工具或移动应用助手中调试（参见[官方文档](https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/miniapp/api/miniapp/chooseFile.html)）。

支持 Anki 的特殊 CSV 格式：文件开头以 `#` 开头的行为配置项，随后每行一张卡片。目前支持的配置项：

```
#separator:Comma              分隔符，默认逗号（可用 Comma/Tab/Semicolon/Space/Pipe，或直接给字符）
#html:false                   本项目不支持 HTML，一律按纯文本处理
#notetype:Basic               Anki 笔记类型，仅记录不做特殊处理
#deck:Chinese Characters P1   牌组名称（缺省时用「模板名 + 导入」）
#columns:Character,Pinyin,Meaning,Tags   各列对应的字段名（对应模板变量）
#tags column:4                标签所在列；本项目当作普通字段处理
```

示例：

```
#separator:Comma
#html:false
#notetype:Basic
#deck:Chinese Characters P1
#columns:Character,Pinyin,Meaning,Tags
#tags column:4
衣,yī,clothes,Lesson01
鱼,yú,fish,Lesson01
```

导入时需先选择一个模板，且**模板字段必须与 `#columns` 严格匹配**（字段名集合完全一致，多一个或少一个都不行）才能导入。每行数据按列名填入对应字段，再用模板渲染出卡片正反面。

## 目录结构

```
├── app.js              # 小程序入口，初始化本地数据
├── app.json            # 全局配置、页面注册、tabBar
├── app.wxss            # 全局样式与 CSS 变量
├── project.config.json # 开发者工具项目配置
├── sitemap.json
├── utils/
│   ├── store.js        # 本地存储数据层（牌组/卡片/模板 CRUD）
│   ├── srs.js          # FSRS 间隔重复算法（兼容旧版 SM-2 数据迁移）
│   ├── csv.js          # Anki CSV 解析（配置项 + 数据行）
│   └── template.js     # 纯文本模板渲染（{{字段}} 替换、字段提取与校验）
└── pages/
    ├── index/          # 学习统计（tab）
    ├── decks/          # 牌组列表（tab）
    ├── templates/      # 模板列表（tab）
    ├── template-edit/  # 模板编辑（字段管理 + 正反面模板 + 预览）
    ├── study/          # 学习复习页
    └── card-edit/      # 卡片管理页
```

## 运行

1. 用微信开发者工具导入本目录
2. AppID 使用测试号（当前 `project.config.json` 已设为 `touristappid`）
3. 编译预览即可，首次启动会自动写入一个示例牌组

## 数据存储

所有数据存放于 `wx.storage`：

牌组键为 `anki_decks`：

```js
[{ id, name, templateId, createdAt, cards: [{ id, front, back, fields, srs: { ease, interval, reps, due } }] }]
```

> `fields` 为用模板创建卡片时填写的字段原始值（如 `{ 单词: 'apple', 释义: '苹果' }`）。更新模板后可据此重新渲染 `front` / `back`；非模板卡片没有该字段。

模板键为 `anki_templates`：

```js
[{ id, name, createdAt, fields: ['字段A', '字段B'], front: '{{字段A}}', back: '{{字段B}}', scale: 1 }]
```
