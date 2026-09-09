const store = require('../../utils/store.js')

Page({
  data: {
    templates: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const templates = store.getTemplates().map(t => ({
      id: t.id,
      name: t.name,
      fieldCount: (t.fields || []).length
    }))
    this.setData({ templates })
  },

  onAddTemplate() {
    wx.showModal({
      title: '新建模板',
      editable: true,
      placeholderText: '请输入模板名称',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const tpl = store.addTemplate(res.content.trim())
          wx.navigateTo({ url: `/pages/template-edit/template-edit?templateId=${tpl.id}` })
        }
      }
    })
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/template-edit/template-edit?templateId=${id}` })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除模板',
      content: '确定删除该模板？',
      success: (res) => {
        if (res.confirm) {
          store.deleteTemplate(id)
          this.refresh()
        }
      }
    })
  }
})
