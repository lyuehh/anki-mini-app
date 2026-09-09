const store = require('../../utils/store.js')
const srs = require('../../utils/srs.js')
const csv = require('../../utils/csv.js')

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
  },

  // ===== 导入 CSV =====

  // 从微信会话选择 CSV 文件并导入
  onImportCsv() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv', 'txt'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        this.readCsvFile(file.path)
      },
      fail: () => {
        // 用户取消不提示
      }
    })
  },

  // 读取文件内容并解析
  readCsvFile(path) {
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: path,
      encoding: 'utf-8',
      success: (res) => {
        let parsed
        try {
          parsed = csv.parse(res.data)
        } catch (err) {
          wx.showModal({ title: '解析失败', content: err.message || '无法解析该 CSV 文件', showCancel: false })
          return
        }
        if (!parsed.columns || parsed.columns.length === 0) {
          wx.showModal({ title: '缺少列定义', content: 'CSV 文件缺少 #columns 配置行，无法确定各列对应的字段名。', showCancel: false })
          return
        }
        if (!parsed.rows || parsed.rows.length === 0) {
          wx.showModal({ title: '没有数据', content: 'CSV 文件中没有可导入的卡片数据。', showCancel: false })
          return
        }
        this.pickTemplateForImport(parsed)
      },
      fail: () => {
        wx.showModal({ title: '读取失败', content: '无法读取所选文件', showCancel: false })
      }
    })
  },

  // 让用户选择导入使用的模板
  pickTemplateForImport(parsed) {
    const templates = store.getTemplates()
    if (templates.length === 0) {
      wx.showModal({
        title: '暂无模板',
        content: '导入 CSV 需要先创建模板，并使模板字段与 CSV 的 #columns 严格匹配。请到「模板」页新建模板。',
        showCancel: false
      })
      return
    }
    wx.showActionSheet({
      itemList: templates.map(t => t.name),
      success: (res) => {
        const tpl = templates[res.tapIndex]
        this.validateAndImport(parsed, tpl)
      }
    })
  },

  // 校验模板字段与 columns 严格匹配后导入
  validateAndImport(parsed, tpl) {
    const columns = parsed.columns
    const fields = tpl.fields || []
    // 严格匹配：名称集合完全一致（数量与内容都相同）
    const missing = columns.filter(c => fields.indexOf(c) === -1)
    const extra = fields.filter(f => columns.indexOf(f) === -1)
    if (missing.length > 0 || extra.length > 0) {
      const parts = []
      if (missing.length) parts.push(`CSV 有而模板缺少：${missing.join('、')}`)
      if (extra.length) parts.push(`模板有而 CSV 缺少：${extra.join('、')}`)
      wx.showModal({
        title: '字段不匹配',
        content: `模板「${tpl.name}」的字段与 CSV 的列必须严格匹配。\n${parts.join('\n')}`,
        showCancel: false
      })
      return
    }

    const deckName = parsed.deckName || tpl.name + ' 导入'
    wx.showModal({
      title: '确认导入',
      content: `将使用模板「${tpl.name}」把 ${parsed.rows.length} 行数据导入到牌组「${deckName}」，是否继续？`,
      confirmText: '导入',
      success: (res) => {
        if (!res.confirm) return
        try {
          const result = store.importDeckFromCsv(deckName, tpl.id, columns, parsed.rows)
          wx.showToast({ title: `已导入 ${result.imported} 张卡片`, icon: 'none' })
          this.refresh()
        } catch (err) {
          wx.showModal({ title: '导入失败', content: err.message || '导入过程出错', showCancel: false })
        }
      }
    })
  }
})
