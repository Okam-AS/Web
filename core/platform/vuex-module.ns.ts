import { IVuexModule } from '../interfaces'

class VuexModuleNS implements IVuexModule {
  state: any;
  getters: any;
  commit: any;
  dispatch: any;
  subscribe: any;
  watch: any;

  constructor () {
    const storePath = '../../vuex/store'
    const tempStore = require(storePath)
    this.state = tempStore.state
    this.getters = tempStore.getters
    this.commit = tempStore.commit
    this.dispatch = tempStore.dispatch
    this.subscribe = tempStore.subscribe
    this.watch = tempStore.watch
  }
}

export const VuexModule = VuexModuleNS