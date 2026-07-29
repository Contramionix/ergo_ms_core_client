/**
 * Эталон standalone SPA: shell + один манифест модуля.
 * В монорепо манифест резолвится через alias @standalone-module-manifest.
 * Во внешнем репо: import manifest from './module/manifest.js'
 *
 * Shell: @ergo-ms/core-client/shell (path/git) или @ergo-ms/client-shell (ergoms client-shell-pack).
 */
import { bootstrapErgoClient } from '@ergo-ms/core-client/shell'

await bootstrapErgoClient({
  modules: [() => import('@standalone-module-manifest')],
})
