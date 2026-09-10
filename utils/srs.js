// utils/srs.js - FSRS（Free Spaced Repetition Scheduler）现代间隔重复算法
//
// FSRS 基于记忆的 DSR 模型，用三个量描述每张卡片的记忆状态：
//   - Stability（稳定性 S）：记忆强度，可复习后仍能以目标保持率回忆的天数。
//   - Difficulty（难度 D，1~10）：内容本身的难度，越大越难。
//   - Retrievability（可提取性 R，0~1）：距上次复习 t 天后仍能回忆的概率。
//
// 相比旧版简化 SM-2，FSRS 不再用固定 ease/倍数堆叠间隔，而是按记忆遗忘曲线
// 直接计算「达到目标保持率」所需的下次复习间隔，长期更贴合真实记忆规律。
//
// 评分 quality（沿用小程序既有约定）：0=Again(忘记) 1=Hard(困难) 2=Good(良好) 3=Easy(简单)
// 内部映射为 FSRS 评分 G = quality + 1，即 1..4。

const DAY_MS = 24 * 60 * 60 * 1000

// 目标保持率：复习到期时希望仍能回忆的概率（Anki 默认 0.9）
const REQUEST_RETENTION = 0.9
// 遗忘曲线幂指数与配套因子（FSRS-5）
const DECAY = -0.5
const FACTOR = Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1 // = 0.9^-2 - 1 ≈ 0.2345679
// 间隔上下限（天）
const MIN_INTERVAL = 1
const MAX_INTERVAL = 36500
// 忘记时的短复习延时（沿用旧版「10 分钟后再练」，并在本轮内重新入队）
const AGAIN_DELAY_MS = 10 * 60 * 1000

// FSRS-5 默认权重（19 个），来自公开的大规模拟合结果
const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
  1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315,
  2.9898, 0.51655, 0.6621
]

function clamp(x, lo, hi) {
  return Math.min(Math.max(x, lo), hi)
}

// 新卡片状态：尚无稳定性/难度，state 为 'new'
function defaultSrs() {
  return {
    stability: 0,
    difficulty: 0,
    state: 'new',      // new | learning | review | relearning
    reps: 0,           // 复习次数
    lapses: 0,         // 遗忘次数
    interval: 0,       // 当前安排的间隔（天，供展示/统计）
    due: Date.now(),   // 下次到期时间戳
    lastReview: 0      // 上次复习时间戳
  }
}

// 可提取性 R：距上次复习 t 天、稳定性为 S 时仍能回忆的概率
function retrievability(elapsedDays, stability) {
  if (!stability || stability <= 0) return 0
  return Math.pow(1 + FACTOR * elapsedDays / stability, DECAY)
}

// 由稳定性反解「达到目标保持率」所需的间隔（天）
function nextInterval(stability) {
  const days = (stability / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1)
  return clamp(Math.round(days), MIN_INTERVAL, MAX_INTERVAL)
}

// 首次复习的初始稳定性：直接取该评分对应权重
function initStability(G) {
  return Math.max(W[G - 1], 0.1)
}

// 首次复习的初始难度（1~10）
function initDifficulty(G) {
  return clamp(W[4] - Math.exp(W[5] * (G - 1)) + 1, 1, 10)
}

// 后续复习的难度更新：先按评分线性调整并阻尼，再向「简单档初始难度」做均值回归
function nextDifficulty(D, G) {
  const deltaD = -W[6] * (G - 3)
  const damped = D + deltaD * (10 - D) / 9
  const d0Easy = clamp(W[4] - Math.exp(W[5] * (4 - 1)) + 1, 1, 10)
  const reverted = W[7] * d0Easy + (1 - W[7]) * damped
  return clamp(reverted, 1, 10)
}

// 回忆成功（G>=2）后的稳定性增长
function nextRecallStability(D, S, R, G) {
  const hardPenalty = G === 2 ? W[15] : 1
  const easyBonus = G === 4 ? W[16] : 1
  const inc = Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) *
    (Math.exp(W[10] * (1 - R)) - 1) * hardPenalty * easyBonus
  return Math.max(S * (inc + 1), 0.01)
}

// 遗忘（G==1）后的稳定性；不超过遗忘前稳定性
function nextForgetStability(D, S, R) {
  const sf = W[11] * Math.pow(D, -W[12]) *
    (Math.pow(S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R))
  return clamp(sf, 0.01, S)
}

// 同日多次复习（间隔不足一天）时的短期稳定性调整
function shortTermStability(S, G) {
  return Math.max(S * Math.exp(W[17] * (G - 3 + W[18])), 0.01)
}

// 把旧版 SM-2 数据（ease/interval/reps）平滑迁移为 FSRS 状态，避免升级后进度归零。
// 目标保持率 0.9 时 nextInterval(S) ≈ S，故用已有 interval 近似稳定性；
// 由 ease 反推一个大致难度（ease 越高越简单，难度越低）。
function fromLegacy(srs) {
  const interval = Number(srs.interval) || 0
  const reps = Number(srs.reps) || 0
  const ease = Number(srs.ease) || 2.5
  const stability = Math.max(interval, 0.1)
  const difficulty = clamp(5.28 + (2.5 - ease) * 2.5, 1, 10)
  return {
    stability,
    difficulty,
    state: reps > 0 ? 'review' : 'new',
    reps,
    lapses: 0,
    interval,
    due: srs.due || Date.now(),
    lastReview: reps > 0 ? (srs.due ? srs.due - interval * DAY_MS : Date.now()) : 0
  }
}

// 归一化卡片的 srs 状态：新卡返回 null（表示尚未有记忆状态），旧数据迁移为 FSRS
function normalize(srs) {
  if (!srs) return null
  if (typeof srs.stability === 'number' && typeof srs.difficulty === 'number' && srs.state) {
    return srs
  }
  // 旧版 SM-2 结构
  if ('ease' in srs || 'interval' in srs || 'reps' in srs) {
    return fromLegacy(srs)
  }
  return null
}

// 复习一次，返回新的 srs 状态
function review(card, quality, now) {
  now = now || Date.now()
  const G = Number(quality) + 1 // 1..4
  const prev = normalize(card && card.srs)
  const firstReview = !prev || prev.state === 'new' || !prev.stability

  let stability, difficulty, reps, lapses, state

  if (firstReview) {
    // 首次复习：由评分直接确定初始稳定性与难度
    difficulty = initDifficulty(G)
    stability = initStability(G)
    reps = (prev && prev.reps ? prev.reps : 0) + 1
    lapses = (prev && prev.lapses) || 0
    if (G === 1) {
      lapses += 1
      state = 'learning'
    } else {
      state = 'review'
    }
  } else {
    const elapsedDays = prev.lastReview ? Math.max(0, (now - prev.lastReview) / DAY_MS) : 0
    const R = retrievability(elapsedDays, prev.stability)
    difficulty = nextDifficulty(prev.difficulty, G)
    reps = (prev.reps || 0) + 1
    lapses = prev.lapses || 0

    if (G === 1) {
      // 遗忘：稳定性回落，进入重学
      stability = nextForgetStability(prev.difficulty, prev.stability, R)
      lapses += 1
      state = 'relearning'
    } else if (elapsedDays < 1) {
      // 同日再练：走短期稳定性
      stability = shortTermStability(prev.stability, G)
      state = 'review'
    } else {
      stability = nextRecallStability(prev.difficulty, prev.stability, R, G)
      state = 'review'
    }
  }

  let interval, due
  if (G === 1) {
    // 忘记：短延时后再练（本轮内也会被重新入队），间隔按 0 天记
    interval = 0
    due = now + AGAIN_DELAY_MS
  } else {
    interval = nextInterval(stability)
    due = now + interval * DAY_MS
  }

  return {
    stability: Number(stability.toFixed(4)),
    difficulty: Number(difficulty.toFixed(4)),
    state,
    reps,
    lapses,
    interval,
    due,
    lastReview: now
  }
}

// 是否到期需复习
function isDue(card, now) {
  now = now || Date.now()
  const due = card && card.srs && card.srs.due ? card.srs.due : 0
  return due <= now
}

// 是否已掌握：处于复习态且下次间隔达到一周以上（稳定性足够）
function isMastered(card) {
  const s = card && card.srs
  if (!s) return false
  const norm = normalize(s)
  if (!norm) return false
  return norm.state === 'review' && (norm.interval || 0) >= 7
}

module.exports = {
  defaultSrs, review, isDue, isMastered, normalize,
  retrievability, nextInterval,
  DAY_MS, REQUEST_RETENTION, W
}
