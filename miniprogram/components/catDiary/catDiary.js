const { WxCalendar } = require('@lspriv/wx-calendar/lib');
const { DisabledPlugin, DISABLED_PLUGIN_KEY } = require('@lspriv/wc-plugin-disabled');

WxCalendar.use(DisabledPlugin);

Component({
    options: {
        multipleSlots: true, // 在组件定义时的选项中启用多slot支持
    },
    properties: {
        cat: {
            type: Object,
            value: ''
        }
    },
    data: {
            isOpenDate: false,
            startY: 0,
            currentDate: new Date().toLocaleDateString(),
            calendar:{},
    },
    methods: {
        handleLoad(e) {
            const calendar = this.selectComponent('#calendar'); 
            this.setData({
                calendar:calendar
            })
            const disabledPlugin = calendar.getPlugin(DISABLED_PLUGIN_KEY);
            console.log(e)
          },
          changeDate(e){
            console.log(Object.values(e.detail.checked))
            this.setData({
                currentDate:Object.values(e.detail.checked).slice(0,3).join('/')
            })
          },
          changeOpen(){
              this.setData({
                  isOpenDate:!this.data.isOpenDate
              })
              console.log(this.data.isOpenDate)
          }

    }
});