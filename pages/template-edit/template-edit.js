const store = require('../../utils/store.js')
const template = require('../../utils/template.js')

Page({
  data: {
    templateId: '',
    name: '',
    fields: [],
    front: '',
    back: '',
    newField: '',
    scale: 1,
    scaleOptions: [
      { label: '1x', value: 1 },
      { label: '1.5x', value: 1.5 },
      { label: '2x', value: 2 },
      { label: '2.5x', value: 2.5 },
      { label: '3x', value: 3 },
      { label: '4x', value: 4 },
      { label: '5x', value: 5 }
    ],
    preview: { front: '', back: '' }
  },

  onLoad(options) {
    this.setData({ templateId: options.templateId })
    this.refresh()
  },

  refresh() {
    const tpl = store.getTemplate(this.data.templateId)
    if (!tpl) {
      wx.showToast({ title: '模板不存在', icon: 'none' })
      return
    }
    wx.setNavigationBarTitle({ title: tpl.name })
    this.setData({
      name: tpl.name,
      fields: tpl.fields || [],
      front: tpl.front || '',
      back: tpl.back || '',
      scale: tpl.scale || 1
    })
    this.updatePreview()
  },

  // 用字段名本身作为示例值预览渲染效果
  updatePreview() {
    const sample = {}
    this.data.fields.forEach(f => { sample[f] = '「' + f + '」' })
    this.setData({
      preview: {
        front: template.render(this.data.front, sample),
        back: template.render(this.data.back, sample)
      }
    })
  },

  onNewFieldInput(e) {
    this.setData({ newField: e.detail.value })
  },

  onAddField() {
    const name = this.data.newField.trim()
    if (!name) {
      wx.showToast({ title: '请输入字段名', icon: 'none' })
      return
    }
    if (this.data.fields.indexOf(name) !== -1) {
      wx.showToast({ title: '字段已存在', icon: 'none' })
      return
    }
    store.addTemplateField(this.data.templateId, name)
    this.setData({ newField: '' })
    this.refresh()
  },

  onDeleteField(e) {
    const name = e.currentTarget.dataset.name
    wx.showModal({
      title: '删除字段',
      content: `确定删除字段「${name}」？模板中使用到它的地方将失效。`,
      success: (res) => {
        if (res.confirm) {
          store.deleteTemplateField(this.data.templateId, name)
          this.refresh()
        }
      }
    })
  },

  // 点击字段标签，把 {{字段}} 插入到当前正在编辑的面
  onInsertField(e) {
    const name = e.currentTarget.dataset.name
    const target = this.data.editing || 'front'
    const token = `{{${name}}}`
    this.setData({ [target]: (this.data[target] || '') + token })
    this.updatePreview()
  },

  onFrontFocus() {
    this.setData({ editing: 'front' })
  },

  onBackFocus() {
    this.setData({ editing: 'back' })
  },

  onFrontInput(e) {
    this.setData({ front: e.detail.value })
    this.updatePreview()
  },

  onBackInput(e) {
    this.setData({ back: e.detail.value })
    this.updatePreview()
  },

  onScaleChange(e) {
    const scale = Number(e.currentTarget.dataset.value)
    this.setData({ scale })
  },

  onSave() {
    const front = this.data.front
    const back = this.data.back
    // 校验只能使用本模板的字段
    const unknownFront = template.findUnknownFields(front, this.data.fields)
    const unknownBack = template.findUnknownFields(back, this.data.fields)
    const unknown = unknownFront.concat(unknownBack.filter(n => unknownFront.indexOf(n) === -1))
    if (unknown.length > 0) {
      wx.showModal({
        title: '存在未定义字段',
        content: `以下字段不属于本模板：${unknown.join('、')}。请先添加为字段，或从模板中移除。`,
        showCancel: false
      })
      return
    }

    // 统计受影响的卡片：使用本模板、且保存了字段值可重新渲染的卡片
    const affected = store.countTemplateCards(this.data.templateId)
    if (affected > 0) {
      wx.showModal({
        title: '确认保存',
        content: `保存后将用新模板重新渲染 ${affected} 张已有卡片的正反面，是否继续？`,
        confirmText: '保存并刷新',
        success: (res) => {
          if (res.confirm) this.doSave(front, back, true)
        }
      })
      return
    }
    this.doSave(front, back, false)
  },

  doSave(front, back, refresh) {
    store.updateTemplate(this.data.templateId, { front, back, scale: this.data.scale })
    if (refresh) {
      const n = store.refreshCardsByTemplate(this.data.templateId)
      wx.showToast({ title: `已保存，刷新 ${n} 张卡片`, icon: 'none' })
    } else {
      wx.showToast({ title: '已保存', icon: 'success' })
    }
  }
})
