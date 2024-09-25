import {
    hex_sha256
} from "../packages/sha256/sha256";
// import { cloud } from "./cloudAccess";

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
    return uuid;
};

function isWifi(callback) {
    // 检查是不是Wifi网络正在访问
    // callback返回参数true/false
    wx.getNetworkType({
        success: res => {
            const networkType = res.networkType;
            if (networkType == 'wifi') {
                callback(true);
            } else {
                callback(false);
            }
        }
    })
}

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// 获取分享连接，从首页跳转过去
function shareTo(title, path) {
    return {
        title: title,
        path: '/pages/genealogy/genealogy?toPath=' + encodeURIComponent(path)
    }
}

async function replaceAsync(str, regex, asyncFn) {
    const promises = [] //存入数据
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args) //第一次执行replace操作，找到所有需要替换的数据
        promises.push(promise) //存入到数组
    })

    //所有的promise执行完毕以后通过all拿到值
    const data = await Promise.all(promises)

    // data.shift() 每次执行都会拿到data数组第一个值返回，类似于splice(0,1)
    return str.replace(regex, () => data.shift())

}

//批量签名cos桶链接
async function getSignContent(cloud,content) {
    content = await replaceAsync(content, /(https?:\/\/[^\s"']+myqcloud\.com[^\s"']+)/g, async (url) => {
        var res = await cloud.signCosUrl(url)
        // console.log(res)
        return res
    })
    return content
}

//编码猫猫卡片链接
function encodeUrls(text) {
    const urlRegex = /(https?:\/\/[^\s"']+)|(\/pages[^\s"']+)/g;
    return text.replace(urlRegex, (url) => {
        console.log(url)
        if (url.includes("myqcloud.com")) {
            url = url.split('?')[0]
            return encodeURIComponent(url);
        }
        return encodeURIComponent(url)
    })
}

//解码猫猫卡片链接
function decodeUrls(text) {
    // "<p></p><card src="https%3A%2F%2Fcat-1327294719.cos.ap-nanjing.myqcloud.com%2Fcompressed%2F53da6442-e73b-4d82-db47-4a40cdd5f32a.jpg%3Fq-sign-algorithm%3Dsha1%26q-ak%3DAKIDPvtzEv-nYzTHMaIX55QvpLiZogyc7-0ONBrtTVaw00-nkXx9U1TrBbKAPdQ8jIPe%26q-sign-time%3D1726822126%3B1726829326%26q-key-time%3D1726822126%3B1726829326%26q-header-list%3Dhost%26q-url-param-list%3D%26q-signature%3Da14e24cdc7cdd3244d29cba4a397193adb42e2e0%26x-cos-security-token%3DptGu0R0ple7Biza0ongMATc7O7q7oHQa63140bae39963acd221dcbf6f63ef95fGi5Ke5dj5ybM-9zXIeGI9uRps_uGEFyZ3ZONHmiryRCAbuI0n_Lw_5Sv-oXumxY23kqH6G8AxEm7w10G93NhAWPd-NPZBsYakw96mDe6ywMivI6v0k32OIJR6EfVNCEH1WUKz0rBTQsWH-74mDhY8SBH6pxh7g3Csmr8uAfmioy-aPLufCDiQrxVUDu06gDM8CFZiJtFe0snLZI12s8fEooNQ-JgmCQVRdmChNv39aTH8cWRweC5ioDnFxMnMPcxgu88pV6CQCg_odGXLZZamtVyipUBZT6bvk0zGXk1mZ4" title="大花" desc="长相颇愁眉苦脸，非常圆润，额头左侧一块黑" url="%2Fpages%2Fgenealogy%2FdetailCat%2FdetailCat%3Fcat_id%3D664a1852ac139c628dd96a56" color="#333333" bgcolor="#ffffff" border="#e5e5e5">"
    const urlRegex = /(https?%3A%2F%2F[^\s"']+)|(%2Fpages[^\s"']+)/g;
    return text.replace(urlRegex, (url) => {
        return decodeURIComponent(url);
    })
}

// 获取当前页面的path，包括参数
function getCurrentPath(pagesStack) {
    const currentPage = pagesStack[pagesStack.length - 1];
    const route = currentPage.route;
    const options = currentPage.options;
    var path = '/' + route + '?'
    for (const key in options) {
        path += key + '=' + options[key] + '&';
    }
    return path;
}

// 判断两个userInfo是否相同，初级版
function userInfoEq(a, b) {
    try {
        for (const k in a) {
            if (a[k] != b[k]) {
                console.log('找到不同了', k, a[k], b[k]);
                return false;
            }
        }
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}


// 替换字符串中的正则特殊符号
function regReplace(raw) {
    const sp_char = "*.?+$^[](){}|\/";
    for (const ch of sp_char) {
        raw = raw.replace(ch, '\\' + ch);
    }
    return raw;
}

function formatDate(date, fmt) {
    date = new Date(date);
    var o = {
        "M+": date.getMonth() + 1, //月份 
        "d+": date.getDate(), //日 
        "h+": date.getHours(), //小时 
        "m+": date.getMinutes(), //分 
        "s+": date.getSeconds(), //秒 
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度 
        "S": date.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

/**
 * 检查版本更新
 */
function checkUpdateVersion() {
    const updateManager = wx.getUpdateManager();

    updateManager.onCheckForUpdate(function (res) {
        // 请求完新版本信息的回调
        console.log(res.hasUpdate)
    })

    updateManager.onUpdateReady(function () {
        wx.showModal({
            title: '更新提示',
            content: '新版本已就绪，是否重启应用？',
            success: function (res) {
                if (res.confirm) {
                    // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
                    updateManager.applyUpdate()
                }
            }
        })
    })

    updateManager.onUpdateFailed(function () {
        // 新版本下载失败
        console.log("新版本下载失败");
    })
}

// 切分org的filter
function splitFilterLine(line) {
    if (!line) {
        return [];
    }
    var line = line.split('\n');
    return line.filter((val) => val.length);
}


function checkMultiClick(cat_id) {
    const last_click = wx.getStorageSync(cat_id);
    if (!cat_id) {
        return false;
    }
    const deltaHours = getDeltaHours(last_click);
    console.log("last click: " + deltaHours);
    // 小于2小时就返回true，说明是一个multi-click
    return deltaHours < 2;
}

function getDeltaHours(lastTime) {
    const today = new Date();
    var deltaHours = today - (new Date(lastTime)); // milliseconds
    deltaHours = deltaHours / 1000 / 3600; // hours
    return deltaHours;
}

function getDateWithDiffHours(diff) {
    var res = new Date();
    res.setHours(res.getHours() + diff);
    return res;
}

async function arrayResort(oriArray) {
    var resortedArray = [];
    var len = oriArray.length;
    for (var i = 0; i < len; i++) {
        var index = Math.floor(Math.random() * oriArray.length);
        resortedArray.push(oriArray[index]);
        oriArray.splice(index, 1);
    }
    resortedArray = [...resortedArray, ...oriArray];
    return resortedArray;
}

// 等待时间（ms）
const sleep = m => new Promise(r => setTimeout(r, m))

// 字符串的字节长度
String.prototype.gblen = function () {
    var len = 0;
    for (var i = 0; i < this.length; i++) {
        if (this.charCodeAt(i) > 127 || this.charCodeAt(i) == 94) {
            len += 2;
        } else {
            len++;
        }
    }
    return len;
}

// 深拷贝
function deepcopy(obj) {
    return JSON.parse(JSON.stringify(obj))
}

// 强制压缩
async function compressImage(src, quality) {
    var res = await wx.compressImage({
        src, // 图片路径
        quality, // 压缩质量
    })
    return res.tempFilePath;
}

/**
 * 解析url参数
 */
function _analysisUrlParam(url) {
    var queryParts = url.slice(url.indexOf("?") + 1).split('&');
    var params = {};
    queryParts.map(function (item) {
        var a = item.split('=')
        params[a[0]] = a[1]
    })
    return params
}

// 解析URL参数
function parseQueryParams(url) {
    const searchParams = _analysisUrlParam(url);
    const params = {};

    for (let key in searchParams) {
        let value = searchParams[key];
        // 如果参数名已经存在，则将值转换为数组
        if (params.hasOwnProperty(key)) {
            if (Array.isArray(params[key])) {
                params[key].push(value);
            } else {
                params[key] = [params[key], value];
            }
        } else {
            params[key] = value;
        }
    }

    return params;
}

// 获取URL中除参数以外的部分
function removeQueryParams(url) {
    const indexOfQuestionMark = url.indexOf('?');
    if (indexOfQuestionMark !== -1) {
        return url.substring(0, indexOfQuestionMark);
    }
    return url;
}

module.exports = {
    replaceAsync,
    getSignContent,
    encodeUrls,
    decodeUrls,
    hex_sha256,
    randomInt,
    generateUUID,
    isWifi,
    shuffle,
    shareTo,
    getCurrentPath,
    userInfoEq,
    regReplace,
    formatDate,
    checkUpdateVersion,
    splitFilterLine,
    checkMultiClick,
    getDeltaHours,
    arrayResort,
    getDateWithDiffHours,
    sleep,
    deepcopy,
    compressImage,
    parseQueryParams,
    removeQueryParams
};