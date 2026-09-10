// utils/store.js - 基于本地存储的数据层
const template = require('./template.js')
const i18n = require('./i18n.js')
const srs = require('./srs.js')
const exchange = require('./exchange.js')

const KEY = 'anki_decks'
const TPL_KEY = 'anki_templates'

function _load() {
  try {
    return wx.getStorageSync(KEY) || []
  } catch (e) {
    return []
  }
}

function _save(decks) {
  wx.setStorageSync(KEY, decks)
}

function _loadTemplates() {
  try {
    return wx.getStorageSync(TPL_KEY) || []
  } catch (e) {
    return []
  }
}

function _saveTemplates(templates) {
  wx.setStorageSync(TPL_KEY, templates)
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 首次启动写入示例数据
function init() {
  // 示例数据按当前语言生成（默认中文），只在首次启动写入
  const seed = i18n.dict().seed
  const decks = _load()
  if (decks.length === 0) {
    const now = Date.now()
    _save([
      {
        id: genId(),
        name: seed.deckName,
        createdAt: now,
        cards: seed.cards.map(c => ({
          id: genId(), front: c.front, back: c.back, srs: Object.assign(srs.defaultSrs(), { due: now })
        }))
      }
    ])
  }
  const templates = _loadTemplates()
  if (templates.length === 0) {
    const now = Date.now()
    _saveTemplates([
      {
        id: genId(),
        name: seed.tplName,
        createdAt: now,
        fields: [seed.fieldWord, seed.fieldMeaning, seed.fieldExample],
        front: `{{${seed.fieldWord}}}`,
        back: seed.backTemplate,
        scale: 1
      }
    ])
  }
}

function getDecks() {
  return _load()
}

function getDeck(deckId) {
  return _load().find(d => d.id === deckId) || null
}

function addDeck(name, templateId) {
  const decks = _load()
  const deck = { id: genId(), name, templateId: templateId || '', createdAt: Date.now(), cards: [] }
  decks.push(deck)
  _save(decks)
  return deck
}

function updateDeck(deckId, patch) {
  const decks = _load()
  const deck = decks.find(d => d.id === deckId)
  if (!deck) return null
  Object.assign(deck, patch)
  _save(decks)
  return deck
}

function deleteDeck(deckId) {
  _save(_load().filter(d => d.id !== deckId))
}

function addCard(deckId, front, back, fields) {
  const decks = _load()
  const deck = decks.find(d => d.id === deckId)
  if (!deck) return null
  const card = {
    id: genId(),
    front,
    back,
    srs: srs.defaultSrs()
  }
  // 使用模板创建的卡片保存字段原始值，便于模板更新后重新渲染正反面
  if (fields && Object.keys(fields).length) card.fields = Object.assign({}, fields)
  deck.cards.push(card)
  _save(decks)
  return card
}

function updateCard(deckId, cardId, patch) {
  const decks = _load()
  const deck = decks.find(d => d.id === deckId)
  if (!deck) return null
  const card = deck.cards.find(c => c.id === cardId)
  if (!card) return null
  Object.assign(card, patch)
  _save(decks)
  return card
}

function deleteCard(deckId, cardId) {
  const decks = _load()
  const deck = decks.find(d => d.id === deckId)
  if (!deck) return
  deck.cards = deck.cards.filter(c => c.id !== cardId)
  _save(decks)
}

// 从 CSV 解析结果批量导入：新建牌组并按模板渲染每行卡片
// deckName: 牌组名；templateId: 使用的模板；columns: 列名数组（须与模板字段严格匹配）；rows: 数据行数组
// 返回 { deck, imported }
function importDeckFromCsv(deckName, templateId, columns, rows) {
  const tpl = _loadTemplates().find(t => t.id === templateId)
  if (!tpl) throw new Error('模板不存在')
  const decks = _load()
  const now = Date.now()
  const deck = { id: genId(), name: deckName, templateId, createdAt: now, cards: [] }
  let imported = 0
  ;(rows || []).forEach(row => {
    const fields = {}
    columns.forEach((col, i) => { fields[col] = row[i] == null ? '' : String(row[i]) })
    // 至少有一个字段有值才导入
    const hasValue = columns.some(col => (fields[col] || '').trim())
    if (!hasValue) return
    const front = template.render(tpl.front, fields).trim()
    const back = template.render(tpl.back, fields).trim()
    deck.cards.push({
      id: genId(),
      front,
      back,
      fields,
      srs: Object.assign(srs.defaultSrs(), { due: now })
    })
    imported++
  })
  decks.push(deck)
  _save(decks)
  return { deck, imported }
}

// ===== 模板 =====

function getTemplates() {
  return _loadTemplates()
}

function getTemplate(templateId) {
  return _loadTemplates().find(t => t.id === templateId) || null
}

function addTemplate(name) {
  const templates = _loadTemplates()
  const tpl = {
    id: genId(),
    name,
    createdAt: Date.now(),
    fields: [],
    front: '',
    back: '',
    scale: 1  // 展示卡片时内容放大倍数（1 = 原始大小）
  }
  templates.push(tpl)
  _saveTemplates(templates)
  return tpl
}

function updateTemplate(templateId, patch) {
  const templates = _loadTemplates()
  const tpl = templates.find(t => t.id === templateId)
  if (!tpl) return null
  Object.assign(tpl, patch)
  _saveTemplates(templates)
  return tpl
}

// 统计使用某模板、且保存了字段值（可被重新渲染）的卡片数量
function countTemplateCards(templateId) {
  if (!templateId) return 0
  let count = 0
  _load().forEach(deck => {
    if (deck.templateId !== templateId) return
    deck.cards.forEach(c => {
      if (c.fields && Object.keys(c.fields).length) count++
    })
  })
  return count
}

// 用指定模板重新渲染其下所有卡片的正反面（基于卡片保存的字段值），返回刷新数量
function refreshCardsByTemplate(templateId) {
  if (!templateId) return 0
  const tpl = _loadTemplates().find(t => t.id === templateId)
  if (!tpl) return 0
  const decks = _load()
  let count = 0
  decks.forEach(deck => {
    if (deck.templateId !== templateId) return
    deck.cards.forEach(c => {
      if (!c.fields || !Object.keys(c.fields).length) return
      c.front = template.render(tpl.front, c.fields).trim()
      c.back = template.render(tpl.back, c.fields).trim()
      count++
    })
  })
  _save(decks)
  return count
}

function deleteTemplate(templateId) {
  _saveTemplates(_loadTemplates().filter(t => t.id !== templateId))
}

// 给模板添加字段（纯文本字段名，去重）
function addTemplateField(templateId, fieldName) {
  const templates = _loadTemplates()
  const tpl = templates.find(t => t.id === templateId)
  if (!tpl) return null
  const name = (fieldName || '').trim()
  if (!name) return tpl
  if (!tpl.fields) tpl.fields = []
  if (tpl.fields.indexOf(name) === -1) tpl.fields.push(name)
  _saveTemplates(templates)
  return tpl
}

// 删除模板字段
function deleteTemplateField(templateId, fieldName) {
  const templates = _loadTemplates()
  const tpl = templates.find(t => t.id === templateId)
  if (!tpl) return null
  tpl.fields = (tpl.fields || []).filter(f => f !== fieldName)
  _saveTemplates(templates)
  return tpl
}

// ===== 导入 / 导出 =====

// 构建某牌组的导出文本（JSON）。
//   deckId: 要导出的牌组
//   includeProgress: 是否带上学习进度（SRS 状态）
// 始终带上牌组绑定的模板（若有）。返回 JSON 字符串。
function exportDeck(deckId, includeProgress) {
  const deck = getDeck(deckId)
  if (!deck) throw new Error('牌组不存在')
  const tpl = deck.templateId ? getTemplate(deck.templateId) : null
  const obj = exchange.build(deck, tpl, { includeProgress: !!includeProgress })
  return exchange.stringify(obj)
}

// 找一个字段集合完全一致的既有模板（用于导入时复用，避免重复创建同名模板）
function _findMatchingTemplate(tplData) {
  if (!tplData) return null
  const target = (tplData.fields || []).slice().sort()
  return _loadTemplates().find(t => {
    if ((t.name || '') !== (tplData.name || '')) return false
    if ((t.front || '') !== (tplData.front || '')) return false
    if ((t.back || '') !== (tplData.back || '')) return false
    const fs = (t.fields || []).slice().sort()
    return fs.length === target.length && fs.every((f, i) => f === target[i])
  }) || null
}

// 从导出文本导入一个牌组。
//   text: exportDeck 产出的 JSON（或兼容格式）
// 行为：
//   - 若文件带模板：复用完全相同的既有模板，否则新建一个模板。
//   - 新建牌组并绑定该模板；卡片重新分配 id。
//   - 若卡片带 srs 则接续该学习进度（经 srs.normalize 规整），否则以新卡起始。
// 返回 { deck, imported, template, includeProgress }
function importDeck(text) {
  const parsed = exchange.parse(text)
  const now = Date.now()

  // 处理模板：优先复用，否则新建
  let templateId = ''
  let tpl = null
  if (parsed.template) {
    const existing = _findMatchingTemplate(parsed.template)
    if (existing) {
      tpl = existing
    } else {
      const templates = _loadTemplates()
      tpl = {
        id: genId(),
        name: parsed.template.name || i18n.t('exchange.importedTemplate'),
        createdAt: now,
        fields: parsed.template.fields || [],
        front: parsed.template.front || '',
        back: parsed.template.back || '',
        scale: parsed.template.scale || 1
      }
      templates.push(tpl)
      _saveTemplates(templates)
    }
    templateId = tpl.id
  }

  const decks = _load()
  const deck = {
    id: genId(),
    name: parsed.deck.name || (tpl ? tpl.name : '') || i18n.t('exchange.importedDeck'),
    templateId,
    createdAt: now,
    cards: []
  }
  let imported = 0
  parsed.deck.cards.forEach(c => {
    const card = {
      id: genId(),
      front: c.front || '',
      back: c.back || ''
    }
    if (c.fields && Object.keys(c.fields).length) card.fields = Object.assign({}, c.fields)
    if (c.srs) {
      // 接续已有学习进度：规整为 FSRS 状态（兼容旧版 SM-2）
      const norm = srs.normalize(c.srs)
      card.srs = norm || Object.assign(srs.defaultSrs(), { due: now })
    } else {
      // 不带进度：作为新卡，立即到期可学
      card.srs = Object.assign(srs.defaultSrs(), { due: now })
    }
    deck.cards.push(card)
    imported++
  })
  decks.push(deck)
  _save(decks)
  return { deck, imported, template: tpl, includeProgress: parsed.includeProgress }
}

module.exports = {
  init, genId,
  getDecks, getDeck, addDeck, updateDeck, deleteDeck,
  addCard, updateCard, deleteCard,
  importDeckFromCsv,
  exportDeck, importDeck,
  getTemplates, getTemplate, addTemplate, updateTemplate, deleteTemplate,
  countTemplateCards, refreshCardsByTemplate,
  addTemplateField, deleteTemplateField
}
