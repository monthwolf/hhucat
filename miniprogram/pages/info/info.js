// miniprogram/pages/info/info.js
const utils = require('../../utils.js');

console.log("utils:", utils);
const isManager = utils.isManager;

const rewardsStep = 20;
var rewardsMax = 0;
Page({

  /**
   * 页面的初始数据
   */
  data: {
    showManager: false,
    numChkPhotos: 0,
    numPrcssImg: 0,
    numFeedbacks: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */

  // 用 onShow 不用 onLoad，为了在返回这个页面时也能重新加载
  onShow: function (options) {
    const that = this;
    isManager(res => {
      if (res) {
        const that = this;
        const db = wx.cloud.database();
        const _ = db.command;
        db.collection('photo').where({ verified: false}).count().then(res => {
          that.data.numChkPhotos = res.total;
          that.setData({
            numChkPhotos: res.total,
          })
        })
        this.data.numPrcssImg = db.collection('photo').where({ photo_compressed: _.in([undefined, '']), verified: true }).count().then(res => {
          that.data.numPrcssImg = res.total;
          that.setData({
            numPrcssImg: res.total,
          })
        })
        this.data.numFeedbacks = db.collection('feedback').where({ dealed: false}).count().then(res => {
          that.data.numFeedbacks = res.total;
          that.setData({
            numFeedbacks: res.total,
          })
        })
        that.setData({
          showManager: true,
        });
      }
    });

    // 获取version
    const app = getApp();
    this.setData({
      version: app.globalData.version
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '关于 - 中大猫谱'
    }
  },

  clickbtn(e) {
    const to = e.currentTarget.dataset.to;
    if (!to) {
      wx.showToast({
        title: 'Nothing...',
      });
      return false;
    }
    wx.navigateTo({
      url: to,
    });
  }
})