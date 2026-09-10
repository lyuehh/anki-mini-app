const store = require('../../utils/store.js')
const srs = require('../../utils/srs.js')
const csv = require('../../utils/csv.js')
const i18n = require('../../utils/i18n.js')

Page({
  data: {
    decks: []
  },

  onShow() {
    i18n.attach(this)
    wx.setNavigationBarTitle({ title: i18n.t('nav.decks') })
    this.refresh()
  },

  refresh() {
    const now = Date.now()
    const templates = store.getTemplates()
    const decks = store.getDecks().map(d => {
      const total = d.cards.length
      const due = d.cards.filter(c => srs.isDue(c, now)).length
      const tpl = d.templateId ? templates.find(t => t.id === d.templateId) : null
      const templateName = tpl ? tpl.name : ''
      return {
        id: d.id,
        name: d.name,
        total,
        due,
        templateName,
        // 含占位符的文案在此渲染，便于随语言切换
        totalText: i18n.t('decks.totalCards', { n: total }),
        dueText: due > 0 ? i18n.t('decks.due', { n: due }) : i18n.t('decks.finished'),
        tplText: templateName ? i18n.t('decks.template', { name: templateName }) : i18n.t('decks.noTemplate')
      }
    })
    this.setData({ decks })
  },

  onAddDeck() {
    wx.showModal({
      title: i18n.t('decks.addTitle'),
      editable: true,
      placeholderText: i18n.t('decks.addPlaceholder'),
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
        title: i18n.t('decks.noTplTitle'),
        content: i18n.t('decks.noTplContent'),
        confirmText: i18n.t('decks.continue'),
        success: (res) => {
          if (res.confirm) {
            store.addDeck(name, '')
            this.refresh()
          }
        }
      })
      return
    }
    const itemList = templates.map(t => t.name).concat([i18n.t('decks.noTplItem')])
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
      wx.showToast({ title: i18n.t('decks.noTplToast'), icon: 'none' })
      return
    }
    const itemList = templates.map(t => t.name).concat([i18n.t('decks.noTplItem')])
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
      title: i18n.t('decks.deleteTitle'),
      content: i18n.t('decks.deleteContent'),
      success: (res) => {
        if (res.confirm) {
          store.deleteDeck(id)
          this.refresh()
        }
      }
    })
  },

  // ===== 导入 CSV =====

  // 选择 CSV 文件并导入
  //
  // 本项目已转为多端应用（微信 / Android / iOS / 鸿蒙）。
  // 微信客户端里 `wx.chooseMessageFile` 从会话选文件；但在 Android / iOS
  // 衍生 App 上没有「微信会话」，需改用多端框架提供的 `wx.miniapp.chooseFile`
  // 拉起系统文件选择器。这里按环境选择合适的选择器，二者都不可用时兜底。
  // 参考：https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/miniapp/api/miniapp/chooseFile.html
  onImportCsv() {
    // wx.miniapp.chooseFile 仅在 Android / iOS 衍生 App 真机可用
    // （不支持微信开发者工具、移动应用助手调试），故运行时探测存在性。
    if (wx.miniapp && typeof wx.miniapp.chooseFile === 'function') {
      wx.miniapp.chooseFile({
        allowsMultipleSelection: false,
        success: (res) => {
          const file = res.tempFiles && res.tempFiles[0]
          if (!file) return
          if (!this.isCsvFile(file.name)) {
            wx.showModal({ title: i18n.t('decks.fileTypeTitle'), content: i18n.t('decks.fileTypeContent'), showCancel: false })
            return
          }
          this.readCsvFile(file.path)
        },
        fail: () => {
          // 用户取消不提示
        }
      })
      return
    }

    // 微信客户端 / 开发者工具：从会话选择文件
    if (typeof wx.chooseMessageFile === 'function') {
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
      return
    }

    wx.showModal({
      title: i18n.t('decks.cannotChooseTitle'),
      content: i18n.t('decks.cannotChooseContent'),
      showCancel: false
    })
  },

  // 校验文件名后缀是否为受支持的 CSV/TXT
  isCsvFile(name) {
    if (!name) return true // 部分平台可能不返回文件名，此时不阻断
    return /\.(csv|txt)$/i.test(name.trim())
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
          wx.showModal({ title: i18n.t('decks.parseFailTitle'), content: err.message || i18n.t('decks.parseFailContent'), showCancel: false })
          return
        }
        if (!parsed.columns || parsed.columns.length === 0) {
          wx.showModal({ title: i18n.t('decks.noColumnsTitle'), content: i18n.t('decks.noColumnsContent'), showCancel: false })
          return
        }
        if (!parsed.rows || parsed.rows.length === 0) {
          wx.showModal({ title: i18n.t('decks.noRowsTitle'), content: i18n.t('decks.noRowsContent'), showCancel: false })
          return
        }
        this.pickTemplateForImport(parsed)
      },
      fail: () => {
        wx.showModal({ title: i18n.t('decks.readFailTitle'), content: i18n.t('decks.readFailContent'), showCancel: false })
      }
    })
  },

  // 让用户选择导入使用的模板
  pickTemplateForImport(parsed) {
    const templates = store.getTemplates()
    if (templates.length === 0) {
      wx.showModal({
        title: i18n.t('decks.noTplTitle'),
        content: i18n.t('decks.importNoTplContent'),
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
      if (missing.length) parts.push(i18n.t('decks.mismatchCsvOnly', { fields: missing.join('、') }))
      if (extra.length) parts.push(i18n.t('decks.mismatchTplOnly', { fields: extra.join('、') }))
      wx.showModal({
        title: i18n.t('decks.mismatchTitle'),
        content: i18n.t('decks.mismatchContent', { name: tpl.name, detail: parts.join('\n') }),
        showCancel: false
      })
      return
    }

    const deckName = parsed.deckName || tpl.name + i18n.t('decks.importedSuffix')
    wx.showModal({
      title: i18n.t('decks.confirmImportTitle'),
      content: i18n.t('decks.confirmImportContent', { tpl: tpl.name, n: parsed.rows.length, deck: deckName }),
      confirmText: i18n.t('decks.importConfirm'),
      success: (res) => {
        if (!res.confirm) return
        try {
          const result = store.importDeckFromCsv(deckName, tpl.id, columns, parsed.rows)
          wx.showToast({ title: i18n.t('decks.importedToast', { n: result.imported }), icon: 'none' })
          this.refresh()
        } catch (err) {
          wx.showModal({ title: i18n.t('decks.importFailTitle'), content: err.message || i18n.t('decks.importFailContent'), showCancel: false })
        }
      }
    })
  }
})
