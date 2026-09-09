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
    const templates = store.getTemplates()
    const decks = store.getDecks().map(d => {
      const total = d.cards.length
      const due = d.cards.filter(c => srs.isDue(c, now)).length
      const tpl = d.templateId ? templates.find(t => t.id === d.templateId) : null
      return { id: d.id, name: d.name, total, due, templateName: tpl ? tpl.name : '' }
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
          this.pickTemplate(res.content.trim())
        }
      }
    })
  },

  // 新建牌组时选择模板
  pickTemplate(name) {
    const templates = store.getTemplates()
    if (templates.length === 0) {
      wx.showModal({
        title: '暂无模板',
        content: '还没有任何模板，将创建不使用模板的牌组。可到「模板」页新建模板后再指定。',
        confirmText: '继续',
        success: (res) => {
          if (res.confirm) {
            store.addDeck(name, '')
            this.refresh()
          }
        }
      })
      return
    }
    const itemList = templates.map(t => t.name).concat(['不使用模板'])
    wx.showActionSheet({
      itemList,
      success: (res) => {
        const idx = res.tapIndex
        const templateId = idx < templates.length ? templates[idx].id : ''
        store.addDeck(name, templateId)
        this.refresh()
      }
    })
  },

  // 修改牌组使用的模板
  onChangeTemplate(e) {
    const id = e.currentTarget.dataset.id
    const templates = store.getTemplates()
    if (templates.length === 0) {
      wx.showToast({ title: '暂无可用模板', icon: 'none' })
      return
    }
    const itemList = templates.map(t => t.name).concat(['不使用模板'])
    wx.showActionSheet({
      itemList,
      success: (res) => {
        const idx = res.tapIndex
        const templateId = idx < templates.length ? templates[idx].id : ''
        store.updateDeck(id, { templateId })
        this.refresh()
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
