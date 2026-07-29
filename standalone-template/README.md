# Standalone SPA шаблон (CLIENT_MODULARITY=standalone)

Внешний git-репозиторий модуля потребляет shell ядра и регистрирует один манифест.

## Быстрый старт

1. Скопируйте этот каталог в новый репозиторий.
2. В `package.json` укажите зависимость на shell:

```json
"@ergo-ms/core-client": "file:../path/to/core/client"
```

или tarball из `ergoms client-shell-pack` (`@ergo-ms/client-shell`).

Импорт:

```js
import { bootstrapErgoClient } from '@ergo-ms/core-client/shell'
// или: from '@ergo-ms/client-shell'
```

3. Положите UI модуля в `src/module/` и экспортируйте манифест (`manifest.js`) —
   тот же контракт, что `federation-entry.js` (routes, endpoints, locales, …).

4. `npm install && npm run build`

5. CORS: добавьте origin SPA в `CORS_ALLOWED_ORIGINS` корневого `.env`.
6. nginx: отдельный `server_name` / `root` на `dist`; `/api/` → общий gateway.

## В монорепо (CI)

```bash
ergoms client-build-standalone --module=<name>
```

Артефакт: `virtual_env/client-standalone/<module>/`.
