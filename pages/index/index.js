const store = require('../../utils/store.js')
const srs = require('../../utils/srs.js')
const i18n = require('../../utils/i18n.js')

Page({
  data: {
    deckCount: 0,
    cardCount: 0,
    dueCount: 0,
    masteredCount: 0
  },

  onShow() {
    // 应用当前语言（文案树 + tabBar + 导航栏标题）
    this.applyLocale()

    const now = Date.now()
    const decks = store.getDecks()
    let cardCount = 0
    let dueCount = 0
    let masteredCount = 0
    decks.forEach(d => {
      d.cards.forEach(c => {
        cardCount++
        if (srs.isDue(c, now)) dueCount++
        // 熟练：FSRS 处于复习态且下次间隔 ≥ 7 天
        if (srs.isMastered(c)) masteredCount++
      })
    })
    this.setData({
      deckCount: decks.length,
      cardCount,
      dueCount,
      masteredCount
    })
  },

  // 把当前语言写入 data，并刷新 tabBar 与导航栏标题
  applyLocale() {
    i18n.attach(this)
    i18n.updateTabBar()
    wx.setNavigationBarTitle({ title: i18n.t('nav.index') })
  },

  // 切换语言（点击语言选项）
  onSwitchLocale(e) {
    const locale = e.currentTarget.dataset.locale
    if (locale === i18n.getLocale()) return
    i18n.setLocale(locale)
    this.applyLocale()
  }
})
