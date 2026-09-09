# Anki 微信小程序

一个基于间隔重复（SM-2 算法）的记忆卡片微信小程序，数据全部保存在本地存储，无需后端。

## 功能

- **牌组管理**：新建 / 删除牌组，查看每个牌组的卡片数与待复习数量
- **卡片管理**：为牌组添加正反面卡片，删除卡片
- **学习复习**：翻转卡片查看答案，按「忘记 / 困难 / 良好 / 简单」四档评分，自动安排下次复习时间（SM-2）
- **学习统计**：牌组数、卡片总数、待复习、已掌握概览

## 目录结构

```
├── app.js              # 小程序入口，初始化本地数据
├── app.json            # 全局配置、页面注册、tabBar
├── app.wxss            # 全局样式与 CSS 变量
├── project.config.json # 开发者工具项目配置
├── sitemap.json
├── utils/
│   ├── store.js        # 本地存储数据层（牌组/卡片 CRUD）
│   └── srs.js          # SM-2 间隔重复算法
└── pages/
    ├── index/          # 学习统计（tab）
    ├── decks/          # 牌组列表（tab）
    ├── study/          # 学习复习页
    └── card-edit/      # 卡片管理页
```

## 运行

1. 用微信开发者工具导入本目录
2. AppID 使用测试号（当前 `project.config.json` 已设为 `touristappid`）
3. 编译预览即可，首次启动会自动写入一个示例牌组

## 数据存储

所有数据存放于 `wx.storage`，键为 `anki_decks`，结构：

```js
[{ id, name, createdAt, cards: [{ id, front, back, srs: { ease, interval, reps, due } }] }]
```
