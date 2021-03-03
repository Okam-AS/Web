export default {
  set (name, value) {
    const d = new Date()
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000))
    const expires = 'expires=' + d.toUTCString()
    document.cookie = name + '=' + value + ';' + expires + ';path=/;'
  },
  get (name) {
    function escape (s) { return s.replace(/([.*+?^$(){}|[\]/\\])/g, '\\$1') }
    const match = document.cookie.match(RegExp('(?:^|;\\s*)' + escape(name) + '=([^;]*)'))
    return match ? match[1] : null
  },
  remove (name) {
    document.cookie = name + '=;expires=0;path=/;'
  }
}