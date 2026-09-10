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
    scale: 1,       // 内容放大倍数（来自牌组绑定的模板）
    // 手写练习相关
    showWrite: false,       // 是否展开手写面板
    showGuide: true,        // 是否显示描红引导层
    writeSource: 'front',   // 描红内容取正面还是背面
    writeText: '',          // 当前描红文本
    writeGuideSize: 260     // 描红字号（rpx，随文本长度自适应）
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
    // 换卡片时清空画布并同步描红文本
    this.syncWriteText()
    this.clearCanvas()
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
  },

  // ===== 手写练习 =====

  // 展开/收起手写面板；首次展开时初始化画布
  onToggleWrite() {
    const showWrite = !this.data.showWrite
    this.setData({ showWrite })
    if (showWrite) {
      this.syncWriteText()
      // 等待画布渲染后再初始化
      wx.nextTick(() => this.initCanvas())
    }
  },

  // 切换描红内容来源（正面/背面）
  onSwitchWriteSource() {
    const writeSource = this.data.writeSource === 'front' ? 'back' : 'front'
    this.setData({ writeSource }, () => this.syncWriteText())
  },

  // 显示/隐藏描红引导层
  onToggleGuide() {
    this.setData({ showGuide: !this.data.showGuide })
  },

  // 根据当前卡片和来源更新描红文本
  syncWriteText() {
    const card = this.data.current
    if (!card) {
      this.setData({ writeText: '', writeGuideSize: 260 })
      return
    }
    const text = this.data.writeSource === 'back' ? (card.back || '') : (card.front || '')
    this.setData({ writeText: text, writeGuideSize: this.computeGuideSize(text) })
  },

  // 根据文本长度自适应描红字号（rpx）：
  // 单字/少字尽量大，方便描红；多字/多行/较长英文单词时按可用宽高自动缩小，避免溢出
  computeGuideSize(text) {
    const t = text || ''
    if (!t.trim()) return 260
    // 画布可用宽/高（rpx，预留内边距）
    const AVAIL_W = 600
    const AVAIL_H = 420
    const LINE_HEIGHT = 1.2
    // 保留换行（含空行）：按行拆分，宽度取最宽行，高度按行数
    const lines = t.split('\n')
    let maxUnits = 0
    for (const line of lines) {
      // 按字符类型估算行宽：中日韩等全角字符约 1em，其余（英文/数字）约 0.6em
      let units = 0
      for (const ch of line) {
        units += /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1 : 0.6
      }
      if (units > maxUnits) maxUnits = units
    }
    const byWidth = AVAIL_W / Math.max(maxUnits, 1)
    const byHeight = AVAIL_H / (lines.length * LINE_HEIGHT)
    let size = Math.floor(Math.min(byWidth, byHeight))
    // 限制在合理区间：最小保证长/多行文本可读，最大避免单字过分放大
    size = Math.max(48, Math.min(size, 300))
    return size
  },

  // 初始化 canvas 2d 上下文（含高清屏适配）
  initCanvas() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#writeCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio || 1
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 8
        ctx.strokeStyle = '#1a202c'
        this._canvas = canvas
        this._ctx = ctx
        this._cssWidth = res[0].width
        this._cssHeight = res[0].height
        this._drawing = false
      })
  },

  // 触摸开始：起笔
  onWriteStart(e) {
    if (!this._ctx) return
    const t = e.touches[0]
    const p = this._toLocal(t)
    this._drawing = true
    this._ctx.beginPath()
    this._ctx.moveTo(p.x, p.y)
    // 单点也画出可见笔迹
    this._ctx.lineTo(p.x + 0.1, p.y + 0.1)
    this._ctx.stroke()
  },

  // 触摸移动：运笔
  onWriteMove(e) {
    if (!this._ctx || !this._drawing) return
    const t = e.touches[0]
    const p = this._toLocal(t)
    this._ctx.lineTo(p.x, p.y)
    this._ctx.stroke()
  },

  // 触摸结束：收笔
  onWriteEnd() {
    this._drawing = false
  },

  // 将触摸坐标转换为画布本地坐标
  _toLocal(touch) {
    return { x: touch.x, y: touch.y }
  },

  // 清除画布内容
  onClearWrite() {
    this.clearCanvas()
  },

  clearCanvas() {
    if (this._ctx && this._cssWidth) {
      this._ctx.clearRect(0, 0, this._cssWidth, this._cssHeight)
    }
  }
})
