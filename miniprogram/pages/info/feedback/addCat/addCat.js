import { text as text_cfg, cat_status_adopt } from "../../../../config";
import { getPageUserInfo, checkCanFeedback } from "../../../../utils/user";
import { loadFilter } from "../../../../utils/page";
import { getCatItemMulti } from "../../../../utils/cat";
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
      adopt: cat_status_adopt.map((x) => { return {desc: x} }),
      to_star: [false, true],
    },
    picker_selected: {},
    bottomShow: false,
    text_cfg: text_cfg,
    noUpload:false,
  },

  jsData: {
    name: null,
    phers: {}, // 暂时存放摄影师名字
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    if(Boolean(options.noUpload)){
        this.setData({noUpload:Boolean(options.noUpload)})
    }
    this.jsData.name = options.name;
    await this.loadPickers();

    await this.loadCat();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow:async function () {
      
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
    if (this.jsData.name===undefined) {
        this.setData({
          cat: {
            nickname: [],
            characteristics: [],
            popularity: 0,
          }
        })
        //说明是新猫
        return false;
      }
      const db = await cloud.databaseAsync();
      var cat = (await db.collection('new_cat_feedback').where({cat:{name:this.jsData.name}}).limit(1).get()).data[0].cat;
      console.log("[loadCat] -", cat);
      // 处理一下picker
      var picker_selected = {};
      const pickers = this.data.pickers;
      for (const key in pickers) {
        const items = pickers[key];
        const value = cat[key];
        if (value == undefined) {
          continue;
        }
        const idx = items.findIndex((v) => v === value);
        if (idx === -1 && typeof value === "number") {
          // 既不是undefined，也找不到，说明存的就是下标
          picker_selected[key] = value;
        } else {
          picker_selected[key] = idx;
        }
      }
      await this.setData({
        cat: cat,
        picker_selected: picker_selected,
      });
  

  },

   // 输入了东西
   inputText(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    // if (this.data.cat[key] instanceof Array) {
    //   // 是Array，要把输入切分
    //   this.setData({
    //     ['cat.' + key]: value.split(',')
    //   });
    // } else {
    // }
    this.setData({
      ['cat.' + key]: value
    });
  },
  // 选择了东西
  pickerChange(e) {
    const key = e.currentTarget.dataset.key;
    const index = e.detail.value;
    var value = this.data.pickers[key][index];
    if (typeof value === "object" && value.desc != undefined) {
      // 说明是一种映射关系，只保存下标
      value = parseInt(index);
    }
    this.setData({
      ['cat.'+key]: value
    });
    return value;
  },
  // 选择了出生日期
  pickerDateChange(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    this.setData({
      ['cat.' + key]: value
    });
    return value;
  },
  // checkBoxChange(e) {
  //   console.log(e);
  //   this.setData({
  //     "cat.characteristics": e.detail.value
  //   }, () => {
  //     this.isCharChecked();
  //   })
  // },
  // isCharChecked() {
  //   const cat_chars = this.data.cat.characteristics || [];
  //   const chars = this.data.pickers.char;
  //   var checked = [];
  //   for (const c of chars) {
  //     checked.push(cat_chars.includes(c));
  //   }
  //   console.log(checked);
  //   this.setData({
  //     charChecked: checked
  //   });
  // },
  pickerAreaColumnChange(e) {
    var pickers = this.data.pickers;

    const column = e.detail.column;
    const index = e.detail.value;

    if (column == 0) {  // 修改了校区列内容，区域列变为对应校区的区域
      var now_campus = pickers.campus_area[0][index];
      pickers.campus_area[1] = pickers.area_category[now_campus];
      this.setData({
        "pickers.campus_area": pickers.campus_area,
        "pickers.campus_index": [index, 0]
      })
    }
  },
  bindAreaChange(e) {    // 这个和columnChange的区别是要确认才触发
    var pickers = this.data.pickers;
    const indices = e.detail.value;
    this.setData({
      'cat.campus': pickers.campus_area[0][indices[0]],
      'cat.area': pickers.campus_area[1][indices[1]]
    });
  },
  async loadPickers() {
    var filterRes = await loadFilter();
    console.log(filterRes);
    // 把area按campus分类
    var area_category = {};
    for (const campus of filterRes.campuses) {
      area_category[campus] = []
    }
    for (const area of filterRes.area) {
      area_category[area.campus].push(area.name);
    }
    var first_campus = filterRes.campuses[0];
    this.setData({
      "pickers.area_category": area_category, // wxml实际上不用到这个值，但是更改area picker时的逻辑需要这些数据
      "pickers.campus_area": [filterRes.campuses, area_category[first_campus]],
      "pickers.campus_index": [0, 0],
      "pickers.colour": filterRes.colour,
    });
  },
  async upload() {
    // 检查必要字段
    if (!this.data.cat.name) {
      wx.showToast({
        title: '缺少名字',
        icon: 'error'
      });
      return false;
    }
    if (!this.data.cat.campus || !this.data.cat.area) {
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
        cat: this.data.cat,
        cat_id: this.jsData.cat_id,
        deleted: false ,
        needVerify:true
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
  }
})