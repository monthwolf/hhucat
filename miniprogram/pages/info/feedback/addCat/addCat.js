import { text as text_cfg, cat_status_adopt } from "../../../../config";
import { getPageUserInfo, checkCanFeedback } from "../../../../utils/user";
import { cloud } from "../../../../utils/cloudAccess";
import api from "../../../../utils/cloudApi";
import { async } from "../../../../packages/tencentcloud/cos";

const photoStep = 5; // 每次加载的图片数量

Page({
  /**
   * 页面的初始数据
   */
  data: {
    tipText: '正在加载表格...',
    pickers: {
      gender: ['公', '母'],
      sterilized: [false, true],
      adopt: cat_status_adopt.map((x) => { return { desc: x } }),
      to_star: [false, true],
    },
    picker_selected: {},
    bottomShow: false,
    text_cfg: text_cfg,
    noUpload: false,
    cat: {}
  },

  jsData: {
    name: null,
    phers: {}, // 暂时存放摄影师名字
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    if (Boolean(options.noUpload)) {
      this.setData({ noUpload: Boolean(options.noUpload) })
    }
    this.jsData.name = options?.name;
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: async function () {
    const infoTab = this.selectComponent('#catInfoTab');
    console.log('infoTab', infoTab);
    this.setData({
      infoTab: infoTab,
    })
    await this.loadCat();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: async function () {

    await getPageUserInfo(this);

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },
  // 没有权限，返回上一页
  goBack() {
    wx.navigateBack();
  },
  // 检查权限

  async loadCat() {
    if (this.jsData.name === undefined) {
      this.data.infoTab.createNewCat();
      //说明是新猫
      return false;
    }
    const db = await cloud.databaseAsync();
    var cat = (await db.collection('new_cat_feedback').where({ cat: { name: this.jsData.name } }).limit(1).get()).data[0].cat;
    console.log("[loadCat] -", cat);
    await this.setData({
      cat: cat
    });
  },
  async upload(cat, cat_id) {
    // 检查必要字段
    if (!cat.name) {
      wx.showToast({
        title: '缺少名字',
        icon: 'error'
      });
      return false;
    }
    if (!cat.campus || !cat.area) {
      wx.showToast({
        title: '缺少校区及区域',
        icon: 'error'
      });
      return false;
    }

    wx.showLoading({
      title: '更新中...',
    });
    var data = {
      openid: this.data.user.openid,
      openDate: api.getDate(),
      cat: cat,
      cat_id: cat_id,
      deleted: false,
      needVerify: true
    };
    var res = (await api.curdOp({
      operation: "add",
      collection: "new_cat_feedback",
      data: data
    })).result;
    // var res = (await api.updateCat({
    //   cat: this.data.cat,
    //   cat_id: this.jsData.cat_id
    // })).result;
    console.log("updateCat res:", res);
    wx.showToast({
      title: '操作成功',
    });
  },
  async handleSubmit() {
    const infoTab = this.selectComponent('#catInfoTab');
    if (infoTab) {
      const { cat, cat_id } = infoTab.getCat();
      await this.upload(cat, cat_id);
    }

  }
})