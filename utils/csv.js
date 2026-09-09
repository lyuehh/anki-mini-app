// utils/csv.js - 解析 Anki 导出的 CSV 格式
//
// Anki CSV 以若干 # 开头的配置行开头，随后是每行一张卡片的数据行。
// 目前支持的配置项：
//   #separator:Comma        分隔符，默认逗号（支持 Comma/Tab/Semicolon/Space/Pipe 或直接给字符）
//   #html:false             是否使用 HTML 模板，本项目不支持 HTML，仅按纯文本处理
//   #notetype:Basic         Anki 笔记类型，仅记录不做特殊处理
//   #deck:牌组名             牌组名称
//   #columns:A,B,C          各列对应的字段名（对应本项目模板变量）
//   #tags column:4          标签所在列（1 起）；本项目当作普通字段处理
//
// 解析结果：
//   { config, columns, rows, notetype, deckName, tagsColumn, separator }
//   - config: 原始配置项键值对
//   - columns: 列名数组（来自 #columns，缺省则为空数组）
//   - rows: 数据行，每行为字符串数组

// 分隔符名称到字符的映射
const SEP_MAP = {
  comma: ',',
  tab: '\t',
  semicolon: ';',
  space: ' ',
  pipe: '|'
}

function resolveSeparator(val) {
  if (!val) return ','
  const key = String(val).trim().toLowerCase()
  if (SEP_MAP[key]) return SEP_MAP[key]
  // 允许直接给出分隔字符（如 ","）
  return String(val).trim().charAt(0) || ','
}

// 解析单行（支持双引号包裹、"" 转义、字段内含分隔符/换行由上层保证不进入本函数）
function parseLine(line, sep) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === sep) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

// 解析整个 CSV 文本
function parse(text) {
  if (!text) throw new Error('文件内容为空')
  // 去除 BOM
  text = text.replace(/^\uFEFF/, '')
  const rawLines = text.split(/\r\n|\r|\n/)

  const config = {}
  let sep = ','
  let bodyStart = 0

  // 先读取开头连续的 # 配置行
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    if (line.indexOf('#') !== 0) {
      bodyStart = i
      break
    }
    // 形如 #key:value，key 可能含空格（如 "tags column"）
    const rest = line.slice(1)
    const idx = rest.indexOf(':')
    if (idx === -1) {
      bodyStart = i + 1
      continue
    }
    const key = rest.slice(0, idx).trim().toLowerCase()
    const value = rest.slice(idx + 1).trim()
    config[key] = value
    bodyStart = i + 1
    if (key === 'separator') sep = resolveSeparator(value)
  }

  const columns = config['columns']
    ? parseLine(config['columns'], sep).filter(c => c !== '')
    : []

  let tagsColumn = 0
  if (config['tags column']) {
    const n = parseInt(config['tags column'], 10)
    if (!isNaN(n)) tagsColumn = n
  }

  // 解析数据行，跳过空行
  const rows = []
  for (let i = bodyStart; i < rawLines.length; i++) {
    const line = rawLines[i]
    if (line.trim() === '') continue
    rows.push(parseLine(line, sep))
  }

  return {
    config,
    separator: sep,
    columns,
    notetype: config['notetype'] || '',
    deckName: config['deck'] || '',
    html: /^true$/i.test(config['html'] || ''),
    tagsColumn,
    rows
  }
}

module.exports = { parse, parseLine, resolveSeparator }
