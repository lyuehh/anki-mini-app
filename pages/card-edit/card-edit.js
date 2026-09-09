const store = require('../../utils/store.js')

Page({
  data: {
    deckId: '',
    deckName: '',
    cards: [],
    front: '',
    back: ''
  },

  onLoad(options) {
    this.setData({ deckId: options.deckId })
    this.refresh()
  },

  refresh() {
    const deck = store.getDeck(this.data.deckId)
    if (!deck) return
    wx.setNavigationBarTitle({ title: deck.name })
    this.setData({ deckName: deck.name, cards: deck.cards })
  },

  onFrontInput(e) {
    this.setData({ front: e.detail.value })
  },

  onBackInput(e) {
    this.setData({ back: e.detail.value })
  },

  onAddCard() {
    const front = this.data.front.trim()
    const back = this.data.back.trim()
    if (!front || !back) {
      wx.showToast({ title: '正反面均需填写', icon: 'none' })
      return
    }
    store.addCard(this.data.deckId, front, back)
    this.setData({ front: '', back: '' })
    this.refresh()
  },

  onDeleteCard(e) {
    const cardId = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除卡片',
      content: '确定删除这张卡片？',
      success: (res) => {
        if (res.confirm) {
          store.deleteCard(this.data.deckId, cardId)
          this.refresh()
        }
      }
    })
  }
})
