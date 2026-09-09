const store = require('../../utils/store.js')
const srs = require('../../utils/srs.js')

Page({
  data: {
    deckCount: 0,
    cardCount: 0,
    dueCount: 0,
    masteredCount: 0
  },

  onShow() {
    const now = Date.now()
    const decks = store.getDecks()
    let cardCount = 0
    let dueCount = 0
    let masteredCount = 0
    decks.forEach(d => {
      d.cards.forEach(c => {
        cardCount++
        if (srs.isDue(c, now)) dueCount++
        // 熟练：复习过 3 次以上且间隔大于等于 7 天
        if (c.srs && c.srs.reps >= 3 && c.srs.interval >= 7) masteredCount++
      })
    })
    this.setData({
      deckCount: decks.length,
      cardCount,
      dueCount,
      masteredCount
    })
  }
})
