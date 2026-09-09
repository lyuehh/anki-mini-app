// utils/srs.js - SM-2 间隔重复算法
// 评分 quality: 0=Again(忘记), 1=Hard(困难), 2=Good(良好), 3=Easy(简单)

const DAY_MS = 24 * 60 * 60 * 1000

// card.srs: { ease, interval(天), reps, due(时间戳) }
function defaultSrs() {
  return { ease: 2.5, interval: 0, reps: 0, due: Date.now() }
}

function review(card, quality, now) {
  now = now || Date.now()
  const srs = Object.assign(defaultSrs(), card.srs || {})
  let { ease, interval, reps } = srs

  if (quality === 0) {
    // 忘记：重置进度，10 分钟后再复习
    reps = 0
    interval = 0
    ease = Math.max(1.3, ease - 0.2)
    const due = now + 10 * 60 * 1000
    return { ease, interval, reps, due }
  }

  // 记住：更新熟练度
  reps += 1
  if (reps === 1) {
    interval = quality === 1 ? 1 : quality === 3 ? 4 : 1
  } else if (reps === 2) {
    interval = 6
  } else {
    let factor = ease
    if (quality === 1) factor = 1.2
    if (quality === 3) factor = ease * 1.3
    interval = Math.round(interval * factor)
  }

  // 调整 ease
  if (quality === 1) ease = Math.max(1.3, ease - 0.15)
  if (quality === 3) ease = ease + 0.15

  const due = now + interval * DAY_MS
  return { ease: Number(ease.toFixed(2)), interval, reps, due }
}

// 是否到期需复习
function isDue(card, now) {
  now = now || Date.now()
  const due = card.srs && card.srs.due ? card.srs.due : 0
  return due <= now
}

module.exports = { defaultSrs, review, isDue, DAY_MS }
