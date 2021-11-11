import { IVuexModule } from '../interfaces'
import GetStoreModule from '../../modules/store-module'

class VuexModuleNUXT implements IVuexModule {
    state: any;
    getters: any;
    commit: any;
    dispatch: any;
    subscribe: any;
    watch: any;
    constructor () {
      if (GetStoreModule) {
        const tempStore = GetStoreModule()
        if (tempStore) {
          this.state = tempStore.state
          this.getters = tempStore.getters
          this.commit = tempStore.commit
          this.dispatch = tempStore.dispatch
          this.subscribe = tempStore.subscribe
          this.watch = tempStore.watch
        }
      }
    }
}

export const VuexModule = VuexModuleNUXT