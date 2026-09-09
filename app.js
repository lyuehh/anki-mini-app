// app.js
const store = require('./utils/store.js')

App({
  onLaunch() {
    // 初始化本地数据（首次启动写入示例牌组）
    store.init()
  },
  globalData: {}
})
