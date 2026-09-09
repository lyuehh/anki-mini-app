// utils/store.js - 基于本地存储的数据层
const KEY = 'anki_decks'

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
}

function getDecks() {
  return _load()
}

function getDeck(deckId) {
  return _load().find(d => d.id === deckId) || null
}

function addDeck(name) {
  const decks = _load()
  const deck = { id: genId(), name, createdAt: Date.now(), cards: [] }
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

module.exports = {
  init, genId,
  getDecks, getDeck, addDeck, updateDeck, deleteDeck,
  addCard, updateCard, deleteCard
}
