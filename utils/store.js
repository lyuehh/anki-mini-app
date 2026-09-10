// utils/store.js - 基于本地存储的数据层
const template = require('./template.js')
const i18n = require('./i18n.js')

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
          id: genId(), front: c.front, back: c.back, srs: { ease: 2.5, interval: 0, reps: 0, due: now }
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
    srs: { ease: 2.5, interval: 0, reps: 0, due: Date.now() }
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
      srs: { ease: 2.5, interval: 0, reps: 0, due: now }
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

module.exports = {
  init, genId,
  getDecks, getDeck, addDeck, updateDeck, deleteDeck,
  addCard, updateCard, deleteCard,
  importDeckFromCsv,
  getTemplates, getTemplate, addTemplate, updateTemplate, deleteTemplate,
  countTemplateCards, refreshCardsByTemplate,
  addTemplateField, deleteTemplateField
}
