const store = require('../../utils/store.js')
const srs = require('../../utils/srs.js')

Page({
  data: {
    deckId: '',
    deckName: '',
    queue: [],      // 待复习卡片
    current: null,  // 当前卡片
    showBack: false,
    doneCount: 0,
    finished: false,
    scale: 1        // 内容放大倍数（来自牌组绑定的模板）
  },

  onLoad(options) {
    const deckId = options.deckId
    const deck = store.getDeck(deckId)
    if (!deck) {
      wx.showToast({ title: '牌组不存在', icon: 'none' })
      return
    }
    const now = Date.now()
    const queue = deck.cards.filter(c => srs.isDue(c, now))
    const tpl = deck.templateId ? store.getTemplate(deck.templateId) : null
    this.setData({
      deckId,
      deckName: deck.name,
      queue,
      scale: (tpl && tpl.scale) || 1,
      finished: queue.length === 0
    })
    wx.setNavigationBarTitle({ title: deck.name })
    this.next()
  },

  next() {
    const queue = this.data.queue
    if (queue.length === 0) {
      this.setData({ current: null, finished: true })
      return
    }
    this.setData({ current: queue[0], showBack: false })
  },

  onFlip() {
    this.setData({ showBack: true })
  },

  onRate(e) {
    const quality = Number(e.currentTarget.dataset.q)
    const card = this.data.current
    if (!card) return

    const newSrs = srs.review(card, quality)
    store.updateCard(this.data.deckId, card.id, { srs: newSrs })

    const queue = this.data.queue.slice(1)
    // 忘记的卡片重新加入队尾，本轮再练一次
    if (quality === 0) {
      queue.push(Object.assign({}, card, { srs: newSrs }))
    }
    this.setData({
      queue,
      doneCount: this.data.doneCount + (quality === 0 ? 0 : 1)
    })
    this.next()
  },

  onBack() {
    wx.navigateBack()
  }
})
