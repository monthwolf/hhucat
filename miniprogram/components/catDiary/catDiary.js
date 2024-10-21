import {
    getUserInfo,
} from "../../utils/user"
import {
    requestNotice
} from "../../utils/msg"
import {
    generateUUID
} from "../../utils/utils"
import api from "../../utils/cloudApi";
import {
    cloud
} from "../../utils/cloudAccess";



Component({
    options: {
        multipleSlots: true, // 在组件定义时的选项中启用多slot支持
    },
    properties: {
        cat: {
            type: Object,
            value: ''
        },
        user: {
            type: Object,
            value: ''
        },
        canEdit: {
            type: Boolean,
            value: true
        }

    },
    data: {
        isOpenDate: false,
        startY: 0,
        currentDate: '',
        currentTime: '12:00',
        calendar: {},
        animation: false,
        popShow: false,
        submitPopShow: false, // 新增提交成功弹窗的显示控制
        content: '',
        fileList: [],
        validationError: '',
        syncToAlbum: true, // 默认选中同步到相册
        showMedia: false, // 控制弹窗显示
        mediaList: [], // 存储媒体列表
        isExpanded: false,
        getMsg: false
    },
    lifetimes: {
        attached: function () {
            var time = new Date();
            var year = time.getFullYear().toString().padStart(4, '0');
            var month = (time.getMonth() + 1).toString().padStart(2, '0');
            var date = time.getDate().toString().padStart(2, '0');
            this.setData({
                currentDate: year + "-" + month + "-" + date
            })
            this.loadDiary()
        }
    },
    methods: {
        async loadDiary() {
            const db = await cloud.databaseAsync();
            const _ = db.command;
            const qf = {
                cat_id: this.data.cat._id,
                verified: true,
                deleted: _.neq(true),
                date: this.data.currentDate
            };
            const diary = (await db.collection('diary').where(qf).orderBy('time', 'asc').get()).data;


            this.setData({
                diary: diary,

            })
        },
        timeToString(time) {
            var year = time.getFullYear().toString().padStart(4, '0');
            var month = (time.getMonth() + 1).toString().padStart(2, '0');
            var date = time.getDate().toString().padStart(2, '0');
            return year + "-" + month + "-" + date;
        },
        async handleLoad(e) {
            const calendar = this.selectComponent('#calendar');
            this.setData({
                calendar: calendar,
            })

        },
        changeDate(e) {
            var date = new Date(e.detail.checked.year, e.detail.checked.month - 1, e.detail.checked.day);
            this.setData({
                currentDate: this.timeToString(date)
            })
            this.loadDiary();
        },
        async changeOpen() {
            this.setData({
                isOpenDate: !this.data.isOpenDate
            })
            if (this.data.isOpenDate) {
                const db = await cloud.databaseAsync();
                const _ = db.command;
                const marks = await db.collection('diary').aggregate([{
                        $match: {
                            cat_id: this.data.cat._id,
                            verified: true
                        }
                    }, {
                        $group: {
                            _id: "$date", // 以 date 字段进行分组
                            count: {
                                $sum: 1
                            } // 统计每个 date 出现的次数
                        }
                    },
                    {
                        $match: {
                            count: {
                                $gt: 0
                            } // 排除没有出现过的日期（通常不存在这种情况，因为只会统计实际存在的日期）
                        }
                    },
                    {
                        $project: {
                            _id: 0, // 不显示 _id 字段
                            date: "$_id", // 将 _id 字段重命名为 date
                            type: {
                                $literal: "corner"
                            },
                            color: {
                                $literal: "#ff6868"
                            },
                            text: {
                                $toString: "$count"
                            } // 将出现的次数存储为 content 字段
                        }
                    }
                ]).end()
                // console.log(marks)
                this.setData({
                    marks: marks.data
                })
            }
        },
        //切换日期到前一天
        goYesterday() {
            let time = this.data.currentDate.split('-')
            let date = new Date(time[0], parseInt(time[1]) - 1, parseInt(time[2]) - 1)
            this.setData({
                currentDate: this.timeToString(date)
            })
            this.setData({
                direction: "left",
                animation: true
            })
            this.loadDiary();
            setTimeout(() => {
                this.setData({
                    animation: false
                })
            }, 500)
        },
        //切换日期到后一天
        goNextDay() {
            let time = this.data.currentDate.split('-')
            let date = new Date(time[0], parseInt(time[1]) - 1, parseInt(time[2]) + 1)
            this.setData({
                currentDate: this.timeToString(date)
            })
            this.setData({
                direction: "right",
                animation: true
            })

            setTimeout(() => {

                this.setData({
                    animation: false
                })
                this.setData({
                    diary: []
                })
                this.loadDiary();
            }, 500)

        },
        //打开上传喵日记
        openEdit() {
            var that = this
            wx.showModal({
                title: '提示',
                content: '为了猫猫安全，文本尽量不要包含详细地点，欢迎您的支持~',
                success: function (res) {
                    if (res.confirm) { //这里是点击了确定以后
                        var time = new Date();
                        that.setData({
                            popShow: true,
                            currentTime: time.getHours().toString().padStart(2, '0') + ":" + time.getMinutes().toString().padStart(2, '0')
                        })
                    }
                }
            })
        },
        bindTimeChange(e) {
            this.setData({
                currentTime: e.detail.value
            });
        },

        onContentChange(e) {
            this.setData({
                content: e.detail.value
            });
        },
        afterRead(e) {
            const {
                file
            } = e.detail;
            this.setData({
                fileList: this.data.fileList.concat(file)
            })
            console.log(file)
        },
        delete(e) {
            var fileList = this.data.fileList
            fileList.splice(e.detail.index, 1)
            this.setData({
                fileList: fileList
            })
        },
        onSyncAlbumChange(e) {
            this.setData({
                syncToAlbum: e.detail.value.includes('sync'),
                getMsg: e.detail.value.includes('msg')
            });
        },
        async submitForm() {
            // 表单验证
            if (this.data.content.trim() == '') {
                this.showError('喵喵喵？日记内容不能为空哦~');
                return;
            }

            var fileList = this.data.fileList
            var link = []
            if (fileList != []) {
                for (var e of fileList) {
                    // console.log(e)
                    const tempFilePath = e.url;
                    console.log(tempFilePath)

                    wx.showLoading({
                        title: '正在上传(' + (fileList.length - link.length) + ')',
                        mask: true,
                    });
                    //获取后缀
                    const index = tempFilePath.lastIndexOf(".");
                    const ext = tempFilePath.substr(index + 1);
                    let res = await cloud.uploadFile({
                        cloudPath: this.properties.cat.campus + '/' + generateUUID() + '.' + ext, // 上传至云端的路径
                        filePath: tempFilePath, // 小程序临时文件路径
                    });
                    link.push({
                        type: res.fileID.includes('.mp4') ? 'video' : 'image', // 判断媒体类型
                        url: res.fileID
                    })
                    wx.hideLoading()
                };
                const params = {
                    cat_id: this.properties.cat._id,
                    link: link,
                    content: this.data.content,
                    date: this.data.currentDate,
                    time: this.data.currentTime,
                    verified: false,
                };

                let dbAddRes = (await api.curdOp({
                    operation: "add",
                    collection: "diary",
                    data: params
                })).result;
                console.log("curdOp(add-diary) result:", dbAddRes);

                if (this.data.syncToAlbum) {
                    for (var i of link) {
                        const index = i.url.lastIndexOf(".");
                        const ext = i.url.substr(index + 1);
                        if (ext == "jpg" || ext == "png" || ext == "jpeg") {
                            const params2 = {
                                cat_id: this.properties.cat._id,
                                photo_id: i.url,
                                user_id: this.properties.user._id,
                                verified: false,
                                shooting_date: this.data.currentDate.substring(0, 7),
                                photographer: getUserInfo(this.properties.user.openid).nickName
                            };
                            dbAddRes = (await api.curdOp({
                                operation: "add",
                                collection: "photo",
                                data: params2
                            })).result;
                            console.log("curdOp(add-photo) result:", dbAddRes);
                        }
                    }
                }
            }


            setTimeout(() => {
                this.setData({
                    submitPopShow: true
                });
            }, 1000);

            //三秒后关闭提交成功弹窗
            setTimeout(() => {
                this.setData({
                    submitPopShow: false
                });
                this.closePopup()

            }, 3000);

        },
        async sendMsg() {
            if (this.data.getMsg) {
                await requestNotice('verify');
            }
        },
        authOpt(e) {
            console.log(e)
            const {
                _,
                callback
            } = e.detail;
            wx.requirePrivacyAuthorize({
                success: () => {
                    callback(true);
                },
                fail: (err) => {
                    console.log("err", err);
                    wx.openPrivacyContract({})
                }
            })
        },
        openAction(e) {
            var diary = this.data.diary[e.currentTarget.dataset.index]
            if (this.data.user.manager < 1 && this.data.user.openid != diary._openid) {
                return
            }
            var that = this
            wx.showActionSheet({
                itemList: ['删除'],
                success(res) {
                    if (res.tapIndex == 0) {
                        console.log(diary)
                        api.curdOp({
                            operation: 'remove',
                            collection: "diary",
                            item_id: diary._id,
                            data: diary
                        })
                        setTimeout(() => {
                            that.loadDiary()
                        }, 1000)
                    }
                }
            })
        },
        showError(message) {
            this.setData({
                validationError: message
            });

            // 2秒后清除错误信息
            setTimeout(() => {
                this.setData({
                    validationError: ''
                });
            }, 2000);
        },
        // 添加表单重置逻辑，建议在关闭弹窗或提交成功后调用
        resetForm() {
            this.setData({
                content: '',
                fileList: [],
                syncToAlbum: true, // 重置为默认值
                validationError: ''
            });
            const uploadComponent = this.selectComponent('#uploader');
            if (uploadComponent) {
                uploadComponent.resetFileList();
            }
        },
        // 更新关闭弹窗的方法
        closePopup() {
            this.setData({
                popShow: false
            });
            this.resetForm(); // 关闭时重置表单
            this.loadDiary();
        },
        // 显示弹窗逻辑
        async showDetails(e) {
            const links = this.data.diary[e.currentTarget.dataset.index].link; // 获取当前点击的媒体链接
            const content = this.data.diary[e.currentTarget.dataset.index].content;
            const time = this.data.diary[e.currentTarget.dataset.index].time
            this.setData({
                mediaList: links,
                diaryDetails: {
                    content: content,
                    time: time
                },
                isOpenDate: false,
                showMedia: true // 显示弹窗
            });
        },
        // 隐藏弹窗
        hidePopup() {
            this.setData({
                showMedia: false,
                mediaList: [],
                diaryDetails: {}
            });
        },
        preview(e) {
                const idx = e.currentTarget.dataset.index
                wx.previewMedia({
                  sources: this.data.mediaList,
                  current: idx
                })
        },
        toggleExpand() {
            this.setData({
                isExpanded: !this.data.isExpanded
            });
        }
    }
});