const store = require('../../utils/store.js')
const srs = require('../../utils/srs.js')
const csv = require('../../utils/csv.js')
const exchange = require('../../utils/exchange.js')
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
  },

  // ===== 导出牌组（含/不含学习进度，始终带模板）=====

  onExport(e) {
    const id = e.currentTarget.dataset.id
    const deck = store.getDeck(id)
    if (!deck) return
    if (!deck.cards || deck.cards.length === 0) {
      wx.showModal({ title: i18n.t('decks.exportEmptyTitle'), content: i18n.t('decks.exportEmptyContent'), showCancel: false })
      return
    }
    // 需求 1/2：让用户选择「牌组 + 进度」或「仅牌组」
    wx.showActionSheet({
      itemList: [i18n.t('decks.exportWithProgress'), i18n.t('decks.exportDeckOnly')],
      success: (res) => {
        const includeProgress = res.tapIndex === 0
        this.doExport(deck, includeProgress)
      }
    })
  },

  // 生成导出文件写入用户目录，再按环境保存/分享
  doExport(deck, includeProgress) {
    let text
    try {
      text = store.exportDeck(deck.id, includeProgress)
    } catch (err) {
      wx.showModal({ title: i18n.t('decks.exportFailTitle'), content: err.message || i18n.t('decks.exportFailContent'), showCancel: false })
      return
    }
    // 文件名：牌组名 + 时间戳，非法字符替换为下划线
    const safeName = (deck.name || 'deck').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40)
    const suffix = includeProgress ? '_progress' : ''
    const fileName = `${safeName}${suffix}_${this.formatDate(Date.now())}.json`
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`
    try {
      fs.writeFileSync(filePath, text, 'utf-8')
    } catch (err) {
      wx.showModal({ title: i18n.t('decks.exportFailTitle'), content: i18n.t('decks.exportFailContent'), showCancel: false })
      return
    }
    this.shareFile(filePath)
  },

  // 把生成的文件交给用户：优先系统分享（Android/iOS），微信端用 shareFileMessage
  shareFile(filePath) {
    // 多端衍生 App：系统分享面板
    if (wx.miniapp && typeof wx.miniapp.shareFileMessage === 'function') {
      wx.miniapp.shareFileMessage({
        filePath,
        fail: () => {}
      })
      return
    }
    // 微信客户端：分享文件到会话
    if (typeof wx.shareFileMessage === 'function') {
      wx.shareFileMessage({
        filePath,
        fail: (err) => {
          // 用户取消不提示；其他失败给出保存提示
          if (err && /cancel/i.test(err.errMsg || '')) return
          wx.showModal({ title: i18n.t('decks.exportSavedTitle'), content: i18n.t('decks.exportSavedContent'), showCancel: false })
        }
      })
      return
    }
    // 开发者工具等无分享能力：保存到本地并提示
    if (typeof wx.saveFileToDisk === 'function') {
      wx.saveFileToDisk({
        filePath,
        success: () => wx.showToast({ title: i18n.t('decks.exportSavedTitle'), icon: 'none' }),
        fail: () => wx.showModal({ title: i18n.t('decks.exportSavedTitle'), content: i18n.t('decks.exportSavedContent'), showCancel: false })
      })
      return
    }
    wx.showModal({ title: i18n.t('decks.exportSavedTitle'), content: i18n.t('decks.exportSavedContent'), showCancel: false })
  },

  // 生成 YYYYMMDDHHmm 便于文件名排序
  formatDate(ts) {
    const d = new Date(ts)
    const p = n => (n < 10 ? '0' + n : '' + n)
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`
  },

  // ===== 导入牌组（.json，含模板与可选进度）=====

  onImportDeck() {
    // 与 CSV 导入一致：按环境选择文件选择器
    if (wx.miniapp && typeof wx.miniapp.chooseFile === 'function') {
      wx.miniapp.chooseFile({
        allowsMultipleSelection: false,
        success: (res) => {
          const file = res.tempFiles && res.tempFiles[0]
          if (!file) return
          if (file.name && !/\.(json|txt)$/i.test(file.name.trim())) {
            wx.showModal({ title: i18n.t('decks.fileTypeTitle'), content: i18n.t('decks.fileTypeContent'), showCancel: false })
            return
          }
          this.readDeckFile(file.path)
        },
        fail: () => {}
      })
      return
    }
    if (typeof wx.chooseMessageFile === 'function') {
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['json', 'txt'],
        success: (res) => {
          const file = res.tempFiles && res.tempFiles[0]
          if (!file) return
          this.readDeckFile(file.path)
        },
        fail: () => {}
      })
      return
    }
    wx.showModal({
      title: i18n.t('decks.cannotChooseTitle'),
      content: i18n.t('decks.cannotChooseContent'),
      showCancel: false
    })
  },

  readDeckFile(path) {
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: path,
      encoding: 'utf-8',
      success: (res) => {
        let parsed
        try {
          parsed = exchange.parse(res.data)
        } catch (err) {
          // exchange.parse 抛出的是错误键（empty/invalidJson/...），映射到本地化文案
          const key = 'decks.importErr' + (err.message ? err.message.charAt(0).toUpperCase() + err.message.slice(1) : '')
          const msg = i18n.t(key)
          wx.showModal({
            title: i18n.t('decks.importDeckParseFailTitle'),
            content: msg === key ? (err.message || i18n.t('decks.importFailContent')) : msg,
            showCancel: false
          })
          return
        }
        this.confirmImportDeck(parsed)
      },
      fail: () => {
        wx.showModal({ title: i18n.t('decks.readFailTitle'), content: i18n.t('decks.readFailContent'), showCancel: false })
      }
    })
  },

  confirmImportDeck(parsed) {
    const deckName = parsed.deck.name || i18n.t('exchange.importedDeck')
    const n = parsed.deck.cards.length
    const tplText = parsed.template
      ? i18n.t('decks.importDeckWithTpl', { name: parsed.template.name })
      : i18n.t('decks.importDeckNoTpl')
    const key = parsed.includeProgress ? 'decks.importDeckConfirmProgress' : 'decks.importDeckConfirmNoProgress'
    wx.showModal({
      title: i18n.t('decks.importDeckConfirmTitle'),
      content: i18n.t(key, { deck: deckName, n, tpl: tplText }),
      confirmText: i18n.t('decks.importConfirm'),
      success: (res) => {
        if (!res.confirm) return
        try {
          // parse 已完成，把规范化对象重新序列化交给 store.importDeck 复用其建牌逻辑
          const result = store.importDeck(exchange.stringify({
            format: exchange.FORMAT,
            version: parsed.version,
            includeProgress: parsed.includeProgress,
            template: parsed.template,
            deck: parsed.deck
          }))
          wx.showModal({
            title: i18n.t('decks.importDeckDoneTitle'),
            content: i18n.t('decks.importDeckDoneContent', { deck: result.deck.name, n: result.imported }),
            showCancel: false
          })
          this.refresh()
        } catch (err) {
          wx.showModal({ title: i18n.t('decks.importFailTitle'), content: err.message || i18n.t('decks.importFailContent'), showCancel: false })
        }
      }
    })
  }
})
