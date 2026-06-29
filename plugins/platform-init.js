// Register the web platform implementation into core before services are used.
// Core is bundler-agnostic and relies on each app registering its own platform via
// setPlatform(). Listed FIRST in nuxt.config plugins (before store-init / global-mixin)
// so HttpModule/PersistenceModule are available by the time any core service runs.
import { HttpModule } from '~/platform/http-module'
import { PersistenceModule } from '~/platform/persistence-module'
import { setPlatform } from '~/core/platform'

setPlatform(HttpModule, PersistenceModule)
