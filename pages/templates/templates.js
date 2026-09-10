const store = require('../../utils/store.js')
const i18n = require('../../utils/i18n.js')

Page({
  data: {
    templates: []
  },

  onShow() {
    i18n.attach(this)
    wx.setNavigationBarTitle({ title: i18n.t('nav.templates') })
    this.refresh()
  },

  refresh() {
    const templates = store.getTemplates().map(t => ({
      id: t.id,
      name: t.name,
      fieldCount: (t.fields || []).length,
      fieldCountText: i18n.t('templates.fieldCount', { n: (t.fields || []).length })
    }))
    this.setData({ templates })
  },

  onAddTemplate() {
    wx.showModal({
      title: i18n.t('templates.addTitle'),
      editable: true,
      placeholderText: i18n.t('templates.addPlaceholder'),
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
      title: i18n.t('templates.deleteTitle'),
      content: i18n.t('templates.deleteContent'),
      success: (res) => {
        if (res.confirm) {
          store.deleteTemplate(id)
          this.refresh()
        }
      }
    })
  }
})
