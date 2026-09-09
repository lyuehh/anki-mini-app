const store = require('../../utils/store.js')
const template = require('../../utils/template.js')

Page({
  data: {
    deckId: '',
    deckName: '',
    cards: [],
    front: '',
    back: '',
    // 模板相关
    tpl: null,          // 牌组绑定的模板（无则为 null）
    fieldValues: {}     // 模板字段名 -> 输入值
  },

  onLoad(options) {
    this.setData({ deckId: options.deckId })
    this.refresh()
  },

  refresh() {
    const deck = store.getDeck(this.data.deckId)
    if (!deck) return
    wx.setNavigationBarTitle({ title: deck.name })
    const tpl = deck.templateId ? store.getTemplate(deck.templateId) : null
    this.setData({ deckName: deck.name, cards: deck.cards, tpl })
  },

  onFrontInput(e) {
    this.setData({ front: e.detail.value })
  },

  onBackInput(e) {
    this.setData({ back: e.detail.value })
  },

  // 模板字段输入
  onFieldInput(e) {
    const name = e.currentTarget.dataset.name
    const fieldValues = Object.assign({}, this.data.fieldValues)
    fieldValues[name] = e.detail.value
    this.setData({ fieldValues })
  },

  onAddCard() {
    const tpl = this.data.tpl
    if (tpl) {
      // 使用模板：按字段填写，渲染出正反面
      const values = this.data.fieldValues
      const filled = (tpl.fields || []).some(f => (values[f] || '').trim())
      if (!filled) {
        wx.showToast({ title: '请至少填写一个字段', icon: 'none' })
        return
      }
      const front = template.render(tpl.front, values).trim()
      const back = template.render(tpl.back, values).trim()
      if (!front && !back) {
        wx.showToast({ title: '渲染结果为空，请检查模板', icon: 'none' })
        return
      }
      store.addCard(this.data.deckId, front, back)
      this.setData({ fieldValues: {} })
      this.refresh()
      return
    }

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
