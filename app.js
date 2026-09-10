// app.js
const store = require('./utils/store.js')
const i18n = require('./utils/i18n.js')

App({
  onLaunch() {
    // 初始化本地数据（首次启动写入示例牌组）
    store.init()
    // 按已保存的语言刷新 tabBar 文案（默认中文）
    i18n.updateTabBar()
  },
  globalData: {}
})
