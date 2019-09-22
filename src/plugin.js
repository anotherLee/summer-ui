import Toast from "./Toast"
export default {
  install(Vue, options) {
    Vue.prototype.$toast = function(msg, toastOptions) {
      const Constructor = Vue.extend(Toast)
      const toast = new Constructor({
        propsData: toastOptions
      })
      toast.$slots.default = [msg]
      toast.$mount()
      document.body.appendChild(toast.$el)
    }
  }
}
