const store = require('../../utils/store.js')
const srs = require('../../utils/srs.js')

Page({
  data: {
    decks: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const now = Date.now()
    const decks = store.getDecks().map(d => {
      const total = d.cards.length
      const due = d.cards.filter(c => srs.isDue(c, now)).length
      return { id: d.id, name: d.name, total, due }
    })
    this.setData({ decks })
  },

  onAddDeck() {
    wx.showModal({
      title: '新建牌组',
      editable: true,
      placeholderText: '请输入牌组名称',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          store.addDeck(res.content.trim())
          this.refresh()
        }
      }
    })
  },

  onStudy(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/study/study?deckId=${id}` })
  },

  onManage(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/card-edit/card-edit?deckId=${id}` })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除牌组',
      content: '确定删除该牌组及其所有卡片？',
      success: (res) => {
        if (res.confirm) {
          store.deleteDeck(id)
          this.refresh()
        }
      }
    })
  }
})
