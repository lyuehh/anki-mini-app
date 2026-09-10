// utils/exchange.js - 牌组导入/导出的数据格式（与 wx API 解耦，纯数据处理，便于测试）
//
// 设计目标（见需求）：
//   1. 导出某个牌组 + 学习进度（SRS 状态）
//   2. 仅导出某个牌组（不含学习进度，导入后从零开始学）
//   3. 始终带上牌组绑定的模板，导入后可直接按模板渲染 / 继续加卡
//
// 兼容性设计（为未来升级预留）：
//   - 顶层 `format` 固定标识 + 整数 `version`，用于识别文件与做版本迁移。
//   - 采用「显式字段 + 宽松解析」：导入时只读取已知字段，忽略未知字段，
//     这样旧版本 App 打开新版本导出文件时不会因为多出字段而报错（向前兼容）；
//     新版本 App 也能读旧文件（向后兼容，缺字段走默认值）。
//   - version 只在「无法安全解析旧结构」时才递增；小的增量字段不升 version。
//   - 卡片只存「原始字段值 fields + 正反面 front/back + 可选 srs」，
//     不存内部自增 id / 时间戳等运行时细节，导入时一律重新生成，避免跨设备 id 冲突。

// 文件格式标识与当前版本
const FORMAT = 'anki-mini-app-deck'
const VERSION = 1
// 本模块能安全解析的最低/最高版本；高于 MAX 的文件视为不兼容
const MIN_SUPPORTED_VERSION = 1
const MAX_SUPPORTED_VERSION = 1

// 从完整的 srs 状态中挑出需要持久化导出的字段（丢弃展示用/派生字段之外的一切运行时垃圾）。
// 保留 FSRS 记忆状态所需的全部量，导入后 srs.normalize 可直接接续复习。
function pickSrs(srs) {
  if (!srs || typeof srs !== 'object') return null
  const out = {}
  // FSRS 状态字段
  const keys = ['stability', 'difficulty', 'state', 'reps', 'lapses', 'interval', 'due', 'lastReview']
  keys.forEach(k => { if (srs[k] != null) out[k] = srs[k] })
  // 兼容旧版 SM-2 字段（若导出的是尚未迁移的老数据）
  const legacy = ['ease']
  legacy.forEach(k => { if (srs[k] != null) out[k] = srs[k] })
  return Object.keys(out).length ? out : null
}

// 构建导出对象。
//   deck: store 中的牌组对象 { name, cards: [{ front, back, fields, srs }] }
//   tpl:  牌组绑定的模板对象（可能为 null，表示无模板牌组）
//   opts: { includeProgress: bool } —— 是否带上学习进度
// 返回可 JSON.stringify 的普通对象。
function build(deck, tpl, opts) {
  opts = opts || {}
  const includeProgress = !!opts.includeProgress

  const template = tpl ? {
    name: tpl.name || '',
    fields: Array.isArray(tpl.fields) ? tpl.fields.slice() : [],
    front: tpl.front || '',
    back: tpl.back || '',
    scale: typeof tpl.scale === 'number' ? tpl.scale : 1
  } : null

  const cards = (deck.cards || []).map(c => {
    const card = {
      front: c.front || '',
      back: c.back || ''
    }
    // 模板卡片保存字段原始值，导入后可随模板重新渲染
    if (c.fields && Object.keys(c.fields).length) card.fields = Object.assign({}, c.fields)
    // 仅在导出进度时带上 srs
    if (includeProgress) {
      const s = pickSrs(c.srs)
      if (s) card.srs = s
    }
    return card
  })

  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: Date.now(),
    includeProgress,
    template,
    deck: {
      name: deck.name || '',
      cards
    }
  }
}

// 将导出对象序列化为带缩进的 JSON 文本（便于人工查看与 diff）
function stringify(obj) {
  return JSON.stringify(obj, null, 2)
}

// 解析导入文本，返回规范化结构：
//   { version, includeProgress, template|null, deck: { name, cards: [...] } }
// 出错时抛出 Error（错误信息为可展示的键，UI 侧再本地化）。
function parse(text) {
  if (!text || !String(text).trim()) throw new Error('empty')
  let data
  try {
    data = JSON.parse(String(text).replace(/^\uFEFF/, ''))
  } catch (e) {
    throw new Error('invalidJson')
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('notObject')
  if (data.format !== FORMAT) throw new Error('wrongFormat')

  const version = Number(data.version)
  if (!version || version < MIN_SUPPORTED_VERSION) throw new Error('badVersion')
  // 高于本 App 支持的版本：可能有本 App 读不懂的结构，明确提示而非静默丢数据
  if (version > MAX_SUPPORTED_VERSION) throw new Error('tooNew')

  const rawDeck = data.deck
  if (!rawDeck || typeof rawDeck !== 'object') throw new Error('noDeck')

  // 模板：可选。字段做类型收敛，未知字段忽略。
  let template = null
  if (data.template && typeof data.template === 'object') {
    const t = data.template
    template = {
      name: typeof t.name === 'string' ? t.name : '',
      fields: Array.isArray(t.fields) ? t.fields.filter(f => typeof f === 'string') : [],
      front: typeof t.front === 'string' ? t.front : '',
      back: typeof t.back === 'string' ? t.back : '',
      scale: typeof t.scale === 'number' && t.scale > 0 ? t.scale : 1
    }
  }

  const rawCards = Array.isArray(rawDeck.cards) ? rawDeck.cards : []
  const cards = rawCards.map(c => {
    if (!c || typeof c !== 'object') return null
    const card = {
      front: typeof c.front === 'string' ? c.front : '',
      back: typeof c.back === 'string' ? c.back : ''
    }
    if (c.fields && typeof c.fields === 'object' && !Array.isArray(c.fields)) {
      const fields = {}
      Object.keys(c.fields).forEach(k => {
        const v = c.fields[k]
        fields[k] = v == null ? '' : String(v)
      })
      if (Object.keys(fields).length) card.fields = fields
    }
    if (c.srs && typeof c.srs === 'object') card.srs = c.srs
    return card
  }).filter(Boolean)

  return {
    version,
    includeProgress: !!data.includeProgress,
    template,
    deck: {
      name: typeof rawDeck.name === 'string' ? rawDeck.name : '',
      cards
    }
  }
}

module.exports = {
  FORMAT, VERSION, MIN_SUPPORTED_VERSION, MAX_SUPPORTED_VERSION,
  build, stringify, parse, pickSrs
}
