import {
    cloud
} from "../../../../utils/cloudAccess";
import {
    generateUUID,decodeUrls
} from "../../../../utils/utils";
import api from "../../../../utils/cloudApi"
const content = require('./content')

// 上传图片方法
function upload(src, type) {
    return new Promise((resolve, reject) => {
        console.log('上传', type === 'img' ? '图片' : '视频', '：', src)
        // resolve(src)
        const tempFilePath = src;
        //获取后缀
        const index = tempFilePath.lastIndexOf(".");
        const ext = tempFilePath.substr(index + 1);
        const cloudPath = 'news' + '/' + generateUUID() + '.' + ext
        cloud.uploadFile({
            cloudPath: cloudPath, // 上传至云端的路径
            filePath: tempFilePath, // 小程序临时文件路径
        }).then((res) => {
                resolve(res.fileID)
        })
        
    })
}
// 删除图片方法
function remove(src) {
    src = src.replace('news','/news')
    console.log('删除图片：', src)
    api.deleteFiles({
        fileIDs:[src]
    })
    // 实际使用时，删除线上资源
}
Page({
    data: {
        content,
        editable: true,
        showSelectCat: false,
        rows: 1,
        cols: 1,
        // 用于插入的 emoji 表情
        emojis: [
            ['😄', '😷', '😂', '😝', '😳', '😱', '😔', '😒', '😉'],
            ['😎', '😭', '😍', '😘', '🤔', '😕', '🙃', '🤑', '😲'],
            ['🙄', '😤', '😴', '🤓', '😡', '😑', '😮', '🤒', '🤮']
        ],
        // 用于插入的卡片信息
        cardInfo: {
            color: '#333333',
            bgcolor: '#a9d5ff',
            border: '#ffffff'
        },
        // 用于插入的 html 模板
        templates: ['<section style="text-align: center; margin: 0px auto;"><section style="border-radius: 4px; border: 1px solid #757576; display: inline-block; padding: 5px 20px;"><span style="font-size: 18px; color: #595959;">标题</span></section></section>',
            '<div style="width: 100%; box-sizing: border-box; border-radius: 5px; background-color: #f6f6f6; padding: 10px; margin: 10px 0"><div>卡片</div><div style="font-size: 12px; color: gray">正文</div></div>',
            '<div style="border: 1px solid gray; box-shadow: 3px 3px 0px #cfcfce; padding: 10px; margin: 10px 0">段落</div>'
        ]
    },
    onLoad: function (options) {
        this.ctx = this.selectComponent('#article')
        wx.showActionSheet({
            itemList: ['简易模式', '正常模式'],
            success: e => {
                if (e.tapIndex === 0) {
                    this.setData({
                        editable: 'simple'
                    })
                    this._editmode = 'simple'
                } else {
                    this.setData({
                        editable: false
                    })
                    this._editmode = true
                    this.setData({
                        editable: true
                    })
                }
            }
        })


        /**
         * @description 设置获取链接的方法
         * @param {String} type 链接的类型（img/video/audio/link）
         * @param {String} value 修改链接时，这里会传入旧值
         * @returns {Promise} 返回线上地址（2.2.0 版本起设置了 domain 属性时，可以缺省主域名）
         *   type 为 audio/video 时，可以返回一个源地址数组
         *   2.1.3 版本起 type 为 audio 时，可以返回一个 object，包含 src、name、author、poster 等字段
         *   2.2.0 版本起 type 为 img 时，可以返回一个源地址数组，表示插入多张图片（修改链接时仅限一张）
         */
        this.ctx.getSrc = (type, value) => {
            return new Promise((resolve, reject) => {
                if (type === 'img' || type === 'video') {
                    wx.showActionSheet({
                        itemList: ['本地选取', '远程链接'],
                        success: res => {
                            if (res.tapIndex == 0) {
                                // 本地选取
                                if (type === 'img') {
                                    wx.chooseImage({
                                        count: value === undefined ? 9 : 1, // 2.2.0 版本起插入图片时支持多张（修改图片链接时仅限一张）
                                        success: res => {
                                            if (res.tempFilePaths.length == 1 && wx.editImage) {
                                                // 单张图片时进行编辑
                                                wx.editImage({
                                                    src: res.tempFilePaths[0],
                                                    complete: res2 => {
                                                        wx.showLoading({
                                                            title: '上传中'
                                                        })
                                                        upload(res2.tempFilePath || res.tempFilePaths[0], type).then(res => {
                                                            wx.hideLoading()
                                                            resolve(res)
                                                        })
                                                    }
                                                })
                                            } else {
                                                // 否则批量上传
                                                wx.showLoading({
                                                    title: '上传中'
                                                });
                                                (async () => {
                                                    const arr = []
                                                    for (let item of res.tempFilePaths) {
                                                        // 依次上传
                                                        const src = await upload(item, type)
                                                        arr.push(src)
                                                    }
                                                    return arr
                                                })().then(res => {
                                                    wx.hideLoading()
                                                    resolve(res)
                                                })
                                            }
                                        },
                                        fail: reject
                                    })
                                } else {
                                    wx.chooseVideo({
                                        success: res => {
                                            wx.showLoading({
                                                title: '上传中'
                                            })
                                            upload(res.tempFilePath, type).then(res => {
                                                wx.hideLoading()
                                                resolve(res)
                                            })
                                        },
                                        fail: reject
                                    })
                                }
                            } else {
                                // 远程链接
                                this.callback = {
                                    resolve,
                                    reject
                                }
                                this.setData({
                                    modal: {
                                        title: (type === 'img' ? '图片' : '视频') + '链接',
                                        value
                                    }
                                })
                            }
                        }
                    })
                } else {
                    this.callback = {
                        resolve,
                        reject
                    }
                    let title
                    if (type === 'audio') {
                        title = '音频链接'
                    } else if (type === 'link') {
                        title = '链接地址'
                    }
                    this.setData({
                        modal: {
                            title,
                            value
                        }
                    })
                }
            })
        }
        this.setData({
            content: decodeUrls(wx.getStorageSync('content'))
        })
    },
    // 删除图片/视频/音频标签事件
    remove(e) {
        // 删除线上资源
        remove(e.detail.src)
    },
    // 检查是否可编辑
    checkEditable() {
        return new Promise((resolve, reject) => {
            if (this.data.editable) {
                resolve()
            } else {
                wx.showModal({
                    content: '需要继续编辑吗？',
                    success: res => {
                        if (res.confirm) {
                            // 切换编辑状态
                            this.save()
                            resolve()
                        } else {
                            reject()
                        }
                    }
                })
            }
        })
    },
    // 调用编辑器接口
    edit(e) {
        this.checkEditable().then(() => {
            this.ctx[e.currentTarget.dataset.method](e.currentTarget.dataset.param)
        }).catch(() => {})
    },
    // 插入 head 系列标签
    insertHead() {
        this.checkEditable().then(() => {
            wx.showActionSheet({
                itemList: ['大标题', '中标题', '小标题'],
                success: res => {
                    let tagName = ['h1', 'h3', 'h5'][res.tapIndex]
                    this.ctx.insertHtml(`<${tagName}>标题</${tagName}>`)
                }
            })
        }).catch(() => {})
    },
    // 插入表格
    insertTable() {
        this.checkEditable().then(() => {
            this.setData({
                modal: {
                    title: '插入表格'
                }
            })
            this.callback = {
                resolve: () => {
                    this.ctx.insertTable(this.data.rows, this.data.cols)
                },
                reject: () => {}
            }
        }).catch(() => {})
    },
    // 插入代码
    insertCode() {
        this.checkEditable().then(() => {
            wx.showActionSheet({
                itemList: ['css', 'javascript', 'json'],
                success: res => {
                    const lan = ['css', 'javascript', 'json'][res.tapIndex]
                    this.ctx.insertHtml(`<pre><code class="language-${lan}">${lan} code</code></pre>`)
                }
            })
        }).catch(() => {})
    },
    insertText() {
        this.checkEditable().then(() => {
            this.ctx.insertHtml(`<p style="display: inline;">请输入</p>`)
        }).catch(() => {})
    },
    insertP() {
        this.checkEditable().then(() => {
            this.ctx.insertHtml(`<pre style="background-color:transparent;font-color:black;white-space: pre-wrap;white-space: -moz-pre-wrap;white-space: -pre-wrap;white-space: -o-pre-wrap;word-wrap: break-word;">段落内容</pre>`)
        }).catch(() => {})
    },
    // 插入markdown
    insertMd() {
        this.checkEditable().then(() => {
            this.setData({
                modal: {
                    title: '插入markdown'
                }
            })
            // this.setData({mdcontent:''})
            this.callback = {
                resolve: (res) => {
                    this.ctx.setContent(res, true)
                },
                reject: () => {}
            }
        }).catch(() => {})
    },
    insertHtml() {
        this.checkEditable().then(() => {
            this.setData({
                modal: {
                    title: '插入html'
                }
            })
            // this.setData({mdcontent:''})
            this.callback = {
                resolve: (res) => {
                    this.ctx.setContent(res, true)
                },
                reject: () => {}
            }
        }).catch(() => {})
    },
    insertCard() {
        this.checkEditable().then(() => {
            this.setData({
                showSelectCat:true
            })
        })
            // this.setData({mdcontent:''})
    },
    // 插入 emoji
    insertEmoji(e) {
        this.ctx.insertHtml(e.currentTarget.dataset.emoji)
        this.closeDialog()
    },
    // 清空编辑器内容
    clear() {
        wx.showModal({
            title: '确认',
            content: '确定清空内容吗？',
            success: res => {
                if (res.confirm)
                    this.ctx.clear()
            }
        })
    },
    // 加载内容
    load() {
        this.checkEditable().then(() => {
            wx.showActionSheet({
                itemList: ['载入示例内容', '载入自定义文件'],
                success: res => {
                    const tapIndex = res.tapIndex
                    wx.showModal({
                        title: '提示',
                        content: '导入内容将覆盖现有内容，是否继续？',
                        success: res => {
                            if (res.confirm) {
                                if (tapIndex == 0) {
                                    this.ctx.setContent(content)
                                } else {
                                    if (!wx.chooseMessageFile) {
                                        return wx.showModal({
                                            title: '失败',
                                            content: '您的微信版本太低，无法使用此功能',
                                            showCancel: false
                                        })
                                    }
                                    wx.chooseMessageFile({
                                        count: 1,
                                        type: 'file',
                                        extension: ['txt', 'html'],
                                        success: res => {
                                            const content = wx.getFileSystemManager().readFileSync(res.tempFiles[0].path, 'utf8')
                                            this.ctx.setContent(content)
                                        }
                                    })
                                }
                            }
                        }
                    })
                }
            })
        }).catch(() => {})
    },
    // 保存 / 编辑
    save() {
        //   console.log(this.ctx)
        // 延时避免当前编辑内容没有保存
        setTimeout(() => {
            //    var ctx console.log(this.ctx)
            const data = {}
            if (this.data.editable) {
                // 保存编辑好的内容
                data.content = this.ctx.getContent()
                if (data.content === '<p></p>') {
                    data.content = ''
                }
                wx.setStorageSync('content', data.content)
                wx.showToast({
                    title: '保存成功',
                })
                data.editable = false
            } else {
                data.editable = this._editmode
            }
            this.setData(data)
        }, 100)
    },
    // 处理模态框
    modalInput(e) {
        console.log(e)
        if (this.value == undefined && 'type' in e.currentTarget.dataset) {
            this.value = this.data.cardInfo
        }
        console.log(this.value)
        if ('type' in e.currentTarget.dataset) {
            this.value[e.currentTarget.dataset.type] = e.detail.value
        } else {
            this.value = e.detail.value
        }
        console.log(this.value)
    },
    pickerChange(e) {
        this.setData({
            [e.currentTarget.dataset.type]: parseInt(e.detail.value) + 1
        })
    },
    modalConfirm() {
        if (this.data.modal.title === '插入卡片') {
            this.callback.resolve(this.value)
        } else {
            this.callback.resolve(this.value || this.data.modal.value || '')
        }

        this.setData({
            modal: null
        })
    },
    // 处理底部弹窗
    openDialog(e) {
        this.checkEditable().then(() => {
            this.setData({
                dialog: e.currentTarget.dataset.type
            })
        }).catch(() => {})
    },
    closeDialog() {
        this.setData({
            dialog: false,
            showSelectCat: false
        })
    },
    modalCancel() {
        this.callback.reject()
        this.setData({
            modal: null
        })
    },
    async selectCat(e) {
        const cat = e.detail
        if (!cat) {
          return;
        }
        console.log(cat)
        const detail_url = '/pages/genealogy/detailCat/detailCat?cat_id='+cat._id;
        const cardHtml = `<card src='${cat.avatar.photo_compressed}' title='${cat.name}' desc='${cat.characteristics}' url='${detail_url}' color='${this.data.cardInfo.color}' bgcolor='${this.data.cardInfo.bgcolor}' border='${this.data.cardInfo.border}' />`;
        this.ctx.setContent(cardHtml, true)
        this.setData({
          showSelectCat: false
        });

      },
})