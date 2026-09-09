// utils/store.js - 基于本地存储的数据层
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
  const decks = _load()
  if (decks.length === 0) {
    const now = Date.now()
    _save([
      {
        id: genId(),
        name: '示例牌组：常用英语单词',
        createdAt: now,
        cards: [
          { id: genId(), front: 'apple', back: '苹果', srs: { ease: 2.5, interval: 0, reps: 0, due: now } },
          { id: genId(), front: 'book', back: '书', srs: { ease: 2.5, interval: 0, reps: 0, due: now } },
          { id: genId(), front: 'cat', back: '猫', srs: { ease: 2.5, interval: 0, reps: 0, due: now } }
        ]
      }
    ])
  }
  const templates = _loadTemplates()
  if (templates.length === 0) {
    const now = Date.now()
    _saveTemplates([
      {
        id: genId(),
        name: '示例模板：单词卡',
        createdAt: now,
        fields: ['单词', '释义', '例句'],
        front: '{{单词}}',
        back: '{{释义}}\n\n例句：{{例句}}',
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

function addCard(deckId, front, back) {
  const decks = _load()
  const deck = decks.find(d => d.id === deckId)
  if (!deck) return null
  const card = {
    id: genId(),
    front,
    back,
    srs: { ease: 2.5, interval: 0, reps: 0, due: Date.now() }
  }
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
  getTemplates, getTemplate, addTemplate, updateTemplate, deleteTemplate,
  addTemplateField, deleteTemplateField
}
