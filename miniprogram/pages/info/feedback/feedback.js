// miniprogram/pages/info/feedback/feedback.js
Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  toFeedback() {
    wx.navigateTo({
      url: '/pages/genealogy/feedbackDetail/feedbackDetail',
    })
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '信息反馈 - 中大猫谱'
    }
  }
})