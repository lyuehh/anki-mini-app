const store = require('../../utils/store.js')
const template = require('../../utils/template.js')
const i18n = require('../../utils/i18n.js')

Page({
  data: {
    deckId: '',
    deckName: '',
    cards: [],
    front: '',
    back: '',
    // 模板相关
    tpl: null,          // 牌组绑定的模板（无则为 null）
    tplFields: [],      // 模板字段的展示信息（含本地化占位符）
    fieldValues: {},    // 模板字段名 -> 输入值
    listTitle: ''       // 卡片列表标题（含数量，随语言切换）
  },

  onLoad(options) {
    this.setData({ deckId: options.deckId })
  },

  onShow() {
    i18n.attach(this)
    this.refresh()
  }

  refresh() {
    const deck = store.getDeck(this.data.deckId)
    if (!deck) return
    wx.setNavigationBarTitle({ title: deck.name })
    const tpl = deck.templateId ? store.getTemplate(deck.templateId) : null
    // 每个字段预生成本地化占位符，供 WXML 直接绑定
    const tplFields = tpl ? (tpl.fields || []).map(f => ({
      name: f,
      placeholder: i18n.t('cardEdit.fieldPlaceholder', { name: f })
    })) : []
    this.setData({
      deckName: deck.name,
      cards: deck.cards,
      tpl,
      tplFields,
      tplHintText: tpl ? i18n.t('cardEdit.tplHint', { name: tpl.name }) : '',
      listTitle: i18n.t('cardEdit.listTitle', { n: deck.cards.length })
    })
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
        wx.showToast({ title: i18n.t('cardEdit.needOneField'), icon: 'none' })
        return
      }
      const front = template.render(tpl.front, values).trim()
      const back = template.render(tpl.back, values).trim()
      if (!front && !back) {
        wx.showToast({ title: i18n.t('cardEdit.renderEmpty'), icon: 'none' })
        return
      }
      store.addCard(this.data.deckId, front, back, values)
      this.setData({ fieldValues: {} })
      this.refresh()
      return
    }

    const front = this.data.front.trim()
    const back = this.data.back.trim()
    if (!front || !back) {
      wx.showToast({ title: i18n.t('cardEdit.needBoth'), icon: 'none' })
      return
    }
    store.addCard(this.data.deckId, front, back)
    this.setData({ front: '', back: '' })
    this.refresh()
  },

  onDeleteCard(e) {
    const cardId = e.currentTarget.dataset.id
    wx.showModal({
      title: i18n.t('cardEdit.deleteTitle'),
      content: i18n.t('cardEdit.deleteContent'),
      success: (res) => {
        if (res.confirm) {
          store.deleteCard(this.data.deckId, cardId)
          this.refresh()
        }
      }
    })
  }
})
