// utils/template.js - 纯文本模板渲染
//
// 微信小程序不支持在卡片内执行 HTML/script/CSS（WXML 不是 HTML，
// rich-text 仅渲染有限的标签白名单且不执行脚本）。因此模板只做
// 简单的纯文本变量替换：用 {{字段名}} 作为占位符，渲染时替换为字段值。

// 匹配 {{ 字段名 }}，允许占位符内前后有空格
const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g

// 将文本中的 {{字段名}} 替换为 fields 中对应的值，未提供的字段替换为空字符串
function render(text, fields) {
  if (!text) return ''
  fields = fields || {}
  return text.replace(PLACEHOLDER, (_, name) => {
    const key = name.trim()
    const val = fields[key]
    return val == null ? '' : String(val)
  })
}

// 提取文本中用到的所有字段名（去重，保持出现顺序）
function extractFields(text) {
  const names = []
  if (!text) return names
  let m
  PLACEHOLDER.lastIndex = 0
  while ((m = PLACEHOLDER.exec(text)) !== null) {
    const name = m[1].trim()
    if (name && names.indexOf(name) === -1) names.push(name)
  }
  return names
}

// 校验文本中的字段是否都属于 allowedFields，返回未知字段列表
function findUnknownFields(text, allowedFields) {
  const allowed = allowedFields || []
  return extractFields(text).filter(n => allowed.indexOf(n) === -1)
}

module.exports = { render, extractFields, findUnknownFields, PLACEHOLDER }
