import {
    checkAuth,
    fillUserInfo
} from "../../../utils/user";
import {
    requestNotice,
    sendVerifyCatNotice,
    //   sendVerifyCommentNotice,
    getMsgTplId
} from "../../../utils/msg";
import cache from "../../../utils/cache";
import {
    getCatItem
} from "../../../utils/cat";
import {
    cloud
} from "../../../utils/cloudAccess";
import {
    formatDate
} from "../../../utils/utils";
import api from "../../../utils/cloudApi";

Page({

    /**
     * 页面的初始数据
     */
    data: {
        tipText: '正在鉴权...',
        tipBtn: false,
        campus_list: [],
    },

    jsData: {
        notice_list: [],
    },

    /**
     * 生命周期函数--监听页面加载
     */
    async onLoad() {
        if (await checkAuth(this, 1)) {
            this.loadComments();
        }
    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {
        console.log('[onUnload] - 页面退出');

        // 发送审核消息
        sendVerifyCatNotice(this.jsData.notice_list);
    },

    async loadComments() {
        // 常用的对象
        const db = await cloud.databaseAsync();
        const _ = db.command;
        var newcat = [];
        var qf = {
            needVerify: _.eq(true),
            deleted: _.neq(true)
        };
        var res = await db.collection('new_cat_feedback').where(qf).orderBy("create_date", "desc").get();
        console.log(res);

        // 填充userInfo
        await fillUserInfo(res.data, "_openid", "userInfo");
        for (var item of res.data) {
            item.datetime = formatDate(new Date(item.create_date), "yyyy-MM-dd hh:mm:ss")
            newcat.push(item);
        }

        // 填充猫猫信息
        var campus_list = {};
        var memory_cache = {};
        for (var c of newcat) {
            if (memory_cache[c.cat.name]) {
                c.cat = memory_cache[c.cat.name];
            } else {
                memory_cache[c.cat.name] = c.cat;
            }

            // 分类记录到campus里
            var campus = c.cat.campus;
            if (!campus_list[campus]) {
                campus_list[campus] = [];
            }
            campus_list[campus].push(c);
        }

        // 恢复最后一次审批的校区
        var cache_active_campus = cache.getCacheItem("checkPhotoCampus");
        if (!cache_active_campus || !campus_list[cache_active_campus]) {
            cache_active_campus = undefined
        }

        this.setData({
            campus_list: campus_list,
            active_campus: cache_active_campus,
        })
    },

    bindClickCampus(e) {
        var campus = e.currentTarget.dataset.key;
        var active_campus = this.data.active_campus;
        // console.log(campus);

        if (active_campus == campus) {
            return;
        }

        this.setData({
            active_campus: campus
        });
    },

    // 标记审核
    bindMark(e) {
        const index = e.currentTarget.dataset.index;
        var mark_type = e.currentTarget.dataset.type;
        var active_campus = this.data.active_campus;
        var newcat = this.data.campus_list[active_campus];

        if (newcat[index].mark == mark_type) {
            mark_type = ""; // 反选
        }
        this.setData({
            [`campus_list.${active_campus}[${index}].mark`]: mark_type
        });
    },

    openBigPhoto(e) {
        const pid = e.currentTarget.dataset.pid;
        wx.previewImage({
            urls: [pid]
        });
    },

    // 点击所属猫猫名称，可以跳转到猫猫详情
    toCatDetail(e) {
        const name = e.currentTarget.dataset.cat_name;
        wx.navigateTo({
            url: '/pages/info/feedback/addCat/addCat?name=' + name + '&noUpload=' + true,
        })
    },

    // 没有权限，返回上一页
    goBack() {
        wx.navigateBack();
    },

    // 确定处理
    async bindCheckMulti(e) {
        var active_campus = this.data.active_campus;
        var newcat = this.data.campus_list[active_campus];
        var nums = {},
            total_num = 0;
        if (newcat == undefined || newcat.length == 0) {
            wx.showToast({
                title: '无审核内容',
            });
            return;
        }

        for (const cat of newcat) {
            if (!cat.mark || cat.mark == "") {
                continue;
            }
            if (!(cat.mark in nums)) {
                nums[cat.mark] = 0;
            }
            nums[cat.mark]++;
            total_num++;
        }

        if (total_num == 0) {
            return false;
        }

        var modalRes = await wx.showModal({
            title: '确定批量审核？',
            content: `删除${nums['delete'] || 0}条，通过${nums['pass'] || 0}条`,
        });

        if (modalRes.confirm) {
            console.log('[bindCheckMulti] - 开始通过');
            await this.doCheckMulti();
        }

        // 记录一下最后一次审批的cache
        cache.setCacheItem("checkPhotoCampus", active_campus, cache.cacheTime.checkPhotoCampus);
    },

    // 开始批量处理
    async doCheckMulti() {
        wx.showLoading({
            title: '处理中...',
        })
        var active_campus = this.data.active_campus;
        var newcat = this.data.campus_list[active_campus];
        var all_queries = [],
            new_newcat = [];
        for (const cat of newcat) {
            if (!cat.mark || cat.mark == "") {
                new_newcat.push(cat);
                continue;
            }

            // 准备数据
            var data = {
                needVerify: false,
            }
            if (cat.mark == 'delete') {
                data.deleted = true;
            }
            else{
                all_queries.push(
                api.updateCat({
                    cat: cat.cat,
                    cat_id: cat.cat.cat_id
                }))
            }
            const db = await cloud.databaseAsync();
            await db.collection('new_cat_feedback').where({
                _id: cat._id
            }).update(data);
            this.addNotice(cat, (cat.mark != "delete"));
        }
        // 阻塞一下
        await Promise.all(all_queries);
        this.setData({
            [`campus_list.${active_campus}`]: new_newcat,
        });

        wx.showToast({
            title: '审核通过',
        });
    },

    // 添加一条通知记录，等页面退出的时候统一发送通知
    addNotice(cat, accepted) {
        const openid = cat._openid;
        let {
            notice_list
        } = this.jsData;
        if (!notice_list[openid]) {
            notice_list[openid] = {
                accepted: 0,
                deleted: 0,
            }
        }
        if (accepted) {
            notice_list[openid].accepted++;
        } else {
            notice_list[openid].deleted++;
        }
    },

    // 管理员点击订阅
    async requestSubscribeMessage() {
        const notifyVerifyTplId = getMsgTplId("notifyVerify");
        wx.getSetting({
            withSubscriptions: true,
            success: res => {
                console.log("[requestSubscribeMessage] - subscribeSet:", res);
                if ('subscriptionsSetting' in res) {
                    if (!(notifyVerifyTplId in res['subscriptionsSetting'])) {
                        // 第一次申请或只点了取消，未永久拒绝也未允许
                        requestNotice('notifyVerify');
                        // console.log("firstRequest");
                    } else if (res.subscriptionsSetting[notifyVerifyTplId] === 'reject') {
                        // console.log("已拒绝");// 不再请求/重复弹出toast
                    } else if (res.subscriptionsSetting[notifyVerifyTplId] === 'accept') {
                        console.log('[requestSubscribeMessage] - 重新请求下个一次性订阅');
                        requestNotice('notifyVerify');
                    }
                }
            }
        })
    },

})