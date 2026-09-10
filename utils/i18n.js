// utils/i18n.js - 轻量国际化：中文 / 英文 双语与语言切换
// 语言选择保存在本地存储，默认中文。
// 用法：
//   const i18n = require('../../utils/i18n.js')
//   页面 onShow / onLoad 里 i18n.attach(this) —— 把整棵文案树写入 data.i18n，
//   WXML 中即可 {{i18n.xxx.yyy}} 绑定；需要带参数的文案用 i18n.t('a.b', { n: 3 })。

const LOCALE_KEY = 'anki_locale'
const DEFAULT_LOCALE = 'zh'

// 语言包。第一层为命名空间（common / tabBar / index / decks / ...），
// 叶子为字符串，其中 {name} 形式的占位符由 t() 在运行时替换。
const messages = {
  zh: {
    // 应用级
    appName: 'Anki',
    // 首次启动写入的示例数据
    seed: {
      deckName: '示例牌组：常用英语单词',
      tplName: '示例模板：单词卡',
      fieldWord: '单词',
      fieldMeaning: '释义',
      fieldExample: '例句',
      backTemplate: '{{释义}}\n\n例句：{{例句}}',
      cards: [
        { front: 'apple', back: '苹果' },
        { front: 'book', back: '书' },
        { front: 'cat', back: '猫' }
      ]
    },
    // tabBar 文案（切换语言后由 setLocale 重设）
    tabBar: {
      decks: '牌组',
      templates: '模板',
      stats: '统计'
    },
    // 各页导航栏标题
    nav: {
      index: '学习统计',
      decks: '牌组',
      templates: '模板',
      templateEdit: '模板编辑',
      study: '学习',
      cardEdit: '卡片管理'
    },
    // 统计页
    index: {
      heroTitle: '学习统计',
      heroSub: '坚持复习，记得更牢 ✨',
      deckCount: '牌组',
      cardCount: '卡片总数',
      dueCount: '待复习',
      masteredCount: '已掌握',
      langLabel: '语言 / Language',
      langZh: '中文',
      langEn: 'English'
    },
    // 牌组页
    decks: {
      title: '我的牌组',
      importCsv: '导入 CSV',
      add: '+ 新建',
      totalCards: '共 {n} 张',
      due: '待复习 {n}',
      finished: '已完成',
      template: '模板：{name}',
      noTemplate: '未指定模板',
      study: '学习',
      manage: '管理',
      templateBtn: '模板',
      delete: '删除',
      empty: '还没有牌组，点击右上角新建一个吧',
      addTitle: '新建牌组',
      addPlaceholder: '请输入牌组名称',
      noTplTitle: '暂无模板',
      noTplContent: '还没有任何模板，将创建不使用模板的牌组。可到「模板」页新建模板后再指定。',
      continue: '继续',
      noTplItem: '不使用模板',
      noTplToast: '暂无可用模板',
      deleteTitle: '删除牌组',
      deleteContent: '确定删除该牌组及其所有卡片？',
      fileTypeTitle: '文件类型不支持',
      fileTypeContent: '请选择 .csv 或 .txt 格式的文件。',
      cannotChooseTitle: '无法选择文件',
      cannotChooseContent: '当前环境不支持文件选择，请在微信或已安装的 App 中操作。',
      parseFailTitle: '解析失败',
      parseFailContent: '无法解析该 CSV 文件',
      noColumnsTitle: '缺少列定义',
      noColumnsContent: 'CSV 文件缺少 #columns 配置行，无法确定各列对应的字段名。',
      noRowsTitle: '没有数据',
      noRowsContent: 'CSV 文件中没有可导入的卡片数据。',
      importNoTplContent: '导入 CSV 需要先创建模板，并使模板字段与 CSV 的 #columns 严格匹配。请到「模板」页新建模板。',
      mismatchTitle: '字段不匹配',
      mismatchCsvOnly: 'CSV 有而模板缺少：{fields}',
      mismatchTplOnly: '模板有而 CSV 缺少：{fields}',
      mismatchContent: '模板「{name}」的字段与 CSV 的列必须严格匹配。\n{detail}',
      importedSuffix: ' 导入',
      confirmImportTitle: '确认导入',
      confirmImportContent: '将使用模板「{tpl}」把 {n} 行数据导入到牌组「{deck}」，是否继续？',
      importConfirm: '导入',
      importedToast: '已导入 {n} 张卡片',
      importFailTitle: '导入失败',
      importFailContent: '导入过程出错',
      readFailTitle: '读取失败',
      readFailContent: '无法读取所选文件'
    },
    // 模板列表页
    templates: {
      title: '卡片模板',
      add: '+ 新建',
      fieldCount: '{n} 个字段',
      edit: '编辑',
      delete: '删除',
      empty: '还没有模板，点击右上角新建一个吧',
      addTitle: '新建模板',
      addPlaceholder: '请输入模板名称',
      deleteTitle: '删除模板',
      deleteContent: '确定删除该模板？'
    },
    // 模板编辑页
    templateEdit: {
      fieldsTitle: '字段（只有字段才能作为变量加入模板）',
      newFieldPlaceholder: '新字段名称',
      addField: '添加',
      fieldsHint: '点击字段标签可插入到当前编辑的面，点击 × 删除',
      noFields: '暂无字段，先添加字段后才能在模板中使用',
      frontTitle: '正面模板',
      backTitle: '背面模板',
      tplPlaceholder: '点击上方字段可插入引用，支持纯文本',
      scaleTitle: '内容放大倍数',
      scaleHint: '复习时卡片正反面内容会按此倍数放大，方便识别、不费眼睛',
      previewTitle: '预览',
      front: '正面',
      back: '背面',
      save: '保存模板',
      notExist: '模板不存在',
      needFieldName: '请输入字段名',
      fieldExists: '字段已存在',
      deleteFieldTitle: '删除字段',
      deleteFieldContent: '确定删除字段「{name}」？模板中使用到它的地方将失效。',
      unknownTitle: '存在未定义字段',
      unknownContent: '以下字段不属于本模板：{fields}。请先添加为字段，或从模板中移除。',
      confirmSaveTitle: '确认保存',
      confirmSaveContent: '保存后将用新模板重新渲染 {n} 张已有卡片的正反面，是否继续？',
      saveRefresh: '保存并刷新',
      savedRefresh: '已保存，刷新 {n} 张卡片',
      saved: '已保存'
    },
    // 学习页
    study: {
      progress: '剩余 {left} · 已复习 {done}',
      front: '正面',
      back: '背面',
      tapHint: '点击卡片查看答案',
      hideWrite: '收起手写',
      showWrite: '手写练习',
      writeHead: '在下方书写练习（描红：{source}）',
      traceBack: '描背面',
      traceFront: '描正面',
      hideGuide: '隐描红',
      showGuide: '显描红',
      clear: '清除',
      writeTip: '用手指在方格内书写，边写边记忆笔画顺序',
      again: '忘记',
      hard: '困难',
      good: '良好',
      easy: '简单',
      finished: '本轮复习完成！',
      finishedSub: '已复习 {n} 张卡片',
      backToDecks: '返回牌组',
      deckNotExist: '牌组不存在'
    },
    // 卡片管理页
    cardEdit: {
      addTitle: '新增卡片',
      tplHint: '使用模板「{name}」，按字段填写',
      fieldPlaceholder: '请输入{name}',
      noFields: '该模板还没有字段，请先到模板页添加字段',
      frontPlaceholder: '正面（问题）',
      backPlaceholder: '背面（答案）',
      addCard: '添加卡片',
      listTitle: '卡片列表（{n}）',
      delete: '删除',
      empty: '暂无卡片',
      needOneField: '请至少填写一个字段',
      renderEmpty: '渲染结果为空，请检查模板',
      needBoth: '正反面均需填写',
      deleteTitle: '删除卡片',
      deleteContent: '确定删除这张卡片？'
    }
  },
  en: {
    appName: 'Anki',
    seed: {
      deckName: 'Sample Deck: Common English Words',
      tplName: 'Sample Template: Word Card',
      fieldWord: 'Word',
      fieldMeaning: 'Meaning',
      fieldExample: 'Example',
      backTemplate: '{{Meaning}}\n\nExample: {{Example}}',
      cards: [
        { front: 'apple', back: 'a round fruit with red or green skin' },
        { front: 'book', back: 'a set of printed pages bound together' },
        { front: 'cat', back: 'a small furry animal kept as a pet' }
      ]
    },
    tabBar: {
      decks: 'Decks',
      templates: 'Templates',
      stats: 'Stats'
    },
    nav: {
      index: 'Study Stats',
      decks: 'Decks',
      templates: 'Templates',
      templateEdit: 'Edit Template',
      study: 'Study',
      cardEdit: 'Manage Cards'
    },
    index: {
      heroTitle: 'Study Stats',
      heroSub: 'Keep reviewing, remember better ✨',
      deckCount: 'Decks',
      cardCount: 'Total Cards',
      dueCount: 'Due',
      masteredCount: 'Mastered',
      langLabel: '语言 / Language',
      langZh: '中文',
      langEn: 'English'
    },
    decks: {
      title: 'My Decks',
      importCsv: 'Import CSV',
      add: '+ New',
      totalCards: '{n} cards',
      due: '{n} due',
      finished: 'Done',
      template: 'Template: {name}',
      noTemplate: 'No template',
      study: 'Study',
      manage: 'Manage',
      templateBtn: 'Template',
      delete: 'Delete',
      empty: 'No decks yet. Tap “+ New” in the top right to create one.',
      addTitle: 'New Deck',
      addPlaceholder: 'Enter deck name',
      noTplTitle: 'No Templates',
      noTplContent: 'There are no templates yet, so a deck without a template will be created. You can create one on the Templates tab and assign it later.',
      continue: 'Continue',
      noTplItem: 'No template',
      noTplToast: 'No template available',
      deleteTitle: 'Delete Deck',
      deleteContent: 'Delete this deck and all its cards?',
      fileTypeTitle: 'Unsupported File Type',
      fileTypeContent: 'Please choose a .csv or .txt file.',
      cannotChooseTitle: 'Cannot Choose File',
      cannotChooseContent: 'File selection is not supported in the current environment. Please use WeChat or the installed app.',
      parseFailTitle: 'Parse Failed',
      parseFailContent: 'Unable to parse this CSV file',
      noColumnsTitle: 'Missing Columns',
      noColumnsContent: 'The CSV file lacks a #columns config line, so the field name for each column cannot be determined.',
      noRowsTitle: 'No Data',
      noRowsContent: 'The CSV file contains no card data to import.',
      importNoTplContent: 'Importing a CSV requires a template first, and the template fields must strictly match the CSV #columns. Please create a template on the Templates tab.',
      mismatchTitle: 'Fields Mismatch',
      mismatchCsvOnly: 'In CSV but missing from template: {fields}',
      mismatchTplOnly: 'In template but missing from CSV: {fields}',
      mismatchContent: 'The fields of template “{name}” must strictly match the CSV columns.\n{detail}',
      importedSuffix: ' Import',
      confirmImportTitle: 'Confirm Import',
      confirmImportContent: 'Import {n} rows into deck “{deck}” using template “{tpl}”. Continue?',
      importConfirm: 'Import',
      importedToast: 'Imported {n} cards',
      importFailTitle: 'Import Failed',
      importFailContent: 'An error occurred during import',
      readFailTitle: 'Read Failed',
      readFailContent: 'Unable to read the selected file'
    },
    templates: {
      title: 'Card Templates',
      add: '+ New',
      fieldCount: '{n} fields',
      edit: 'Edit',
      delete: 'Delete',
      empty: 'No templates yet. Tap “+ New” in the top right to create one.',
      addTitle: 'New Template',
      addPlaceholder: 'Enter template name',
      deleteTitle: 'Delete Template',
      deleteContent: 'Delete this template?'
    },
    templateEdit: {
      fieldsTitle: 'Fields (only fields can be used as template variables)',
      newFieldPlaceholder: 'New field name',
      addField: 'Add',
      fieldsHint: 'Tap a field tag to insert it into the face being edited; tap × to delete.',
      noFields: 'No fields yet. Add a field before using it in the template.',
      frontTitle: 'Front Template',
      backTitle: 'Back Template',
      tplPlaceholder: 'Tap a field above to insert a reference. Plain text supported.',
      scaleTitle: 'Content Scale',
      scaleHint: 'During review both faces are scaled by this factor for easier reading.',
      previewTitle: 'Preview',
      front: 'Front',
      back: 'Back',
      save: 'Save Template',
      notExist: 'Template not found',
      needFieldName: 'Enter a field name',
      fieldExists: 'Field already exists',
      deleteFieldTitle: 'Delete Field',
      deleteFieldContent: 'Delete field “{name}”? Places in the template using it will break.',
      unknownTitle: 'Undefined Fields',
      unknownContent: 'These fields do not belong to this template: {fields}. Add them as fields first, or remove them from the template.',
      confirmSaveTitle: 'Confirm Save',
      confirmSaveContent: 'Saving will re-render both faces of {n} existing cards with the new template. Continue?',
      saveRefresh: 'Save & Refresh',
      savedRefresh: 'Saved, refreshed {n} cards',
      saved: 'Saved'
    },
    study: {
      progress: '{left} left · {done} done',
      front: 'Front',
      back: 'Back',
      tapHint: 'Tap the card to reveal the answer',
      hideWrite: 'Hide Writing',
      showWrite: 'Handwriting',
      writeHead: 'Practice writing below (tracing: {source})',
      traceBack: 'Trace Back',
      traceFront: 'Trace Front',
      hideGuide: 'Hide Trace',
      showGuide: 'Show Trace',
      clear: 'Clear',
      writeTip: 'Write with your finger in the box and memorize the stroke order.',
      again: 'Again',
      hard: 'Hard',
      good: 'Good',
      easy: 'Easy',
      finished: 'Review complete!',
      finishedSub: 'Reviewed {n} cards',
      backToDecks: 'Back to Decks',
      deckNotExist: 'Deck not found'
    },
    cardEdit: {
      addTitle: 'Add Card',
      tplHint: 'Using template “{name}”, fill in the fields',
      fieldPlaceholder: 'Enter {name}',
      noFields: 'This template has no fields yet. Add fields on the Templates page first.',
      frontPlaceholder: 'Front (question)',
      backPlaceholder: 'Back (answer)',
      addCard: 'Add Card',
      listTitle: 'Cards ({n})',
      delete: 'Delete',
      empty: 'No cards yet',
      needOneField: 'Fill in at least one field',
      renderEmpty: 'Render result is empty, please check the template',
      needBoth: 'Both front and back are required',
      deleteTitle: 'Delete Card',
      deleteContent: 'Delete this card?'
    }
  }
}

let _locale = null

function getLocale() {
  if (_locale) return _locale
  try {
    const saved = wx.getStorageSync(LOCALE_KEY)
    _locale = messages[saved] ? saved : DEFAULT_LOCALE
  } catch (e) {
    _locale = DEFAULT_LOCALE
  }
  return _locale
}

function setLocale(locale) {
  if (!messages[locale]) return getLocale()
  _locale = locale
  try {
    wx.setStorageSync(LOCALE_KEY, locale)
  } catch (e) {}
  return _locale
}

function locales() {
  return Object.keys(messages)
}

// 当前语言的整棵文案树，供 WXML 直接绑定（i18n.attach 写入 data.i18n）
function dict() {
  return messages[getLocale()]
}

// 按点分路径取文案，并替换 {param} 占位符
function t(path, params) {
  const parts = String(path).split('.')
  let node = messages[getLocale()]
  for (const p of parts) {
    if (node == null) break
    node = node[p]
  }
  if (typeof node !== 'string') return path
  if (!params) return node
  return node.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? params[k] : m))
}

// 把文案树与当前语言写入页面 data，页面 WXML 即可用 {{i18n.xxx}} 绑定
function attach(page) {
  page.setData({ i18n: dict(), locale: getLocale() })
}

// 根据当前语言刷新 tabBar 文案（tabBar 不随 data 绑定，需手动设置）
function updateTabBar() {
  const tab = dict().tabBar
  try {
    wx.setTabBarItem({ index: 0, text: tab.decks })
    wx.setTabBarItem({ index: 1, text: tab.templates })
    wx.setTabBarItem({ index: 2, text: tab.stats })
  } catch (e) {}
}

module.exports = {
  getLocale,
  setLocale,
  locales,
  dict,
  t,
  attach,
  updateTabBar
}
